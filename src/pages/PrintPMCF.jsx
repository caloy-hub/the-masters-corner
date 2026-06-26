import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function PrintPMCF() {
  const { id } = useParams()
  const { session, loading: authLoading } = useAuth()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('pmcf_records')
        .select('*, teacher:teacher_id(full_name, position), master_teacher:master_teacher_id(full_name, position), approver:approved_by(full_name, position), domain:domain_no(title)')
        .eq('id', id)
        .single()
      if (error || !data) { setNotFound(true); setLoading(false); return }
      setRecord(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (!authLoading && !session) return <Navigate to="/login" replace />
  if (loading) return <div className="empty-state">Loading…</div>
  if (notFound) return <div className="empty-state">This record isn't available to you, or doesn't exist yet.</div>

  const r = record

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <button className="btn btn-primary" onClick={() => window.print()}>Print this result</button>
      </div>

      <div className="print-sheet">
        <div className="print-header">
          <div className="print-eyebrow">Performance Monitoring &amp; Coaching Form</div>
          <h1>Coaching Session Record</h1>
          <div className="print-sub">{r.domain ? `Domain — ${r.domain.title}` : ''}</div>
        </div>

        <div className="print-meta">
          <div><span>Teacher</span><strong>{r.teacher?.full_name}</strong></div>
          <div><span>Position</span><strong>{r.teacher?.position || '—'}</strong></div>
          <div><span>Master teacher</span><strong>{r.master_teacher?.full_name}</strong></div>
          <div><span>Status</span><strong style={{ textTransform: 'capitalize' }}>{r.status}</strong></div>
        </div>

        <div className="print-domain">
          <div className="print-domain-title">Focus indicator</div>
          <p>{r.indicator_text}</p>
        </div>

        <div className="print-domain">
          <div className="print-domain-title">Observation / evidence</div>
          <p>{r.observation || '—'}</p>
        </div>

        <div className="print-two-col">
          <div>
            <div className="print-domain-title">Strengths noted</div>
            <p>{r.strengths || '—'}</p>
          </div>
          <div>
            <div className="print-domain-title">Areas for improvement</div>
            <p>{r.areas_for_improvement || '—'}</p>
          </div>
        </div>

        <div className="print-domain">
          <div className="print-domain-title">Coaching action plan</div>
          <p>{r.coaching_action_plan || '—'}</p>
        </div>

        <div className="print-meta">
          <div><span>Agreed follow-up date</span><strong>{r.agreed_timeline || '—'}</strong></div>
        </div>

        {r.follow_up_notes && (
          <div className="print-domain">
            <div className="print-domain-title">Follow-up notes</div>
            <p>{r.follow_up_notes}</p>
          </div>
        )}

        <div className="print-signatures">
          <div>
            <div className="sig-line" />
            <div className="sig-label">{r.teacher?.full_name}<br />Teacher</div>
          </div>
          <div>
            <div className="sig-line" />
            <div className="sig-label">{r.master_teacher?.full_name}<br />Master Teacher</div>
          </div>
          <div>
            <div className="sig-line" />
            <div className="sig-label">{r.approving_official_name || r.approver?.full_name || '—'}<br />{r.approving_official_title || 'Approved by'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
