import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const ROLES = ['admin', 'master_teacher', 'teacher']

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateField(id, field, value) {
    await supabase.from('profiles').update({ [field]: value }).eq('id', id)
    load()
  }

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Administration</div>
        <h2>Manage Users</h2>
        <p>Assign roles and positions. New sign-ups default to "Teacher" until you change their role here.</p>
      </div>

      <div className="card">
        {loading ? <p className="muted">Loading…</p> : (
          <table>
            <thead><tr><th>Name</th><th>Position</th><th>Role</th><th>Active</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>
                    <input
                      defaultValue={u.position || ''}
                      onBlur={(e) => updateField(u.id, 'position', e.target.value)}
                      style={{ minWidth: 160 }}
                    />
                  </td>
                  <td>
                    <select value={u.role} onChange={(e) => updateField(u.id, 'role', e.target.value)}>
                      {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="checkbox" checked={u.is_active} onChange={(e) => updateField(u.id, 'is_active', e.target.checked)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
