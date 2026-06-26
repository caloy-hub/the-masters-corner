import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Layout from './Layout.jsx'

export default function ProtectedRoute({ children, allow }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <div className="empty-state">Loading…</div>
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <div className="empty-state">Setting up your account… ask an admin to confirm your role if this persists.</div>
  if (allow && !allow.includes(profile.role)) return <Navigate to="/" replace />

  return <Layout>{children}</Layout>
}
