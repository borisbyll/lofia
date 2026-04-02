import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout         from '@/components/layout/Layout'
import HomePage       from '@/pages/HomePage'
import VentePage      from '@/pages/VentePage'
import LocationPage   from '@/pages/LocationPage'
import BienDetailPage from '@/pages/BienDetailPage'
import LoginPage      from '@/pages/auth/LoginPage'
import RegisterPage   from '@/pages/auth/RegisterPage'
import NotFound       from '@/pages/NotFound'

import RequireAuth     from '@/components/layout/RequireAuth'
import RequireRole     from '@/components/layout/RequireRole'

import DashboardPage   from '@/pages/utilisateur/DashboardPage'
import MesBiensPage    from '@/pages/utilisateur/MesBiensPage'
import PublierBienPage from '@/pages/utilisateur/PublierBienPage'
import MessagesPage    from '@/pages/utilisateur/MessagesPage'
import FavorisPage     from '@/pages/utilisateur/FavorisPage'
import ProfilPage      from '@/pages/utilisateur/ProfilPage'

import ModerateurLayout from '@/pages/moderateur/ModerateurLayout'
import DashboardModPage from '@/pages/moderateur/DashboardModPage'
import ReviewBienPage   from '@/pages/moderateur/ReviewBienPage'

import AdminLayout        from '@/pages/admin/AdminLayout'
import DashboardAdminPage from '@/pages/admin/DashboardAdminPage'
import BienAdminPage      from '@/pages/admin/BienAdminPage'
import UsersPage          from '@/pages/admin/UsersPage'
import SignalementsPage   from '@/pages/admin/SignalementsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route element={<Layout />}>
          <Route index              element={<HomePage />} />
          <Route path="vente"       element={<VentePage />} />
          <Route path="location"    element={<LocationPage />} />
          <Route path="biens/:slug" element={<BienDetailPage />} />
          <Route path="connexion"   element={<LoginPage />} />
          <Route path="inscription" element={<RegisterPage />} />
        </Route>

        {/* ── Utilisateur ── */}
        <Route path="mon-espace" element={<RequireAuth />}>
          <Route index             element={<DashboardPage />} />
          <Route path="mes-biens"  element={<MesBiensPage />} />
          <Route path="publier"    element={<PublierBienPage />} />
          <Route path="messages"   element={<MessagesPage />} />
          <Route path="favoris"    element={<FavorisPage />} />
          <Route path="profil"     element={<ProfilPage />} />
        </Route>

        {/* ── Modérateur ── */}
        <Route path="moderateur" element={<RequireRole roles={['moderateur','admin']} />}>
          <Route element={<ModerateurLayout />}>
            <Route index            element={<DashboardModPage />} />
            <Route path="biens/:id" element={<ReviewBienPage />} />
          </Route>
        </Route>

        {/* ── Admin ── */}
        <Route path="admin" element={<RequireRole roles={['admin']} />}>
          <Route element={<AdminLayout />}>
            <Route index               element={<DashboardAdminPage />} />
            <Route path="biens"        element={<BienAdminPage />} />
            <Route path="utilisateurs" element={<UsersPage />} />
            <Route path="signalements" element={<SignalementsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
