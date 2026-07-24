'use client'

import { useState } from 'react'
import { Copy, Check, Eye, EyeOff, KeyRound, Globe, Webhook, TicketCheck, TicketX } from 'lucide-react'
import { trpc } from '@/utils/trpc'

function CopyButton({ text, label = 'Copier' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--brand-700)] border border-[var(--brand-500)]/30 rounded-lg px-2.5 py-1.5 hover:bg-[var(--brand-50)] transition-colors shrink-0"
    >
      {copied ? <><Check className="h-3.5 w-3.5" /> Copié</> : <><Copy className="h-3.5 w-3.5" /> {label}</>}
    </button>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-[12px] leading-relaxed overflow-x-auto font-mono">{code}</pre>
      <div className="absolute top-2.5 right-2.5">
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-[11px] font-bold text-slate-300 hover:text-white bg-white/10 rounded-md px-2 py-1"
        >
          Copier
        </button>
      </div>
    </div>
  )
}

const METHOD_CLS = 'bg-emerald-100 text-emerald-700 border-emerald-200'

function Endpoint({
  icon: Icon, title, path, desc, request, response, curl,
}: {
  icon: any; title: string; path: string; desc: string; request?: string; response: string; curl: string
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[var(--shadow-premium-sm)] overflow-hidden">
      <div className="p-5 border-b border-black/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-[var(--brand-50)] flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-[var(--brand-600)]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-ink-900">{title}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black border ${METHOD_CLS}`}>POST</span>
              <code className="text-[12px] font-mono text-ink-700">{path}</code>
            </div>
          </div>
        </div>
        <p className="text-[13px] text-ink-500 mt-3">{desc}</p>
      </div>
      <div className="p-5 space-y-4">
        {request && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500 mb-1.5">Corps de la requête</div>
            <CodeBlock code={request} />
          </div>
        )}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500 mb-1.5">Réponse</div>
          <CodeBlock code={response} />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500 mb-1.5">Exemple cURL</div>
          <CodeBlock code={curl} />
        </div>
      </div>
    </div>
  )
}

export function ApiDocsTab() {
  const { data: config } = trpc.getIntegrationConfig.useQuery()
  const [showSecret, setShowSecret] = useState(false)

  const baseUrl = config?.baseUrl || 'https://gift.obooking.tn'
  const secret = config?.sharedSecret || ''
  const secretConfigured = config?.secretConfigured ?? false
  const SEC = secretConfigured ? secret : 'VOTRE_SECRET'

  const curl = (path: string, bodyLines: string) =>
    `curl -X POST ${baseUrl}${path} \\\n  -H "x-api-secret: ${SEC}" \\\n  -H "Content-Type: application/json" \\\n  -d '${bodyLines}'`

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink-900">API d'intégration obooking.tn</h2>
        <p className="text-sm text-ink-500 mt-1.5 max-w-xl">
          Ces endpoints permettent au site de l'agence de voyage <b>obooking.tn</b> de créditer les points
          merci après un achat et de valider les bons de réduction. Transmettez ces informations à leur équipe technique.
        </p>
      </div>

      {/* Connexion : base URL + secret */}
      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[var(--shadow-premium-sm)] p-5">
        <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2 mb-4">
          <KeyRound className="h-4 w-4 text-[var(--brand-600)]" /> Connexion & authentification
        </h3>

        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500 mb-1.5 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> URL de base
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-[13px] font-mono text-ink-800 truncate">{baseUrl}</code>
              <CopyButton text={baseUrl} />
            </div>
            {!config?.baseUrl && (
              <p className="text-[11px] text-amber-600 mt-1.5">⚠ APP_BASE_URL n'est pas encore configurée — valeur d'exemple affichée.</p>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-500 mb-1.5">Secret partagé (SHARED_API_SECRET)</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-[13px] font-mono text-ink-800 truncate">
                {secretConfigured ? (showSecret ? secret : '•'.repeat(Math.min(secret.length, 40))) : 'Non configuré'}
              </code>
              {secretConfigured && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-ink-500 hover:text-ink-900 hover:bg-slate-50 transition-colors"
                    aria-label={showSecret ? 'Masquer' : 'Afficher'}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <CopyButton text={secret} />
                </>
              )}
            </div>
            <p className="text-[12px] text-ink-500 mt-2">
              À envoyer dans l'en-tête <code className="font-mono bg-slate-100 px-1 rounded">x-api-secret</code> (ou{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">Authorization: Bearer &lt;secret&gt;</code>) de chaque requête.
              Appels <b>serveur → serveur uniquement</b>. Sans secret valide → <b>401</b>.
            </p>
          </div>
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-5">
        <Endpoint
          icon={Webhook}
          title="Enregistrer un achat (webhook)"
          path="/api/loyalty/purchase"
          desc="À appeler après chaque paiement réussi. Enregistre l'achat et crédite les points (immédiat si le client a un compte, sinon en attente puis crédité à l'inscription). Idempotent sur orderRef."
          request={`{
  "orderRef": "OBK-2026-00123",
  "email": "client@example.com",
  "amountTnd": 500,
  "description": "Séjour Hammamet 4 nuits"
}`}
          response={`{
  "orderRef": "OBK-2026-00123",
  "pointsEarned": 100,
  "status": "CREDITED",
  "customerExists": true,
  "signupUrl": "${baseUrl}/client/signup?email=..."
}`}
          curl={curl('/api/loyalty/purchase', `{"orderRef":"OBK-2026-00123","email":"client@example.com","amountTnd":500}`)}
        />

        <Endpoint
          icon={TicketCheck}
          title="Vérifier un bon (au checkout)"
          path="/api/loyalty/voucher/validate"
          desc="Quand le client saisit un code de réduction au paiement. Lecture seule : ne consomme pas le bon. reason peut valoir not_found, already_redeemed ou expired."
          request={`{ "code": "OB-4MJ7-GX7R" }`}
          response={`{
  "valid": true,
  "code": "OB-4MJ7-GX7R",
  "valueTnd": 5.55,
  "status": "ACTIVE",
  "expiresAt": null
}`}
          curl={curl('/api/loyalty/voucher/validate', `{"code":"OB-4MJ7-GX7R"}`)}
        />

        <Endpoint
          icon={TicketX}
          title="Utiliser un bon (consommer)"
          path="/api/loyalty/voucher/redeem"
          desc="Une fois la réduction appliquée et le paiement confirmé, marque le bon comme utilisé (usage unique). Idempotent : rejouer renvoie alreadyRedeemed sans erreur."
          request={`{ "code": "OB-4MJ7-GX7R", "orderRef": "OBK-2026-00456" }`}
          response={`{
  "redeemed": true,
  "code": "OB-4MJ7-GX7R",
  "valueTnd": 5.55,
  "redeemedAt": "2026-07-24T03:34:34.928Z"
}`}
          curl={curl('/api/loyalty/voucher/redeem', `{"code":"OB-4MJ7-GX7R","orderRef":"OBK-2026-00456"}`)}
        />
      </div>

      {/* Codes HTTP */}
      <div className="rounded-2xl border border-black/[0.06] bg-white shadow-[var(--shadow-premium-sm)] p-5">
        <h3 className="text-sm font-bold text-ink-900 mb-3">Codes de réponse</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
          {[
            ['200 / 201', 'Succès (créé, lu, ou idempotent)'],
            ['400', 'Requête invalide (champ manquant)'],
            ['401', 'Secret API invalide/manquant'],
            ['404', 'Code de bon inconnu'],
            ['409', 'Bon expiré'],
          ].map(([code, label]) => (
            <div key={code} className="flex items-center gap-2">
              <code className="font-mono font-bold text-ink-800 w-16">{code}</code>
              <span className="text-ink-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
