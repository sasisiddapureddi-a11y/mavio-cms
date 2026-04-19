import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Grid3x3, Plus, Image, Star } from 'lucide-react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Home', exact: true },
  { to: '/cards', icon: Grid3x3, label: 'Cards', exact: true },
  { to: '/cards/new', icon: Plus, label: 'New', isMain: true },
  { to: '/backgrounds', icon: Image, label: 'BGs' },
  { to: '/festivals', icon: Star, label: 'Festivals' },
]

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[#E8E2D9]">
      <div className="flex items-center h-16">
        {NAV.map(({ to, icon: Icon, label, exact, isMain }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors ${
                isMain ? 'pb-1' : isActive ? 'text-[#FF6B00]' : 'text-[#A89E93]'
              }`
            }
          >
            {({ isActive }) =>
              isMain ? (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
                >
                  <Plus size={24} />
                </div>
              ) : (
                <>
                  <Icon size={22} />
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
