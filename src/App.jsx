import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import useAuthStore from './stores/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Cards = lazy(() => import('./pages/Cards'))
const CardNew = lazy(() => import('./pages/CardNew'))
const CardEdit = lazy(() => import('./pages/CardEdit'))
const Backgrounds = lazy(() => import('./pages/Backgrounds'))
const Festivals = lazy(() => import('./pages/Festivals'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error?.status >= 400 && error?.status < 500) return false
        return failureCount < 2
      },
    },
  },
})

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F3EF]">
      <div className="w-8 h-8 border-[3px] border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AppRoutes() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cards"
          element={
            <ProtectedRoute>
              <Layout><Cards /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cards/new"
          element={
            <ProtectedRoute>
              <Layout><CardNew /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cards/:id/edit"
          element={
            <ProtectedRoute>
              <Layout><CardEdit /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/backgrounds"
          element={
            <ProtectedRoute>
              <Layout><Backgrounds /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/festivals"
          element={
            <ProtectedRoute>
              <Layout><Festivals /></Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1A1612',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '14px',
                padding: '12px 16px',
              },
              success: {
                iconTheme: { primary: '#FF6B00', secondary: '#fff' },
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
