import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastContextValue {
  toast: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible(false), 2200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={`toast${visible ? ' show' : ''}`} role="status" aria-live="polite">
        {message}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue['toast'] {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}
