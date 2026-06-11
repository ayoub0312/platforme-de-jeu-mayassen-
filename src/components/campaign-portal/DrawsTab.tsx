'use client'

import React from 'react'
import { Calendar, CheckCircle, Loader2, Trophy, Upload } from 'lucide-react'

interface DrawsTabProps {
  activeCampaign: any
  playerInfo: any
  uploadingReceipt: boolean
  handleReceiptUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleJoinDraw: () => void
}

export function DrawsTab({
  activeCampaign,
  playerInfo,
  uploadingReceipt,
  handleReceiptUpload,
  handleJoinDraw,
}: DrawsTabProps) {
  const drawPrizes = activeCampaign.prizes.filter((p: any) => p.drawDate)
  const partnerName = activeCampaign.partner?.name || 'Partenaire'

  const formatDrawDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return dateStr
    }
  }

  return (
    <div className="w-full text-left space-y-6">
      {/* Alert / Notice block */}
      <div className="bg-gradient-to-br from-orange-50/60 via-orange-50/30 to-transparent border border-orange-100 p-5 rounded-3xl relative overflow-hidden shadow-xs">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-orange-100/30 pointer-events-none">
          <Trophy className="h-24 w-24 stroke-[1.5]" />
        </div>
        <h3 className="text-xs font-black text-[#FF8C00] uppercase tracking-wider flex items-center gap-2">
          <span className="p-1 rounded-lg bg-orange-100/80 text-[#FF8C00]">
            <Trophy className="h-3.5 w-3.5" />
          </span>
          Tirages au Sort Actifs
        </h3>
        <p className="text-slate-600 text-xs mt-3 leading-relaxed font-medium">
          Ces lots d'exception ne figurent pas sur la roulette. Ils sont attribués par tirage au sort (<span className="font-semibold text-slate-850">Kor3a</span>) à la date indiquée après validation de vos défis de participation ci-dessous.
        </p>
      </div>

      {/* Prizes List */}
      <div className="space-y-6">
        {drawPrizes.length > 0 ? (
          drawPrizes.map((prize: any) => {
            return (
              <div
                key={prize.id}
                className="flex flex-col p-6 sm:p-7 rounded-3xl bg-white border border-slate-100 shadow-xs hover:shadow-md hover:border-orange-100/50 transition-all duration-300 relative overflow-hidden"
              >
                {/* Visual Accent Corner Glow */}
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-gradient-to-br from-orange-500/5 to-transparent rounded-full blur-xl pointer-events-none" />

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl shrink-0" role="img" aria-label="gift">🎁</span>
                      <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug">
                        {prize.name}
                      </h4>
                    </div>
                    <div className="text-xs text-slate-450 font-semibold flex items-center gap-1.5 pl-7.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Tirage le : {formatDrawDate(prize.drawDate!)}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-[9px] rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5 self-start sm:self-center shrink-0">
                    <Trophy className="h-3 w-3" /> Grand Prix
                  </span>
                </div>

                {/* Step-by-step challenges for this Draw */}
                <div className="flex flex-col gap-4 w-full mt-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    📋 Étapes de participation :
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Étape 1: Receipt Upload */}
                    {playerInfo?.completedTasks?.includes('RECEIPT_UPLOAD') ? (
                      <div className="flex flex-col p-5 rounded-2xl bg-emerald-50/20 gap-3 relative overflow-hidden">
                        <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 text-emerald-500/10 pointer-events-none">
                          <CheckCircle className="h-16 w-16 fill-emerald-500/5" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-emerald-600 fill-emerald-100" /> Étape 1 : Validée
                          </span>
                          <p className="text-[10px] text-emerald-700/80 mt-1.5 font-semibold leading-normal">
                            Votre ticket de caisse {partnerName} a été importé et validé avec succès.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-50/80 gap-4 transition-all duration-200">
                        <div>
                          <span className="text-xs font-extrabold text-slate-800 block">🧾 Étape 1 : Scanner le ticket</span>
                          <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                            Importez votre ticket de caisse {partnerName} comme preuve d'achat pour deblocquer l'inscription.
                          </p>
                        </div>

                        <div className="mt-auto pt-3 flex items-center justify-end border-t border-slate-200/50">
                          <div className="relative shrink-0 w-full">
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              id={`receipt-file-input-${prize.id}`}
                              disabled={uploadingReceipt}
                              onChange={handleReceiptUpload}
                              className="hidden"
                            />
                            <label
                              htmlFor={`receipt-file-input-${prize.id}`}
                              className="w-full py-3 bg-gradient-to-r from-orange-500 to-[#FF8C00] hover:from-[#e07b00] hover:to-[#FF8C00] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/10 cursor-pointer active:scale-95"
                            >
                              {uploadingReceipt ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                  <span>Analyse du ticket...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-3.5 w-3.5" />
                                  <span>Importer mon ticket</span>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Étape 2: Join Draw */}
                    {playerInfo?.completedTasks?.includes('JOIN_DRAW') ? (
                      <div className="flex flex-col p-5 rounded-2xl bg-emerald-50/20 gap-3 relative overflow-hidden">
                        <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 text-emerald-500/10 pointer-events-none">
                          <CheckCircle className="h-16 w-16 fill-emerald-500/5" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-emerald-600 fill-emerald-100" /> Étape 2 : Inscrit !
                          </span>
                          <p className="text-[10px] text-emerald-700/80 mt-1.5 font-semibold leading-normal">
                            Félicitations, votre inscription pour le tirage au sort de ce grand prix est validée.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col p-5 rounded-2xl bg-slate-50/50 gap-4 transition-all duration-200">
                        <div>
                          <span className="text-xs font-extrabold text-slate-800 block">🎟️ Étape 2 : S'inscrire au Tirage</span>
                          <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                            Validez votre participation officielle au tirage pour avoir une chance d'être tiré au sort.
                          </p>
                        </div>

                        <div className="mt-auto pt-3 flex items-center justify-end border-t border-slate-200/50 w-full">
                          {playerInfo?.completedTasks?.includes('RECEIPT_UPLOAD') ? (
                            <button
                              onClick={handleJoinDraw}
                              className="w-full py-3 bg-gradient-to-r from-orange-500 to-[#FF8C00] hover:from-[#e07b00] hover:to-[#FF8C00] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/10 cursor-pointer active:scale-95"
                            >
                              🎟️ M'inscrire au tirage
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full py-3 bg-slate-100 text-slate-400 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                              title="Validez d'abord l'Étape 1 (scanner ticket)"
                            >
                              🔒 Étape bloquée
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-12 text-xs text-slate-450 bg-slate-50 border border-slate-150 rounded-2xl font-semibold">
            Aucun tirage prévu pour cette campagne.
          </div>
        )}
      </div>
    </div>
  )
}
