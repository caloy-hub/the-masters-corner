import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Approvals() {
  const { profile } = useAuth()
  const [evaluations, setEvaluations] = useState([])
  const [pmcf, setPmcf] = useState([])
  const [loading, setLoading] = useState(true)

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
    await supabase.from('rpms_evaluations').update({
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      released_to_teacher: release,
    }).eq('id', id)
    load()
  }

  async function approvePmcf(id) {
    await supabase.from('pmcf_records').update({
      status: 'approved', approved_by: profile.id, approved_at: new Date().toISOString(),
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
