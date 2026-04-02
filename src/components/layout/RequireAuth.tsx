import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function RequireAuth() {
  const { user, loading } = useAuthStore()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1a3c5e] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  if (!user) return <Navigate to="/connexion" replace />

  return <Outlet />
}
