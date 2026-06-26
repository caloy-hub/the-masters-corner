import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { IconGrid, IconClipboard, IconCompass, IconCheckCircle, IconChart, IconUserStar, IconUsers, IconCalendar } from './icons.jsx'

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconGrid, roles: ['admin', 'master_teacher', 'teacher'] },
  { to: '/schedule', label: 'Schedule', icon: IconCalendar, roles: ['admin', 'master_teacher', 'teacher'] },
  { to: '/rpms', label: 'RPMS-PPST Form', icon: IconClipboard, roles: ['admin', 'master_teacher'] },
  { to: '/pmcf', label: 'Coaching (PMCF)', icon: IconCompass, roles: ['admin', 'master_teacher'] },
  { to: '/approvals', label: 'Approvals', icon: IconCheckCircle, roles: ['admin', 'master_teacher'] },
  { to: '/reports', label: 'Reports', icon: IconChart, roles: ['admin', 'master_teacher'] },
  { to: '/my-results', label: 'My Results', icon: IconUserStar, roles: ['teacher'] },
  { to: '/users', label: 'Manage Users', icon: IconUsers, roles: ['admin'] },
]

const ROLE_LABEL = { admin: 'Admin', master_teacher: 'Master Teacher', teacher: 'Teacher' }

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const role = profile?.role || 'teacher'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="seal">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1b1f3b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5V5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13" />
              <path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H20" />
              <path d="M8 8h8M8 11.5h5" />
            </svg>
          </div>
          <h1>The Master's Corner</h1>
          <div className="tag">Coaching &amp; RPMS-PPST</div>
        </div>
        <nav>
          {NAV.filter((item) => item.roles.includes(role)).map((item) => (
            <NavLink key={item.to} to={item.to} end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <item.icon /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="footer">
          <div className="who">{profile?.full_name || 'Loading…'}</div>
          <span className="role-badge">{ROLE_LABEL[role]}</span>
          <div>
            <button className="signout" onClick={async () => { await signOut(); navigate('/login') }}>Sign out</button>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}

