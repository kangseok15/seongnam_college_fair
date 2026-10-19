import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  getDocFromServer,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { firebaseConfig } from '../config/firebaseConfig';
import { StudentApplicant, Consultant, AllocationLog } from '../types';

// 1. Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/* CRITICAL: The app will break without this line */
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// 2. Strict Error Handling Pattern according to Security/Audit Specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 3. Test Connection
export async function testFirestoreConnection(): Promise<boolean> {
  const testPath = 'fair_config/test';
  try {
    await getDocFromServer(doc(db, 'fair_config', 'test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration or network connection.');
      return false;
    }
    // If doc doesn't exist, it still succeeded in reaching the server
    return true;
  }
}

// 4. Auth helpers
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out failed:', error);
    throw error;
  }
}

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// 4.1 Admin Authorization & RBAC
export const PRIMARY_ADMIN_EMAIL = 'sophia31511@gmail.com';
const APPROVED_ADMINS_STORAGE_KEY = 'sn_approved_admin_emails_v1';

export function getApprovedAdminEmails(): string[] {
  const list = [PRIMARY_ADMIN_EMAIL.toLowerCase()];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(APPROVED_ADMINS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((email: string) => {
            const clean = String(email).toLowerCase().trim();
            if (clean && !list.includes(clean)) {
              list.push(clean);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error reading approved admin emails:', e);
    }
  }
  return list;
}

export function addApprovedAdminEmail(email: string): boolean {
  const clean = email.toLowerCase().trim();
  if (!clean || !clean.includes('@')) return false;
  const current = getApprovedAdminEmails();
  if (current.includes(clean)) return true;
  const updated = [...current.filter(e => e !== PRIMARY_ADMIN_EMAIL.toLowerCase()), clean];
  try {
    localStorage.setItem(APPROVED_ADMINS_STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.error('Error saving approved admin email:', e);
    return false;
  }
}

export function removeApprovedAdminEmail(email: string): boolean {
  const clean = email.toLowerCase().trim();
  if (clean === PRIMARY_ADMIN_EMAIL.toLowerCase()) return false; // Primary admin cannot be removed
  const current = getApprovedAdminEmails();
  const updated = current.filter(e => e !== clean && e !== PRIMARY_ADMIN_EMAIL.toLowerCase());
  try {
    localStorage.setItem(APPROVED_ADMINS_STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.error('Error removing approved admin email:', e);
    return false;
  }
}

export function isApprovedAdminUser(user: User | { email?: string | null } | null): boolean {
  if (!user || !user.email) return false;
  const clean = user.email.toLowerCase().trim();
  const approvedList = getApprovedAdminEmails();
  return approvedList.includes(clean);
}


// 5. Clean Data Conversion (Ensure no undefined fields for Firestore)
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

// 6. Firestore Real-Time Subscriptions
export function subscribeApplicantsFromFirestore(
  onData: (applicants: StudentApplicant[]) => void,
  onError?: (err: any) => void
) {
  const collectionPath = 'applicants';
  try {
    const colRef = collection(db, collectionPath);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: StudentApplicant[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as StudentApplicant);
        });
        // Sort by ID or registration date
        list.sort((a, b) => a.id.localeCompare(b.id));
        onData(list);
      },
      (error) => {
        console.error('Applicants onSnapshot error:', error);
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      }
    );
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, collectionPath);
  }
}

export function subscribeConsultantsFromFirestore(
  onData: (consultants: Consultant[]) => void,
  onError?: (err: any) => void
) {
  const collectionPath = 'consultants';
  try {
    const colRef = collection(db, collectionPath);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: Consultant[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Consultant);
        });
        list.sort((a, b) => a.boothId - b.boothId);
        onData(list);
      },
      (error) => {
        console.error('Consultants onSnapshot error:', error);
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      }
    );
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, collectionPath);
  }
}

export function subscribeLogsFromFirestore(
  onData: (logs: AllocationLog[]) => void,
  onError?: (err: any) => void
) {
  const collectionPath = 'allocation_logs';
  try {
    const colRef = collection(db, collectionPath);
    const q = query(colRef, limit(200));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: AllocationLog[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as AllocationLog);
        });
        // Sort descending by timestamp
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        onData(list);
      },
      (error) => {
        console.error('Logs onSnapshot error:', error);
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      }
    );
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, collectionPath);
  }
}

// 7. Write Operations
export async function saveApplicantToFirestore(applicant: StudentApplicant): Promise<void> {
  const path = `applicants/${applicant.id}`;
  try {
    const ref = doc(db, 'applicants', applicant.id);
    await setDoc(ref, sanitizeForFirestore(applicant), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchSaveApplicantsToFirestore(applicants: StudentApplicant[]): Promise<void> {
  const path = 'applicants (batch)';
  try {
    // Firestore batch limit is 500 operations
    const CHUNK_SIZE = 350;
    for (let i = 0; i < applicants.length; i += CHUNK_SIZE) {
      const chunk = applicants.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const ref = doc(db, 'applicants', item.id);
        batch.set(ref, sanitizeForFirestore(item), { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveConsultantsToFirestore(consultants: Consultant[]): Promise<void> {
  const path = 'consultants (batch)';
  try {
    const batch = writeBatch(db);
    for (const consultant of consultants) {
      const ref = doc(db, 'consultants', String(consultant.boothId));
      batch.set(ref, sanitizeForFirestore(consultant), { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addLogToFirestore(log: AllocationLog): Promise<void> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `allocation_logs/${logId}`;
  try {
    const ref = doc(db, 'allocation_logs', logId);
    await setDoc(ref, sanitizeForFirestore({ ...log, id: logId }));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function seedInitialFirestoreDataIfEmpty(
  initialApplicants: StudentApplicant[],
  initialConsultants: Consultant[]
): Promise<boolean> {
  try {
    const appSnap = await getDocs(query(collection(db, 'applicants'), limit(5)));
    if (appSnap.empty) {
      console.log('Firestore is empty. Seeding initial 450 applicants and 30 booth consultants...');
      await batchSaveApplicantsToFirestore(initialApplicants);
      await saveConsultantsToFirestore(initialConsultants);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Could not check or seed Firestore automatically:', e);
    return false;
  }
}
