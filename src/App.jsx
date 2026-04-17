import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import useAuthStore from './stores/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Cards from './pages/Cards'
import CardNew from './pages/CardNew'
import CardEdit from './pages/CardEdit'
import Backgrounds from './pages/Backgrounds'
import Festivals from './pages/Festivals'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function AppRoutes() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cards"
        element={
          <ProtectedRoute>
            <Layout>
              <Cards />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cards/new"
        element={
          <ProtectedRoute>
            <Layout>
              <CardNew />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cards/:id/edit"
        element={
          <ProtectedRoute>
            <Layout>
              <CardEdit />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/backgrounds"
        element={
          <ProtectedRoute>
            <Layout>
              <Backgrounds />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/festivals"
        element={
          <ProtectedRoute>
            <Layout>
              <Festivals />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
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
  )
}
