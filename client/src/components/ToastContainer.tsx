// ============================================================
// APYMSA — ToastContainer
// Design: Enterprise Precision — navy/green/amber/red toasts
// ============================================================
import { Toast } from '@/hooks/useToast';

interface Props {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ICON_MAP: Record<string, string> = {
  success: 'check_circle',
  warning: 'warning',
  error: 'error',
  info: 'info',
};

const BG_MAP: Record<string, string> = {
  success: 'bg-[#16a34a]',
  warning: 'bg-[#d97706]',
  error: 'bg-[#dc2626]',
  info: 'bg-[#1a2b6b]',
};

export default function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${BG_MAP[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm max-w-xs pointer-events-auto`}
          style={{ animation: 'toastIn 0.3s ease', fontFamily: 'Roboto, sans-serif' }}
          onClick={() => onRemove(toast.id)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {ICON_MAP[toast.type]}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
