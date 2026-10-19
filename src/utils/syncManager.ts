import Peer, { DataConnection } from 'peerjs';
import { StudentApplicant, Consultant, AllocationLog } from '../types';

export type SyncRole = 'STANDALONE' | 'HOST' | 'CLIENT';
export type PCPreset = 'NONE' | 'CHECKIN_KIOSK' | 'ONSITE_KIOSK' | 'ADMIN_PC';

export interface SyncStatus {
  role: SyncRole;
  roomId: string;
  connectedPeersCount: number;
  isConnected: boolean;
  isConnecting: boolean;
  lastSyncTime: string | null;
  latencyMs: number | null;
  error: string | null;
  preset: PCPreset;
}

export type SyncMessage =
  | {
      type: 'INIT_SYNC';
      applicants: StudentApplicant[];
      consultants: Consultant[];
      logs: AllocationLog[];
      timestamp: number;
    }
  | {
      type: 'STATE_UPDATE';
      applicants: StudentApplicant[];
      logs: AllocationLog[];
      consultants?: Consultant[];
      timestamp: number;
    }
  | {
      type: 'CLIENT_ACTION_CHECK_IN';
      applicantId: string;
      checkInTime: string;
      timestamp: number;
    }
  | {
      type: 'CLIENT_ACTION_ADD_ONSITE';
      applicantData: Omit<StudentApplicant, 'id' | 'registeredAt' | 'status'>;
      timestamp: number;
    }
  | {
      type: 'PING';
      timestamp: number;
    }
  | {
      type: 'PONG';
      originalTimestamp: number;
    };

interface SyncCallbacks {
  onStateUpdate: (data: { applicants: StudentApplicant[]; logs: AllocationLog[]; consultants?: Consultant[] }) => void;
  onClientCheckIn?: (applicantId: string, checkInTime: string) => void;
  onClientAddOnSite?: (applicantData: Omit<StudentApplicant, 'id' | 'registeredAt' | 'status'>) => void;
  onStatusChange: (status: SyncStatus) => void;
}

class SyncManager {
  private peer: Peer | null = null;
  private role: SyncRole = 'STANDALONE';
  private roomId: string = '2026';
  private preset: PCPreset = 'NONE';
  private connections: Map<string, DataConnection> = new Map();
  private hostConn: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private callbacks: SyncCallbacks | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private lastSyncTime: string | null = null;
  private latencyMs: number | null = null;
  private errorMessage: string | null = null;
  private pingInterval: any = null;
  private reconnectTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('sn_fair_broadcast_channel');
        this.broadcastChannel.onmessage = (event) => {
          this.handleBroadcastMessage(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
    }
  }

  public getStatus(): SyncStatus {
    return {
      role: this.role,
      roomId: this.roomId,
      connectedPeersCount: this.role === 'HOST' ? this.connections.size : this.isConnected ? 1 : 0,
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      lastSyncTime: this.lastSyncTime,
      latencyMs: this.latencyMs,
      error: this.errorMessage,
      preset: this.preset
    };
  }

  private notifyStatus() {
    if (this.callbacks?.onStatusChange) {
      this.callbacks.onStatusChange(this.getStatus());
    }
  }

  public registerCallbacks(callbacks: SyncCallbacks) {
    this.callbacks = callbacks;
    this.notifyStatus();
  }

  public setPreset(preset: PCPreset) {
    this.preset = preset;
    this.notifyStatus();
  }

