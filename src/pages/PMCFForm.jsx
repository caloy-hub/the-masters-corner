import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function PMCFForm() {
  const { profile } = useAuth()
  const [teachers, setTeachers] = useState([])
  const [domains, setDomains] = useState([])
  const [form, setForm] = useState({
    teacher_id: '', domain_no: '', indicator_text: '', observation: '',
    strengths: '', areas_for_improvement: '', coaching_action_plan: '', agreed_timeline: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('profiles').select('id, full_name').eq('role', 'teacher').eq('is_active', true).order('full_name')
      const { data: d } = await supabase.from('ppst_domains').select('*').order('domain_no')
      setTeachers(t || [])
      setDomains(d || [])
    }
    load()
  }, [])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(status) {
    if (!form.teacher_id || !form.indicator_text) {
      setMessage('Select a teacher and describe the indicator being coached.')
      return
    }
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('pmcf_records').insert({
      ...form,
      domain_no: form.domain_no || null,
      agreed_timeline: form.agreed_timeline || null,
      master_teacher_id: profile.id,
      status,
      submitted_at: status === 'submitted' ? new Date().toISOString() : null,
    })
    setSaving(false)
    if (error) setMessage(error.message)
    else {
      setMessage(status === 'submitted' ? 'Coaching plan submitted for approval.' : 'Saved as draft.')
      setForm({ teacher_id: '', domain_no: '', indicator_text: '', observation: '', strengths: '', areas_for_improvement: '', coaching_action_plan: '', agreed_timeline: '' })
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">PMCF</div>
        <h2>Performance Monitoring &amp; Coaching Form</h2>
        <p>Document a coaching session between observation cycles — what was seen, what's strong, and the agreed next step.</p>
      </div>

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label>Teacher being coached</label>
            <select value={form.teacher_id} onChange={(e) => update('teacher_id', e.target.value)}>
              <option value="">Select teacher…</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Related PPST domain</label>
            <select value={form.domain_no} onChange={(e) => update('domain_no', e.target.value)}>
              <option value="">Select domain…</option>
              {domains.map((d) => <option key={d.domain_no} value={d.domain_no}>{d.domain_no}. {d.title}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Indicator / focus area being coached</label>
          <input value={form.indicator_text} onChange={(e) => update('indicator_text', e.target.value)} placeholder="e.g. Use of formative assessment during independent practice" />
        </div>

        <div className="field">
          <label>Observation / evidence</label>
          <textarea rows={3} value={form.observation} onChange={(e) => update('observation', e.target.value)} placeholder="What did you observe in the classroom or in submitted work?" />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Strengths noted</label>
            <textarea rows={3} value={form.strengths} onChange={(e) => update('strengths', e.target.value)} />
          </div>
          <div className="field">
            <label>Areas for improvement</label>
            <textarea rows={3} value={form.areas_for_improvement} onChange={(e) => update('areas_for_improvement', e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Coaching action plan</label>
          <textarea rows={3} value={form.coaching_action_plan} onChange={(e) => update('coaching_action_plan', e.target.value)} placeholder="Agreed steps the teacher will take before the next check-in" />
        </div>

        <div className="field" style={{ maxWidth: 220 }}>
          <label>Agreed follow-up date</label>
          <input type="date" value={form.agreed_timeline} onChange={(e) => update('agreed_timeline', e.target.value)} />
        </div>

        {message && <p className="muted">{message}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-ghost" disabled={saving} onClick={() => handleSubmit('draft')}>Save draft</button>
          <button className="btn btn-primary" disabled={saving} onClick={() => handleSubmit('submitted')}>Submit for approval</button>
        </div>
      </div>
    </div>
  )
}
