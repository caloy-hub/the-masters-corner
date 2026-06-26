import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Account() {
  const { profile } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleChangePassword(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) setError(err.message)
    else {
      setMessage('Password updated.')
      setPassword('')
      setConfirm('')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Account</div>
        <h2>My Account</h2>
        <p>Update your own sign-in password. You'll use the new password next time you log in.</p>
      </div>

      <div className="card" style={{ maxWidth: 420 }}>
        <div className="section-title">Signed in as</div>
        <p className="muted" style={{ marginTop: -6 }}>{profile?.full_name} · {profile?.email}</p>

        <form onSubmit={handleChangePassword} style={{ marginTop: 18 }}>
          <div className="field">
            <label>New password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          <div className="field">
            <label>Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
          </div>
          {error && <p className="auth-error">{error}</p>}
          {message && <p className="muted">{message}</p>}
          <button className="btn btn-primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Update password'}</button>
        </form>
      </div>
    </div>
  )
}
