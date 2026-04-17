import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Edit2, Trash2, Eye, EyeOff } from 'lucide-react'
import { useCards, useDeleteCard, usePublishCard, useUnpublishCard } from '../hooks/useCards'
import { useCategories } from '../hooks/useCategories'
import { useLanguages } from '../hooks/useLanguages'
import { getCardThumbUrl } from '../lib/supabase'

const STATUS_TABS = ['all', 'published', 'draft', 'scheduled', 'rejected']

const STATUS_BADGE = {
  published: 'bg-[#DCFCE7] text-[#16A34A]',
  draft: 'bg-[#FEF9C3] text-[#CA8A04]',
  scheduled: 'bg-[#DBEAFE] text-[#2563EB]',
  rejected: 'bg-[#FEE2E2] text-[#DC2626]',
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-[#E8E2D9]">
          <div className="w-12 h-12 rounded-lg bg-[#E8E2D9]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#E8E2D9] rounded w-1/3" />
            <div className="h-3 bg-[#E8E2D9] rounded w-1/4" />
          </div>
          <div className="h-6 bg-[#E8E2D9] rounded-full w-20" />
        </div>
      ))}
    </div>
  )
}

export default function Cards() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: cards, isLoading } = useCards({
    status: statusFilter,
    category_id: categoryFilter || undefined,
    language_id: languageFilter || undefined,
  })
  const { data: categories } = useCategories()
  const { data: languages } = useLanguages()
  const deleteCard = useDeleteCard()
  const publishCard = usePublishCard()
  const unpublishCard = useUnpublishCard()

  const confirmDelete = (card) => setDeleteTarget(card)

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteCard.mutateAsync({ id: deleteTarget.id, imagePath: deleteTarget.image_url })
    setDeleteTarget(null)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1612]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            All Cards
          </h1>
          <p className="text-sm text-[#6B6358]">{cards?.length ?? 0} cards</p>
        </div>
        <Link
          to="/cards/new"
          className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          + New Card
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-[#F5F3EF] rounded-xl p-1">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? 'bg-white shadow-sm text-[#1A1612]'
                  : 'text-[#6B6358] hover:text-[#1A1612]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-[#E8E2D9] text-xs text-[#6B6358] bg-white focus:outline-none focus:border-[#FF6B00]"
        >
          <option value="">All Categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>

        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-[#E8E2D9] text-xs text-[#6B6358] bg-white focus:outline-none focus:border-[#FF6B00]"
        >
          <option value="">All Languages</option>
          {languages?.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl overflow-hidden">
        {isLoading ? (
          <Skeleton />
        ) : !cards?.length ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🖼️</div>
            <p className="font-medium text-[#1A1612]">No cards found</p>
            <p className="text-sm text-[#A89E93] mt-1">Try adjusting filters or create a new card</p>
            <Link
              to="/cards/new"
              className="inline-block mt-4 px-4 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
            >
              Create Card
            </Link>
          </div>
        ) : (
          <div>
            <div className="hidden lg:grid grid-cols-[56px_1fr_1fr_100px_80px_120px_100px] gap-4 px-5 py-2.5 bg-[#F5F3EF] border-b border-[#E8E2D9] text-xs font-medium text-[#6B6358] uppercase tracking-wider">
              <span />
              <span>Category / Lang</span>
              <span>Occasions / Tags</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Created</span>
              <span>Actions</span>
            </div>
            <div className="divide-y divide-[#E8E2D9]">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-[#F5F3EF]/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F5F3EF] shrink-0">
                    {card.image_url && (
                      <img src={getCardThumbUrl(card.image_url)} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1612]">
                      {card.category?.emoji} {card.category?.name}
                    </p>
                    <p className="text-xs text-[#6B6358]">{card.language?.name}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1">
                      {(card.occasions || []).slice(0, 2).map((o) => (
                        <span key={o} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F3EF] text-[#6B6358]">{o}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(card.tags || []).slice(0, 2).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFF0E6] text-[#FF6B00]">{t}</span>
                      ))}
                      {(card.tags || []).length > 2 && (
                        <span className="text-[10px] text-[#A89E93]">+{card.tags.length - 2}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-16 shrink-0">
                    <div className="h-1.5 rounded-full bg-[#E8E2D9] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${((card.priority || 5) / 10) * 100}%`,
                          background: 'linear-gradient(to right, #FF6B00, #FFB800)',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-[#A89E93] mt-0.5">{card.priority || 5}/10</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE[card.status] || 'bg-gray-100 text-gray-600'}`}>
                    {card.status}
                  </span>
                  <span className="text-xs text-[#A89E93] shrink-0">
                    {new Date(card.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      to={`/cards/${card.id}/edit`}
                      className="p-1.5 rounded-lg hover:bg-[#F5F3EF] text-[#6B6358] hover:text-[#1A1612] transition-all"
                      title="Edit"
                    >
                      <Edit2 size={15} />
                    </Link>
                    {card.status === 'published' ? (
                      <button
                        onClick={() => unpublishCard.mutate(card.id)}
                        className="p-1.5 rounded-lg hover:bg-yellow-50 text-[#6B6358] hover:text-yellow-600 transition-all"
                        title="Unpublish"
                      >
                        <EyeOff size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => publishCard.mutate(card.id)}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-[#6B6358] hover:text-green-600 transition-all"
                        title="Publish"
                      >
                        <Eye size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => confirmDelete(card)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#6B6358] hover:text-red-500 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-[#E8E2D9]">
            <h3 className="font-semibold text-[#1A1612] mb-2">Delete Card?</h3>
            <p className="text-sm text-[#6B6358] mb-5">
              This will permanently delete the card and its image. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-[#E8E2D9] text-sm font-medium text-[#6B6358] hover:bg-[#F5F3EF]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteCard.isPending}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60"
              >
                {deleteCard.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
