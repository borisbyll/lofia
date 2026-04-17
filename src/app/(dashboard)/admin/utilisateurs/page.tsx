'use client'

import { useEffect, useState } from 'react'
import {
  Users, Search, Shield, UserX, UserCheck,
  ChevronDown, Loader2, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string
  nom: string
  role: string
  phone: string | null
  is_diaspora: boolean
  identite_verifiee: boolean
  avatar_url: string | null
  created_at: string
  biens_count?: number
}

const ROLES = ['utilisateur', 'moderateur', 'admin'] as const

export default function UsersPage() {
  const [users,    setUsers]    = useState<UserRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, nom, role, phone, is_diaspora, identite_verifiee, avatar_url, created_at')
      .order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  const updateRole = async (userId: string, newRole: string) => {
    setLoadingId(userId)
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) toast.error('Erreur')
    else {
      toast.success(`Rôle mis à jour : ${newRole}`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setLoadingId(null)
  }

  const verifierIdentite = async (userId: string) => {
    setLoadingId(userId)
    const { error } = await supabase.from('profiles').update({
      identite_verifiee: true,
      identite_verifiee_at: new Date().toISOString(),
    }).eq('id', userId)
    if (error) toast.error('Erreur')
    else {
      toast.success('Identité vérifiée')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, identite_verifiee: true } : u))

      // Notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'identite_verifiee',
        titre: 'Identité vérifiée ✅',
        corps: 'Votre identité a été vérifiée. Vous pouvez maintenant publier des annonces vérifiées.',
        lien: '/mon-espace/profil',
      })
    }
    setLoadingId(null)
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.nom.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const roleCls: Record<string, string> = {
    admin:       'badge-danger',
    moderateur:  'badge-primary',
    utilisateur: 'badge',
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Utilisateurs</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} comptes enregistrés</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un utilisateur…"
            className="input-field pl-9 text-sm" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="input-field text-sm w-auto">
          <option value="all">Tous les rôles</option>
          <option value="utilisateur">Utilisateurs</option>
          <option value="moderateur">Modérateurs</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users size={36} className="mx-auto mb-2 opacity-20" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Utilisateur', 'Rôle', 'Identité', 'Inscription', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            : <span className="text-xs font-bold text-primary-600">{u.nom?.charAt(0) ?? '?'}</span>
                          }
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.nom}</p>
                          {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                          {u.is_diaspora && <span className="text-[10px] text-primary-500 font-medium">Diaspora</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative inline-block">
                        <select
                          value={u.role}
                          onChange={e => updateRole(u.id, e.target.value)}
                          disabled={loadingId === u.id}
                          className={cn(
                            'text-xs font-bold px-2 py-1 rounded-lg border-0 bg-transparent cursor-pointer',
                            'focus:outline-none focus:ring-2 focus:ring-primary-300',
                            'appearance-none pr-5',
                            roleCls[u.role] ?? 'badge'
                          )}>
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        {loadingId === u.id
                          ? <Loader2 size={10} className="absolute right-1 top-1/2 -translate-y-1/2 animate-spin" />
                          : <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.identite_verifiee ? (
                        <span className="badge badge-success text-xs flex items-center gap-1 w-fit">
                          <CheckCircle size={10} /> Vérifiée
                        </span>
                      ) : (
                        <button
                          onClick={() => verifierIdentite(u.id)}
                          disabled={loadingId === u.id}
                          className="text-xs text-primary-500 font-semibold hover:underline disabled:opacity-50">
                          {loadingId === u.id ? '…' : 'Vérifier'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${u.id}`} className="text-xs text-gray-400 hover:text-gray-600">
                        Voir profil
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
