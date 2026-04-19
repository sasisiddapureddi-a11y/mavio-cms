import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Edit2, Trash2, Eye, EyeOff, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCards, useDeleteCard, usePublishCard, useUnpublishCard } from '../hooks/useCards'
import { useCategories } from '../hooks/useCategories'
import { useLanguages } from '../hooks/useLanguages'
import { getCardThumbUrl } from '../lib/supabase'

const PAGE_SIZE = 20
const STATUS_TABS = ['all', 'published', 'draft', 'scheduled', 'rejected']
const STATUS_BADGE = {
  published: 'bg-[#DCFCE7] text-[#16A34A]',
  draft: 'bg-[#FEF9C3] text-[#CA8A04]',
  scheduled: 'bg-[#DBEAFE] text-[#2563EB]',
  rejected: 'bg-[#FEE2E2] text-[#DC2626]',
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function Skeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#E8E2D9]">
          <div className="w-10 rounded-lg bg-[#E8E2D9]" style={{ aspectRatio: '9/16', height: 56 }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#E8E2D9] rounded w-1/3" />
            <div className="h-3 bg-[#E8E2D9] rounded w-1/4" />
          </div>
          <div className="h-6 bg-[#E8E2D9] rounded-full w-16" />
        </div>
      ))}
    </div>
  )
}

export default function Cards() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const debouncedSearch = useDebounce(searchInput, 300)

  // Reset page on filter change
  useEffect(() => { setPage(0) }, [statusFilter, categoryFilter, languageFilter, debouncedSearch])

  const { data: cards, isLoading } = useCards({
    status: statusFilter,
    category_id: categoryFilter || undefined,
    language_id: languageFilter || undefined,
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })
  const { data: categories } = useCategories()
  const { data: languages } = useLanguages()
  const deleteCard = useDeleteCard()
  const publishCard = usePublishCard()
  const unpublishCard = useUnpublishCard()

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteCard.mutateAsync({ id: deleteTarget.id, imagePath: deleteTarget.image_url })
    setDeleteTarget(null)
  }

  const hasMore = cards?.length === PAGE_SIZE

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1612]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            All Cards
          </h1>
          <p className="text-sm text-[#6B6358]">
            {cards?.length ?? 0} cards
            {page > 0 ? ` · page ${page + 1}` : ''}
          </p>
        </div>
        <Link
          to="/cards/new"
          className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold min-h-[48px] flex items-center"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          + New Card
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A89E93]" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by content text…"
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#E8E2D9] text-sm bg-white focus:outline-none focus:border-[#FF6B00] min-h-[48px]"
        />
        {searchInput && (
          <button
            onClick={() => setSearchInput('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A89E93] hover:text-[#1A1612]"
          >
            ×
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E8E2D9] rounded-2xl p-3 md:p-4 space-y-3">
        <div className="flex items-center gap-1 bg-[#F5F3EF] rounded-xl p-1 overflow-x-auto">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap min-h-[44px] ${
                statusFilter === s ? 'bg-white shadow-sm text-[#1A1612]' : 'text-[#6B6358]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E8E2D9] text-sm text-[#6B6358] bg-white focus:outline-none focus:border-[#FF6B00] min-h-[44px]"
          >
            <option value="">All Categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>

          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E8E2D9] text-sm text-[#6B6358] bg-white focus:outline-none focus:border-[#FF6B00] min-h-[44px]"
          >
            <option value="">All Languages</option>
            {languages?.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Card list */}
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
              className="inline-block mt-4 px-4 py-2.5 rounded-xl text-white text-sm font-semibold min-h-[48px]"
              style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
            >
              Create Card
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E2D9]">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F3EF]/50 transition-colors"
              >
                {/* Thumbnail — 9:16 ratio */}
                <div className="shrink-0 rounded-lg overflow-hidden bg-[#F5F3EF] border border-[#E8E2D9]"
                  style={{ width: 40, aspectRatio: '9/16' }}
                >
                  {card.image_url && (
                    <img
                      src={getCardThumbUrl(card.image_url)}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1612] truncate">
                    {card.category?.emoji} {card.category?.name}
                    {card.language?.name && <span className="text-[#A89E93] font-normal"> · {card.language.name}</span>}
                  </p>
                  {card.content_text ? (
                    <p className="text-xs text-[#6B6358] truncate mt-0.5">{card.content_text}</p>
                  ) : (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {(card.occasions || []).slice(0, 2).map((o) => (
                        <span key={o} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F3EF] text-[#6B6358]">{o}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[card.status] || 'bg-gray-100 text-gray-600'}`}>
                    {card.status}
                  </span>
                  <span className="text-xs text-[#A89E93] hidden md:block">
                    {new Date(card.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/cards/${card.id}/edit`}
                    className="p-2 rounded-lg hover:bg-[#F5F3EF] text-[#6B6358] hover:text-[#1A1612] transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Edit2 size={15} />
                  </Link>
                  {card.status === 'published' ? (
                    <button
                      onClick={() => unpublishCard.mutate(card.id)}
                      className="p-2 rounded-lg hover:bg-yellow-50 text-[#6B6358] hover:text-yellow-600 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <EyeOff size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => publishCard.mutate(card.id)}
                      className="p-2 rounded-lg hover:bg-green-50 text-[#6B6358] hover:text-green-600 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(card)}
                    className="p-2 rounded-lg hover:bg-red-50 text-[#6B6358] hover:text-red-500 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E8E2D9] text-sm font-medium text-[#6B6358] disabled:opacity-40 bg-white min-h-[48px]"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-[#A89E93]">Page {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E8E2D9] text-sm font-medium text-[#6B6358] disabled:opacity-40 bg-white min-h-[48px]"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Delete dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl md:rounded-2xl p-6 w-full md:max-w-sm shadow-xl">
            <h3 className="font-semibold text-[#1A1612] mb-2">Delete Card?</h3>
            <p className="text-sm text-[#6B6358] mb-5">
              This will permanently delete the card and its image. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm font-medium text-[#6B6358] min-h-[52px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteCard.isPending}
                className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60 min-h-[52px]"
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
