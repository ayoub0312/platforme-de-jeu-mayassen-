'use client'

import { useState } from 'react'
import { trpc } from '@/utils/trpc'
import type { UserSession } from '@/lib/auth'
import { 
  Users, 
  Play, 
  Package, 
  ArrowUpRight, 
  Download, 
  Link, 
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Mail,
  PhoneCall,
  Trophy,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Check,
  X,
  ShieldAlert,
  Settings,
  ChevronRight,
  Globe,
  Sliders,
  UserCheck
} from 'lucide-react'

interface PartnerDashboardProps {
  partnerId: string
  initialSession: UserSession | null
}

type TabType = 'leads' | 'partners' | 'campaigns' | 'prizes' | 'users'

export function PartnerDashboard({ partnerId, initialSession }: PartnerDashboardProps) {
  const isAuthenticated = !!initialSession
  const isSuperAdmin = initialSession?.role === 'SUPERADMIN'

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginPending, setLoginPending] = useState(false)

  const loginMutation = trpc.loginAdmin.useMutation()

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginPending(true)

    try {
      const res = await loginMutation.mutateAsync({
        email: loginEmail,
        password: loginPassword,
      })

      // Set cookie
      document.cookie = `admin_session=${res.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`
      
      // Reload page to apply auth context
      window.location.reload()
    } catch (err: any) {
      setLoginError(err.message || 'Identifiants incorrects ou accès refusé.')
    } finally {
      setLoginPending(false)
    }
  }

  const handleLogout = () => {
    document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict'
    window.location.reload()
  }

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('leads')

  // Search States
  const [leadSearch, setLeadSearch] = useState('')
  const [partnerSearch, setPartnerSearch] = useState('')
  const [campaignSearch, setCampaignSearch] = useState('')
  const [prizeSearch, setPrizeSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')

  // 1. Fetch data from tRPC queries
  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = trpc.getPartnerStats.useQuery(
    { partnerId: partnerId || '' },
    { enabled: isAuthenticated && !!partnerId }
  )
  const { data: partners, refetch: refetchPartners, isLoading: partnersLoading } = trpc.getPartners.useQuery(
    undefined,
    { enabled: isAuthenticated && isSuperAdmin }
  )
  const { data: campaigns, refetch: refetchCampaigns, isLoading: campaignsLoading } = trpc.getAllCampaigns.useQuery(
    undefined,
    { enabled: isAuthenticated && isSuperAdmin }
  )
  const { data: prizes, refetch: refetchPrizes, isLoading: prizesLoading } = trpc.getAllPrizes.useQuery(
    undefined,
    { enabled: isAuthenticated && isSuperAdmin }
  )
  const { data: users, refetch: refetchUsers, isLoading: usersLoading } = trpc.getAllUsers.useQuery(
    undefined,
    { enabled: isAuthenticated && isSuperAdmin }
  )

  // 2. Mutations
  const createPartnerMut = trpc.createPartner.useMutation()
  const updatePartnerMut = trpc.updatePartner.useMutation()
  const deletePartnerMut = trpc.deletePartner.useMutation()

  const createCampaignMut = trpc.createCampaign.useMutation()
  const updateCampaignMut = trpc.updateCampaign.useMutation()
  const deleteCampaignMut = trpc.deleteCampaign.useMutation()
  const toggleCampaignActiveMut = trpc.toggleCampaignActive.useMutation()

  const createPrizeMut = trpc.createPrize.useMutation()
  const updatePrizeMut = trpc.updatePrize.useMutation()
  const deletePrizeMut = trpc.deletePrize.useMutation()

  const createUserMut = trpc.createUser.useMutation()
  const updateUserMut = trpc.updateUser.useMutation()
  const deleteUserMut = trpc.deleteUser.useMutation()

  // 3. Modal States
  const [partnerModal, setPartnerModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data: any | null }>({
    open: false,
    mode: 'create',
    data: null,
  })
  const [campaignModal, setCampaignModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data: any | null }>({
    open: false,
    mode: 'create',
    data: null,
  })
  const [prizeModal, setPrizeModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data: any | null }>({
    open: false,
    mode: 'create',
    data: null,
  })
  const [userModal, setUserModal] = useState<{ open: boolean; mode: 'create' | 'edit'; data: any | null }>({
    open: false,
    mode: 'create',
    data: null,
  })

  // 4. Modal Form Inputs
  const [partnerForm, setPartnerForm] = useState({ name: '', allowedDomains: '' })
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    partnerId: '',
    startDate: '',
    endDate: '',
    isActive: true,
    adBadge1: '',
    adTitle1: '',
    adDesc1: '',
    adBadge2: '',
    adTitle2: '',
    adDesc2: '',
    adBadge3: '',
    adTitle3: '',
    adDesc3: '',
    promoTitle: '',
    promoCode: '',
    promoDesc: '',
    promoUrl: '',
  })
  const [prizeForm, setPrizeForm] = useState({ campaignId: '', name: '', type: 'PHYSICAL', totalStock: 10, winProbability: 5, fallbackPrizeId: '', drawDate: '' })
  const [userForm, setUserForm] = useState({ email: '', name: '', phone: '', role: 'PLAYER', campaignIdForTokens: '', playTokensCount: 0 })

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)

  // Combined Loading States
  const isLoading = isAuthenticated && (
    (!!partnerId && statsLoading) || 
    (isSuperAdmin && (partnersLoading || campaignsLoading || prizesLoading || usersLoading))
  )

  // Render Login overlay if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-slate-200/85 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative background glows */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-400/20 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex flex-col items-center mb-8">
              <div className="p-4 bg-orange-500/10 rounded-2xl mb-4 border border-orange-500/15">
                <ShieldAlert className="h-8 w-8 text-[#FF8C00]" />
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center">
                Connexion Partenaire
              </h1>
              <p className="text-slate-400 text-xs mt-1 text-center font-medium">
                Saisissez vos identifiants pour accéder aux statistiques et à la console.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-655 uppercase mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@agency.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-655 uppercase mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                />
              </div>

              {loginError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-150 text-red-600 rounded-xl text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#FF8C00] hover:bg-[#E07B00] disabled:bg-orange-400 text-white rounded-xl text-sm font-black transition-all cursor-pointer shadow-md shadow-orange-500/10 active:scale-98"
              >
                {loginPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin text-[#FF8C00]" />
        <span className="text-sm font-semibold">Chargement du tableau de bord d'administration...</span>
      </div>
    )
  }

  // Refetch utility
  const refetchAll = () => {
    refetchStats()
    if (isSuperAdmin) {
      refetchPartners()
      refetchCampaigns()
      refetchPrizes()
      refetchUsers()
    }
  }

  // CSV Export for Leads
  const handleExportCSV = (activeCampaign: any) => {
    if (!activeCampaign) return
    try {
      const headers = ['Lead ID', 'Name', 'Email', 'Phone', 'Source', 'Registration Date', 'Prizes Won']
      const rows = activeCampaign.leads.map((lead: any) => [
        lead.id,
        lead.name || 'Anonymous',
        lead.email,
        lead.phone || 'N/A',
        lead.source,
        new Date(lead.createdAt).toISOString(),
        lead.prizesWon.join('; ') || 'None'
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((e: any) => e.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', url)
      linkElement.setAttribute('download', `${stats?.name.replace(/\s+/g, '_')}_leads_${activeCampaign.title.substring(0, 10)}.csv`)
      document.body.appendChild(linkElement)
      linkElement.click()
      document.body.removeChild(linkElement)
    } catch (err) {
      alert('Erreur lors de la génération du fichier CSV.')
    }
  }

  // Formatting date for datetime-local value
  const formatDateForInput = (d: any) => {
    if (!d) return ''
    const date = new Date(d)
    const tzoffset = date.getTimezoneOffset() * 60000
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16)
    return localISOTime
  }

  // Modal open handlers
  const openPartnerModal = (mode: 'create' | 'edit', data: any = null) => {
    setPartnerForm({
      name: data?.name || '',
      allowedDomains: data?.allowedDomains || '',
    })
    setPartnerModal({ open: true, mode, data })
  }

  const openCampaignModal = (mode: 'create' | 'edit', data: any = null) => {
    setCampaignForm({
      title: data?.title || '',
      partnerId: data?.partnerId || (partners && partners.length > 0 ? partners[0].id : ''),
      startDate: data ? formatDateForInput(data.startDate) : '',
      endDate: data ? formatDateForInput(data.endDate) : '',
      isActive: data ? data.isActive : true,
      adBadge1: data?.adBadge1 || '',
      adTitle1: data?.adTitle1 || '',
      adDesc1: data?.adDesc1 || '',
      adBadge2: data?.adBadge2 || '',
      adTitle2: data?.adTitle2 || '',
      adDesc2: data?.adDesc2 || '',
      adBadge3: data?.adBadge3 || '',
      adTitle3: data?.adTitle3 || '',
      adDesc3: data?.adDesc3 || '',
      promoTitle: data?.promoTitle || '',
      promoCode: data?.promoCode || '',
      promoDesc: data?.promoDesc || '',
      promoUrl: data?.promoUrl || '',
    })
    setCampaignModal({ open: true, mode, data })
  }

  const openPrizeModal = (mode: 'create' | 'edit', data: any = null) => {
    setPrizeForm({
      campaignId: data?.campaignId || (campaigns && campaigns.length > 0 ? campaigns[0].id : ''),
      name: data?.name || '',
      type: data?.type || 'PHYSICAL',
      totalStock: data ? data.totalStock : 10,
      winProbability: data ? Math.round(data.winProbability * 100) : 5,
      fallbackPrizeId: data?.fallbackPrizeId || '',
      drawDate: data?.drawDate ? formatDateForInput(data.drawDate) : '',
    })
    setPrizeModal({ open: true, mode, data })
  }

  const openUserModal = (mode: 'create' | 'edit', data: any = null) => {
    const campaignId = campaigns && campaigns.length > 0 ? campaigns[0].id : ''
    const currentUnused = data?.tokensByCampaign?.[campaignId]?.unused || 0
    setUserForm({
      email: data?.email || '',
      name: data?.name || '',
      phone: data?.phone || '',
      role: data?.role || 'PLAYER',
      campaignIdForTokens: campaignId,
      playTokensCount: currentUnused,
    })
    setUserModal({ open: true, mode, data })
  }

  // Deletion logic with checks
  const handleDeletePartner = async (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le partenaire "${name}" ? Ses leads associés seront définitivement supprimés et ses campagnes seront dissociées.`)) {
      try {
        await deletePartnerMut.mutateAsync({ id })
        refetchAll()
      } catch (err: any) {
        console.error(err)
        alert(err.message || "Une erreur est survenue lors de la suppression du partenaire.")
      }
    }
  }

  const handleDeleteCampaign = async (id: string, title: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la campagne "${title}" ? Tous les cadeaux, jetons de jeu, et leads correspondants seront supprimés.`)) {
      try {
        await deleteCampaignMut.mutateAsync({ id })
        refetchAll()
      } catch (err: any) {
        console.error(err)
        alert(err.message || "Une erreur est survenue lors de la suppression de la campagne.")
      }
    }
  }

  const handleDeletePrize = async (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le lot "${name}" ? Les historiques de gains associés seront également supprimés.`)) {
      try {
        await deletePrizeMut.mutateAsync({ id })
        refetchAll()
      } catch (err: any) {
        console.error(err)
        alert(err.message || "Une erreur est survenue lors de la suppression du lot.")
      }
    }
  }

  const handleDeleteUser = async (id: string, email: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${email}" ? Tous ses jetons de jeu, leads et gains de lots seront définitivement supprimés.`)) {
      try {
        await deleteUserMut.mutateAsync({ id })
        refetchAll()
      } catch (err: any) {
        console.error(err)
        alert(err.message || "Une erreur est survenue lors de la suppression de l'utilisateur.")
      }
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Admin Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <span className="text-[#FF8C00] font-black text-xs tracking-wider uppercase flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" /> {isSuperAdmin ? 'Administration Centrale' : 'Espace Partenaire'}
          </span>
          <h2 className="text-3xl font-black text-slate-800 mt-1">
            {isSuperAdmin ? "Console d'Administration" : "Statistiques & Activité"}
          </h2>
          <p className="text-slate-400 text-sm mt-1.5">
            {isSuperAdmin 
              ? 'Gérez globalement vos Partenaires, Campagnes, Cadeaux (Lots) et Utilisateurs tout en visualisant le suivi analytique.'
              : 'Visualisez les leads capturés et exportez vos statistiques de campagne.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
          <div className="flex flex-col items-end text-slate-500 text-xs font-semibold mr-1">
            <span className="text-slate-700">{initialSession?.email}</span>
            <span className="text-xxs text-[#FF8C00] uppercase font-bold">{initialSession?.role}</span>
          </div>
          <button 
            onClick={refetchAll}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md text-sm font-bold active:scale-95"
          >
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200/80 text-red-650 hover:text-red-700 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md text-sm font-bold active:scale-95"
          >
            Se déconnecter
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap gap-2 mt-8 border-b border-slate-100 pb-4">
        {[
          { id: 'leads', label: '📊 Leads & Stats', desc: 'Analytique & Exports' },
          ...(isSuperAdmin
            ? [
                { id: 'partners', label: '🤝 Partenaires', desc: 'Whitelists CORS & Noms' },
                { id: 'campaigns', label: '✈️ Campagnes', desc: 'Périodes & Statuts' },
                { id: 'prizes', label: '🎁 Cadeaux / Lots', desc: 'RNG Probabilités & Stocks' },
                { id: 'users', label: '👥 Utilisateurs', desc: 'Rôles & Crédits Lancers' }
              ]
            : [])
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as TabType)}
            className={`flex flex-col items-start px-5 py-3 rounded-2xl border text-left transition-all duration-350 cursor-pointer w-full sm:w-[220px] ${
              activeTab === t.id
                ? 'bg-white border-[#FF8C00] shadow-md shadow-orange-500/5 text-[#FF8C00]'
                : 'bg-white border-slate-100 text-slate-500 hover:border-slate-350 hover:bg-slate-50/50'
            }`}
          >
            <span className="text-sm font-black tracking-tight">{t.label}</span>
            <span className="text-[10px] text-slate-400 mt-0.5 font-medium">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT: LEADS & ANALYTICS */}
      {activeTab === 'leads' && (
        <div className="mt-8">
          {!stats || stats.campaigns.length === 0 ? (
            <div className="text-center py-16 border border-slate-100 rounded-3xl bg-white shadow-sm max-w-xl mx-auto">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800 mt-4">Aucune donnée analytique</h3>
              <p className="text-slate-400 text-sm mt-2">
                Le compte partenaire sélectionné ne possède aucune campagne active avec des statistiques associées.
              </p>
            </div>
          ) : (() => {
            const activeCampaignIdVal = selectedCampaignId || stats.campaigns[0].id
            const activeCampaign = stats.campaigns.find(c => c.id === activeCampaignIdVal)
            if (!activeCampaign) return null

            const filteredLeads = activeCampaign.leads.filter(lead => 
              lead.name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
              lead.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
              lead.source?.toLowerCase().includes(leadSearch.toLowerCase())
            )

            const conversionRate = activeCampaign.totalLeads > 0 
              ? Math.round((activeCampaign.totalSpinsUsed / activeCampaign.totalLeads) * 100) 
              : 0

            return (
              <>
                {/* Leads Whitelist Banner */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white border border-slate-100 p-6 rounded-2xl shadow-sm gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      Suivi Analytique : {stats.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm">
                      <Link className="h-4 w-4 text-[#FF8C00]" />
                      <span>Domaine dynamic CORS :</span>
                      <span className="text-slate-700 font-mono text-xs bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                        {stats.allowedDomains || '(Aucun domaine whitelisté)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    <label className="text-sm font-bold text-slate-500 shrink-0">Campagne :</label>
                    <select
                      value={activeCampaignIdVal}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] cursor-pointer shadow-sm w-full lg:w-auto"
                    >
                      {stats.campaigns.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Metrics boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Total Leads</span>
                      <Users className="h-5 w-5 text-[#FF8C00]" />
                    </div>
                    <div className="text-3xl font-black text-slate-850 mt-3">{activeCampaign.totalLeads}</div>
                    <p className="text-xs text-slate-400 mt-2">Contacts capturés sur cette campagne</p>
                  </div>

                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Lancers Joués</span>
                      <Play className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="text-3xl font-black text-slate-850 mt-3">{activeCampaign.totalSpinsUsed}</div>
                    <p className="text-xs text-slate-400 mt-2">Total de lancers de roulette effectués</p>
                  </div>

                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider font-sans">Engagement</span>
                      <ArrowUpRight className="h-5 w-5 text-[#FF8C00]" />
                    </div>
                    <div className="text-3xl font-black text-slate-850 mt-3">{conversionRate}%</div>
                    <p className="text-xs text-slate-400 mt-2">Leads ayant effectué au moins un lancer</p>
                  </div>

                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider">Statut</span>
                      <CheckCircle className={`h-5 w-5 ${activeCampaign.isActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                    </div>
                    <div className={`text-xl font-black mt-4 ${activeCampaign.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {activeCampaign.isActive ? 'ACTIVE & EN COURS' : 'PAUSÉE'}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">Intégration opérationnelle</p>
                  </div>
                </div>

                {/* Real-time Prize stocks */}
                <div className="mt-8 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-lg font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#FF8C00]" /> État Réel des Stocks
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {activeCampaign.prizes.map((prize: any) => {
                      const isLowStock = prize.totalStock !== -1 && prize.remainingStock <= 5 && prize.remainingStock > 0
                      const isOutOfStock = prize.totalStock !== -1 && prize.remainingStock === 0

                      return (
                        <div 
                          key={prize.id} 
                          className={`p-4 rounded-xl border flex flex-col justify-between ${
                            isOutOfStock 
                              ? 'bg-red-50 border-red-150 text-red-800'
                              : isLowStock
                                ? 'bg-amber-50 border-amber-150 text-amber-800'
                                : 'bg-slate-50 border-slate-150 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-extrabold text-slate-850 text-sm line-clamp-1">{prize.name}</div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">
                              Probabilité : {Math.round(prize.winProbability * 100)}% | Type : {prize.type}
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs font-medium">Stock restant :</span>
                            <span className="text-sm font-black">
                              {prize.totalStock === -1 ? (
                                <span className="text-emerald-600">Illimité</span>
                              ) : (
                                `${prize.remainingStock} / ${prize.totalStock}`
                              )}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Captured Leads List */}
                <div className="mt-8 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Leads Capturés</h3>
                      <p className="text-slate-400 text-xs mt-1">Visualisation et export des contacts de la campagne.</p>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Rechercher..."
                          value={leadSearch}
                          onChange={(e) => setLeadSearch(e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-700 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] w-52 sm:w-64"
                        />
                      </div>

                      <button
                        onClick={() => handleExportCSV(activeCampaign)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#FF8C00] hover:bg-[#e07b00] text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-orange-500/10 cursor-pointer"
                      >
                        <Download className="h-4 w-4" /> Exporter CSV
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {filteredLeads.length > 0 ? (
                      <table className="w-full text-left text-sm text-slate-500">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4 font-bold">Détails du Lead</th>
                            <th className="px-6 py-4 font-bold">Source</th>
                            <th className="px-6 py-4 font-bold">Cadeaux Remportés</th>
                            <th className="px-6 py-4 font-bold text-right">Date d'inscription</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredLeads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-extrabold text-slate-800">{lead.name || 'Anonymous'}</div>
                                <div className="flex items-center gap-4 text-xs mt-1 text-slate-400">
                                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>
                                  {lead.phone && (
                                    <span className="flex items-center gap-1"><PhoneCall className="h-3 w-3" /> {lead.phone}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 bg-orange-50 border border-orange-100 rounded-md text-[10px] font-bold text-[#FF8C00]">
                                  {lead.source}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-medium">
                                {lead.prizesWon.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {lead.prizesWon.map((p: string, i: number) => (
                                      <span key={i} className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold">
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Aucun lot gagné</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right text-xs text-slate-400">
                                {new Date(lead.createdAt).toLocaleDateString('fr-FR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        Aucun lead trouvé pour cette recherche.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* TAB CONTENT: PARTNERS CRUD */}
      {activeTab === 'partners' && (
        <div className="mt-8 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Gestion des Partenaires</h3>
              <p className="text-slate-450 text-xs mt-1">Créez et configurez les comptes B2B autorisés à intégrer les widgets.</p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un partenaire..."
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] w-52 sm:w-64"
                />
              </div>

              <button
                onClick={() => openPartnerModal('create')}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF8C00] hover:bg-[#e07b00] text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {partners && partners.length > 0 ? (() => {
              const filtered = partners.filter(p => p.name.toLowerCase().includes(partnerSearch.toLowerCase()))
              return (
                <table className="w-full text-left text-sm text-slate-500">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-bold">ID Partenaire</th>
                      <th className="px-6 py-4 font-bold">Nom complet</th>
                      <th className="px-6 py-4 font-bold">Domaines whitelistés (CORS)</th>
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">{p.id}</td>
                        <td className="px-6 py-4 font-extrabold text-slate-800">{p.name}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-slate-50 border border-slate-200 text-slate-600 px-2 py-1 rounded-md">
                            {p.allowedDomains || '* (Aucun domaine)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openPartnerModal('edit', p)}
                              className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-150 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePartner(p.id, p.name)}
                              className="p-2 text-red-500 hover:text-white hover:bg-red-500 bg-red-50 border border-red-100 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })() : (
              <div className="text-center py-12 text-slate-400">Aucun partenaire enregistré.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CAMPAIGNS CRUD */}
      {activeTab === 'campaigns' && (
        <div className="mt-8 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Gestion des Campagnes</h3>
              <p className="text-slate-450 text-xs mt-1">Associez des campagnes à vos partenaires et déterminez les périodes de validité.</p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher une campagne..."
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] w-52 sm:w-64"
                />
              </div>

              <button
                onClick={() => openCampaignModal('create')}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF8C00] hover:bg-[#e07b00] text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {campaigns && campaigns.length > 0 ? (() => {
              const filtered = campaigns.filter(c => c.title.toLowerCase().includes(campaignSearch.toLowerCase()))
              return (
                <table className="w-full text-left text-sm text-slate-500">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-bold">Campagne</th>
                      <th className="px-6 py-4 font-bold">Partenaire B2B</th>
                      <th className="px-6 py-4 font-bold">Début / Fin</th>
                      <th className="px-6 py-4 font-bold">Statut</th>
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-800">{c.title}</div>
                          <div className="text-xxs text-slate-400 font-mono mt-0.5">{c.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          {c.partner ? (
                            <span className="font-bold text-slate-700">{c.partner.name}</span>
                          ) : (
                            <span className="text-slate-400 italic font-medium">Aucun partenaire</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                          <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-[#FF8C00]" /> Du {new Date(c.startDate).toLocaleDateString('fr-FR')}</div>
                          <div className="text-slate-400 mt-1">Au {new Date(c.endDate).toLocaleDateString('fr-FR')}</div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={async () => {
                              try {
                                await toggleCampaignActiveMut.mutateAsync({
                                  id: c.id,
                                  isActive: !c.isActive
                                })
                                refetchAll()
                              } catch (err: any) {
                                alert(err.message || "Erreur lors du changement de statut.")
                              }
                            }}
                            disabled={toggleCampaignActiveMut.isPending}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide border transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 select-none ${
                              c.isActive 
                                ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white shadow-emerald-500/10' 
                                : 'bg-slate-800 hover:bg-slate-900 border-slate-900 text-white shadow-slate-800/10'
                            }`}
                            title={c.isActive ? "Désactiver le lancement" : "Activer le lancement"}
                          >
                            {toggleCampaignActiveMut.isPending && toggleCampaignActiveMut.variables?.id === c.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin text-white" />
                            ) : (
                              <span className={`h-1.5 w-1.5 rounded-full ${c.isActive ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
                            )}
                            {c.isActive ? 'LANCEMENT ACTIF' : 'LANCEMENT DÉSACTIVÉ'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openCampaignModal('edit', c)}
                              className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-150 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(c.id, c.title)}
                              className="p-2 text-red-500 hover:text-white hover:bg-red-500 bg-red-50 border border-red-100 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })() : (
              <div className="text-center py-12 text-slate-400">Aucune campagne configurée.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PRIZES CRUD */}
      {activeTab === 'prizes' && (
        <div className="mt-8 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Gestion des Lots</h3>
              <p className="text-slate-450 text-xs mt-1">Configurez les récompenses de la roulette, ajustez les probabilités de gain et le stock disponible.</p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un lot..."
                  value={prizeSearch}
                  onChange={(e) => setPrizeSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] w-52 sm:w-64"
                />
              </div>

              <button
                onClick={() => openPrizeModal('create')}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF8C00] hover:bg-[#e07b00] text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {prizes && prizes.length > 0 ? (() => {
              const filtered = prizes.filter(p => p.name.toLowerCase().includes(prizeSearch.toLowerCase()))
              return (
                <table className="w-full text-left text-sm text-slate-500">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-bold">Lot</th>
                      <th className="px-6 py-4 font-bold">Campagne</th>
                      <th className="px-6 py-4 font-bold">Type</th>
                      <th className="px-6 py-4 font-bold">Stock Restant / Initial</th>
                      <th className="px-6 py-4 font-bold">Probabilité RNG</th>
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(p => {
                      const isLowStock = p.totalStock !== -1 && p.remainingStock <= 5 && p.remainingStock > 0
                      const isOutOfStock = p.totalStock !== -1 && p.remainingStock === 0
                      const fallbackPrize = prizes.find(pr => pr.id === p.fallbackPrizeId)

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-extrabold text-slate-800">{p.name}</div>
                            {p.fallbackPrizeId && (
                              <div className="text-[10px] text-amber-600 mt-1 font-semibold flex items-center gap-0.5">
                                <RefreshCw className="h-2.5 w-2.5 animate-spin-slow" /> Consolation : {fallbackPrize?.name || p.fallbackPrizeId}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-600">{p.campaign.title}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              p.type === 'DIGITAL' 
                                ? 'bg-blue-50 border-blue-100 text-blue-600'
                                : 'bg-purple-50 border-purple-100 text-purple-600'
                            }`}>
                              {p.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {p.totalStock === -1 ? (
                              <span className="text-emerald-600 font-bold text-xs">Illimité (Fallback)</span>
                            ) : (
                              <span className={`font-mono text-xs font-bold ${
                                isOutOfStock 
                                  ? 'text-red-650'
                                  : isLowStock
                                    ? 'text-amber-650'
                                    : 'text-slate-700'
                              }`}>
                                {p.remainingStock} / {p.totalStock}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {p.drawDate ? (
                              <div className="flex flex-col">
                                <span className="bg-orange-50 text-[#FF8C00] border border-orange-100 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide inline-block w-max">
                                  Tirage (Kor3a)
                                </span>
                                <span className="text-[10px] text-slate-550 font-semibold mt-1">
                                  {new Date(p.drawDate).toLocaleString('fr-FR')}
                                </span>
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-slate-800">
                                {Math.round(p.winProbability * 100)}%
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openPrizeModal('edit', p)}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-150 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePrize(p.id, p.name)}
                                className="p-2 text-red-500 hover:text-white hover:bg-red-500 bg-red-50 border border-red-100 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })() : (
              <div className="text-center py-12 text-slate-400">Aucun lot configuré.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: USERS CRUD */}
      {activeTab === 'users' && (
        <div className="mt-8 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Membres & Joueurs</h3>
              <p className="text-slate-450 text-xs mt-1">Créez des utilisateurs, ajustez leurs rôles (Superadmin, Partenaire, Joueur) et attribuez manuellement des lancers.</p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un joueur..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] w-52 sm:w-64"
                />
              </div>

              <button
                onClick={() => openUserModal('create')}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF8C00] hover:bg-[#e07b00] text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {users && users.length > 0 ? (() => {
              const filtered = users.filter(u => 
                (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                (u.phone || '').toLowerCase().includes(userSearch.toLowerCase())
              )
              return (
                <table className="w-full text-left text-sm text-slate-500">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-bold">Membre</th>
                      <th className="px-6 py-4 font-bold">Rôle</th>
                      <th className="px-6 py-4 font-bold">Code Parrainage</th>
                      <th className="px-6 py-4 font-bold">Lancers par Campagne (Dispo)</th>
                      <th className="px-6 py-4 font-bold">Gains</th>
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-800">{u.name || 'Anonyme'}</div>
                          <div className="text-xs text-slate-400 mt-1 flex flex-col gap-1">
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</span>
                            {u.phone && <span className="flex items-center gap-1"><PhoneCall className="h-3 w-3" /> {u.phone}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            u.role === 'SUPERADMIN'
                              ? 'bg-red-50 border-red-100 text-red-650'
                              : u.role === 'PARTNER'
                                ? 'bg-amber-50 border-amber-100 text-amber-650'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}>
                            {u.role === 'SUPERADMIN'
                              ? 'SUPERADMIN'
                              : u.role === 'PARTNER'
                                ? 'PARTENAIRE'
                                : 'JOUEUR'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-655">
                          {u.referralCode}
                        </td>
                        <td className="px-6 py-4">
                          {Object.keys(u.tokensByCampaign).length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {Object.entries(u.tokensByCampaign).map(([campId, tokens]: [string, any]) => {
                                const camp = campaigns?.find(c => c.id === campId)
                                return (
                                  <div key={campId} className="text-xxs font-medium text-slate-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                    <span className="font-bold text-slate-850">{camp?.title || 'Campagne'} :</span>
                                    <span className="bg-orange-50 text-[#FF8C00] border border-orange-100 px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap shrink-0">
                                      {tokens.unused} lancers restants
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xxs">Aucun lancer disponible</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {u.wonPrizesCount > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {u.wonPrizes.map((wpName: string, idx: number) => (
                                <span key={idx} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-full text-[9px] font-bold inline-block">
                                  {wpName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xxs">0 gains</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openUserModal('edit', u)}
                              className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-150 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              className="p-2 text-red-500 hover:text-white hover:bg-red-500 bg-red-50 border border-red-100 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })() : (
              <div className="text-center py-12 text-slate-400">Aucun utilisateur enregistré.</div>
            )}
          </div>
        </div>
      )}

      {/* PARTNER MODAL */}
      {partnerModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setPartnerModal(p => ({ ...p, open: false }))}
              className="absolute right-5 top-5 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all border border-slate-200 text-slate-400 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
              <Globe className="h-5 w-5 text-[#FF8C00]" />
              {partnerModal.mode === 'create' ? 'Ajouter un Partenaire' : 'Modifier le Partenaire'}
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-6">
              Les paramètres CORS limitent les domaines d'appels autorisés pour capturer des leads.
            </p>

            <form 
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  if (partnerModal.mode === 'create') {
                    await createPartnerMut.mutateAsync(partnerForm)
                  } else {
                    await updatePartnerMut.mutateAsync({ id: partnerModal.data.id, ...partnerForm })
                  }
                  setPartnerModal(p => ({ ...p, open: false }))
                  refetchAll()
                } catch (err: any) {
                  console.error(err)
                  alert(err.message || "Une erreur est survenue lors de l'enregistrement du partenaire. Veuillez rafraîchir la page.")
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nom du Partenaire *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gourmet Bistro, Boulangerie Co."
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Domaines dynamic CORS whitelistés</label>
                <input
                  type="text"
                  placeholder="Ex: localhost:3000, gourmetbistro.com, secure.net"
                  value={partnerForm.allowedDomains}
                  onChange={(e) => setPartnerForm(p => ({ ...p, allowedDomains: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                />
                <span className="text-[10px] text-slate-400 mt-2 block leading-normal font-semibold">
                  Séparez plusieurs domaines par des virgules sans espaces. Laissez vide pour tout bloquer hors origine principale.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPartnerModal(p => ({ ...p, open: false }))}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-655 font-bold rounded-xl text-sm transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createPartnerMut.isPending || updatePartnerMut.isPending}
                  className="px-6 py-2.5 bg-[#FF8C00] hover:bg-[#e07b00] text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm shadow-orange-500/10"
                >
                  {createPartnerMut.isPending || updatePartnerMut.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMPAIGN MODAL */}
      {campaignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setCampaignModal(p => ({ ...p, open: false }))}
              className="absolute right-5 top-5 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all border border-slate-200 text-slate-400 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
              <Sliders className="h-5 w-5 text-[#FF8C00]" />
              {campaignModal.mode === 'create' ? 'Créer une Campagne' : 'Modifier la Campagne'}
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-6">
              Associez une période de validité, liez-la à un partenaire B2B et personnalisez les annonces de la bannière.
            </p>

            <form 
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  const data = {
                    ...campaignForm,
                    partnerId: (campaignForm.partnerId && campaignForm.partnerId.trim() !== '') ? campaignForm.partnerId : null,
                    startDate: new Date(campaignForm.startDate),
                    endDate: new Date(campaignForm.endDate),
                  }

                  if (campaignModal.mode === 'create') {
                    await createCampaignMut.mutateAsync(data)
                  } else {
                    await updateCampaignMut.mutateAsync({ id: campaignModal.data.id, ...data })
                  }
                  setCampaignModal(p => ({ ...p, open: false }))
                  refetchAll()
                } catch (err: any) {
                  console.error(err)
                  alert(err.message || "Une erreur est survenue lors de l'enregistrement de la campagne. Veuillez rafraîchir la page.")
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Titre de la Campagne *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Grand Jeu d'Été Boulangerie"
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Partenaire B2B Propriétaire</label>
                <select
                  value={campaignForm.partnerId}
                  onChange={(e) => setCampaignForm(p => ({ ...p, partnerId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-850 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] cursor-pointer"
                >
                  <option value="">Aucun - Campagne Système Générale</option>
                  {partners?.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Date de Début *</label>
                  <input
                    type="datetime-local"
                    required
                    value={campaignForm.startDate}
                    onChange={(e) => setCampaignForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Date de Fin *</label>
                  <input
                    type="datetime-local"
                    required
                    value={campaignForm.endDate}
                    onChange={(e) => setCampaignForm(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="campaignActive"
                  checked={campaignForm.isActive}
                  onChange={(e) => setCampaignForm(p => ({ ...p, isActive: e.target.checked }))}
                  className="h-5 w-5 rounded-md border-slate-300 text-[#FF8C00] focus:ring-[#FF8C00] cursor-pointer accent-orange-500"
                />
                <label htmlFor="campaignActive" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                  Campagne active et ouverte aux participations immédiates
                </label>
              </div>

              {/* 📢 HERO BANNER ADS SECTION */}
              <div className="border-t border-slate-100 pt-4 mt-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  📢 Annonces de la Bannière Hero (Optionnel)
                </h4>
                <p className="text-[10px] text-slate-400 mb-4 font-semibold">
                  Laissez ces champs vides pour utiliser la bannière Obooking / Seychelles / Tout est la par défaut.
                </p>

                {/* Slide 1 */}
                <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl mb-4 space-y-3">
                  <span className="text-[10px] font-black text-[#FF8C00] uppercase tracking-wider">Slide 1</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Badge</label>
                      <input
                        type="text"
                        placeholder="Ex: ✈️ Offre Spéciale"
                        value={campaignForm.adBadge1}
                        onChange={(e) => setCampaignForm(p => ({ ...p, adBadge1: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Titre</label>
                      <input
                        type="text"
                        placeholder="Ex: Seychelles avec -15%"
                        value={campaignForm.adTitle1}
                        onChange={(e) => setCampaignForm(p => ({ ...p, adTitle1: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Description</label>
                    <textarea
                      placeholder="Ex: Entrez le code promo SEYCH15 lors de votre réservation..."
                      value={campaignForm.adDesc1}
                      onChange={(e) => setCampaignForm(p => ({ ...p, adDesc1: e.target.value }))}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00] h-16 resize-none"
                    />
                  </div>
                </div>

                {/* Slide 2 */}
                <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl mb-4 space-y-3">
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-wider">Slide 2</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Badge</label>
                      <input
                        type="text"
                        placeholder="Ex: 🏝️ Grand tirage"
                        value={campaignForm.adBadge2}
                        onChange={(e) => setCampaignForm(p => ({ ...p, adBadge2: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Titre</label>
                      <input
                        type="text"
                        placeholder="Ex: Gagnez un séjour aux Maldives !"
                        value={campaignForm.adTitle2}
                        onChange={(e) => setCampaignForm(p => ({ ...p, adTitle2: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Description</label>
                    <textarea
                      placeholder="Ex: Le grand prix de la roulette Obooking est un séjour complet de 5 jours..."
                      value={campaignForm.adDesc2}
                      onChange={(e) => setCampaignForm(p => ({ ...p, adDesc2: e.target.value }))}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00] h-16 resize-none"
                    />
                  </div>
                </div>

                {/* Slide 3 */}
                <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl mb-4 space-y-3">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Slide 3</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Badge</label>
                      <input
                        type="text"
                        placeholder="Ex: 🛒 Partenaire"
                        value={campaignForm.adBadge3}
                        onChange={(e) => setCampaignForm(p => ({ ...p, adBadge3: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Titre</label>
                      <input
                        type="text"
                        placeholder="Ex: Faites vos achats et Gagnez !"
                        value={campaignForm.adTitle3}
                        onChange={(e) => setCampaignForm(p => ({ ...p, adTitle3: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Description</label>
                    <textarea
                      placeholder="Ex: Scannez votre ticket de caisse dans l'onglet des défis..."
                      value={campaignForm.adDesc3}
                      onChange={(e) => setCampaignForm(p => ({ ...p, adDesc3: e.target.value }))}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00] h-16 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* 🌴 PROMO FLASH SECTION */}
              <div className="border-t border-slate-100 pt-4 mt-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  🌴 Promo Flash de Côté (Optionnel)
                </h4>
                <p className="text-[10px] text-slate-400 mb-4 font-semibold">
                  Laissez ces champs vides pour utiliser la promo Seychelles Island Escape par défaut.
                </p>

                <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Titre de la Promo</label>
                      <input
                        type="text"
                        placeholder="Ex: Seychelles Island Escape"
                        value={campaignForm.promoTitle}
                        onChange={(e) => setCampaignForm(p => ({ ...p, promoTitle: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Code Promo</label>
                      <input
                        type="text"
                        placeholder="Ex: SEYCH15"
                        value={campaignForm.promoCode}
                        onChange={(e) => setCampaignForm(p => ({ ...p, promoCode: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">URL de Redirection</label>
                    <input
                      type="text"
                      placeholder="Ex: https://obooking.com"
                      value={campaignForm.promoUrl}
                      onChange={(e) => setCampaignForm(p => ({ ...p, promoUrl: e.target.value }))}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Description</label>
                    <textarea
                      placeholder="Ex: Voyagez à prix réduit vers les îles Seychelles avec le code promo exclusif d'Obooking..."
                      value={campaignForm.promoDesc}
                      onChange={(e) => setCampaignForm(p => ({ ...p, promoDesc: e.target.value }))}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00] h-16 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCampaignModal(p => ({ ...p, open: false }))}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-655 font-bold rounded-xl text-sm transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createCampaignMut.isPending || updateCampaignMut.isPending}
                  className="px-6 py-2.5 bg-[#FF8C00] hover:bg-[#e07b00] text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm shadow-orange-500/10"
                >
                  {createCampaignMut.isPending || updateCampaignMut.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRIZE MODAL */}
      {prizeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setPrizeModal(p => ({ ...p, open: false }))}
              className="absolute right-5 top-5 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all border border-slate-200 text-slate-400 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-[#FF8C00]" />
              {prizeModal.mode === 'create' ? 'Ajouter un Lot' : 'Modifier le Lot'}
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-6">
              Les probabilités de gain de l'ensemble des lots d'une même campagne doivent être cohérentes (RNG cumulatif).
            </p>

            <form 
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  const prizeData = {
                    campaignId: prizeForm.campaignId,
                    name: prizeForm.name,
                    type: prizeForm.type as 'PHYSICAL' | 'DIGITAL',
                    totalStock: Number(prizeForm.totalStock),
                    winProbability: prizeForm.drawDate ? 0 : Number(prizeForm.winProbability) / 100,
                    fallbackPrizeId: prizeForm.fallbackPrizeId || undefined,
                    drawDate: prizeForm.drawDate ? new Date(prizeForm.drawDate) : null,
                  }

                  if (prizeModal.mode === 'create') {
                    await createPrizeMut.mutateAsync(prizeData)
                  } else {
                    await updatePrizeMut.mutateAsync({ id: prizeModal.data.id, ...prizeData })
                  }
                  setPrizeModal(p => ({ ...p, open: false }))
                  refetchAll()
                } catch (err: any) {
                  console.error(err)
                  alert(err.message || "Une erreur est survenue lors de l'enregistrement du lot. Veuillez rafraîchir la page.")
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Campagne Cible *</label>
                <select
                  value={prizeForm.campaignId}
                  onChange={(e) => setPrizeForm(p => ({ ...p, campaignId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-850 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] cursor-pointer"
                >
                  {campaigns?.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Désignation du Lot *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: T-Shirt Vintage, 10% de réduction"
                  value={prizeForm.name}
                  onChange={(e) => setPrizeForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Type de Récompense *</label>
                  <select
                    value={prizeForm.type}
                    onChange={(e) => setPrizeForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-855 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] cursor-pointer"
                  >
                    <option value="PHYSICAL">Lot Physique (Stock limité)</option>
                    <option value="DIGITAL">Lot Digital (Code / Bon d'achat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Stock Initial (-1 = Illimité)</label>
                  <input
                    type="number"
                    required
                    value={prizeForm.totalStock}
                    onChange={(e) => setPrizeForm(p => ({ ...p, totalStock: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Probabilité de gain (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    value={prizeForm.winProbability}
                    onChange={(e) => setPrizeForm(p => ({ ...p, winProbability: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Consolation (Si rupture stock)</label>
                  <select
                    value={prizeForm.fallbackPrizeId}
                    onChange={(e) => setPrizeForm(p => ({ ...p, fallbackPrizeId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-855 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] cursor-pointer"
                  >
                    <option value="">Aucun fallback (Lot de consolation par défaut)</option>
                    {prizes
                      ?.filter(pr => pr.campaignId === prizeForm.campaignId && pr.id !== prizeModal.data?.id)
                      .map(pr => (
                        <option key={pr.id} value={pr.id}>{pr.name} (Stock: {pr.totalStock === -1 ? 'Illimité' : pr.remainingStock})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Date du Tirage au Sort (Optionnel - Pour jeu Kor3a)
                </label>
                <input
                  type="datetime-local"
                  value={prizeForm.drawDate}
                  onChange={(e) => setPrizeForm(p => ({ ...p, drawDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                  Si définie, ce lot est attribué par tirage au sort (Kor3a) à la date indiquée et n'apparaîtra pas sur la roulette. La probabilité de gain sera ignorée.
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPrizeModal(p => ({ ...p, open: false }))}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-655 font-bold rounded-xl text-sm transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createPrizeMut.isPending || updatePrizeMut.isPending}
                  className="px-6 py-2.5 bg-[#FF8C00] hover:bg-[#e07b00] text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm shadow-orange-500/10"
                >
                  {createPrizeMut.isPending || updatePrizeMut.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER MODAL */}
      {userModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setUserModal(p => ({ ...p, open: false }))}
              className="absolute right-5 top-5 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all border border-slate-200 text-slate-400 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
              <UserCheck className="h-5 w-5 text-[#FF8C00]" />
              {userModal.mode === 'create' ? 'Créer un Utilisateur' : 'Modifier le Profil & Crédits'}
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-6">
              Ajustez les privilèges d'accès ou modifiez directement les soldes de lancers (PlayTokens).
            </p>

            <form 
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  if (userModal.mode === 'create') {
                    await createUserMut.mutateAsync({
                      email: userForm.email,
                      name: userForm.name || undefined,
                      phone: userForm.phone || undefined,
                      role: userForm.role as 'SUPERADMIN' | 'PARTNER' | 'PLAYER',
                    })
                  } else {
                    await updateUserMut.mutateAsync({
                      id: userModal.data.id,
                      email: userForm.email,
                      name: userForm.name || undefined,
                      phone: userForm.phone || undefined,
                      role: userForm.role as 'SUPERADMIN' | 'PARTNER' | 'PLAYER',
                      playTokensCount: Number(userForm.playTokensCount),
                      campaignIdForTokens: userForm.campaignIdForTokens || undefined,
                    })
                  }
                  setUserModal(p => ({ ...p, open: false }))
                  refetchAll()
                } catch (err: any) {
                  console.error(err)
                  alert(err.message || "Une erreur est survenue lors de l'enregistrement de l'utilisateur. Veuillez rafraîchir la page.")
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Nom / Prénom</label>
                <input
                  type="text"
                  placeholder="Ex: Jean Dupont"
                  value={userForm.name}
                  onChange={(e) => setUserForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Adresse E-mail *</label>
                  <input
                    type="email"
                    required
                    placeholder="Ex: jean.dupont@gmail.com"
                    value={userForm.email}
                    onChange={(e) => setUserForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Téléphone</label>
                  <input
                    type="tel"
                    placeholder="Ex: +33 6 12 34 56 78"
                    value={userForm.phone}
                    onChange={(e) => setUserForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Niveau d'Accès Rôle *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-855 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8C00] cursor-pointer"
                  >
                    <option value="PLAYER">PLAYER (Joueur de roulette)</option>
                    <option value="PARTNER">PARTNER (Accès aux analytiques de sa marque)</option>
                    <option value="SUPERADMIN">SUPERADMIN (Accès total)</option>
                  </select>
                </div>
              </div>

              {/* Spin Credit Granting Section */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3 mt-4">
                <h4 className="text-xs font-bold text-[#FF8C00] uppercase tracking-wide flex items-center gap-1.5">
                  <Play className="h-4 w-4 fill-orange-500" /> Crédits de lancers (Lancers NON UTILISÉS)
                </h4>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Campagne Cible pour l'octroi</label>
                  <select
                    value={userForm.campaignIdForTokens}
                    onChange={(e) => {
                      const cId = e.target.value
                      const currentUnused = userModal.data?.tokensByCampaign?.[cId]?.unused || 0
                      setUserForm(p => ({ ...p, campaignIdForTokens: cId, playTokensCount: currentUnused }))
                    }}
                    className="w-full bg-white border border-slate-200 text-slate-855 px-3 h-10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00] cursor-pointer"
                  >
                    {campaigns?.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Solde cible de lancers non-utilisés</label>
                  <input
                    type="number"
                    min="0"
                    value={userForm.playTokensCount}
                    onChange={(e) => setUserForm(p => ({ ...p, playTokensCount: Number(e.target.value) }))}
                    className="w-full bg-white border border-slate-200 text-slate-900 px-3 h-10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C00] transition-all"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block font-semibold leading-normal">
                    La sauvegarde ajoutera ou supprimera des PlayTokens inutilisés pour correspondre exactement à cette valeur.
                  </span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModal(p => ({ ...p, open: false }))}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-655 font-bold rounded-xl text-sm transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createUserMut.isPending || updateUserMut.isPending}
                  className="px-6 py-2.5 bg-[#FF8C00] hover:bg-[#e07b00] text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm shadow-orange-500/10"
                >
                  {createUserMut.isPending || updateUserMut.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
