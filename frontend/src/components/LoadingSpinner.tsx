// src/components/LoadingSpinner.tsx

/** Full-page loading overlay */
export function PageLoader({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-green-200 border-t-green-700 animate-spin" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  )
}

/** Small inline spinner for use inside buttons */
export function ButtonSpinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin text-white inline-block mr-2"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
