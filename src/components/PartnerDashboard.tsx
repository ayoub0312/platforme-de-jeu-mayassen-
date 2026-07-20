'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { trpc } from '@/utils/trpc'
import type { UserSession } from '@/lib/auth'
import { CampaignGameConfigModal } from './campaign-config/CampaignGameConfigModal'
import { DrawManagementModal } from './campaign-config/DrawManagementModal'
import { AdminLayout, type AdminNavItem } from './admin/AdminLayout'
import { Dashboard } from './admin/Dashboard'
import { DataTable } from './admin/DataTable'
import { CampaignWizard } from './admin/campaign-wizard/CampaignWizard'
import { SortableBannerList } from './admin/SortableBannerList'
import { WinnersTab } from './admin/WinnersTab'
import { SettingsTab } from './admin/SettingsTab'
import { CampaignCard } from './admin/CampaignCard'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  Users,
  Play,
  Package,
  ArrowUpRight,
  ArrowLeft,
  Link as LinkIcon,
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
  Check,
  X,
  ShieldAlert,
  Settings,
  Globe,
  Sliders,
  UserCheck,
  BarChart3,
  Gift,
  ImageIcon,
  Upload,
  LayoutTemplate,
  Video,
  LayoutDashboard,
  Power,
  PowerOff,
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  Clock
} from 'lucide-react'

interface PartnerDashboardProps {
  partnerId: string
  initialSession: UserSession | null
  // Full partner list, used only to render the SUPERADMIN "switch account" control.
  allPartnersForSwitcher?: { id: string; name: string }[]
}

type TabType = 'dashboard' | 'leads' | 'partners' | 'campaigns' | 'prizes' | 'winners' | 'users' | 'receipts' | 'homepage' | 'settings'

// Schémas de validation FR — messages affichés sous chaque champ (voir Input.error).
const partnerFormSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.'),
  slug: z.string().trim().min(2, 'Le slug doit contenir au moins 2 caractères.')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Minuscules, chiffres et tirets uniquement (ex: mon-partenaire).'),
  email: z.string().trim().email('Adresse email invalide.'),
  allowedDomains: z.string(),
})

// Dérive un slug à partir d'un nom, au même format que côté serveur
// (generateUniquePartnerSlug) — juste une aide de saisie, l'unicité réelle
// est de toute façon vérifiée par la mutation.
const slugifyPartnerName = (name: string): string =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Pré-remplit le champ mot de passe à la création — juste une suggestion de
// départ, éditable, le super admin choisit toujours le mot de passe final.
const generateSuggestedPassword = (length = 16): string => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => charset[b % charset.length]).join('')
}

const userFormSchema = z.object({
  email: z.string().trim().email('Adresse email invalide.'),
  name: z.string(),
  phone: z.string(),
  role: z.enum(['SUPERADMIN', 'PARTNER', 'PLAYER']),
})

