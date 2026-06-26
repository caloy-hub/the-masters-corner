import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import RPMSForm from './pages/RPMSForm.jsx'
import PMCFForm from './pages/PMCFForm.jsx'
import Approvals from './pages/Approvals.jsx'
import Reports from './pages/Reports.jsx'
import MyResults from './pages/MyResults.jsx'
import Users from './pages/Users.jsx'
import Schedule from './pages/Schedule.jsx'
import PrintRPMS from './pages/PrintRPMS.jsx'
import PrintPMCF from './pages/PrintPMCF.jsx'

export default function App() {
  const { session, loading } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <div className="empty-state">Loading…</div> : session ? <Navigate to="/" replace /> : <Login />}
      />

      <Route path="/" element={<ProtectedRoute allow={['admin', 'master_teacher', 'teacher']}><Dashboard /></ProtectedRoute>} />

      <Route path="/rpms" element={<ProtectedRoute allow={['admin', 'master_teacher']}><RPMSForm /></ProtectedRoute>} />
      <Route path="/rpms/:id" element={<ProtectedRoute allow={['admin', 'master_teacher']}><RPMSForm /></ProtectedRoute>} />

      <Route path="/pmcf" element={<ProtectedRoute allow={['admin', 'master_teacher']}><PMCFForm /></ProtectedRoute>} />
      <Route path="/pmcf/:id" element={<ProtectedRoute allow={['admin', 'master_teacher']}><PMCFForm /></ProtectedRoute>} />

      <Route path="/approvals" element={<ProtectedRoute allow={['admin', 'master_teacher']}><Approvals /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute allow={['admin', 'master_teacher']}><Reports /></ProtectedRoute>} />

      <Route path="/schedule" element={<ProtectedRoute allow={['admin', 'master_teacher', 'teacher']}><Schedule /></ProtectedRoute>} />

      <Route path="/my-results" element={<ProtectedRoute allow={['teacher']}><MyResults /></ProtectedRoute>} />

      <Route path="/users" element={<ProtectedRoute allow={['admin']}><Users /></ProtectedRoute>} />

      {/* Print views render full-bleed, outside the sidebar shell */}
      <Route path="/print/rpms/:id" element={<PrintRPMS />} />
      <Route path="/print/pmcf/:id" element={<PrintPMCF />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

