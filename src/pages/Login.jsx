import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const err = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, fullName)
    setBusy(false)
    if (err) setError(err.message)
    else if (mode === 'signin') navigate('/')
    else setError('Account created. An admin must assign your role before you can sign in.')
  }

  async function handleForgotPassword() {
    setError('')
    if (!email) { setError('Enter your email above first, then click "Forgot password?" again.'); return }
    setBusy(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    if (err) setError(err.message)
    else setResetSent(true)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-seal">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#1b1f3b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5V5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13" />
            <path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H20" />
            <path d="M8 8h8M8 11.5h5" />
          </svg>
        </div>
        <h1>The Master's Corner</h1>
        <p className="sub">RPMS-PPST evaluation &amp; PMCF coaching, in one place</p>

        {error && <div className="auth-error">{error}</div>}
        {resetSent && <p className="muted" style={{ textAlign: 'center', marginBottom: 12 }}>Reset link sent to {email} — check that inbox.</p>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="field">
              <label>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>School email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {mode === 'signin' && (
          <p className="muted" style={{ textAlign: 'center', marginTop: 10 }}>
            <a onClick={handleForgotPassword} style={{ cursor: 'pointer' }}>Forgot password?</a>
          </p>
        )}

        <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
          {mode === 'signin' ? (
            <>New teacher? <a onClick={() => setMode('signup')} style={{ cursor: 'pointer' }}>Create an account</a></>
          ) : (
            <>Already have an account? <a onClick={() => setMode('signin')} style={{ cursor: 'pointer' }}>Sign in</a></>
          )}
        </p>
      </div>
    </div>
  )
}
