'use client'

import React, { useState, useRef } from 'react'
import { trpc } from '@/utils/trpc'
import { Gift, HelpCircle, RefreshCw, Star, Trophy, Volume2, VolumeX } from 'lucide-react'

interface Prize {
  id: string
  name: string
  type: string
  totalStock: number
  remainingStock: number
  winProbability: number
  fallbackPrizeId: string | null
}

interface RouletteWheelProps {
  campaignId: string
  prizes: Prize[]
  email: string
  onSpinSuccess: (prizeName: string, remainingSpins: number) => void
}

// Custom CSS Confetti Component
function Confetti() {
  const pieces = Array.from({ length: 80 }).map((_, i) => {
    const left = Math.random() * 100
    const delay = Math.random() * 1.5
    const duration = 2.0 + Math.random() * 1.5
    const size = 6 + Math.random() * 7
    const color = Math.random() > 0.5 ? '#FF8C00' : '#FFFFFF'
    const isRound = Math.random() > 0.5
    return { id: i, left, delay, duration, size, color, isRound }
  })

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50 rounded-[32px]">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.isRound ? '50%' : '2px',
            border: p.color === '#FFFFFF' ? '1px solid #E5E7EB' : 'none'
          }}
        />
      ))}
    </div>
  )
}

export function RouletteWheel({ campaignId, prizes, email, onSpinSuccess }: RouletteWheelProps) {
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [muteSound, setMuteSound] = useState(false)
  const [winningPrize, setWinningPrize] = useState<Prize | null>(null)
  const [showResult, setShowResult] = useState(false)
  
  const rotationRef = useRef(0)
  const spinMutation = trpc.spinRoulette.useMutation()

  // Web Audio API tick sound synthesizer
  const playTickSound = () => {
    if (muteSound || typeof window === 'undefined') return
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return
      
      const audioCtx = new AudioContext()
      const osc = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(600, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.06)

      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06)

      osc.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      osc.start()
      osc.stop(audioCtx.currentTime + 0.06)
    } catch (e) {
      // Audio context might be blocked by browser autoplay policy
    }
  }

  // Synthesize a fanfare sound for wins
  const playWinSound = () => {
    if (muteSound || typeof window === 'undefined') return
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      const audioCtx = new AudioContext()
      const notes = [261.63, 329.63, 392.00, 523.25] // C, E, G, C chords

      notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator()
        const gainNode = audioCtx.createGain()
        
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + index * 0.1)
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + index * 0.1 + 0.02)
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + index * 0.1 + 0.3)
        
        osc.connect(gainNode)
        gainNode.connect(audioCtx.destination)
        
        osc.start(audioCtx.currentTime + index * 0.1)
        osc.stop(audioCtx.currentTime + index * 0.1 + 0.3)
      })
    } catch (e) {}
  }

  const handleSpin = () => {
    if (isSpinning) return
    setIsSpinning(true)
    setShowResult(false)
    setWinningPrize(null)

    // Call backend to draw and decrement stock atomically
    spinMutation.mutate(
      { campaignId, email },
      {
        onSuccess: (data) => {
          const numPrizes = prizes.length
          const segmentAngle = 360 / numPrizes
          
          // Target angle to center the winning segment at 12 o'clock (0 degrees)
          // 0 index is at top if pointer is aligned.
          const targetSegmentCenter = data.prizeIndex * segmentAngle + segmentAngle / 2
          
          // Calculate rotation delta: add 5 full spins (1800 deg) for suspense
          const nextRotation = rotationRef.current + 1800 + (360 - (targetSegmentCenter + (rotationRef.current % 360)))
          
          rotationRef.current = nextRotation
          setRotation(nextRotation)
          setWinningPrize(data.prize)

          // Play tick sounds as segments pass by during animation
          let lastTickDeg = 0
          const startTimestamp = performance.now()
          const animationDuration = 4000 // 4 seconds

          const checkTick = (now: number) => {
            const elapsed = now - startTimestamp
            if (elapsed < animationDuration) {
              // Cubic bezier easing approximation to sync ticks with deceleration
              const progress = elapsed / animationDuration
              const easedProgress = 1 - Math.pow(1 - progress, 3) // easeOutCubic
              const currentDeg = easedProgress * (nextRotation - (rotationRef.current - 1800))
              
              if (currentDeg - lastTickDeg >= segmentAngle) {
                playTickSound()
                lastTickDeg = currentDeg
              }
              requestAnimationFrame(checkTick)
            }
          }
          requestAnimationFrame(checkTick)

          // Complete the spin after animation ends
          setTimeout(() => {
            setIsSpinning(false)
            setShowResult(true)
            playWinSound()
            // Callback to update parent layout
            onSpinSuccess(data.prize.name, data.remainingSpins)
          }, animationDuration)
        },
        onError: (err) => {
          setIsSpinning(false)
          alert(err.message)
        },
      }
    )
  }

  const numPrizes = prizes.length
  const segmentAngle = 360 / numPrizes

  return (
    <div className="flex flex-col items-center gap-6 py-4 w-full relative">
      {/* Confetti element when winning */}
      {showResult && winningPrize && <Confetti />}

      {/* Sound toggle button */}
      <button
        onClick={() => setMuteSound(!muteSound)}
        className="self-end px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
      >
        {muteSound ? (
          <>
            <VolumeX className="h-3.5 w-3.5 text-slate-400" /> Son désactivé
          </>
        ) : (
          <>
            <Volume2 className="h-3.5 w-3.5 text-[#FF8C00]" /> Son activé
          </>
        )}
      </button>

      {/* Wheel wrapper container */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center select-none">
        
        {/* Pointer Indicator */}
        <div className="absolute -top-3.5 z-30 drop-shadow-[0_4px_8px_rgba(255,140,0,0.35)]">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-[#FF8C00] rounded-sm"></div>
        </div>

        {/* Outer frame */}
        <div className="absolute inset-0 rounded-full border-[6px] border-white shadow-[0_8px_30px_rgba(0,0,0,0.06),_0_0_1px_rgba(0,0,0,0.2)] bg-slate-50 pointer-events-none"></div>

        {/* Interactive SVG Wheel */}
        <svg
          className="w-[94%] h-[94%] rounded-full transform transition-transform duration-[4000ms] cubic-bezier(0.1, 0.8, 0.2, 1)"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionTimingFunction: 'cubic-bezier(0.1, 0.8, 0.2, 1)',
          }}
          viewBox="0 0 200 200"
        >
          {/* Wheel Segments */}
          <g>
            {prizes.map((prize, index) => {
              const startAngle = index * segmentAngle
              const endAngle = startAngle + segmentAngle
              
              // Polar coordinates conversion helper
              const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
                const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
                return {
                  x: centerX + radius * Math.cos(angleInRadians),
                  y: centerY + radius * Math.sin(angleInRadians),
                }
              }

              // SVG arc math
              const start = polarToCartesian(100, 100, 95, endAngle)
              const end = polarToCartesian(100, 100, 95, startAngle)
              const largeArcFlag = segmentAngle <= 180 ? '0' : '1'

              // White & Orange alternating theme colors (supporting odd counts to avoid adjacent duplicates)
              let fillColor = '#FFFFFF'
              if (numPrizes % 2 === 0) {
                fillColor = index % 2 === 0 ? '#FFFFFF' : '#FFF6EE'
              } else {
                fillColor = index % 3 === 0 ? '#FFFFFF' : index % 3 === 1 ? '#FFF6EE' : '#FFEFE0'
              }
              const textColor = fillColor === '#FFFFFF' ? '#1A1A1A' : '#FF8C00'

              // Label placement coordinates for radial text (aligned with radius)
              const labelAngle = startAngle + segmentAngle / 2
              const labelRadius = 55 // Optimal radius to place the label in the center of the segment length
              const labelAngleRad = ((labelAngle - 90) * Math.PI) / 180.0
              const textX = 100 + labelRadius * Math.cos(labelAngleRad)
              const textY = 100 + labelRadius * Math.sin(labelAngleRad)

              // No truncation - show the full prize name
              const displayName = prize.name

              // Calculate font size dynamically based on length of text and number of prizes
              // so that the full text always fits radially without needing truncation
              const baseMaxFontSize = numPrizes <= 4 ? 7.2 : numPrizes <= 6 ? 6.2 : numPrizes <= 8 ? 5.2 : 4.5
              const dynamicFontSize = 125 / displayName.length
              const fontSize = Math.min(baseMaxFontSize, dynamicFontSize)

              return (
                <g key={prize.id}>
                  {/* Segment path - with distinct warm border for clear compartment separation */}
                  <path
                    d={`M 100 100 L ${start.x} ${start.y} A 95 95 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`}
                    fill={fillColor}
                    stroke="#FFE4CC"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  {/* Segment Prize Text */}
                  <text
                    x={textX}
                    y={textY}
                    fill={textColor}
                    fontSize={fontSize}
                    fontWeight="850"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${labelAngle - 90}, ${textX}, ${textY})`}
                    className="tracking-wide"
                  >
                    {displayName}
                  </text>
                </g>
              )
            })}
          </g>

          {/* White Center Hub */}
          <circle cx="100" cy="100" r="18" fill="#FFFFFF" className="stroke-[2.5] stroke-[#FF8C00] shadow-sm" />
          <circle cx="100" cy="100" r="15" fill="#FFEFE0" />
        </svg>

        {/* Spin Center Button overlay (Static) */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || spinMutation.isPending}
          className={`absolute h-16 w-16 rounded-full flex flex-col items-center justify-center border-4 border-white shadow-xl transition-all duration-200 ${
            isSpinning 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-[#FF8C00] hover:bg-[#e07b00] text-white hover:scale-105 active:scale-95 cursor-pointer'
          }`}
        >
          {spinMutation.isPending ? (
            <RefreshCw className="h-5 w-5 animate-spin text-white" />
          ) : (
            <>
              <Gift className="h-5 w-5 text-white mb-0.5" />
              <span className="text-[9px] font-black tracking-wider leading-none uppercase">TOURNER</span>
            </>
          )}
        </button>
      </div>

      {/* Result overlay modal (White & Orange) */}
      {showResult && winningPrize && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in z-40 rounded-[28px] shadow-inner">
          <div className="inline-flex p-3.5 rounded-full bg-orange-50 border border-orange-100 text-[#FF8C00] mb-4 animate-bounce">
            <Trophy className="h-7 w-7" />
          </div>
          <h4 className="text-lg font-extrabold text-[#FF8C00]">Félicitations !</h4>
          <p className="text-slate-550 text-xs mt-1">Vous avez remporté :</p>
          <div className="text-xs font-black text-[#1A1A1A] mt-3 tracking-wide px-5 py-3 rounded-xl bg-orange-50 border border-orange-100 inline-block shadow-sm leading-normal max-w-[250px]">
            {winningPrize.name}
          </div>
          <p className="text-[10px] text-slate-450 mt-4 leading-relaxed max-w-[230px]">
            {winningPrize.type === 'DIGITAL' 
              ? 'Un e-mail de confirmation vient de vous être envoyé pour activer votre gain.' 
              : 'Notre équipe vous contactera par téléphone pour organiser la remise de votre lot.'}
          </p>
          
          <button
            onClick={() => setShowResult(false)}
            className="mt-6 px-6 py-2.5 bg-[#FF8C00] hover:bg-[#e07b00] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  )
}
