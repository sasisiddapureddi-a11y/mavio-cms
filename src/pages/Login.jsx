import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import useAuthStore from '../stores/authStore'

export default function Login() {
  const { user, signIn, loading, dbError } = useAuthStore()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true })
    }
  }, [user, loading, navigate])

  const onSubmit = async ({ email, password }) => {
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Sign in failed. Please check your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #1A1612 0%, #2D2018 100%)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-2xl border border-white/10"
        style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}
      >
        {/* DB error banner */}
        {dbError && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs leading-relaxed">
            ⚠️ {dbError}
          </div>
        )}

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
          >
            M
          </div>
          <div className="text-center">
            <h1
              className="text-2xl font-semibold text-white"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Mavio CMS
            </h1>
            <p className="text-white/40 text-sm mt-0.5">Sign in to your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
              })}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 transition-all text-sm"
              placeholder="you@mavio.app"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 transition-all text-sm"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="text-center text-white/20 text-xs mt-6">
          Access restricted to authorized CMS users only
        </p>
      </div>
    </div>
  )
}
