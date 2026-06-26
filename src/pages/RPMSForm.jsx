import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const DESCRIPTORS = { 5: 'Outstanding', 4: 'Very Satisfactory', 3: 'Satisfactory', 2: 'Unsatisfactory', 1: 'Poor' }

function overallDescriptor(avg) {
  if (!avg) return ''
  if (avg >= 4.5) return 'Outstanding'
  if (avg >= 3.5) return 'Very Satisfactory'
  if (avg >= 2.5) return 'Satisfactory'
  if (avg >= 1.5) return 'Unsatisfactory'
  return 'Poor'
}

export default function RPMSForm() {
  const { profile } = useAuth()
  const [teachers, setTeachers] = useState([])
  const [domains, setDomains] = useState([])
  const [indicators, setIndicators] = useState([])
  const [activeDomain, setActiveDomain] = useState(1)

  const [teacherId, setTeacherId] = useState('')
  const [schoolYear, setSchoolYear] = useState('2026-2027')
  const [ratingPeriod, setRatingPeriod] = useState('Mid-Year')
  const [scores, setScores] = useState({})       // indicator_id -> { rating, evidence }
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('profiles').select('id, full_name, position').eq('role', 'teacher').eq('is_active', true).order('full_name')
      const { data: d } = await supabase.from('ppst_domains').select('*').order('domain_no')
      const { data: i } = await supabase.from('ppst_indicators').select('*').order('domain_no, objective_code')
      setTeachers(t || [])
      setDomains(d || [])
      setIndicators(i || [])
    }
    load()
  }, [])

  function setScore(indicatorId, field, value) {
    setScores((prev) => ({ ...prev, [indicatorId]: { ...prev[indicatorId], [field]: value } }))
  }

  const ratedIndicators = Object.entries(scores).filter(([, v]) => v?.rating)
  const avg = ratedIndicators.length
    ? ratedIndicators.reduce((sum, [, v]) => sum + v.rating, 0) / ratedIndicators.length
    : null

  function domainComplete(domainNo) {
    const ids = indicators.filter((i) => i.domain_no === domainNo).map((i) => i.id)
    return ids.length > 0 && ids.every((id) => scores[id]?.rating)
  }

  async function handleSubmit(status) {
    if (!teacherId) { setMessage('Select a teacher first.'); return }
    if (ratedIndicators.length === 0) { setMessage('Rate at least one indicator before saving.'); return }
    setSaving(true)
    setMessage('')

    const { data: evalRow, error } = await supabase
      .from('rpms_evaluations')
      .insert({
        teacher_id: teacherId,
        evaluator_id: profile.id,
        school_year: schoolYear,
        rating_period: ratingPeriod,
        status,
        overall_rating: avg ? Number(avg.toFixed(2)) : null,
        overall_descriptor: overallDescriptor(avg),
      })
      .select()
      .single()

    if (error) { setMessage(error.message); setSaving(false); return }

    const rows = Object.entries(scores)
      .filter(([, v]) => v?.rating)
      .map(([indicator_id, v]) => ({ evaluation_id: evalRow.id, indicator_id, rating: v.rating, evidence: v.evidence || null }))

    const { error: scoreErr } = await supabase.from('rpms_scores').insert(rows)
    setSaving(false)
    if (scoreErr) setMessage(scoreErr.message)
    else {
      setMessage(status === 'submitted' ? 'Submitted for approval.' : 'Saved as draft.')
      setScores({})
      setTeacherId('')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">RPMS-PPST</div>
        <h2>Classroom Observation &amp; Rating</h2>
        <p>Rate each indicator on the official 5-point DepEd scale. Evidence notes are optional but recommended.</p>
      </div>

      <div className="card">
        <div className="field-row">
          <div className="field">
            <label>Teacher being evaluated</label>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Select teacher…</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}{t.position ? ` — ${t.position}` : ''}</option>)}
            </select>
          </div>
          <div className="field">
            <label>School year</label>
            <input value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} />
          </div>
        </div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label>Rating period</label>
          <select value={ratingPeriod} onChange={(e) => setRatingPeriod(e.target.value)}>
            <option>Mid-Year</option>
            <option>Year-End</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 20 }}>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="section-title">Domains</div>
          <div className="domain-ribbon">
            {domains.map((d) => (
              <div
                key={d.domain_no}
                className={`domain-tab ${activeDomain === d.domain_no ? 'active' : ''} ${domainComplete(d.domain_no) ? 'done' : ''}`}
                onClick={() => setActiveDomain(d.domain_no)}
              >
                <span className="dot">{d.domain_no}</span>
                {d.title}
              </div>
            ))}
          </div>
          {avg !== null && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <div className="muted">Running average</div>
              <div className="display" style={{ fontSize: 24 }}>{avg.toFixed(2)} · {overallDescriptor(avg)}</div>
            </div>
          )}
        </div>

        <div>
          {indicators.filter((i) => i.domain_no === activeDomain).map((ind) => (
            <div className="card" key={ind.id}>
              <div className="muted" style={{ marginBottom: 4 }}>{ind.objective_code}</div>
              <p style={{ marginTop: 0, marginBottom: 14, fontSize: 14.5 }}>{ind.description}</p>
              <div className="rating-dial">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={scores[ind.id]?.rating === n ? `active-${n}` : ''}
                    onClick={() => setScore(ind.id, 'rating', n)}
                    title={DESCRIPTORS[n]}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {scores[ind.id]?.rating && <div className="dial-caption">{DESCRIPTORS[scores[ind.id].rating]}</div>}
              <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label>Evidence / notes (optional)</label>
                <textarea
                  rows={2}
                  value={scores[ind.id]?.evidence || ''}
                  onChange={(e) => setScore(ind.id, 'evidence', e.target.value)}
                  placeholder="What did you observe that supports this rating?"
                />
              </div>
            </div>
          ))}

          {message && <div className="card" style={{ borderColor: 'var(--blue)' }}>{message}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" disabled={saving} onClick={() => handleSubmit('draft')}>Save draft</button>
            <button className="btn btn-primary" disabled={saving} onClick={() => handleSubmit('submitted')}>Submit for approval</button>
          </div>
        </div>
      </div>
    </div>
  )
}
