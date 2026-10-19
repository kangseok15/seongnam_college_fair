import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, X, ShieldAlert, KeyRound, Delete, Check, RotateCcw } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_PINS = ['4706'];
const PIN_STORAGE_KEY = 'sn_admin_pin_v2';

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsShaking(false);
      setIsSuccess(false);
      setIsChangingPin(false);
      setNewPin('');
      setChangeSuccess(null);
    }
  }, [isOpen]);

  // Verify PIN
  const handleVerify = useCallback(
    (enteredPin: string) => {
      const storedPin = localStorage.getItem(PIN_STORAGE_KEY);
      const validPins = storedPin ? [...DEFAULT_PINS, storedPin] : DEFAULT_PINS;

      if (validPins.includes(enteredPin)) {
        setIsSuccess(true);
        setError(null);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 350);
      } else {
        setIsShaking(true);
        setError('비밀번호가 일치하지 않습니다. 다시 시도해 주세요.');
        setTimeout(() => {
          setPin('');
          setIsShaking(false);
        }, 500);
      }
    },
    [onSuccess, onClose]
  );

  // Keypad press handler
  const handleDigit = useCallback(
    (digit: string) => {
      if (isSuccess) return;
      if (pin.length < 4) {
        const next = pin + digit;
        setPin(next);
        setError(null);
        if (next.length === 4) {
          handleVerify(next);
        }
      }
    },
    [pin, isSuccess, handleVerify]
  );

  const handleBackspace = useCallback(() => {
    if (isSuccess) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }, [isSuccess]);

  const handleClear = useCallback(() => {
    if (isSuccess) return;
    setPin('');
    setError(null);
  }, [isSuccess]);

  // Physical keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigit, handleBackspace, onClose]);

  // Save custom PIN
  const handleSaveCustomPin = () => {
    if (newPin.length !== 4) {
      setError('새 비밀번호는 숫자 4자리여야 합니다.');
      return;
    }
    localStorage.setItem(PIN_STORAGE_KEY, newPin);
    setChangeSuccess(`비밀번호가 [${newPin}] (으)로 변경되었습니다.`);
    setIsChangingPin(false);
    setNewPin('');
    setTimeout(() => setChangeSuccess(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden text-center relative animate-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="닫기 (교사 화면 유지)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg mb-3">
            {isSuccess ? (
              <Unlock className="w-7 h-7 text-emerald-300 animate-bounce" />
            ) : (
              <Lock className="w-7 h-7" />
            )}
          </div>

          <h3 className="text-lg font-black tracking-tight text-white">
            관리자 인증 (PIN 번호)
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
            교사용 뷰어 화면에서 관리자 종합 대시보드로 이동하려면 4자리 비밀번호를 입력해 주세요.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* PIN Dots Display */}
          <div
            className={`flex items-center justify-center gap-3.5 py-3 transition-transform ${
              isShaking ? 'translate-x-[-8px] animate-pulse' : ''
            }`}
          >
            {[0, 1, 2, 3].map((index) => {
              const hasDigit = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-11 h-12 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                    isSuccess
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                      : hasDigit
                      ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs scale-105'
                      : error
                      ? 'border-rose-300 bg-rose-50/40 text-slate-400'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {hasDigit ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shadow-2xs" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Error / Status Message */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {changeSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{changeSuccess}</span>
            </div>
          )}

          {/* Number Keypad */}
          {!isChangingPin ? (
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-blue-100 border border-slate-200/90 text-lg font-black text-slate-800 hover:text-blue-600 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all border border-slate-200/80 cursor-pointer active:scale-95"
              >
                전체지움
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-blue-100 border border-slate-200/90 text-lg font-black text-slate-800 hover:text-blue-600 transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all border border-slate-200/80 flex items-center justify-center cursor-pointer active:scale-95"
                title="한 글자 지우기"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
              <div className="text-xs font-bold text-slate-800">
                새 4자리 관리자 PIN 설정
              </div>
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="새 4자리 숫자 입력"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono text-center tracking-widest focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCustomPin}
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-xs"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setIsChangingPin(false)}
                  className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* Footer Guidance */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>운영본부 관리자 전용 인증 화면입니다.</span>
              {!isChangingPin && (
                <button
                  type="button"
                  onClick={() => setIsChangingPin(true)}
                  className="text-blue-600 hover:underline text-[10px] font-medium"
                >
                  PIN 변경
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              취소 (교사용 뷰어 계속 이용)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