export function PartnerDashboard({ partnerId, initialSession, allPartnersForSwitcher }: PartnerDashboardProps) {
  const router = useRouter()
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
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  // Toast notifications — delegates to the global ToastProvider (src/components/ui/Toast.tsx)
  // mounted in layout.tsx. Kept as a thin `showToast(msg, type)` wrapper so every existing
  // call site below didn't need to change when the two toast systems were consolidated.
  const toast = useToast()
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'error') toast.error(msg)
    else toast.success(msg)
  }

  // Generic confirmation dialog (replaces native confirm()/window.confirm() for
  // destructive or irreversible actions across the whole admin console).
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    description: string
    confirmLabel?: string
    danger?: boolean
    onConfirm: () => void | Promise<void>
  } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const askConfirm = (params: { title: string; description: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void | Promise<void> }) => {
    setConfirmDialog(params)
  }

  const handleConfirmDialogConfirm = async () => {
    if (!confirmDialog) return
    setConfirmLoading(true)
    try {
      await confirmDialog.onConfirm()
    } finally {
      setConfirmLoading(false)
      setConfirmDialog(null)
    }
  }

  // Search States
  const [leadSearch, setLeadSearch] = useState('')
  const [partnerSearch, setPartnerSearch] = useState('')
  const [campaignSearch, setCampaignSearch] = useState('')
  const [prizeSearch, setPrizeSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')

  // Filter States
  const [campaignPartnerFilter, setCampaignPartnerFilter] = useState<string>('all')
  const [prizePartnerFilter, setPrizePartnerFilter] = useState<string>('all')
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // 1. Fetch data from tRPC queries
  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = trpc.getPartnerStats.useQuery(
    { partnerId: partnerId || '' },
    { enabled: isAuthenticated && !!partnerId }
  )
  const { data: partners, refetch: refetchPartners, isLoading: partnersLoading } = trpc.getPartners.useQuery(
    undefined,
    { enabled: isAuthenticated && isSuperAdmin }
  )
  const { data: pendingPartners, refetch: refetchPendingPartners, isLoading: pendingPartnersLoading } = trpc.getPendingPartners.useQuery(
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
  const { data: receiptSubmissions, refetch: refetchReceipts, isLoading: receiptsLoading } = trpc.getReceiptSubmissions.useQuery(
    { status: 'PENDING' },
    { enabled: isAuthenticated }
  )
  const { data: siteSettings, refetch: refetchSiteSettings, isLoading: siteSettingsLoading } = trpc.getSiteSettings.useQuery(
    undefined,
    { enabled: isAuthenticated && isSuperAdmin }
  )
  const { data: promoBanners, refetch: refetchPromoBanners, isLoading: promoBannersLoading } = trpc.getAllPromoBanners.useQuery(
    undefined,
    { enabled: isAuthenticated && isSuperAdmin }
  )

  // 2. Mutations
  const createPartnerMut = trpc.createPartner.useMutation()
  const updatePartnerMut = trpc.updatePartner.useMutation()
  const deletePartnerMut = trpc.deletePartner.useMutation()
  const togglePartnerActiveMut = trpc.togglePartnerActive.useMutation()
  const resetPartnerAccountPasswordMut = trpc.resetPartnerAccountPassword.useMutation()
  const approvePartnerMut = trpc.approvePartner.useMutation()
  const rejectPartnerMut = trpc.rejectPartner.useMutation()

  const createCampaignMut = trpc.createCampaign.useMutation()
  const updateCampaignMut = trpc.updateCampaign.useMutation()
  const deleteCampaignMut = trpc.deleteCampaign.useMutation()
  const toggleCampaignActiveMut = trpc.toggleCampaignActive.useMutation()
  const setCampaignGameModeMut = trpc.setCampaignGameMode.useMutation()
  const updateCampaignGameConfigMut = trpc.updateCampaignGameConfig.useMutation()
  const duplicateCampaignMut = trpc.duplicateCampaign.useMutation()

  const createPrizeMut = trpc.createPrize.useMutation()
  const updatePrizeMut = trpc.updatePrize.useMutation()
  const deletePrizeMut = trpc.deletePrize.useMutation()
  const runDrawMut = trpc.runDraw.useMutation()

  const createUserMut = trpc.createUser.useMutation()
  const updateUserMut = trpc.updateUser.useMutation()
  const deleteUserMut = trpc.deleteUser.useMutation()
  const expireStaleTokensMut = trpc.expireStaleTokens.useMutation()
  const reviewReceiptMut = trpc.reviewReceiptSubmission.useMutation()

  const updateSiteSettingsMut = trpc.updateSiteSettings.useMutation()
  const createPromoBannerMut = trpc.createPromoBanner.useMutation()
  const updatePromoBannerMut = trpc.updatePromoBanner.useMutation()
  const deletePromoBannerMut = trpc.deletePromoBanner.useMutation()
  const reorderPromoBannersMut = trpc.reorderPromoBanners.useMutation()

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
  const [participantsModal, setParticipantsModal] = useState<{ open: boolean; prizeName: string; list: any[] }>({
    open: false,
    prizeName: '',
    list: [],
  })
  const [gameConfigModal, setGameConfigModal] = useState<{ open: boolean; campaignId: string | null }>({
    open: false,
    campaignId: null,
  })
  const [drawManagementModal, setDrawManagementModal] = useState<{ open: boolean; campaignId: string | null }>({
    open: false,
    campaignId: null,
  })
  const [wizardOpen, setWizardOpen] = useState(false)

  // 4. Modal Form Inputs
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    slug: '',
    email: '',
    password: '',
    allowedDomains: '',
    logoUrl: '',
    primaryColor: '#FF6B47',
    secondaryColor: '#0EA5A0',
  })
  const [partnerFormErrors, setPartnerFormErrors] = useState<{ name?: string; slug?: string; email?: string; password?: string }>({})
  const [showPartnerPassword, setShowPartnerPassword] = useState(false)
  // Tant que le super admin n'a pas touché au slug lui-même, on le fait suivre
  // le nom automatiquement (uniquement en création — en édition le slug est figé).
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  // Résultat de creation/reset — mot de passe affiché une seule fois, jamais
  // stocké au-delà de cette modale (fermer la modale l'efface de l'état React).
  const [passwordRevealModal, setPasswordRevealModal] = useState<{ open: boolean; email: string; password: string; title: string }>({
    open: false,
    email: '',
    password: '',
    title: '',
  })
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    partnerId: '',
    startDate: '',
    endDate: '',
    isActive: true,
    gameMode: 'ROULETTE' as 'ROULETTE' | 'DRAW',
    imageData: '' as string | null,
    imageMimeType: '' as string | null,
    senderEmail: '',
    senderEmailPassword: '',
    hasSenderEmailPassword: false,
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
  const [prizeForm, setPrizeForm] = useState({ campaignId: '', name: '', type: 'PHYSICAL', totalStock: 10, winProbability: 5, fallbackPrizeId: '', drawDate: '', validityDays: 30 })
  const [userForm, setUserForm] = useState({ email: '', name: '', phone: '', role: 'PLAYER', campaignIdForTokens: '', playTokensCount: 0 })
  const [userFormErrors, setUserFormErrors] = useState<{ email?: string }>({})

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)

  // Homepage hero video form (site-wide singleton, synced from siteSettings query)
  const [heroForm, setHeroForm] = useState({
    heroVideoData: '',
    heroVideoMimeType: '',
  })

  useEffect(() => {
    if (siteSettings) {
      setHeroForm({
        heroVideoData: siteSettings.heroVideoData || '',
        heroVideoMimeType: siteSettings.heroVideoMimeType || '',
      })
    }
  }, [siteSettings])

  // Promo banners form (new banner to add)
  const [newBannerForm, setNewBannerForm] = useState({ imageData: '', imageMimeType: '' })
  const [bannerFormError, setBannerFormError] = useState<string | null>(null)

  // Combined Loading States
  const isLoading = isAuthenticated && (
    (!!partnerId && statsLoading) ||
    receiptsLoading ||
    (isSuperAdmin && (partnersLoading || campaignsLoading || prizesLoading || usersLoading || siteSettingsLoading || promoBannersLoading))
  )

  // Render Login overlay if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#FF6B47] transition-all mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
        </Link>
        <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-slate-200/85 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative background glows */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-400/20 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex flex-col items-center mb-8">
              <div className="p-4 bg-orange-500/10 rounded-2xl mb-4 border border-orange-500/15">
                <ShieldAlert className="h-8 w-8 text-[#FF6B47]" />
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
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                  Adresse email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@agency.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
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
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[#FF6B47] hover:bg-[#E85530] disabled:bg-orange-400 text-white rounded-xl text-sm font-black transition-all cursor-pointer shadow-md shadow-orange-500/10 active:scale-98"
              >
                {loginPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-450 font-semibold mt-6">
              Pas encore de compte ?{' '}
              <Link href="/partner/signup" className="text-[#FF6B47] hover:underline font-bold">
                Créer un espace partenaire
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin text-[#FF6B47]" />
        <span className="text-sm font-semibold">Chargement du tableau de bord d'administration...</span>
      </div>
    )
  }

  // Refetch utility
  const refetchAll = () => {
    refetchStats()
    refetchReceipts()
    if (isSuperAdmin) {
      refetchPartners()
      refetchPendingPartners()
      refetchCampaigns()
      refetchPrizes()
      refetchUsers()
      refetchSiteSettings()
      refetchPromoBanners()
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

  // Convert a selected campaign photo to base64 for storage in DB
  const handleCampaignImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Veuillez sélectionner un fichier image (JPEG, PNG, WEBP...).', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Le fichier dépasse la limite de 2 Mo.', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] || ''
      setCampaignForm(p => ({ ...p, imageData: base64, imageMimeType: file.type }))
    }
    reader.readAsDataURL(file)
  }

  const handleHeroVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      showToast('Veuillez sélectionner un fichier vidéo (MP4, WEBM...).', 'error')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast('La vidéo dépasse la limite de 20 Mo. Compressez-la avant de la réimporter.', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] || ''
      setHeroForm(p => ({ ...p, heroVideoData: base64, heroVideoMimeType: file.type }))
    }
    reader.readAsDataURL(file)
  }

  const handleSaveHero = async () => {
    try {
      await updateSiteSettingsMut.mutateAsync(heroForm)
      showToast('Hero de la page d\'accueil mis à jour avec succès.')
      refetchSiteSettings()
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la mise à jour du hero.", 'error')
    }
  }

  // "Retirer" saves immediately — otherwise the video stays live on the public
  // site until the admin remembers to also click "Sauvegarder le Hero".
  const handleRemoveHeroVideo = async () => {
    const cleared = { ...heroForm, heroVideoData: '', heroVideoMimeType: '' }
    setHeroForm(cleared)
    try {
      await updateSiteSettingsMut.mutateAsync(cleared)
      showToast('Vidéo retirée du site.')
      refetchSiteSettings()
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du retrait de la vidéo.', 'error')
    }
  }

  const handleNewBannerImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Veuillez sélectionner un fichier image (JPEG, PNG, WEBP...).', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Le fichier dépasse la limite de 2 Mo.', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] || ''
      setNewBannerForm(p => ({ ...p, imageData: base64, imageMimeType: file.type }))
    }
    reader.readAsDataURL(file)
  }

  const handleAddBanner = async () => {
    setBannerFormError(null)
    if (!newBannerForm.imageData) {
      setBannerFormError("Il manque l'image : cliquez sur \"Image\" pour en importer une.")
      return
    }
    try {
      await createPromoBannerMut.mutateAsync(newBannerForm)
      setNewBannerForm({ imageData: '', imageMimeType: '' })
      showToast('Bannière ajoutée avec succès.')
      refetchPromoBanners()
    } catch (err: any) {
      const message = err.message || "Erreur lors de l'ajout de la bannière."
      setBannerFormError(message)
      showToast(message, 'error')
    }
  }

  const handleToggleBannerActive = async (id: string, isActive: boolean) => {
    await updatePromoBannerMut.mutateAsync({ id, isActive: !isActive })
    refetchPromoBanners()
  }

  const handleReorderBanners = async (orderedIds: string[]) => {
    await reorderPromoBannersMut.mutateAsync({ orderedIds })
    refetchPromoBanners()
  }

  const handleDeleteBanner = (id: string) => {
    askConfirm({
      title: 'Supprimer cette bannière ?',
      description: 'Cette bannière sera définitivement supprimée du carrousel de la page d\'accueil.',
      onConfirm: async () => {
        await deletePromoBannerMut.mutateAsync({ id })
        showToast('Bannière supprimée.')
        refetchPromoBanners()
      },
    })
  }

  // Modal open handlers
  const openPartnerModal = (mode: 'create' | 'edit', data: any = null) => {
    setPartnerForm({
      name: data?.name || '',
      slug: data?.slug || '',
      email: data?.email || '',
      password: mode === 'create' ? generateSuggestedPassword() : '',
      allowedDomains: data?.allowedDomains || '',
      logoUrl: data?.logoUrl || '',
      primaryColor: data?.primaryColor || '#FF6B47',
      secondaryColor: data?.secondaryColor || '#0EA5A0',
    })
    setPartnerFormErrors({})
    setSlugManuallyEdited(mode === 'edit')
    setShowPartnerPassword(false)
    setPartnerModal({ open: true, mode, data })
  }

  const handlePartnerLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Veuillez sélectionner un fichier image (JPEG, PNG, WEBP...).', 'error')
      return
    }
    if (file.size > 1 * 1024 * 1024) {
      showToast('Le logo dépasse la limite de 1 Mo.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setPartnerForm(p => ({ ...p, logoUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleTogglePartnerActive = (id: string, name: string, nextActive: boolean) => {
    askConfirm({
      title: nextActive ? 'Réactiver ce partenaire ?' : 'Désactiver ce partenaire ?',
      description: nextActive
        ? `"${name}" pourra de nouveau se connecter à son espace.`
        : `"${name}" ne pourra plus se connecter à son espace tant qu'il n'est pas réactivé. Ses données sont conservées.`,
      danger: !nextActive,
      onConfirm: async () => {
        try {
          await togglePartnerActiveMut.mutateAsync({ id, isActive: nextActive })
          showToast(nextActive ? 'Partenaire réactivé.' : 'Partenaire désactivé.')
          refetchAll()
        } catch (err: any) {
          showToast(err.message || "Une erreur est survenue.", 'error')
        }
      },
    })
  }

  const handleResetPartnerPassword = (partnerId: string, name: string) => {
    askConfirm({
      title: 'Réinitialiser le mot de passe ?',
      description: `Un nouveau mot de passe sera généré pour le compte de "${name}". L'ancien ne fonctionnera plus.`,
      onConfirm: async () => {
        try {
          const res = await resetPartnerAccountPasswordMut.mutateAsync({ partnerId })
          setPasswordRevealModal({
            open: true,
            email: res.accountEmail,
            password: res.temporaryPassword,
            title: 'Mot de passe réinitialisé',
          })
          refetchAll()
        } catch (err: any) {
          showToast(err.message || "Une erreur est survenue.", 'error')
        }
      },
    })
  }

  const handleApprovePartnerRequest = (id: string, name: string) => {
    askConfirm({
      title: 'Approuver cette demande ?',
      description: `"${name}" pourra se connecter avec le compte qu'il a créé lui-même à l'inscription.`,
      onConfirm: async () => {
        try {
          await approvePartnerMut.mutateAsync({ id })
          showToast('Partenaire approuvé.')
          refetchAll()
        } catch (err: any) {
          showToast(err.message || "Une erreur est survenue.", 'error')
        }
      },
    })
  }

  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string; name: string; reason: string }>({
    open: false,
    id: '',
    name: '',
    reason: '',
  })

  const handleRejectPartnerRequest = async () => {
    try {
      await rejectPartnerMut.mutateAsync({ id: rejectModal.id, reason: rejectModal.reason.trim() || undefined })
      setRejectModal({ open: false, id: '', name: '', reason: '' })
      showToast('Demande rejetée.')
      refetchAll()
    } catch (err: any) {
      showToast(err.message || "Une erreur est survenue.", 'error')
    }
  }

  const openCampaignModal = (mode: 'create' | 'edit', data: any = null) => {
    setCampaignForm({
      title: data?.title || '',
      partnerId: data?.partnerId || (partners && partners.length > 0 ? partners[0].id : ''),
      startDate: data ? formatDateForInput(data.startDate) : '',
      endDate: data ? formatDateForInput(data.endDate) : '',
      isActive: data ? data.isActive : true,
      gameMode: data?.gameMode || 'ROULETTE',
      imageData: data?.imageData || '',
      imageMimeType: data?.imageMimeType || '',
      senderEmail: data?.senderEmail || '',
      senderEmailPassword: '',
      hasSenderEmailPassword: !!data?.hasSenderEmailPassword,
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
      validityDays: data ? (data.validityDays ?? 30) : 30,
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
    setUserFormErrors({})
    setUserModal({ open: true, mode, data })
  }

  // Deletion logic with checks — chaque suppression passe par une modale de
  // confirmation stylée (askConfirm) plutôt que le confirm() natif du navigateur.
  const handleDeletePartner = (id: string, name: string) => {
    askConfirm({
      title: 'Supprimer ce partenaire ?',
      description: `Le partenaire "${name}" sera supprimé. Ses leads associés seront définitivement supprimés et ses campagnes seront dissociées.`,
      onConfirm: async () => {
        try {
          await deletePartnerMut.mutateAsync({ id })
          showToast('Partenaire supprimé.')
          refetchAll()
        } catch (err: any) {
          showToast(err.message || 'Une erreur est survenue lors de la suppression du partenaire.', 'error')
        }
      },
    })
  }

  const handleDeleteCampaign = (id: string, title: string) => {
    askConfirm({
      title: 'Supprimer cette campagne ?',
      description: `La campagne "${title}" sera supprimée. Tous les cadeaux, jetons de jeu et leads correspondants seront supprimés.`,
      onConfirm: async () => {
        try {
          await deleteCampaignMut.mutateAsync({ id })
          showToast('Campagne supprimée.')
          refetchAll()
        } catch (err: any) {
          showToast(err.message || 'Une erreur est survenue lors de la suppression de la campagne.', 'error')
        }
      },
    })
  }

  const handleDeletePrize = (id: string, name: string) => {
    askConfirm({
      title: 'Supprimer ce lot ?',
      description: `Le lot "${name}" sera supprimé. Les historiques de gains associés seront également supprimés.`,
      onConfirm: async () => {
        try {
          await deletePrizeMut.mutateAsync({ id })
          showToast('Lot supprimé.')
          refetchAll()
        } catch (err: any) {
          showToast(err.message || 'Une erreur est survenue lors de la suppression du lot.', 'error')
        }
      },
    })
  }

  const handleExecuteDraw = (prize: any) => {
    const participantCount = prize.participantCount || 0
    if (!participantCount) {
      showToast("Aucun participant n'est encore inscrit à ce tirage au sort.", 'error')
      return
    }
    askConfirm({
      title: 'Effectuer le tirage au sort ?',
      description: `Un gagnant sera sélectionné au hasard parmi les ${participantCount} participant(s) inscrit(s) pour le lot "${prize.name}". Cette action est irréversible.`,
      confirmLabel: 'Lancer le tirage',
      danger: false,
      onConfirm: () =>
        new Promise<void>((resolve) => {
          runDrawMut.mutate(
            { prizeId: prize.id },
            {
              onSuccess: (data) => {
                refetchAll()
                const names = data.winners.map((w: any) => w.name || w.email).join(', ')
                showToast(`Tirage effectué ! Gagnant(s) : ${names}`)
                resolve()
              },
              onError: (err) => {
                showToast(err.message || 'Erreur lors du tirage au sort.', 'error')
                resolve()
              },
            }
          )
        }),
    })
  }

  const handleDeleteUser = (id: string, email: string) => {
    askConfirm({
      title: 'Supprimer cet utilisateur ?',
      description: `L'utilisateur "${email}" sera supprimé. Tous ses jetons de jeu, leads et gains de lots seront définitivement supprimés.`,
      onConfirm: async () => {
        try {
          await deleteUserMut.mutateAsync({ id })
          showToast('Utilisateur supprimé.')
          refetchAll()
        } catch (err: any) {
          showToast(err.message || "Une erreur est survenue lors de la suppression de l'utilisateur.", 'error')
        }
      },
    })
  }

  const handleCleanStaleTokens = async () => {
    try {
      const res = await expireStaleTokensMut.mutateAsync()
      showToast(`${res.expiredCount} jeton(s) expiré(s) nettoyé(s)`, 'success')
      refetchAll()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || "Une erreur est survenue lors du nettoyage des jetons.", 'error')
    }
  }

  const handleReviewReceipt = async (submissionId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await reviewReceiptMut.mutateAsync({
        submissionId,
        decision,
      })
      showToast(
        decision === 'APPROVED'
          ? 'Ticket approuvé avec succès ! Un jeton a été attribué.'
          : 'Ticket rejeté avec succès.',
        'success'
      )
      refetchAll()
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Une erreur est survenue lors de la modération du ticket.', 'error')
    }
  }

  const navItems: AdminNavItem[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads & Stats', icon: BarChart3 },
    { id: 'winners', label: 'Gagnants', icon: Trophy },
    { id: 'receipts', label: 'Tickets à vérifier', icon: CheckCircle },
    ...(isSuperAdmin
      ? [
        { id: 'partners', label: 'Partenaires', icon: Globe, badge: pendingPartners?.length || 0 },
        { id: 'campaigns', label: 'Campagnes', icon: Sliders },
        { id: 'prizes', label: 'Cadeaux / Lots', icon: Gift },
        { id: 'users', label: 'Utilisateurs', icon: UserCheck },
        { id: 'homepage', label: "Page d'Accueil", icon: LayoutTemplate },
        { id: 'settings', label: 'Paramètres', icon: Settings },
      ]
      : []),
  ]

  // Topbar search box mirrors whichever per-tab search state is active — there is
  // no unified cross-entity search endpoint yet, so this stays scoped per section.
  const activeSearchByTab: Partial<Record<TabType, [string, (v: string) => void]>> = {
    leads: [leadSearch, setLeadSearch],
    partners: [partnerSearch, setPartnerSearch],
    campaigns: [campaignSearch, setCampaignSearch],
    prizes: [prizeSearch, setPrizeSearch],
    users: [userSearch, setUserSearch],
  }
  const [topbarSearchValue, setTopbarSearchValue] = activeSearchByTab[activeTab] ?? [undefined, undefined]

  return (
    <AdminLayout
      session={initialSession!}
      navItems={navItems}
      activeId={activeTab}
      onNavigate={(id) => setActiveTab(id as TabType)}
      onLogout={handleLogout}
      searchValue={topbarSearchValue}
      onSearchChange={setTopbarSearchValue}
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink-900">
              {isSuperAdmin ? "Console d'Administration" : "Statistiques & Activité"}
            </h2>
            <p className="text-ink-500 text-sm mt-1">
              {isSuperAdmin
                ? 'Gérez globalement vos Partenaires, Campagnes, Cadeaux (Lots) et Utilisateurs tout en visualisant le suivi analytique.'
                : 'Visualisez les leads capturés et exportez vos statistiques de campagne.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isSuperAdmin && allPartnersForSwitcher && allPartnersForSwitcher.length > 1 && (
              <select
                value={partnerId}
                onChange={(e) => router.push(`/partner?id=${e.target.value}`)}
                className="h-9 px-3 rounded-[var(--radius-ds-sm)] bg-surface border border-black/[0.08] text-xs font-bold text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-500/25 cursor-pointer"
                aria-label="Changer de compte partenaire"
              >
                {allPartnersForSwitcher.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={refetchAll}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-black/[0.08] text-ink-700 hover:text-ink-900 rounded-[var(--radius-ds-sm)] transition-all cursor-pointer text-sm font-bold active:scale-95 focus:outline-none"
            >
              <RefreshCw className="h-4 w-4" /> Actualiser
            </button>
          </div>
        </div>

          {/* TAB CONTENT: DASHBOARD */}
          {activeTab === 'dashboard' && <Dashboard />}

          {/* TAB CONTENT: LEADS & ANALYTICS */}
          {activeTab === 'leads' && (
            <div className="mt-0">
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
                      <LinkIcon className="h-4 w-4 text-[#FF6B47]" />
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
                      className="bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] cursor-pointer shadow-sm w-full lg:w-auto"
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
                      <Users className="h-5 w-5 text-[#FF6B47]" />
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
                      <ArrowUpRight className="h-5 w-5 text-[#FF6B47]" />
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
                  <h3 className="text-lg font-bold text-[#241F1C] mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#FF6B47]" /> État Réel des Stocks
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {activeCampaign.prizes.map((prize: any) => {
                      const isLowStock = prize.totalStock !== -1 && prize.remainingStock <= 5 && prize.remainingStock > 0
                      const isOutOfStock = prize.totalStock !== -1 && prize.remainingStock === 0

                      return (
                        <div
                          key={prize.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between ${isOutOfStock
                            ? 'bg-red-50/70 border-red-200 text-red-800'
                            : isLowStock
                              ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                              : 'bg-slate-50/70 border-slate-200 text-slate-700'
                            }`}
                        >
                          <div>
                            <div className="font-extrabold text-slate-800 text-sm line-clamp-1">{prize.name}</div>
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

                {/* Section Maintenance / Outils */}
                <div className="mt-8 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-[#FF6B47]" /> Maintenance
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">
                        Gérez et optimisez le stockage des jetons de jeu.
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        onClick={handleCleanStaleTokens}
                        disabled={expireStaleTokensMut.isPending}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 text-[#FF6B47] disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed active:scale-95"
                      >
                        {expireStaleTokensMut.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" /> Nettoyage...
                          </>
                        ) : (
                          'Nettoyer les jetons périmés'
                        )}
                      </button>
                      <span className="text-[10px] text-slate-400 font-semibold max-w-xs text-right">
                        Marque comme expirés les jetons non utilisés depuis plus de 90 jours
                      </span>
                    </div>
                  </div>
                </div>

                {/* Captured Leads List */}
                <Card className="mt-8 overflow-hidden">
                  <div className="p-6 border-b border-black/[0.06]">
                    <h3 className="text-xl font-bold text-ink-900">Leads Capturés</h3>
                    <p className="text-ink-500 text-xs mt-1">Visualisation et export des contacts de la campagne.</p>
                  </div>

                  <div className="p-6">
                    <DataTable
                      columns={[
                        {
                          key: 'lead', header: 'Détails du Lead', sortValue: (lead: any) => lead.name || lead.email,
                          render: (lead: any) => (
                            <>
                              <div className="font-extrabold text-ink-900">{lead.name || 'Anonymous'}</div>
                              <div className="flex items-center gap-4 text-xs mt-1 text-ink-500">
                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>
                                {lead.phone && (
                                  <span className="flex items-center gap-1"><PhoneCall className="h-3 w-3" /> {lead.phone}</span>
                                )}
                              </div>
                            </>
                          ),
                        },
                        {
                          key: 'source', header: 'Source', sortValue: (lead: any) => lead.source,
                          render: (lead: any) => (
                            <span className="px-2 py-0.5 bg-brand-50 border border-brand-500/20 rounded-md text-[10px] font-bold text-brand-600">
                              {lead.source}
                            </span>
                          ),
                        },
                        {
                          key: 'prizes', header: 'Cadeaux Remportés',
                          render: (lead: any) => lead.prizesWon.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {lead.prizesWon.map((p: string, i: number) => (
                                <span key={i} className="px-2.5 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 text-[10px] font-bold">
                                  {p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-ink-500 italic text-xs">Aucun lot gagné</span>
                          ),
                        },
                        {
                          key: 'createdAt', header: "Date d'inscription", align: 'right',
                          sortValue: (lead: any) => new Date(lead.createdAt).getTime(),
                          render: (lead: any) => (
                            <span className="text-xs text-ink-500">
                              {new Date(lead.createdAt).toLocaleDateString('fr-FR', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          ),
                        },
                      ]}
                      data={filteredLeads}
                      getRowId={(lead: any) => lead.id}
                      emptyIcon={Users}
                      emptyTitle="Aucun lead trouvé"
                      emptyDescription="Aucun contact ne correspond à cette recherche."
                      exportColumns={[
                        { header: 'Nom', value: (lead: any) => lead.name || 'Anonymous' },
                        { header: 'Email', value: (lead: any) => lead.email },
                        { header: 'Téléphone', value: (lead: any) => lead.phone || '' },
                        { header: 'Source', value: (lead: any) => lead.source },
                        { header: "Date d'inscription", value: (lead: any) => new Date(lead.createdAt).toISOString() },
                        { header: 'Cadeaux remportés', value: (lead: any) => lead.prizesWon.join('; ') || '' },
                      ]}
                      exportFilename={`leads_${activeCampaign.title.substring(0, 20)}`}
                    />
                  </div>
                </Card>
              </>
            )
          })()}
        </div>
      )}

      {/* TAB CONTENT: GAGNANTS */}
      {activeTab === 'winners' && <WinnersTab />}

      {/* TAB CONTENT: TICKETS MODERATION */}
      {activeTab === 'receipts' && (
        <div className="mt-0 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Tickets de caisse à vérifier</h3>
              <p className="text-slate-450 text-xs mt-1">
                Validez ou rejetez les tickets de caisse soumis par les joueurs pour deblocquer leur participation.
              </p>
            </div>
            <button
              onClick={() => refetchReceipts()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-850 rounded-xl transition-all cursor-pointer shadow-xs text-xs font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${reviewReceiptMut.isPending ? 'animate-spin' : ''}`} />
              Rafraîchir
            </button>
          </div>

          <div className="overflow-x-auto">
            {!receiptSubmissions || receiptSubmissions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                Aucun ticket en attente de vérification.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-500">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 font-bold">Joueur</th>
                    <th className="px-6 py-4 font-bold">Campagne</th>
                    <th className="px-6 py-4 font-bold">Aperçu du Ticket</th>
                    <th className="px-6 py-4 font-bold">Date de Soumission</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {receiptSubmissions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-800">{sub.user.name || 'Anonyme'}</div>
                        <div className="text-xs mt-1 text-slate-450 font-semibold">{sub.user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{sub.campaign.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        {sub.fileMimeType === 'application/pdf' ? (
                          <a
                            href={`data:${sub.fileMimeType};base64,${sub.fileData}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 text-[#FF6B47] hover:text-[#E85530] rounded-lg text-xs font-bold transition-colors"
                          >
                            Voir le PDF (nouvel onglet)
                          </a>
                        ) : (
                          <div className="relative group w-24 h-24 border border-slate-200 rounded-xl overflow-hidden cursor-zoom-in bg-slate-50">
                            <img
                              src={`data:${sub.fileMimeType};base64,${sub.fileData}`}
                              alt="Ticket"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onClick={() => window.open(`data:${sub.fileMimeType};base64,${sub.fileData}`, '_blank')}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-semibold">
                        {new Date(sub.submittedAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReviewReceipt(sub.id, 'APPROVED')}
                            disabled={reviewReceiptMut.isPending}
                            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 rounded-xl text-xs font-black transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            <Check className="h-3.5 w-3.5" /> Approuver
                          </button>
                          <button
                            onClick={() => handleReviewReceipt(sub.id, 'REJECTED')}
                            disabled={reviewReceiptMut.isPending}
                            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 rounded-xl text-xs font-black transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            <X className="h-3.5 w-3.5" /> Rejeter
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PARTNERS CRUD */}
      {activeTab === 'partners' && (
        <>
        {!!pendingPartners?.length && (
          <Card className="overflow-hidden mb-6 border-2 border-brand-500/30">
            <div className="p-6 border-b border-black/[0.06]">
              <h3 className="text-xl font-bold text-ink-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand-500" /> Demandes en attente ({pendingPartners.length})
              </h3>
              <p className="text-ink-500 text-xs mt-1">Auto-inscriptions à valider avant que le partenaire puisse se connecter.</p>
            </div>
            <div className="divide-y divide-black/[0.05]">
              {pendingPartnersLoading ? (
                <div className="p-6 text-sm text-ink-500">Chargement…</div>
              ) : pendingPartners.map((p: any) => {
                const account = p.users?.[0]
                return (
                  <div key={p.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                    <div>
                      <div className="font-extrabold text-ink-900">{p.name}</div>
                      <div className="text-xs text-ink-500 mt-1 space-y-0.5">
                        <div>{account?.email}</div>
                        {account?.name && <div>Contact : {account.name}</div>}
                        {account?.phone && <div>Tél : {account.phone}</div>}
                        <div>Demandé le {new Date(p.requestedAt).toLocaleString('fr-FR')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApprovePartnerRequest(p.id, p.name)}
                        className="px-4 py-2 bg-[var(--success)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Approuver
                      </button>
                      <button
                        onClick={() => setRejectModal({ open: true, id: p.id, name: p.name, reason: '' })}
                        className="px-4 py-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)] hover:text-white text-[var(--danger)] rounded-xl text-xs font-bold transition-all border border-[var(--danger)]/20 cursor-pointer"
                      >
                        Rejeter
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-ink-900">Gestion des Partenaires</h3>
              <p className="text-ink-500 text-xs mt-1">Créez des espaces partenaires avec leur propre compte de connexion.</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={partnerStatusFilter}
                onChange={(e) => setPartnerStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="bg-surface-alt border border-black/[0.08] text-ink-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer shadow-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Désactivés</option>
              </select>
              <Button size="sm" onClick={() => openPartnerModal('create')}>
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </div>
          </div>

          <div className="p-6">
            <DataTable
              columns={[
                {
                  key: 'name', header: 'Nom complet', sortValue: (p: any) => p.name,
                  render: (p: any) => (
                    <div className="flex items-center gap-2">
                      {p.logoUrl ? (
                        <img src={p.logoUrl} alt="" className="h-7 w-7 rounded-lg object-cover border border-black/[0.06]" />
                      ) : (
                        <div className="h-7 w-7 rounded-lg bg-surface-alt border border-black/[0.06] flex items-center justify-center text-ink-500">
                          <Globe className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div>
                        <div className="font-extrabold text-ink-900">{p.name}</div>
                        <div className="font-mono text-[10px] text-ink-500">{p.slug}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'status', header: 'Statut', sortValue: (p: any) => (p.isActive ? 1 : 0),
                  render: (p: any) => (
                    p.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-[var(--success)]/10 text-[var(--success)]">
                        <CheckCircle className="h-3 w-3" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-[var(--danger)]/10 text-[var(--danger)]">
                        <PowerOff className="h-3 w-3" /> Désactivé
                      </span>
                    )
                  ),
                },
                {
                  key: 'campaignCount', header: 'Campagnes', sortValue: (p: any) => p.campaignCount,
                  render: (p: any) => <span className="font-mono text-xs text-ink-700">{p.campaignCount}</span>,
                },
                {
                  key: 'accountCount', header: 'Comptes', sortValue: (p: any) => p.accountCount,
                  render: (p: any) => <span className="font-mono text-xs text-ink-700">{p.accountCount}</span>,
                },
                {
                  key: 'domains', header: 'Domaines whitelistés (CORS)',
                  render: (p: any) => (
                    <span className="font-mono text-xs bg-surface-alt border border-black/[0.06] text-ink-700 px-2 py-1 rounded-md">
                      {p.allowedDomains || '* (Aucun domaine)'}
                    </span>
                  ),
                },
                {
                  key: 'actions', header: 'Actions', align: 'right',
                  render: (p: any) => (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openPartnerModal('edit', p)}
                        title="Modifier"
                        className="p-2 text-ink-500 hover:text-ink-900 bg-surface-alt border border-black/[0.06] rounded-lg hover:bg-black/[0.04] transition-all cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleResetPartnerPassword(p.id, p.name)}
                        title="Réinitialiser le mot de passe"
                        disabled={p.accountCount === 0}
                        className="p-2 text-ink-500 hover:text-ink-900 bg-surface-alt border border-black/[0.06] rounded-lg hover:bg-black/[0.04] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePartnerActive(p.id, p.name, !p.isActive)}
                        title={p.isActive ? 'Désactiver' : 'Réactiver'}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          p.isActive
                            ? 'text-[var(--danger)] border-[var(--danger)]/20 bg-[var(--danger)]/10 hover:bg-[var(--danger)] hover:text-white'
                            : 'text-[var(--success)] border-[var(--success)]/20 bg-[var(--success)]/10 hover:bg-[var(--success)] hover:text-white'
                        }`}
                      >
                        {p.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </button>
                    </div>
                  ),
                },
              ]}
              data={partners
                ?.filter((p) => p.name.toLowerCase().includes(partnerSearch.toLowerCase()))
                .filter((p) => partnerStatusFilter === 'all' || (partnerStatusFilter === 'active' ? p.isActive : !p.isActive))}
              isLoading={partnersLoading}
              getRowId={(p: any) => p.id}
              emptyIcon={Globe}
              emptyTitle="Aucun partenaire enregistré"
              emptyDescription="Ajoutez votre premier partenaire pour commencer."
              exportColumns={[
                { header: 'ID', value: (p: any) => p.id },
                { header: 'Nom', value: (p: any) => p.name },
                { header: 'Slug', value: (p: any) => p.slug },
                { header: 'Statut', value: (p: any) => (p.isActive ? 'Actif' : 'Désactivé') },
                { header: 'Campagnes', value: (p: any) => p.campaignCount },
                { header: 'Comptes', value: (p: any) => p.accountCount },
                { header: 'Domaines', value: (p: any) => p.allowedDomains || '' },
              ]}
              exportFilename="partenaires"
            />
          </div>
        </Card>
        </>
      )}

      {/* TAB CONTENT: CAMPAIGNS CRUD */}
      {activeTab === 'campaigns' && (
        <div className="mt-0 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Gestion des Campagnes</h3>
              <p className="text-slate-450 text-xs mt-1">Associez des campagnes à vos partenaires et déterminez les périodes de validité.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher une campagne..."
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] w-48 sm:w-56"
                />
              </div>

              <select
                value={campaignPartnerFilter}
                onChange={(e) => setCampaignPartnerFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] cursor-pointer shadow-sm w-44"
              >
                <option value="all">Toutes les entreprises</option>
                <option value="system">Système Général</option>
                {partners?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <button
                onClick={() => setWizardOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-brand-signature text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" /> Nouvelle campagne
              </button>
            </div>
          </div>

          <div className="p-6">
            {campaigns && campaigns.length > 0 ? (() => {
              const filtered = campaigns.filter(c => {
                const matchesSearch = c.title.toLowerCase().includes(campaignSearch.toLowerCase())
                const matchesPartner = campaignPartnerFilter === 'all' ||
                  (campaignPartnerFilter === 'system' && !c.partnerId) ||
                  c.partnerId === campaignPartnerFilter
                return matchesSearch && matchesPartner
              })
              return filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filtered.map((c) => (
                    <CampaignCard
                      key={c.id}
                      campaign={c as any}
                      isTogglingActive={toggleCampaignActiveMut.isPending && toggleCampaignActiveMut.variables?.id === c.id}
                      isDuplicating={duplicateCampaignMut.isPending && duplicateCampaignMut.variables?.id === c.id}
                      onToggleActive={async () => {
                        try {
                          await toggleCampaignActiveMut.mutateAsync({ id: c.id, isActive: !c.isActive })
                          refetchAll()
                        } catch (err: any) {
                          showToast(err.message || 'Erreur lors du changement de statut.', 'error')
                        }
                      }}
                      onSetGameMode={async (mode) => {
                        try {
                          await setCampaignGameModeMut.mutateAsync({ id: c.id, gameMode: mode })
                          refetchAll()
                        } catch (err: any) {
                          showToast(err.message || 'Erreur lors du changement de mode.', 'error')
                        }
                      }}
                      onSpinsPerClientChange={async (value) => {
                        try {
                          await updateCampaignGameConfigMut.mutateAsync({ id: c.id, spinsPerClient: value })
                          refetchAll()
                        } catch (err: any) {
                          showToast(err.message || 'Erreur lors de la mise à jour du nombre de lancers.', 'error')
                        }
                      }}
                      onConfigure={() => setGameConfigModal({ open: true, campaignId: c.id })}
                      onManageDraws={() => setDrawManagementModal({ open: true, campaignId: c.id })}
                      onEdit={() => openCampaignModal('edit', c)}
                      onDuplicate={async () => {
                        try {
                          await duplicateCampaignMut.mutateAsync({ id: c.id })
                          showToast('Campagne dupliquée en brouillon.')
                          refetchAll()
                        } catch (err: any) {
                          showToast(err.message || 'Erreur lors de la duplication.', 'error')
                        }
                      }}
                      onDelete={() => handleDeleteCampaign(c.id, c.title)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Search}
                  title="Aucune campagne ne correspond à cette recherche"
                  description="Essayez un autre mot-clé ou changez le filtre par entreprise."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => { setCampaignSearch(''); setCampaignPartnerFilter('all') }}
                    >
                      Réinitialiser les filtres
                    </Button>
                  }
                />
              )
            })() : (
              <EmptyState
                icon={LayoutDashboard}
                title="Aucune campagne configurée"
                description="Créez votre première campagne pour lancer une roulette ou un tirage au sort."
                action={
                  <Button onClick={() => setWizardOpen(true)}>
                    <Plus className="h-4 w-4" /> Nouvelle campagne
                  </Button>
                }
              />
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PRIZES CRUD */}
      {activeTab === 'prizes' && (
        <div className="mt-0 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Gestion des Lots</h3>
              <p className="text-slate-450 text-xs mt-1">Configurez les récompenses de la roulette, ajustez les probabilités de gain et le stock disponible.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un lot..."
                  value={prizeSearch}
                  onChange={(e) => setPrizeSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] w-48 sm:w-56"
                />
              </div>

              <select
                value={prizePartnerFilter}
                onChange={(e) => setPrizePartnerFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] cursor-pointer shadow-sm w-44"
              >
                <option value="all">Toutes les entreprises</option>
                <option value="system">Système Général</option>
                {partners?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <button
                onClick={() => openPrizeModal('create')}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF6B47] hover:bg-[#e85530] text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02] active:scale-95 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {prizes && prizes.length > 0 ? (() => {
              const filtered = prizes.filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(prizeSearch.toLowerCase())
                const matchesPartner = prizePartnerFilter === 'all' ||
                  (prizePartnerFilter === 'system' && !p.campaign.partnerId) ||
                  p.campaign.partnerId === prizePartnerFilter
                return matchesSearch && matchesPartner
              })
              return filtered.length > 0 ? (
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
                            {p.drawDate && p.winners && p.winners.length > 0 && (
                              <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 p-2 rounded-xl mt-2 font-bold w-max max-w-xs flex flex-col gap-0.5 shadow-sm">
                                <span className="flex items-center gap-1">🏆 Gagnant(s) :</span>
                                {p.winners.map((w: any, idx: number) => (
                                  <span key={idx} className="font-semibold text-slate-700 ml-1 text-xxs leading-normal">
                                    • {w.user.name || 'Joueur'} ({w.user.email})
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-600">{p.campaign.title}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${p.type === 'DIGITAL'
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
                              <span className={`font-mono text-xs font-bold ${isOutOfStock
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
                              <div className="flex flex-col gap-1">
                                <span className="bg-orange-50 text-[#FF6B47] border border-orange-100 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide inline-block w-max">
                                  Tirage
                                </span>
                                <span className="text-[10px] text-slate-550 font-semibold">
                                  {new Date(p.drawDate).toLocaleString('fr-FR')}
                                </span>
                                <button
                                  onClick={() => setParticipantsModal({ open: true, prizeName: p.name, list: p.participants || [] })}
                                  className="text-[10px] text-slate-550 hover:text-[#FF6B47] hover:border-[#FF6B47] hover:bg-orange-50/20 font-bold bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded w-max transition-all cursor-pointer flex items-center gap-0.5"
                                  title="Cliquez pour voir la liste des inscrits"
                                >
                                  🎫 {p.participantCount || 0} inscrit(s)
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-slate-800">
                                {Math.round(p.winProbability * 100)}%
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {p.drawDate && (!p.winners || p.winners.length === 0) && (
                                <button
                                  onClick={() => handleExecuteDraw(p)}
                                  disabled={runDrawMut.isPending || !p.participantCount}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xxs font-extrabold transition-all border shadow-sm ${p.participantCount
                                    ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white cursor-pointer active:scale-95'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                                  title={p.participantCount ? "Effectuer le tirage au sort" : "Aucun inscrit pour le moment"}
                                >
                                  {runDrawMut.isPending ? (
                                    <>
                                      <RefreshCw className="h-3 w-3 animate-spin" /> Tirage...
                                    </>
                                  ) : (
                                    <>
                                      🏆 Tirage
                                    </>
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => openPrizeModal('edit', p)}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
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
              ) : (
                <EmptyState
                  icon={Search}
                  title="Aucun lot ne correspond à cette recherche"
                  description="Essayez un autre mot-clé ou changez le filtre par entreprise."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => { setPrizeSearch(''); setPrizePartnerFilter('all') }}
                    >
                      Réinitialiser les filtres
                    </Button>
                  }
                />
              )
            })() : (
              <EmptyState
                icon={Gift}
                title="Aucun lot configuré"
                description="Ajoutez un lot pour définir les récompenses de vos campagnes."
                action={
                  <Button onClick={() => openPrizeModal('create')}>
                    <Plus className="h-4 w-4" /> Ajouter un lot
                  </Button>
                }
              />
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: USERS CRUD */}
      {activeTab === 'users' && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-ink-900">Membres & Joueurs</h3>
              <p className="text-ink-500 text-xs mt-1">Créez des utilisateurs, ajustez leurs rôles (Superadmin, Partenaire, Joueur) et attribuez manuellement des lancers.</p>
            </div>
            <Button size="sm" onClick={() => openUserModal('create')}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>

          <div className="p-6">
            <DataTable
              columns={[
                {
                  key: 'member', header: 'Membre', sortValue: (u: any) => u.name || u.email,
                  render: (u: any) => (
                    <>
                      <div className="font-extrabold text-ink-900">{u.name || 'Anonyme'}</div>
                      <div className="text-xs text-ink-500 mt-1 flex flex-col gap-1">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</span>
                        {u.phone && <span className="flex items-center gap-1"><PhoneCall className="h-3 w-3" /> {u.phone}</span>}
                      </div>
                    </>
                  ),
                },
                {
                  key: 'role', header: 'Rôle', sortValue: (u: any) => u.role,
                  render: (u: any) => (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${u.role === 'SUPERADMIN'
                      ? 'bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)]'
                      : u.role === 'PARTNER'
                        ? 'bg-[var(--warning)]/10 border-[var(--warning)]/20 text-[var(--warning)]'
                        : 'bg-surface-alt border-black/[0.06] text-ink-500'
                      }`}>
                      {u.role === 'SUPERADMIN' ? 'SUPERADMIN' : u.role === 'PARTNER' ? 'PARTENAIRE' : 'JOUEUR'}
                    </span>
                  ),
                },
                {
                  key: 'referralCode', header: 'Code  partage',
                  render: (u: any) => <span className="font-mono text-xs font-bold text-ink-700">{u.referralCode}</span>,
                },
                {
                  key: 'tokens', header: 'Lancers par Campagne (Dispo)',
                  render: (u: any) => Object.keys(u.tokensByCampaign).length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {Object.entries(u.tokensByCampaign).map(([campId, tokens]: [string, any]) => {
                        const camp = campaigns?.find((c) => c.id === campId)
                        return (
                          <div key={campId} className="text-xxs font-medium text-ink-500 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span className="font-bold text-ink-900">{camp?.title || 'Campagne'} :</span>
                            <span className="bg-brand-50 text-brand-600 border border-brand-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap shrink-0">
                              {tokens.unused} lancers restants
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <span className="text-ink-500 italic text-xxs">Aucun lancer disponible</span>
                  ),
                },
                {
                  key: 'wins', header: 'Gains',
                  render: (u: any) => u.wonPrizesCount > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {u.wonPrizes.map((wpName: string, idx: number) => (
                        <span key={idx} className="bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20 px-1.5 py-0.5 rounded-full text-[9px] font-bold inline-block">
                          {wpName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-ink-500 italic text-xxs">0 gains</span>
                  ),
                },
                {
                  key: 'actions', header: 'Actions', align: 'right',
                  render: (u: any) => (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openUserModal('edit', u)}
                        className="p-2 text-ink-500 hover:text-ink-900 bg-surface-alt border border-black/[0.06] rounded-lg hover:bg-black/[0.04] transition-all cursor-pointer"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="p-2 text-[var(--danger)] hover:text-white hover:bg-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ),
                },
              ]}
              data={users?.filter((u) =>
                (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                (u.phone || '').toLowerCase().includes(userSearch.toLowerCase())
              )}
              isLoading={usersLoading}
              getRowId={(u: any) => u.id}
              emptyIcon={UserCheck}
              emptyTitle="Aucun utilisateur enregistré"
              emptyDescription="Les joueurs inscrits apparaîtront ici."
              exportColumns={[
                { header: 'Nom', value: (u: any) => u.name || '' },
                { header: 'Email', value: (u: any) => u.email },
                { header: 'Téléphone', value: (u: any) => u.phone || '' },
                { header: 'Rôle', value: (u: any) => u.role },
                { header: 'Code parrainage', value: (u: any) => u.referralCode },
              ]}
              exportFilename="utilisateurs"
              bulkActions={[
                {
                  label: 'Supprimer',
                  icon: Trash2,
                  variant: 'danger',
                  onClick: (rows: any[]) => {
                    askConfirm({
                      title: 'Supprimer ces utilisateurs ?',
                      description: `${rows.length} utilisateur(s) sélectionné(s) seront définitivement supprimés, avec leurs jetons, leads et gains.`,
                      onConfirm: async () => {
                        for (const u of rows) {
                          await deleteUserMut.mutateAsync({ id: u.id })
                        }
                        showToast(`${rows.length} utilisateur(s) supprimé(s).`)
                        refetchAll()
                      },
                    })
                  },
                },
              ]}
            />
          </div>
        </Card>
      )}

      {/* TAB CONTENT: HOMEPAGE (Hero video/poster + Promo banners) */}
      {activeTab === 'homepage' && (
        <div className="space-y-6">
          {/* Hero video/poster card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-1">
              <Video className="h-5 w-5 text-[#FF6B47]" /> Vidéo du Hero (Page d'Accueil)
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-5">
              Vidéo de fond en boucle affichée en haut de la page d'accueil. Courte et compressée, 20 Mo max.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Vidéo (MP4/WEBM, 20 Mo max)</label>
              <div className="h-32 w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden mb-2">
                {heroForm.heroVideoData ? (
                  <video
                    src={`data:${heroForm.heroVideoMimeType || 'video/mp4'};base64,${heroForm.heroVideoData}`}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  <Video className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  Importer une vidéo
                  <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleHeroVideoChange} />
                </label>
                {heroForm.heroVideoData && (
                  <button
                    type="button"
                    onClick={handleRemoveHeroVideo}
                    disabled={updateSiteSettingsMut.isPending}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-xs font-bold text-red-500 transition-colors"
                  >
                    Retirer
                  </button>
                )}
              </div>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSaveHero}
                disabled={updateSiteSettingsMut.isPending}
                className="px-6 py-2.5 bg-[#FF6B47] hover:bg-[#e85530] text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm shadow-orange-500/10"
              >
                {updateSiteSettingsMut.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Sauvegarder le Hero
              </button>
            </div>
          </div>

          {/* Promo banners marquee card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-1">
              <LayoutTemplate className="h-5 w-5 text-[#FF6B47]" /> Bandeau Publicitaire (Marquee)
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-5">
              Images défilantes affichées sous la liste des campagnes.
            </p>

            {/* Add new banner */}
            <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 mb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className={`h-16 w-24 shrink-0 rounded-lg border bg-white flex items-center justify-center overflow-hidden ${
                  bannerFormError && !newBannerForm.imageData ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
                }`}>
                  {newBannerForm.imageData ? (
                    <img
                      src={`data:${newBannerForm.imageMimeType};base64,${newBannerForm.imageData}`}
                      alt="Aperçu"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer transition-colors shrink-0">
                  <Upload className="h-3.5 w-3.5" />
                  Image *
                  <input type="file" accept="image/*" className="hidden" onChange={handleNewBannerImageChange} />
                </label>
                <button
                  onClick={handleAddBanner}
                  disabled={createPromoBannerMut.isPending}
                  className="px-4 py-2.5 bg-[#FF6B47] hover:bg-[#e85530] text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </button>
              </div>
              {bannerFormError && (
                <p className="text-xs text-red-500 font-semibold mt-2">{bannerFormError}</p>
              )}
            </div>

            {/* Existing banners list — glisser-déposer pour réordonner */}
            <SortableBannerList
              banners={promoBanners || []}
              onReorder={handleReorderBanners}
              onToggleActive={handleToggleBannerActive}
              onDelete={handleDeleteBanner}
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT: SETTINGS */}
      {activeTab === 'settings' && <SettingsTab />}

      </div> {/* closes max-w-[1600px] wrapper */}

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
              <Globe className="h-5 w-5 text-[#FF6B47]" />
              {partnerModal.mode === 'create' ? 'Créer un espace partenaire' : 'Modifier le partenaire'}
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-6">
              {partnerModal.mode === 'create'
                ? "Crée le partenaire et son compte de connexion (rôle Partenaire) en une fois. Choisis toi-même le mot de passe initial, ou utilise celui suggéré."
                : "Les paramètres CORS limitent les domaines d'appels autorisés pour capturer des leads."}
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const parsed = partnerFormSchema.safeParse(partnerForm)
                if (!parsed.success) {
                  const fieldErrors = parsed.error.flatten().fieldErrors
                  setPartnerFormErrors({
                    name: fieldErrors.name?.[0],
                    slug: fieldErrors.slug?.[0],
                    email: fieldErrors.email?.[0],
                  })
                  return
                }
                if (partnerModal.mode === 'create' && partnerForm.password.length < 8) {
                  setPartnerFormErrors(prev => ({ ...prev, password: 'Le mot de passe doit contenir au moins 8 caractères.' }))
                  return
                }
                setPartnerFormErrors({})
                try {
                  if (partnerModal.mode === 'create') {
                    const res = await createPartnerMut.mutateAsync(partnerForm)
                    setPartnerModal(p => ({ ...p, open: false }))
                    showToast(`Partenaire créé. Identifiant : ${res.accountEmail}`)
                  } else {
                    const { slug, password, ...editableFields } = partnerForm
                    await updatePartnerMut.mutateAsync({ id: partnerModal.data.id, ...editableFields })
                    setPartnerModal(p => ({ ...p, open: false }))
                    showToast('Partenaire enregistré.')
                  }
                  refetchAll()
                } catch (err: any) {
                  console.error(err)
                  showToast(err.message || "Une erreur est survenue lors de l'enregistrement du partenaire.", 'error')
                }
              }}
              className="space-y-4"
            >
              <Input
                label="Nom du Partenaire *"
                placeholder="Ex: Gourmet Bistro, Boulangerie Co."
                value={partnerForm.name}
                onChange={(e) => {
                  const name = e.target.value
                  setPartnerForm(p => ({
                    ...p,
                    name,
                    slug: (!slugManuallyEdited && partnerModal.mode === 'create') ? slugifyPartnerName(name) : p.slug,
                  }))
                }}
                error={partnerFormErrors.name}
              />

              <Input
                label="Identifiant (slug) *"
                placeholder="ex: gourmet-bistro"
                value={partnerForm.slug}
                disabled={partnerModal.mode === 'edit'}
                onChange={(e) => {
                  setSlugManuallyEdited(true)
                  setPartnerForm(p => ({ ...p, slug: e.target.value.toLowerCase() }))
                }}
                error={partnerFormErrors.slug}
              />
              {partnerModal.mode === 'edit' && (
                <p className="text-[10px] text-slate-400 -mt-3 font-semibold">L'identifiant ne peut plus être modifié après la création.</p>
              )}

              <Input
                label="Email de contact *"
                placeholder="contact@partenaire.com"
                type="email"
                value={partnerForm.email}
                disabled={partnerModal.mode === 'edit'}
                onChange={(e) => setPartnerForm(p => ({ ...p, email: e.target.value }))}
                error={partnerFormErrors.email}
              />
              <p className="text-[10px] text-slate-400 -mt-3 font-semibold">
                {partnerModal.mode === 'create'
                  ? "C'est aussi l'identifiant de connexion du compte partenaire créé."
                  : "L'identifiant de connexion du compte reste inchangé même si ce champ l'était (non modifiable ici)."}
              </p>

              {partnerModal.mode === 'create' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Mot de passe initial *</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showPartnerPassword ? 'text' : 'password'}
                        value={partnerForm.password}
                        onChange={(e) => setPartnerForm(p => ({ ...p, password: e.target.value }))}
                        className={`w-full bg-slate-50 border text-slate-900 px-4 pr-10 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 transition-all ${
                          partnerFormErrors.password ? 'border-[var(--danger)] focus:ring-[var(--danger)]' : 'border-slate-200 focus:ring-[#FF6B47]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPartnerPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPartnerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPartnerForm(p => ({ ...p, password: generateSuggestedPassword() }))}
                      className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all whitespace-nowrap"
                    >
                      Générer
                    </button>
                  </div>
                  {partnerFormErrors.password ? (
                    <p className="text-xs font-semibold text-[var(--danger)] mt-1.5">{partnerFormErrors.password}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">Au moins 8 caractères. Transmets-le toi-même au partenaire — il ne sera pas réaffiché ensuite.</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Logo</label>
                <div className="flex items-center gap-3">
                  {partnerForm.logoUrl ? (
                    <img src={partnerForm.logoUrl} alt="" className="h-14 w-14 rounded-xl object-cover border border-slate-200" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all">
                    <Upload className="h-3.5 w-3.5" /> Choisir un fichier
                    <input type="file" accept="image/*" className="hidden" onChange={handlePartnerLogoChange} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Couleur primaire</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={partnerForm.primaryColor}
                      onChange={(e) => setPartnerForm(p => ({ ...p, primaryColor: e.target.value }))}
                      className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <span className="font-mono text-xs text-slate-500">{partnerForm.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Couleur secondaire</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={partnerForm.secondaryColor}
                      onChange={(e) => setPartnerForm(p => ({ ...p, secondaryColor: e.target.value }))}
                      className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <span className="font-mono text-xs text-slate-500">{partnerForm.secondaryColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Domaines dynamic CORS whitelistés</label>
                <input
                  type="text"
                  placeholder="Ex: localhost:3000, gourmetbistro.com, secure.net"
                  value={partnerForm.allowedDomains}
                  onChange={(e) => setPartnerForm(p => ({ ...p, allowedDomains: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
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
                  className="px-6 py-2.5 bg-[#FF6B47] hover:bg-[#e85530] text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm shadow-orange-500/10"
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

      {/* PASSWORD REVEAL MODAL — affiché une seule fois après création/reset,
          jamais reconsultable ensuite (le mot de passe n'est jamais renvoyé
          par une query, uniquement par la réponse de la mutation). */}
      {passwordRevealModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
              <KeyRound className="h-5 w-5 text-[#FF6B47]" />
              {passwordRevealModal.title}
            </h3>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-semibold mb-5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              Ce mot de passe ne sera plus jamais affiché. Note-le ou transmets-le au partenaire maintenant.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Identifiant</label>
                <div className="font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800">
                  {passwordRevealModal.email}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Mot de passe temporaire</label>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 flex-1 truncate">
                    {passwordRevealModal.password}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(passwordRevealModal.password)
                      showToast('Mot de passe copié.')
                    }}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-all cursor-pointer"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setPasswordRevealModal({ open: false, email: '', password: '', title: '' })}
                className="px-6 py-2.5 bg-[#FF6B47] hover:bg-[#e85530] text-white font-bold rounded-xl text-sm transition-all"
              >
                J'ai noté le mot de passe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT PARTNER REQUEST MODAL — motif optionnel */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-800 mb-2">Rejeter la demande de "{rejectModal.name}" ?</h3>
            <p className="text-slate-400 text-xs font-semibold mb-4">
              Motif optionnel (conservé dans le journal d'activité, non transmis automatiquement au partenaire).
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal(m => ({ ...m, reason: e.target.value }))}
              rows={3}
              placeholder="Ex : informations incomplètes, domaine déjà couvert par un autre partenaire..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all resize-none"
            />
            <div className="pt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, id: '', name: '', reason: '' })}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-655 font-bold rounded-xl text-sm transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRejectPartnerRequest}
                disabled={rejectPartnerMut.isPending}
                className="px-6 py-2.5 bg-[var(--danger)] hover:opacity-90 text-white font-bold rounded-xl text-sm transition-all"
              >
                Rejeter la demande
              </button>
            </div>
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
              <Sliders className="h-5 w-5 text-[#FF6B47]" />
              {campaignModal.mode === 'create' ? 'Créer une Campagne' : 'Modifier la Campagne'}
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-6">
              Associez une période de validité, liez-la à un partenaire B2B et personnalisez les annonces de la bannière.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                try {
                  const { hasSenderEmailPassword, ...campaignFormData } = campaignForm
                  const data = {
                    ...campaignFormData,
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
                  showToast('Campagne enregistrée.')
                  refetchAll()
                } catch (err: any) {
                  console.error(err)
                  showToast(err.message || "Une erreur est survenue lors de l'enregistrement de la campagne.", 'error')
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
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Partenaire B2B Propriétaire</label>
                <select
                  value={campaignForm.partnerId}
                  onChange={(e) => setCampaignForm(p => ({ ...p, partnerId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-850 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] cursor-pointer"
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
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Date de Fin *</label>
                  <input
                    type="datetime-local"
                    required
                    value={campaignForm.endDate}
                    onChange={(e) => setCampaignForm(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="campaignActive"
                  checked={campaignForm.isActive}
                  onChange={(e) => setCampaignForm(p => ({ ...p, isActive: e.target.checked }))}
                  className="h-5 w-5 rounded-md border-slate-300 text-[#FF6B47] focus:ring-[#FF6B47] cursor-pointer accent-orange-500"
                />
                <label htmlFor="campaignActive" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                  Campagne active et ouverte aux participations immédiates
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Type de Jeu</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCampaignForm(p => ({ ...p, gameMode: 'ROULETTE' }))}
                    className={`px-4 py-3 rounded-xl text-xs font-black transition-all border ${
                      campaignForm.gameMode === 'ROULETTE'
                        ? 'bg-[#FF6B47] border-[#FF6B47] text-white shadow-md shadow-orange-500/10'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🎰 Roulette
                  </button>
                  <button
                    type="button"
                    onClick={() => setCampaignForm(p => ({ ...p, gameMode: 'DRAW' }))}
                    className={`px-4 py-3 rounded-xl text-xs font-black transition-all border ${
                      campaignForm.gameMode === 'DRAW'
                        ? 'bg-[#FF6B47] border-[#FF6B47] text-white shadow-md shadow-orange-500/10'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🎟️ Tirage au Sort
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-semibold">
                  {campaignForm.gameMode === 'ROULETTE'
                    ? "Les joueurs jouent à la roulette. L'onglet Tirages sera masqué."
                    : "Les joueurs s'inscrivent au tirage au sort (Kor3a). La roulette sera masquée — pensez à définir une date de tirage sur les lots."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Photo de la Campagne</label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                    {campaignForm.imageData ? (
                      <img
                        src={`data:${campaignForm.imageMimeType || 'image/jpeg'};base64,${campaignForm.imageData}`}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                      Importer une image
                      <input type="file" accept="image/*" className="hidden" onChange={handleCampaignImageChange} />
                    </label>
                    {campaignForm.imageData && (
                      <button
                        type="button"
                        onClick={() => setCampaignForm(p => ({ ...p, imageData: '', imageMimeType: '' }))}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-xs font-bold text-red-500 transition-colors"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-semibold">
                  JPEG, PNG ou WEBP, 2 Mo max. Affichée en remplacement de l'icône sur la carte de la campagne.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Email d'Envoi Automatique au Gagnant (Optionnel)
                </label>
                <p className="text-[10px] text-slate-400 mb-3 font-semibold">
                  Dès qu'un client gagne, un email lui est envoyé automatiquement depuis cette adresse, au nom du partenaire de la campagne.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Adresse d'envoi</label>
                    <input
                      type="email"
                      placeholder="gift@obooking.tn"
                      value={campaignForm.senderEmail}
                      onChange={(e) => setCampaignForm(p => ({ ...p, senderEmail: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-3 h-11 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                      Clé API Resend {campaignForm.hasSenderEmailPassword && <span className="text-emerald-500 normal-case font-semibold">(déjà configurée)</span>}
                    </label>
                    <input
                      type="password"
                      placeholder={campaignForm.hasSenderEmailPassword ? '••••••••••••••••' : 're_xxxxxxxxxxxxxxxx'}
                      value={campaignForm.senderEmailPassword}
                      onChange={(e) => setCampaignForm(p => ({ ...p, senderEmailPassword: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-3 h-11 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-semibold">
                  Laissez la clé vide pour conserver celle déjà enregistrée. L'adresse d'envoi doit être sur un domaine{' '}
                  <a
                    href="https://resend.com/domains"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF6B47] hover:underline"
                  >
                    vérifié dans Resend
                  </a>.
                </p>
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
                  <span className="text-[10px] font-black text-[#FF6B47] uppercase tracking-wider">Slide 1</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Badge</label>
                      <input
                        type="text"
                        placeholder="Ex: ✈️ Offre Spéciale"
                        value={campaignForm.adBadge1}
                        onChange={(e) => setCampaignForm(p => ({ ...p, adBadge1: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Titre</label>
                      <input
                        type="text"
                        placeholder="Ex: Seychelles avec -15%"
                        value={campaignForm.adTitle1}
                        onChange={(e) => setCampaignForm(p => ({ ...p, adTitle1: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Description</label>
                    <textarea
                      placeholder="Ex: Entrez le code promo SEYCH15 lors de votre réservation..."
                      value={campaignForm.adDesc1}
                      onChange={(e) => setCampaignForm(p => ({ ...p, adDesc1: e.target.value }))}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47] h-16 resize-none"
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
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Titre</label>
                      <input
                        type="text"
                        placeholder="Ex: Gagnez un séjour aux Maldives !"
                        value={campaignForm.adTitle2}
                        onChange={(e) => setCampaignForm(p => ({ ...p, adTitle2: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Description</label>
                    <textarea
                      placeholder="Ex: Le grand prix de la roulette Obooking est un séjour complet de 5 jours..."
                      value={campaignForm.adDesc2}
                      onChange={(e) => setCampaignForm(p => ({ ...p, adDesc2: e.target.value }))}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47] h-16 resize-none"
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
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Titre</label>
                      <input
                        type="text"
                        placeholder="Ex: Faites vos achats et Gagnez !"
                        value={campaignForm.adTitle3}
                        onChange={(e) => setCampaignForm(p => ({ ...p, adTitle3: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Description</label>
                    <textarea
                      placeholder="Ex: Scannez votre ticket de caisse dans l'onglet des défis..."
                      value={campaignForm.adDesc3}
                      onChange={(e) => setCampaignForm(p => ({ ...p, adDesc3: e.target.value }))}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47] h-16 resize-none"
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
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Code Promo</label>
                      <input
                        type="text"
                        placeholder="Ex: SEYCH15"
                        value={campaignForm.promoCode}
                        onChange={(e) => setCampaignForm(p => ({ ...p, promoCode: e.target.value }))}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47]"
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
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 uppercase mb-1">Description</label>
                    <textarea
                      placeholder="Ex: Voyagez à prix réduit vers les îles Seychelles avec le code promo exclusif d'Obooking..."
                      value={campaignForm.promoDesc}
                      onChange={(e) => setCampaignForm(p => ({ ...p, promoDesc: e.target.value }))}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47] h-16 resize-none"
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
                  className="px-6 py-2.5 bg-[#FF6B47] hover:bg-[#e85530] text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm shadow-orange-500/10"
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
              <Trophy className="h-5 w-5 text-[#FF6B47]" />
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
                    validityDays: prizeForm.validityDays ? Number(prizeForm.validityDays) : null,
                  }

                  if (prizeModal.mode === 'create') {
                    await createPrizeMut.mutateAsync(prizeData)
                  } else {
                    await updatePrizeMut.mutateAsync({ id: prizeModal.data.id, ...prizeData })
                  }
                  setPrizeModal(p => ({ ...p, open: false }))
                  showToast('Lot enregistré.')
                  refetchAll()
                } catch (err: any) {
                  console.error(err)
                  showToast(err.message || "Une erreur est survenue lors de l'enregistrement du lot.", 'error')
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Campagne Cible *</label>
                <select
                  value={prizeForm.campaignId}
                  onChange={(e) => setPrizeForm(p => ({ ...p, campaignId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] cursor-pointer"
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
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Type de Récompense *</label>
                  <select
                    value={prizeForm.type}
                    onChange={(e) => setPrizeForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] cursor-pointer"
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
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
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
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Consolation (Si rupture stock)</label>
                  <select
                    value={prizeForm.fallbackPrizeId}
                    onChange={(e) => setPrizeForm(p => ({ ...p, fallbackPrizeId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] cursor-pointer"
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
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                  Si définie, ce lot est attribué par tirage au sort   à la date indiquée et n'apparaîtra pas sur la roulette. La probabilité de gain sera ignorée.
                </p>
                {campaigns?.find(c => c.id === prizeForm.campaignId)?.gameMode === 'DRAW' && !prizeForm.drawDate && (
                  <p className="text-[10px] text-amber-600 mt-1 font-bold">
                    ⚠️ Cette campagne est en mode Tirage au Sort — une date de tirage est requise pour que ce lot soit jouable.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Durée de validité (en jours)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={prizeForm.validityDays}
                  onChange={(e) => setPrizeForm(p => ({ ...p, validityDays: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                  Nombre de jours durant lesquels le lot digital ou la remise reste valide après avoir été gagné (ex: 30).
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
                  className="px-6 py-2.5 bg-[#FF6B47] hover:bg-[#e85530] text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm shadow-orange-500/10"
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
              className="absolute right-5 top-5 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all border border-slate-200 text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
              <UserCheck className="h-5 w-5 text-[#FF6B47]" />
              {userModal.mode === 'create' ? 'Créer un Utilisateur' : 'Modifier le Profil & Crédits'}
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-6">
              Ajustez les privilèges d'accès ou modifiez directement les soldes de lancers (PlayTokens).
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const parsed = userFormSchema.safeParse(userForm)
                if (!parsed.success) {
                  setUserFormErrors({ email: parsed.error.flatten().fieldErrors.email?.[0] })
                  return
                }
                setUserFormErrors({})
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
                  showToast('Utilisateur enregistré.')
                  refetchAll()
                } catch (err: any) {
                  console.error(err)
                  showToast(err.message || "Une erreur est survenue lors de l'enregistrement de l'utilisateur.", 'error')
                }
              }}
              className="space-y-4"
            >
              <Input
                label="Nom / Prénom"
                placeholder="Ex: Jean Dupont"
                value={userForm.name}
                onChange={(e) => setUserForm(p => ({ ...p, name: e.target.value }))}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="email"
                  label="Adresse E-mail *"
                  placeholder="Ex: jean.dupont@gmail.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm(p => ({ ...p, email: e.target.value }))}
                  error={userFormErrors.email}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Téléphone</label>
                  <input
                    type="tel"
                    placeholder="Ex: +33 6 12 34 56 78"
                    value={userForm.phone}
                    onChange={(e) => setUserForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Niveau d'Accès Rôle *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm(p => ({ ...p, role: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-4 h-12 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#FF6B47] cursor-pointer"
                  >
                    <option value="PLAYER">PLAYER (Joueur de roulette)</option>
                    <option value="PARTNER">PARTNER (Accès aux analytiques de sa marque)</option>
                    <option value="SUPERADMIN">SUPERADMIN (Accès total)</option>
                  </select>
                </div>
              </div>

              {/* Spin Credit Granting Section */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 mt-4">
                <h4 className="text-xs font-bold text-[#FF6B47] uppercase tracking-wide flex items-center gap-1.5">
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
                    className="w-full bg-white border border-slate-200 text-slate-800 px-3 h-10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47] cursor-pointer"
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
                    className="w-full bg-white border border-slate-200 text-slate-900 px-3 h-10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B47] transition-all"
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
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-sm transition-all focus:outline-none"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createUserMut.isPending || updateUserMut.isPending}
                  className="px-6 py-2.5 bg-[#FF6B47] hover:bg-[#e85530] text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm shadow-orange-500/10"
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

      {/* PARTICIPANTS MODAL */}
      {participantsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setParticipantsModal(p => ({ ...p, open: false }))}
              className="absolute right-5 top-5 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all border border-slate-200 text-slate-400 hover:text-slate-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-[#FF6B47]" />
              Inscrits au Tirage
            </h3>
            <p className="text-slate-400 text-xs font-semibold mb-6">
              Liste des participants enregistrés pour le lot <strong className="text-slate-700 font-extrabold">{participantsModal.prizeName}</strong>.
            </p>

            <div className="max-h-[60vh] overflow-y-auto border border-slate-100 rounded-2xl">
              {participantsModal.list.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  Aucun participant n'est encore inscrit à ce tirage au sort.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-550">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-bold">Nom</th>
                      <th className="px-4 py-3 font-bold">Email</th>
                      <th className="px-4 py-3 font-bold">Téléphone</th>
                      <th className="px-4 py-3 font-bold text-right">Date d'inscription</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {participantsModal.list.map((u: any, idx: number) => (
                      <tr key={u.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-extrabold text-slate-800">{u.name || 'N/A'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-655">{u.email}</td>
                        <td className="px-4 py-3 font-mono font-bold text-[#FF6B47]">{u.phone || 'N/A'}</td>
                        <td className="px-4 py-3 text-right text-slate-400 font-semibold">
                          {new Date(u.createdAt).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-4 mt-4 flex items-center justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setParticipantsModal(p => ({ ...p, open: false }))}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/50 text-slate-700 font-bold rounded-xl text-sm transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <CampaignGameConfigModal
        open={gameConfigModal.open}
        campaignId={gameConfigModal.campaignId}
        onClose={() => {
          setGameConfigModal({ open: false, campaignId: null })
          refetchAll()
        }}
      />

      <DrawManagementModal
        open={drawManagementModal.open}
        campaignId={drawManagementModal.campaignId}
        onClose={() => {
          setDrawManagementModal({ open: false, campaignId: null })
          refetchAll()
        }}
      />

      <CampaignWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false)
          refetchAll()
        }}
        partners={partners || []}
      />

      <ConfirmModal
        open={!!confirmDialog}
        title={confirmDialog?.title || ''}
        description={confirmDialog?.description || ''}
        confirmLabel={confirmDialog?.confirmLabel}
        danger={confirmDialog?.danger ?? true}
        loading={confirmLoading}
        onConfirm={handleConfirmDialogConfirm}
        onCancel={() => setConfirmDialog(null)}
      />

    </AdminLayout>
  )
}
