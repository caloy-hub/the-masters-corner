import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const PURPOSE_LABEL = {
  classroom_observation: 'Classroom Observation (RPMS-PPST)',
  pmcf_conference: 'Coaching Conference (PMCF)',
  other: 'Other',
}

function formatWhen(iso) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function Schedule() {
  const { profile } = useAuth()
  const isStaff = profile.role === 'admin' || profile.role === 'master_teacher'

  const [appointments, setAppointments] = useState([])
  const [teachers, setTeachers] = useState([])
  const [observers, setObservers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    teacher_id: isStaff ? '' : profile.id,
    observer_id: isStaff ? profile.id : '',
    purpose: 'classroom_observation',
    title: '',
    date: '',
    time: '',
    duration_minutes: 45,
    location: '',
    notes: '',
  })

  async function load() {
    setLoading(true)
    let query = supabase
      .from('appointments')
      .select('*, teacher:teacher_id(full_name), observer:observer_id(full_name)')
      .order('scheduled_at', { ascending: true })
    if (!isStaff) query = query.eq('teacher_id', profile.id)
    const { data } = await query
    setAppointments(data || [])
    setLoading(false)
  }

  useEffect(() => {
    async function loadPeople() {
      const { data: t } = await supabase.from('profiles').select('id, full_name').eq('role', 'teacher').eq('is_active', true).order('full_name')
      const { data: o } = await supabase.from('profiles').select('id, full_name, role').in('role', ['master_teacher', 'admin']).eq('is_active', true).order('full_name')
      setTeachers(t || [])
      setObservers(o || [])
    }
    loadPeople()
    load()
  }, [])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.teacher_id || !form.observer_id || !form.date || !form.time) {
      setMessage('Please fill in the teacher, observer, date, and time.')
      return
    }
    setSaving(true)
    setMessage('')
    const scheduled_at = new Date(`${form.date}T${form.time}`).toISOString()
    const { error } = await supabase.from('appointments').insert({
      teacher_id: form.teacher_id,
      observer_id: form.observer_id,
      scheduled_by: profile.id,
      purpose: form.purpose,
      title: form.title || null,
      scheduled_at,
      duration_minutes: Number(form.duration_minutes) || 45,
      location: form.location || null,
      notes: form.notes || null,
      status: isStaff ? 'confirmed' : 'proposed',
    })
    setSaving(false)
    if (error) setMessage(error.message)
    else {
      setMessage(isStaff ? 'Appointment confirmed.' : 'Request sent — waiting for confirmation.')
      setForm((prev) => ({ ...prev, title: '', date: '', time: '', location: '', notes: '' }))
      load()
    }
  }

  async function setStatus(id, status) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    load()
  }

  const upcoming = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'completed')
  const past = appointments.filter((a) => a.status === 'cancelled' || a.status === 'completed')

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Calendar</div>
        <h2>Schedule a Conference / Observation</h2>
        <p>Set up classroom observations and PMCF coaching conferences ahead of time, so everyone shows up prepared.</p>
      </div>

      <div className="card">
        <div className="section-title">{isStaff ? 'New appointment' : 'Request an appointment'}</div>
        <form onSubmit={handleCreate}>
          <div className="field-row">
            {isStaff && (
              <div className="field">
                <label>Teacher</label>
                <select value={form.teacher_id} onChange={(e) => update('teacher_id', e.target.value)}>
                  <option value="">Select teacher…</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
            )}
            <div className="field">
              <label>{isStaff ? 'Observer / coach' : 'Master teacher / admin'}</label>
              <select value={form.observer_id} onChange={(e) => update('observer_id', e.target.value)}>
                <option value="">Select…</option>
                {observers.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Purpose</label>
              <select value={form.purpose} onChange={(e) => update('purpose', e.target.value)}>
                <option value="classroom_observation">Classroom Observation (RPMS-PPST)</option>
                <option value="pmcf_conference">Coaching Conference (PMCF)</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label>Title / subject (optional)</label>
              <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. 3rd quarter observation — Grade 5 Math" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
            </div>
            <div className="field">
              <label>Time</label>
              <input type="time" value={form.time} onChange={(e) => update('time', e.target.value)} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Duration (minutes)</label>
              <input type="number" min="15" step="5" value={form.duration_minutes} onChange={(e) => update('duration_minutes', e.target.value)} />
            </div>
            <div className="field">
              <label>Location / room</label>
              <input value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="e.g. Room 12, or Faculty Room" />
            </div>
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Anything to prepare beforehand" />
          </div>

          {message && <p className="muted">{message}</p>}

          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? 'Saving…' : isStaff ? 'Confirm appointment' : 'Send request'}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="section-title">Upcoming ({upcoming.length})</div>
        {loading ? <p className="muted">Loading…</p> : upcoming.length === 0 ? (
          <p className="empty-state">Nothing scheduled yet.</p>
        ) : (
          <table>
            <thead><tr><th>When</th><th>Teacher</th><th>Observer</th><th>Purpose</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {upcoming.map((a) => (
                <tr key={a.id}>
                  <td>{formatWhen(a.scheduled_at)} · {a.duration_minutes}m</td>
                  <td>{a.teacher?.full_name}</td>
                  <td>{a.observer?.full_name}</td>
                  <td>{a.title ? `${a.title} — ` : ''}{PURPOSE_LABEL[a.purpose]}</td>
                  <td><span className={`status-pill status-${a.status === 'proposed' ? 'submitted' : a.status === 'confirmed' ? 'approved' : 'draft'}`}>{a.status}</span></td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    {isStaff && a.status === 'proposed' && (
                      <button className="btn btn-primary" onClick={() => setStatus(a.id, 'confirmed')}>Confirm</button>
                    )}
                    {isStaff && a.status === 'confirmed' && (
                      <button className="btn btn-ghost" onClick={() => setStatus(a.id, 'completed')}>Mark done</button>
                    )}
                    {(isStaff || (a.teacher_id === profile.id && a.status === 'proposed')) && (
                      <button className="btn btn-ghost" onClick={() => setStatus(a.id, 'cancelled')}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {past.length > 0 && (
        <div className="card">
          <div className="section-title">Past / cancelled ({past.length})</div>
          <table>
            <thead><tr><th>When</th><th>Teacher</th><th>Observer</th><th>Purpose</th><th>Status</th></tr></thead>
            <tbody>
              {past.map((a) => (
                <tr key={a.id}>
                  <td>{formatWhen(a.scheduled_at)}</td>
                  <td>{a.teacher?.full_name}</td>
                  <td>{a.observer?.full_name}</td>
                  <td>{PURPOSE_LABEL[a.purpose]}</td>
                  <td><span className={`status-pill status-${a.status === 'completed' ? 'released' : 'draft'}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
