import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase, getCardThumbUrl } from '../lib/supabase'
import { Plus, Image, Star, TrendingUp } from 'lucide-react'

const STATUS_BADGE = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  scheduled: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1A1612]">{value ?? '—'}</p>
        <p className="text-sm text-[#6B6358]">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_cards')
        .select('status')
      if (!data) return {}
      const counts = { published: 0, draft: 0, scheduled: 0, total: data.length }
      data.forEach((c) => {
        if (counts[c.status] !== undefined) counts[c.status]++
      })
      return counts
    },
  })

  const { data: upcomingFestival } = useQuery({
    queryKey: ['upcoming-festival'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data } = await supabase
        .from('festivals')
        .select('*')
        .eq('is_active', true)
        .gte('festival_date', today)
        .lte('festival_date', in30)
        .order('festival_date', { ascending: true })
        .limit(1)
        .maybeSingle()
      return data
    },
  })

  const { data: recentCards } = useQuery({
    queryKey: ['recent-cards'],
    queryFn: async () => {
      const { data } = await supabase
        .from('content_cards')
        .select('*, category:categories(name, emoji), language:languages(name)')
        .order('created_at', { ascending: false })
        .limit(10)
      return data || []
    },
  })

  const daysUntil = upcomingFestival
    ? Math.ceil((new Date(upcomingFestival.festival_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1A1612]" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Dashboard
        </h1>
        <p className="text-sm text-[#6B6358]">Welcome back — here's what's happening</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Published" value={stats?.published} color="bg-green-100 text-green-700" icon={TrendingUp} />
        <StatCard label="Drafts" value={stats?.draft} color="bg-yellow-100 text-yellow-700" icon={Star} />
        <StatCard label="Scheduled" value={stats?.scheduled} color="bg-blue-100 text-blue-700" icon={Image} />
        <StatCard label="Total Cards" value={stats?.total} color="bg-[#FFF0E6] text-[#FF6B00]" icon={Plus} />
      </div>

      {/* Festival banner */}
      {upcomingFestival && (
        <div
          className="rounded-2xl p-5 flex items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          <div>
            <p className="text-white font-semibold text-lg" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {upcomingFestival.name} is in {daysUntil} day{daysUntil !== 1 ? 's' : ''}!
            </p>
            <p className="text-white/80 text-sm">{upcomingFestival.telugu_name} — start creating content now</p>
          </div>
          <Link
            to={`/cards/new?festival_id=${upcomingFestival.id}&festival_name=${encodeURIComponent(upcomingFestival.name)}`}
            className="px-4 py-2 bg-white text-[#FF6B00] font-semibold text-sm rounded-xl shrink-0 hover:bg-white/90 transition-all"
          >
            Create Cards
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { to: '/cards/new', label: 'New Card', icon: Plus, color: 'text-[#FF6B00] bg-[#FFF0E6]' },
          { to: '/backgrounds', label: 'Backgrounds', icon: Image, color: 'text-blue-600 bg-blue-50' },
          { to: '/festivals', label: 'Festivals', icon: Star, color: 'text-yellow-600 bg-yellow-50' },
        ].map(({ to, label, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="bg-white border border-[#E8E2D9] rounded-2xl p-4 flex items-center gap-3 hover:border-[#FF6B00]/30 hover:shadow-sm transition-all"
          >
            <div className={`p-2.5 rounded-xl ${color}`}>
              <Icon size={18} />
            </div>
            <span className="font-medium text-sm text-[#1A1612]">{label}</span>
          </Link>
        ))}
      </div>

      {/* Recent cards */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8E2D9] flex items-center justify-between">
          <h2 className="font-semibold text-[#1A1612]">Recent Cards</h2>
          <Link to="/cards" className="text-sm text-[#FF6B00] hover:underline">View all</Link>
        </div>
        {!recentCards?.length ? (
          <div className="p-10 text-center text-[#A89E93]">No cards yet. Create your first card!</div>
        ) : (
          <div className="divide-y divide-[#E8E2D9]">
            {recentCards.map((card) => (
              <div key={card.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[#F5F3EF] transition-colors">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F5F3EF] shrink-0">
                  {card.image_url && (
                    <img
                      src={getCardThumbUrl(card.image_url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[#6B6358]">
                      {card.category?.emoji} {card.category?.name}
                    </span>
                    <span className="text-xs text-[#A89E93]">·</span>
                    <span className="text-xs text-[#6B6358]">{card.language?.name}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {(card.occasions || []).slice(0, 3).map((o) => (
                      <span key={o} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F3EF] text-[#6B6358]">{o}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-16 h-1.5 rounded-full bg-[#E8E2D9] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${((card.priority || 5) / 10) * 100}%`,
                        background: 'linear-gradient(to right, #FF6B00, #FFB800)',
                      }}
                    />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[card.status] || 'bg-gray-100 text-gray-600'}`}>
                    {card.status}
                  </span>
                  <span className="text-xs text-[#A89E93]">
                    {new Date(card.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
