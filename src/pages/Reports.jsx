import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Reports() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('rpms_evaluations')
        .select('*, teacher:teacher_id(full_name), evaluator:evaluator_id(full_name)')
        .order('created_at', { ascending: false })
      setRows(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const approvedRows = rows.filter((r) => r.status !== 'draft')
  const avgAll = approvedRows.length
    ? (approvedRows.reduce((s, r) => s + (r.overall_rating || 0), 0) / approvedRows.length).toFixed(2)
    : '—'

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Insights</div>
        <h2>Evaluation Reports</h2>
        <p>School-wide view of every RPMS-PPST evaluation, by status and rating.</p>
      </div>

      <div className="card-grid" style={{ marginBottom: 20 }}>
        <div className="stat"><div className="label">Total evaluations</div><div className="value">{rows.length}</div></div>
        <div className="stat"><div className="label">Average rating</div><div className="value">{avgAll}</div></div>
        <div className="stat"><div className="label">Pending approval</div><div className="value">{rows.filter((r) => r.status === 'submitted').length}</div></div>
      </div>

      <div className="card">
        {loading ? <p className="muted">Loading…</p> : rows.length === 0 ? (
          <p className="empty-state">No evaluations recorded yet.</p>
        ) : (
          <table>
            <thead><tr><th>Teacher</th><th>Evaluator</th><th>Period</th><th>Rating</th><th>Descriptor</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.teacher?.full_name}</td>
                  <td>{r.evaluator?.full_name}</td>
                  <td>{r.rating_period}, {r.school_year}</td>
                  <td>{r.overall_rating ?? '—'}</td>
                  <td>{r.overall_descriptor ?? '—'}</td>
                  <td><span className={`status-pill status-${r.status}`}>{r.status}</span></td>
                  <td>
                    {(r.status === 'approved' || r.status === 'released') && (
                      <Link className="btn btn-ghost" to={`/print/rpms/${r.id}`} target="_blank">Print</Link>
                    )}
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
