import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const STORAGE_KEY = 'mc_approving_official'

export default function Approvals() {
  const { profile } = useAuth()
  const [evaluations, setEvaluations] = useState([])
  const [pmcf, setPmcf] = useState([])
  const [loading, setLoading] = useState(true)

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
  })()
  const [officialName, setOfficialName] = useState(saved?.name || '')
  const [officialTitle, setOfficialTitle] = useState(saved?.title || 'Principal')

  function rememberOfficial(name, title) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, title })) } catch { /* ignore */ }
  }

  async function load() {
    setLoading(true)
    const { data: evals } = await supabase
      .from('rpms_evaluations')
      .select('*, teacher:teacher_id(full_name)')
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
    const { data: pmcfRows } = await supabase
      .from('pmcf_records')
      .select('*, teacher:teacher_id(full_name)')
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
    setEvaluations(evals || [])
    setPmcf(pmcfRows || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function approveEval(id, release) {
    rememberOfficial(officialName, officialTitle)
    await supabase.from('rpms_evaluations').update({
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      released_to_teacher: release,
      approving_official_name: officialName || null,
      approving_official_title: officialTitle || null,
    }).eq('id', id)
    load()
  }

  async function approvePmcf(id) {
    rememberOfficial(officialName, officialTitle)
    await supabase.from('pmcf_records').update({
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      approving_official_name: officialName || null,
      approving_official_title: officialTitle || null,
    }).eq('id', id)
    load()
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Validation</div>
        <h2>Approvals</h2>
        <p>Review submitted evaluations and coaching plans. Approving an evaluation can also release it to the teacher.</p>
      </div>

      <div className="card">
        <div className="section-title">Approving official (shown on printed results)</div>
        <p className="muted" style={{ marginTop: -4, marginBottom: 14 }}>
          This is the name and title that prints as "Approved by" — it doesn't have to match whoever is logged in.
          It's remembered on this device for next time.
        </p>
        <div className="field-row" style={{ maxWidth: 480 }}>
          <div className="field">
            <label>Full name</label>
            <input value={officialName} onChange={(e) => setOfficialName(e.target.value)} placeholder="e.g. Lyndon M. Dumael" />
          </div>
          <div className="field">
            <label>Title</label>
            <input value={officialTitle} onChange={(e) => setOfficialTitle(e.target.value)} placeholder="e.g. Principal" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">RPMS-PPST Evaluations awaiting approval ({evaluations.length})</div>
        {evaluations.length === 0 ? <p className="empty-state">Nothing pending.</p> : (
          <table>
            <thead><tr><th>Teacher</th><th>Period</th><th>Rating</th><th>Descriptor</th><th></th></tr></thead>
            <tbody>
              {evaluations.map((e) => (
                <tr key={e.id}>
                  <td>{e.teacher?.full_name}</td>
                  <td>{e.rating_period}, {e.school_year}</td>
                  <td>{e.overall_rating}</td>
                  <td>{e.overall_descriptor}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => approveEval(e.id, false)}>Approve only</button>
                    <button className="btn btn-primary" onClick={() => approveEval(e.id, true)}>Approve &amp; release</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="section-title">PMCF coaching plans awaiting approval ({pmcf.length})</div>
        {pmcf.length === 0 ? <p className="empty-state">Nothing pending.</p> : (
          <table>
            <thead><tr><th>Teacher</th><th>Indicator</th><th>Follow-up date</th><th></th></tr></thead>
            <tbody>
              {pmcf.map((p) => (
                <tr key={p.id}>
                  <td>{p.teacher?.full_name}</td>
                  <td>{p.indicator_text}</td>
                  <td>{p.agreed_timeline || '—'}</td>
                  <td><button className="btn btn-primary" onClick={() => approvePmcf(p.id)}>Approve</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
