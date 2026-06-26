import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function MyResults() {
  const { profile } = useAuth()
  const [evaluations, setEvaluations] = useState([])
  const [pmcf, setPmcf] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: evals } = await supabase
        .from('rpms_evaluations')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })
      const { data: pmcfRows } = await supabase
        .from('pmcf_records')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })
      setEvaluations(evals || [])
      setPmcf(pmcfRows || [])
      setLoading(false)
    }
    load()
  }, [profile])

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Personal record</div>
        <h2>My Results</h2>
        <p>Evaluations and coaching plans appear here once approved and released by your evaluator.</p>
      </div>

      {loading ? <p className="muted">Loading…</p> : (
        <>
          <div className="card">
            <div className="section-title">RPMS-PPST Evaluations</div>
            {evaluations.length === 0 ? <p className="empty-state">No results released yet.</p> : (
              <table>
                <thead><tr><th>Period</th><th>Rating</th><th>Descriptor</th><th></th></tr></thead>
                <tbody>
                  {evaluations.map((e) => (
                    <tr key={e.id}>
                      <td>{e.rating_period}, {e.school_year}</td>
                      <td>{e.overall_rating}</td>
                      <td>{e.overall_descriptor}</td>
                      <td><Link className="btn btn-ghost" to={`/print/rpms/${e.id}`} target="_blank">Print</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <div className="section-title">Coaching Plans (PMCF)</div>
            {pmcf.length === 0 ? <p className="empty-state">No approved coaching plans yet.</p> : (
              <table>
                <thead><tr><th>Focus area</th><th>Coaching plan</th><th>Follow-up</th><th></th></tr></thead>
                <tbody>
                  {pmcf.map((p) => (
                    <tr key={p.id}>
                      <td>{p.indicator_text}</td>
                      <td>{p.coaching_action_plan}</td>
                      <td>{p.agreed_timeline || '—'}</td>
                      <td><Link className="btn btn-ghost" to={`/print/pmcf/${p.id}`} target="_blank">Print</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
