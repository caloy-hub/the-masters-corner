import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const ROLES = ['admin', 'master_teacher', 'teacher']

export default function Users() {
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  async function load() {
    const { data: u } = await supabase.from('profiles').select('*').order('full_name')
    const { data: t } = await supabase.from('teams').select('*').order('name')
    setUsers(u || [])
    setTeams(t || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateField(id, field, value) {
    await supabase.from('profiles').update({ [field]: value }).eq('id', id)
    load()
  }

  async function createTeam(e) {
    e.preventDefault()
    if (!newTeamName.trim()) return
    await supabase.from('teams').insert({ name: newTeamName.trim() })
    setNewTeamName('')
    load()
  }

  async function sendResetLink(user) {
    if (!user.email) { setResetMessage(`${user.full_name} has no email on file — ask them to sign in once so it's recorded.`); return }
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetMessage(error ? error.message : `Reset link sent to ${user.full_name} (${user.email}).`)
  }

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Administration</div>
        <h2>Manage Users</h2>
        <p>Assign roles and positions. New sign-ups default to "Teacher" until you change their role here.</p>
      </div>

      <div className="card">
        <div className="section-title">Teams (Master Teacher circles)</div>
        <p className="muted" style={{ marginTop: -4, marginBottom: 14 }}>
          Each team keeps a master teacher's evaluations, coaching plans, and schedule visible only to that team —
          other master teachers and their teachers won't see it. Admins always see everything, across every team.
        </p>
        <form onSubmit={createTeam} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="e.g. Team Mabini, Grade 4 Cluster, etc."
            style={{ maxWidth: 320 }}
          />
          <button className="btn btn-primary" type="submit">Add team</button>
        </form>
        {teams.length === 0 ? (
          <p className="empty-state">No teams yet — add one above, then assign people to it below.</p>
        ) : (
          <div className="card-grid">
            {teams.map((t) => (
              <div key={t.id} className="stat">
                <div className="label">{t.name}</div>
                <div className="value" style={{ fontSize: 20 }}>
                  {users.filter((u) => u.team_id === t.id).length} member{users.filter((u) => u.team_id === t.id).length === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title">People</div>
        {resetMessage && <p className="muted" style={{ marginBottom: 12 }}>{resetMessage}</p>}
        {loading ? <p className="muted">Loading…</p> : (
          <table>
            <thead><tr><th>Name</th><th>Position</th><th>Role</th><th>Team</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>
                    <input
                      defaultValue={u.position || ''}
                      onBlur={(e) => updateField(u.id, 'position', e.target.value)}
                      style={{ minWidth: 150 }}
                    />
                  </td>
                  <td>
                    <select value={u.role} onChange={(e) => updateField(u.id, 'role', e.target.value)}>
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={u.team_id || ''} onChange={(e) => updateField(u.id, 'team_id', e.target.value || null)} style={{ minWidth: 150 }}>
                      <option value="">No team</option>
                      {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={u.is_active} onChange={(e) => updateField(u.id, 'is_active', e.target.checked)} />
                  </td>
                  <td><button className="btn btn-ghost" onClick={() => sendResetLink(u)}>Reset password</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
