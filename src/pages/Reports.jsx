import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

function formatTimestamp(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function Reports() {
  const [rows, setRows] = useState([])
  const [pmcf, setPmcf] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('active') // 'active' | 'archived'

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('rpms_evaluations')
      .select('*, teacher:teacher_id(full_name), evaluator:evaluator_id(full_name)')
      .order('created_at', { ascending: false })
    const { data: p } = await supabase
      .from('pmcf_records')
      .select('*, teacher:teacher_id(full_name), master_teacher:master_teacher_id(full_name)')
      .order('created_at', { ascending: false })
    setRows(data || [])
    setPmcf(p || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function setArchived(table, id, archived) {
    await supabase.from(table).update({ archived }).eq('id', id)
    load()
  }

  async function remove(table, id) {
    if (!confirm('Delete this report permanently? This cannot be undone.')) return
    await supabase.from(table).delete().eq('id', id)
    load()
  }

  const visibleRows = rows.filter((r) => (view === 'archived' ? r.archived : !r.archived))
  const visiblePmcf = pmcf.filter((p) => (view === 'archived' ? p.archived : !p.archived))

  const approvedRows = rows.filter((r) => r.status !== 'draft' && !r.archived)
  const avgAll = approvedRows.length
    ? (approvedRows.reduce((s, r) => s + (r.overall_rating || 0), 0) / approvedRows.length).toFixed(2)
    : '—'

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Insights</div>
        <h2>Evaluation Reports</h2>
        <p>School-wide view of every RPMS-PPST evaluation and PMCF coaching record, by status, rating, and timestamp.</p>
      </div>

      <div className="card-grid" style={{ marginBottom: 20 }}>
        <div className="stat"><div className="label">Active evaluations</div><div className="value">{rows.filter((r) => !r.archived).length}</div></div>
        <div className="stat"><div className="label">Average rating</div><div className="value">{avgAll}</div></div>
        <div className="stat"><div className="label">Pending approval</div><div className="value">{rows.filter((r) => r.status === 'submitted' && !r.archived).length}</div></div>
        <div className="stat"><div className="label">Archived</div><div className="value">{rows.filter((r) => r.archived).length + pmcf.filter((p) => p.archived).length}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={view === 'active' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setView('active')}>Active</button>
        <button className={view === 'archived' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setView('archived')}>Archived</button>
      </div>

      <div className="card">
        <div className="section-title">RPMS-PPST Evaluations ({visibleRows.length})</div>
        {loading ? <p className="muted">Loading…</p> : visibleRows.length === 0 ? (
          <p className="empty-state">{view === 'archived' ? 'Nothing archived yet.' : 'No evaluations recorded yet.'}</p>
        ) : (
          <table>
            <thead><tr><th>Teacher</th><th>Evaluator</th><th>Period</th><th>Rating</th><th>Descriptor</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id}>
                  <td>{r.teacher?.full_name}</td>
                  <td>{r.evaluator?.full_name}</td>
                  <td>{r.rating_period}, {r.school_year}</td>
                  <td>{r.overall_rating ?? '—'}</td>
                  <td>{r.overall_descriptor ?? '—'}</td>
                  <td><span className={`status-pill status-${r.status}`}>{r.status}</span></td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{formatTimestamp(r.submitted_at || r.created_at)}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(r.status === 'approved' || r.status === 'released') && (
                      <Link className="btn btn-ghost" to={`/print/rpms/${r.id}`} target="_blank">Print</Link>
                    )}
                    <button className="btn btn-ghost" onClick={() => setArchived('rpms_evaluations', r.id, !r.archived)}>
                      {r.archived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => remove('rpms_evaluations', r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="section-title">PMCF Coaching Records ({visiblePmcf.length})</div>
        {loading ? <p className="muted">Loading…</p> : visiblePmcf.length === 0 ? (
          <p className="empty-state">{view === 'archived' ? 'Nothing archived yet.' : 'No coaching records yet.'}</p>
        ) : (
          <table>
            <thead><tr><th>Teacher</th><th>Master teacher</th><th>Focus area</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
            <tbody>
              {visiblePmcf.map((p) => (
                <tr key={p.id}>
                  <td>{p.teacher?.full_name}</td>
                  <td>{p.master_teacher?.full_name}</td>
                  <td>{p.indicator_text}</td>
                  <td><span className={`status-pill status-${p.status}`}>{p.status}</span></td>
                  <td className="muted" style={{ fontSize: 12.5 }}>{formatTimestamp(p.submitted_at || p.created_at)}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {p.status === 'approved' && (
                      <Link className="btn btn-ghost" to={`/print/pmcf/${p.id}`} target="_blank">Print</Link>
                    )}
                    <button className="btn btn-ghost" onClick={() => setArchived('pmcf_records', p.id, !p.archived)}>
                      {p.archived ? 'Unarchive' : 'Archive'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => remove('pmcf_records', p.id)}>Delete</button>
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
