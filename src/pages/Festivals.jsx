import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { useFestivals, useCreateFestival, useToggleFestival } from '../hooks/useFestivals'
import { useCategories } from '../hooks/useCategories'

function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const festDate = new Date(dateStr)
  festDate.setHours(0, 0, 0, 0)
  return Math.ceil((festDate - today) / (1000 * 60 * 60 * 24))
}

export default function Festivals() {
  const [showForm, setShowForm] = useState(false)
  const { data: festivals, isLoading, isError } = useFestivals()
  const { data: categories } = useCategories()
  const createFestival = useCreateFestival()
  const toggleFestival = useToggleFestival()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  const onSubmit = async (data) => {
    await createFestival.mutateAsync({
      name: data.name,
      telugu_name: data.telugu_name || '',
      festival_date: data.festival_date,
      is_recurring: data.is_recurring || false,
      category_id: data.category_id || null,
      is_active: true,
    })
    reset()
    setShowForm(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1612]" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Festivals
          </h1>
          <p className="text-sm text-[#6B6358]">{festivals?.length ?? 0} festivals</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          <Plus size={16} />
          Add Festival
        </button>
      </div>

      {isError && (
        <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          Failed to load festivals. Please refresh the page.
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5">
          <h2 className="font-semibold text-[#1A1612] mb-4">New Festival</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6B6358] mb-1 uppercase tracking-wider">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name', { required: 'Name is required' })}
                placeholder="Diwali"
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00]"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B6358] mb-1 uppercase tracking-wider">Telugu Name</label>
              <input
                {...register('telugu_name')}
                placeholder="దీపావళి"
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B6358] mb-1 uppercase tracking-wider">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('festival_date', { required: 'Date is required' })}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00]"
              />
              {errors.festival_date && <p className="text-red-500 text-xs mt-1">{errors.festival_date.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#6B6358] mb-1 uppercase tracking-wider">Category</label>
              <select
                {...register('category_id')}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm focus:outline-none focus:border-[#FF6B00] bg-white"
              >
                <option value="">No category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="recurring" {...register('is_recurring')} className="rounded" />
              <label htmlFor="recurring" className="text-sm text-[#6B6358]">Recurring (happens every year)</label>
            </div>

            <div className="col-span-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-[#E8E2D9] text-sm font-medium text-[#6B6358] hover:bg-[#F5F3EF]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createFestival.isPending}
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
              >
                {isSubmitting || createFestival.isPending ? 'Saving…' : 'Save Festival'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Festival grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-[#E8E2D9] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !festivals?.length ? (
        <div className="py-16 text-center bg-white border border-[#E8E2D9] rounded-2xl">
          <div className="text-4xl mb-3">🎊</div>
          <p className="font-medium text-[#1A1612]">No festivals yet</p>
          <p className="text-sm text-[#A89E93] mt-1">Add your first festival to start tracking</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {festivals.map((festival) => {
            const days = daysUntil(festival.festival_date)
            const isUpcoming = days >= 0 && days <= 60
            return (
              <div
                key={festival.id}
                className="bg-white border border-[#E8E2D9] rounded-2xl p-5 space-y-3 hover:border-[#FF6B00]/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="text-2xl">{festival.category?.emoji || '🎉'}</div>
                  <div className="flex items-center gap-1.5">
                    {isUpcoming && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#FFF0E6] text-[#FF6B00]">
                        {days === 0 ? 'Today!' : `${days}d away`}
                      </span>
                    )}
                    <button
                      onClick={() => toggleFestival.mutate({ id: festival.id, is_active: !festival.is_active })}
                      className="text-[#A89E93] hover:text-[#1A1612] transition-colors"
                      title={festival.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {festival.is_active
                        ? <ToggleRight size={20} className="text-[#FF6B00]" />
                        : <ToggleLeft size={20} />
                      }
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-[#1A1612]">{festival.name}</h3>
                  {festival.telugu_name && (
                    <p className="text-sm text-[#6B6358]">{festival.telugu_name}</p>
                  )}
                </div>

                <p className="text-xs text-[#A89E93]">
                  {new Date(festival.festival_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {festival.is_recurring && ' · Recurring'}
                </p>

                <Link
                  to={`/cards/new?festival_id=${festival.id}&festival_name=${encodeURIComponent(festival.name)}`}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl border text-xs font-medium transition-all border-[#FF6B00]/30 text-[#FF6B00] hover:bg-[#FFF0E6]"
                >
                  <Plus size={13} />
                  Create Cards
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