  // Generate safe Peer ID based on Room
  private getHostPeerId(roomId: string): string {
    return `sn-admissions-fair-room-${roomId.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  }

  // --- START AS HOST (관리자 PC) ---
  public startHost(roomId: string = '2026', initialData: { applicants: StudentApplicant[]; consultants: Consultant[]; logs: AllocationLog[] }) {
    this.destroy();
    this.role = 'HOST';
    this.roomId = roomId;
    this.isConnecting = true;
    this.errorMessage = null;
    this.notifyStatus();

    const hostPeerId = this.getHostPeerId(roomId);

    try {
      this.peer = new Peer(hostPeerId, {
        debug: 1
      });

      this.peer.on('open', (id) => {
        this.isConnecting = false;
        this.isConnected = true;
        this.lastSyncTime = new Date().toLocaleTimeString('ko-KR');
        this.errorMessage = null;
        this.notifyStatus();
      });

      this.peer.on('connection', (conn) => {
        this.setupHostConnection(conn, initialData);
      });

      this.peer.on('error', (err: any) => {
        console.warn('Peer error on host:', err);
        if (err.type === 'unavailable-id') {
          // Room ID already taken as host, maybe refreshed page.
          this.errorMessage = `룸 코드 '${roomId}'의 호스트 ID가 일시 사용 중입니다. 잠시 후 재시도하거나 다른 룸 코드를 입력하세요.`;
        } else {
          this.errorMessage = err.message || 'P2P 연결 오류가 발생했습니다.';
        }
        this.isConnecting = false;
        this.notifyStatus();
      });

      this.peer.on('disconnected', () => {
        this.isConnected = false;
        this.notifyStatus();
        this.peer?.reconnect();
      });
    } catch (e: any) {
      this.isConnecting = false;
      this.errorMessage = e.message;
      this.notifyStatus();
    }
  }

  private setupHostConnection(
    conn: DataConnection,
    initialData: { applicants: StudentApplicant[]; consultants: Consultant[]; logs: AllocationLog[] }
  ) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.lastSyncTime = new Date().toLocaleTimeString('ko-KR');
      this.notifyStatus();

      // Send initial snapshot to newly connected client
      const initMsg: SyncMessage = {
        type: 'INIT_SYNC',
        applicants: initialData.applicants,
        consultants: initialData.consultants,
        logs: initialData.logs,
        timestamp: Date.now()
      };
      conn.send(initMsg);
    });

    conn.on('data', (data: any) => {
      this.handleHostReceivedData(data, conn);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.notifyStatus();
    });

    conn.on('error', () => {
      this.connections.delete(conn.peer);
      this.notifyStatus();
    });
  }

  private handleHostReceivedData(msg: SyncMessage, senderConn: DataConnection) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'PING') {
      const pong: SyncMessage = { type: 'PONG', originalTimestamp: msg.timestamp };
      senderConn.send(pong);
      return;
    }

    if (msg.type === 'CLIENT_ACTION_CHECK_IN') {
      this.lastSyncTime = new Date().toLocaleTimeString('ko-KR');
      if (this.callbacks?.onClientCheckIn) {
        this.callbacks.onClientCheckIn(msg.applicantId, msg.checkInTime);
      }
    } else if (msg.type === 'CLIENT_ACTION_ADD_ONSITE') {
      this.lastSyncTime = new Date().toLocaleTimeString('ko-KR');
      if (this.callbacks?.onClientAddOnSite) {
        this.callbacks.onClientAddOnSite(msg.applicantData);
      }
    }
  }

  // --- CONNECT AS CLIENT (1번 사전등록 PC 또는 2번 현장접수 PC) ---
  public connectAsClient(roomId: string = '2026') {
    this.destroy();
    this.role = 'CLIENT';
    this.roomId = roomId;
    this.isConnecting = true;
    this.errorMessage = null;
    this.notifyStatus();

    const hostPeerId = this.getHostPeerId(roomId);

    try {
      this.peer = new Peer({ debug: 1 });

      this.peer.on('open', () => {
        if (!this.peer) return;
        const conn = this.peer.connect(hostPeerId, {
          reliable: true
        });

        this.hostConn = conn;

        conn.on('open', () => {
          this.isConnecting = false;
          this.isConnected = true;
          this.lastSyncTime = new Date().toLocaleTimeString('ko-KR');
          this.errorMessage = null;
          this.notifyStatus();
          this.startClientPing();
        });

        conn.on('data', (data: any) => {
          this.handleClientReceivedData(data);
        });

        conn.on('close', () => {
          this.isConnected = false;
          this.hostConn = null;
          this.notifyStatus();
          this.scheduleReconnect();
        });

        conn.on('error', (err) => {
          console.warn('Client conn error:', err);
          this.errorMessage = '관리자 PC 연결 중 오류가 발생했습니다.';
          this.isConnected = false;
          this.notifyStatus();
          this.scheduleReconnect();
        });
      });

      this.peer.on('error', (err: any) => {
        console.warn('Client peer error:', err);
        if (err.type === 'peer-unavailable') {
          this.errorMessage = `관리자 PC(룸 코드: ${roomId})를 찾을 수 없습니다. 3번 관리자 PC에서 먼저 호스트를 시작해 주세요.`;
        } else {
          this.errorMessage = err.message || 'P2P 브로커 연결 오류';
        }
        this.isConnecting = false;
        this.isConnected = false;
        this.notifyStatus();
      });
    } catch (e: any) {
      this.isConnecting = false;
      this.errorMessage = e.message;
      this.notifyStatus();
    }
  }

  private scheduleReconnect() {
    if (this.role !== 'CLIENT') return;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      if (this.role === 'CLIENT' && !this.isConnected) {
        this.connectAsClient(this.roomId);
      }
    }, 4000);
  }

  private startClientPing() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.hostConn && this.hostConn.open) {
        const ping: SyncMessage = { type: 'PING', timestamp: Date.now() };
        this.hostConn.send(ping);
      }
    }, 5000);
  }

  private handleClientReceivedData(msg: SyncMessage) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'PONG') {
      this.latencyMs = Math.max(1, Date.now() - msg.originalTimestamp);
      this.notifyStatus();
      return;
    }

    if (msg.type === 'INIT_SYNC' || msg.type === 'STATE_UPDATE') {
      this.lastSyncTime = new Date().toLocaleTimeString('ko-KR');
      if (this.callbacks?.onStateUpdate) {
        this.callbacks.onStateUpdate({
          applicants: msg.applicants,
          logs: msg.logs,
          consultants: 'consultants' in msg ? msg.consultants : undefined
        });
      }
      this.notifyStatus();
    }
  }

  // --- BROADCAST FROM HOST TO ALL CONNECTED CLIENTS ---
  public broadcastHostState(applicants: StudentApplicant[], logs: AllocationLog[], consultants?: Consultant[]) {
    // 1. BroadcastChannel (같은 PC / 다른 브라우저 탭 즉시 동기화)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'BC_STATE_UPDATE',
          applicants,
          logs,
          consultants,
          timestamp: Date.now()
        });
      } catch (e) {
        console.error('BC error', e);
      }
    }

    // 2. WebRTC DataConnection (다른 PC에 초고속 송신)
    if (this.role === 'HOST') {
      const msg: SyncMessage = {
        type: 'STATE_UPDATE',
        applicants,
        logs,
        consultants,
        timestamp: Date.now()
      };
      this.connections.forEach((conn) => {
        if (conn.open) {
          conn.send(msg);
        }
      });
      this.lastSyncTime = new Date().toLocaleTimeString('ko-KR');
      this.notifyStatus();
    }
  }

  // --- CLIENT SENDS CHECK-IN ACTION TO HOST ---
  public sendCheckInAction(applicantId: string, checkInTime: string) {
    // BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'BC_CHECK_IN',
          applicantId,
          checkInTime,
          timestamp: Date.now()
        });
      } catch (e) {}
    }

    if (this.role === 'CLIENT' && this.hostConn && this.hostConn.open) {
      const msg: SyncMessage = {
        type: 'CLIENT_ACTION_CHECK_IN',
        applicantId,
        checkInTime,
        timestamp: Date.now()
      };
      this.hostConn.send(msg);
      this.lastSyncTime = new Date().toLocaleTimeString('ko-KR');
      this.notifyStatus();
    }
  }

  // --- CLIENT SENDS ON-SITE REGISTRATION TO HOST ---
  public sendAddOnSiteAction(applicantData: Omit<StudentApplicant, 'id' | 'registeredAt' | 'status'>) {
    // BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'BC_ADD_ONSITE',
          applicantData,
          timestamp: Date.now()
        });
      } catch (e) {}
    }

    if (this.role === 'CLIENT' && this.hostConn && this.hostConn.open) {
      const msg: SyncMessage = {
        type: 'CLIENT_ACTION_ADD_ONSITE',
        applicantData,
        timestamp: Date.now()
      };
      this.hostConn.send(msg);
      this.lastSyncTime = new Date().toLocaleTimeString('ko-KR');
      this.notifyStatus();
    }
  }

  private handleBroadcastMessage(data: any) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'BC_STATE_UPDATE') {
      if (this.callbacks?.onStateUpdate) {
        this.callbacks.onStateUpdate({
          applicants: data.applicants,
          logs: data.logs
        });
      }
    } else if (data.type === 'BC_CHECK_IN') {
      if (this.role === 'HOST' && this.callbacks?.onClientCheckIn) {
        this.callbacks.onClientCheckIn(data.applicantId, data.checkInTime);
      }
    } else if (data.type === 'BC_ADD_ONSITE') {
      if (this.role === 'HOST' && this.callbacks?.onClientAddOnSite) {
        this.callbacks.onClientAddOnSite(data.applicantData);
      }
    }
  }

  // --- DISCONNECT / CLEANUP ---
  public destroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    this.connections.forEach((conn) => {
      try {
        conn.close();
      } catch (e) {}
    });
    this.connections.clear();

    if (this.hostConn) {
      try {
        this.hostConn.close();
      } catch (e) {}
      this.hostConn = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }

    this.role = 'STANDALONE';
    this.isConnected = false;
    this.isConnecting = false;
    this.latencyMs = null;
    this.errorMessage = null;
    this.notifyStatus();
  }
}

export const syncManager = new SyncManager();
