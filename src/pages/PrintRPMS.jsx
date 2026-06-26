import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function PrintRPMS() {
  const { id } = useParams()
  const { session, loading: authLoading } = useAuth()
  const [evaluation, setEvaluation] = useState(null)
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: evalRow, error } = await supabase
        .from('rpms_evaluations')
        .select('*, teacher:teacher_id(full_name, position, school), evaluator:evaluator_id(full_name, position), approver:approved_by(full_name, position)')
        .eq('id', id)
        .single()
      if (error || !evalRow) { setNotFound(true); setLoading(false); return }
      const { data: scoreRows } = await supabase
        .from('rpms_scores')
        .select('*, indicator:indicator_id(domain_no, objective_code, description)')
        .eq('evaluation_id', id)
      setEvaluation(evalRow)
      setScores((scoreRows || []).sort((a, b) => a.indicator.domain_no - b.indicator.domain_no))
      setLoading(false)
    }
    load()
  }, [id])

  if (!authLoading && !session) return <Navigate to="/login" replace />
  if (loading) return <div className="empty-state">Loading…</div>
  if (notFound) return <div className="empty-state">This record isn't available to you, or doesn't exist yet.</div>

  const e = evaluation
  const domainGroups = scores.reduce((acc, s) => {
    const key = s.indicator.domain_no
    acc[key] = acc[key] || []
    acc[key].push(s)
    return acc
  }, {})

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <button className="btn btn-primary" onClick={() => window.print()}>Print this result</button>
      </div>

      <div className="print-sheet">
        <div className="print-header">
          <div className="print-eyebrow">Republic of the Philippines · Department of Education</div>
          <h1>RPMS-PPST Classroom Observation &amp; Rating</h1>
          <div className="print-sub">{e.rating_period}, S.Y. {e.school_year}</div>
        </div>

        <div className="print-meta">
          <div><span>Teacher</span><strong>{e.teacher?.full_name}</strong></div>
          <div><span>Position</span><strong>{e.teacher?.position || '—'}</strong></div>
          <div><span>Rated by</span><strong>{e.evaluator?.full_name}</strong></div>
          <div><span>Status</span><strong style={{ textTransform: 'capitalize' }}>{e.status}</strong></div>
        </div>

        {Object.entries(domainGroups).map(([domainNo, rows]) => (
          <div key={domainNo} className="print-domain">
            <div className="print-domain-title">Domain {domainNo}</div>
            <table>
              <thead><tr><th style={{ width: '14%' }}>Indicator</th><th>Description</th><th style={{ width: '10%' }}>Rating</th><th style={{ width: '28%' }}>Evidence</th></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.indicator.objective_code}</td>
                    <td>{s.indicator.description}</td>
                    <td>{s.rating}</td>
                    <td>{s.evidence || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="print-overall">
          <span>Overall rating</span>
          <strong>{e.overall_rating} — {e.overall_descriptor}</strong>
        </div>

        {e.remarks && (
          <div className="print-domain">
            <div className="print-domain-title">Remarks</div>
            <p>{e.remarks}</p>
          </div>
        )}

        <div className="print-signatures">
          <div>
            <div className="sig-line" />
            <div className="sig-label">{e.teacher?.full_name}<br />Teacher</div>
          </div>
          <div>
            <div className="sig-line" />
            <div className="sig-label">{e.evaluator?.full_name}<br />Rated by</div>
          </div>
          <div>
            <div className="sig-line" />
            <div className="sig-label">{e.approver?.full_name || '—'}<br />Approved by</div>
          </div>
        </div>
      </div>
    </div>
  )
}
