'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{
        minHeight: '100vh',
        background: '#0A0E1F',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
        fontFamily: "'Inter', sans-serif",
        color: '#F5F3ED',
        margin: 0,
      }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          marginBottom: 12,
          background: 'linear-gradient(135deg, #FDBA74, #FB7185, #C084FC)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}>Something went wrong.</div>

        <p style={{
          color: '#8A90B5',
          fontSize: '.95rem',
          lineHeight: 1.65,
          maxWidth: 380,
          marginBottom: 36,
        }}>
          An unexpected error occurred. Our team has been notified. Please try again.
        </p>

        <button
          onClick={reset}
          style={{
            background: 'linear-gradient(135deg, #FDBA74, #FB7185, #C084FC)',
            border: 'none',
            color: '#fff',
            padding: '13px 30px',
            borderRadius: 10,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: '.9rem',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  )
}