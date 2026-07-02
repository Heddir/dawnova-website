'use client'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
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
    }}>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: 'clamp(5rem, 15vw, 10rem)',
        lineHeight: 1,
        background: 'linear-gradient(135deg, #FDBA74, #FB7185, #C084FC)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        marginBottom: 16,
      }}>404</div>

      <h1 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: 'clamp(1.4rem, 4vw, 2rem)',
        marginBottom: 12,
      }}>This page is still at dawn.</h1>

      <p style={{
        color: '#8A90B5',
        fontSize: '1rem',
        lineHeight: 1.65,
        maxWidth: 400,
        marginBottom: 40,
      }}>
        The page you&apos;re looking for doesn&apos;t exist yet — but Dawnova is building fast.
      </p>

      <Link href="/" style={{
        background: 'linear-gradient(135deg, #FDBA74, #FB7185, #C084FC)',
        border: 'none',
        color: '#fff',
        padding: '14px 32px',
        borderRadius: 10,
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        fontSize: '.92rem',
        textDecoration: 'none',
        display: 'inline-block',
      }}>
        Back to Home
      </Link>

      <p style={{
        marginTop: 48,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '.72rem',
        letterSpacing: '.3em',
        color: '#8A90B5',
        textTransform: 'uppercase',
      }}>
        Rising from <span style={{ color: '#FB7185' }}>dawn</span>. Reaching for <span style={{ color: '#FB7185' }}>nova</span>.
      </p>
    </div>
  )
}