import React from 'react';

const typeConfig = {
  success: {
    bg: 'bg-emerald-600',
    icon: 'check_circle',
    border: 'border-emerald-500',
  },
  error: {
    bg: 'bg-red-600',
    icon: 'error',
    border: 'border-red-500',
  },
  neutral: {
    bg: 'bg-[#1b1c1c]',
    icon: 'info',
    border: 'border-gray-600',
  },
};

const Toast = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type] || typeConfig.neutral;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-[14px] font-semibold max-w-sm border ${config.bg} ${config.border}`}
            style={{
              animation: 'slideInRight 0.25s ease-out',
            }}
          >
            <span
              className="material-symbols-outlined text-[20px] flex-shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {config.icon}
            </span>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="ml-2 opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Toast;
