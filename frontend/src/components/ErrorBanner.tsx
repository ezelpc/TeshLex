// src/components/ErrorBanner.tsx

interface ErrorBannerProps {
  message:  string
  onRetry?: () => void
  onClose?: () => void
}

export function ErrorBanner({ message, onRetry, onClose }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3"
    >
      {/* Icon */}
      <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M5.07 19h13.86C20.45 19 21.5 17.52 20.74 16.14L13.61 3.23a1.5 1.5 0 00-2.62 0L3.26 16.14C2.5 17.52 3.55 19 5.07 19z" />
      </svg>

      <p className="text-sm text-red-700 flex-1">{message}</p>

      <div className="flex gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-700 font-semibold underline hover:no-underline"
          >
            Reintentar
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
