import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Clicking the emailed reset link logs the user into a temporary
    // "recovery" session. We just need to confirm one exists before
    // letting them set a new password.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) setError(err.message)
    else setDone(true)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-seal">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#1b1f3b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
        </div>
        <h1>Set a New Password</h1>
        <p className="sub">The Master's Corner</p>

        {!ready && !done && (
          <p className="muted" style={{ textAlign: 'center' }}>
            This link may have expired or already been used. Ask whoever sent it for a fresh reset link.
          </p>
        )}

        {ready && !done && (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>New password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
            </div>
            {error && <div className="auth-error">{error}</div>}
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
              {busy ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        )}

        {done && (
          <>
            <p className="muted" style={{ textAlign: 'center' }}>Password updated — you're all set.</p>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => navigate('/')}>
              Continue to the app
            </button>
          </>
        )}
      </div>
    </div>
  )
}
