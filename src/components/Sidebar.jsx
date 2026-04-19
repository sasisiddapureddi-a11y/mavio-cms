import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Grid3x3, Plus, Image, Star, LogOut } from 'lucide-react'
import useAuthStore from '../stores/authStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/cards', icon: Grid3x3, label: 'All Cards', exact: true },
  { to: '/cards/new', icon: Plus, label: 'New Card' },
  { to: '/backgrounds', icon: Image, label: 'Backgrounds' },
  { to: '/festivals', icon: Star, label: 'Festivals' },
]

export default function Sidebar() {
  const { cmsUser, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = cmsUser?.full_name
    ? cmsUser.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="hidden md:flex flex-col h-full w-60 bg-[#1A1612] text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          M
        </div>
        <div>
          <p className="font-semibold text-white text-sm leading-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Mavio CMS
          </p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Content Studio</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-[rgba(255,107,0,0.15)] text-[#FF6B00]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-[#FF6B00]' : 'text-white/40 group-hover:text-white/70'} />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{cmsUser?.full_name || 'User'}</p>
            <p className="text-[10px] text-white/40 capitalize">{cmsUser?.role || 'uploader'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
