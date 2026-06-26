import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      if (profile.role === 'teacher') {
        const { count: evalCount } = await supabase
          .from('rpms_evaluations')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', profile.id)
        const { count: pmcfCount } = await supabase
          .from('pmcf_records')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', profile.id)
        setStats({ evalCount: evalCount || 0, pmcfCount: pmcfCount || 0 })
      } else {
        const { count: teacherCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'teacher')
        const { count: pendingCount } = await supabase
          .from('rpms_evaluations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'submitted')
        const { count: pmcfOpen } = await supabase
          .from('pmcf_records')
          .select('*', { count: 'exact', head: true })
          .in('status', ['draft', 'submitted'])
        setStats({ teacherCount: teacherCount || 0, pendingCount: pendingCount || 0, pmcfOpen: pmcfOpen || 0 })
      }
    }
    load()
  }, [profile])

  return (
    <div>
      <div className="page-header">
        <div className="eyebrow">Overview</div>
        <h2>Good day, {profile.full_name.split(' ')[0]}</h2>
        <p>
          {profile.role === 'teacher'
            ? 'A snapshot of your evaluation history and coaching sessions.'
            : 'School-wide snapshot of RPMS-PPST evaluations and PMCF coaching activity.'}
        </p>
      </div>

      {!stats ? (
        <p className="muted">Loading…</p>
      ) : profile.role === 'teacher' ? (
        <div className="card-grid">
          <div className="stat"><div className="label">Evaluations on record</div><div className="value">{stats.evalCount}</div></div>
          <div className="stat"><div className="label">Coaching sessions (PMCF)</div><div className="value">{stats.pmcfCount}</div></div>
        </div>
      ) : (
        <div className="card-grid">
          <div className="stat"><div className="label">Teachers on roster</div><div className="value">{stats.teacherCount}</div></div>
          <div className="stat"><div className="label">Evaluations awaiting approval</div><div className="value">{stats.pendingCount}</div></div>
          <div className="stat"><div className="label">Open coaching plans</div><div className="value">{stats.pmcfOpen}</div></div>
        </div>
      )}

      <div className="card">
        <div className="section-title">About this workspace</div>
        <p className="muted">
          This app follows the DepEd RPMS-PPST framework for classroom observation and rating, plus the
          Performance Monitoring and Coaching Form (PMCF) for documenting coaching support between
          observation cycles. Evaluation results are shared with teachers only after a master teacher or
          admin approves and releases them.
        </p>
      </div>
    </div>
  )
}
