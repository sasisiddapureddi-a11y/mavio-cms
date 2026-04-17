import { Navigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#1A1612] gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
          style={{ background: 'linear-gradient(135deg, #FF6B00, #FFB800)' }}
        >
          M
        </div>
        <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
