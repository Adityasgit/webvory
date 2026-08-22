import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { apiUrl } from '@/services/api'

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'Google did not return an authorization code.',
  missing_state: 'Login session expired. Try again.',
  invalid_state: 'Invalid login state. Try again.',
  state_mismatch: 'Login state mismatch. Try again.',
  oauth_exchange_failed: 'Could not complete Google sign-in.',
  incomplete_profile: 'Google profile was missing email.',
  access_denied: 'Google sign-in was cancelled.',
}

export function LoginPage() {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const errorKey = params.get('error')
  const errorMessage = useMemo(() => {
    if (!errorKey) return null
    return ERROR_MESSAGES[errorKey] ?? `Sign-in failed (${errorKey}).`
  }, [errorKey])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        Loading…
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(46,196,182,0.18),transparent_45%),radial-gradient(ellipse_at_90%_20%,rgba(56,120,180,0.14),transparent_40%),radial-gradient(ellipse_at_50%_100%,rgba(20,40,60,0.5),transparent_55%),#070a0e]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
          }}
        />
      </div>

      <div className="animate-fade-up relative z-10 w-full max-w-lg">
        <p className="font-display mb-5 text-5xl font-extrabold tracking-tight text-[var(--text)] sm:text-6xl">
          Webvory
        </p>
        <p className="mb-10 max-w-md text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
          Internal task tracking for your team. Sign in with Google to continue.
        </p>

        {errorMessage ? (
          <div role="alert" className="alert-error mb-5">
            {errorMessage}
          </div>
        ) : null}

        <a
          href={apiUrl('/api/auth/google')}
          className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[#747775]/40 bg-white px-5 py-3.5 text-sm font-semibold !text-[#1f1f1f] shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition hover:bg-[#f8f9fa] hover:shadow-[0_14px_44px_rgba(0,0,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a0e] active:bg-[#f1f3f4]"
        >
          <GoogleIcon />
          Continue with Google
        </a>
        <p className="mt-5 text-center text-xs text-[var(--text-muted)]">
          No password login Google OAuth only.
        </p>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 37.1 44 31.5 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  )
}
