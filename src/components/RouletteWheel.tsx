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
  onSpinSuccess: (prize: Prize, remainingSpins: number) => void
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

// Helper function to split text into 2 or 3 lines of roughly equal length,
// keeping parentheses (like value description) on a separate line.
function splitTextIntoLines(text: string): string[] {
  // 1. If there's a parenthesis, separate it
  const parenIndex = text.indexOf('(')
  if (parenIndex !== -1) {
    const mainText = text.substring(0, parenIndex).trim()
    const parenText = text.substring(parenIndex).trim()
    
    // Now split the main text into 1 or 2 lines
    if (mainText.length > 16) {
      const words = mainText.split(/\s+/)
      let bestSplit = Math.ceil(words.length / 2)
      let minDiff = Infinity
      for (let i = 1; i < words.length; i++) {
        const line1 = words.slice(0, i).join(' ')
        const line2 = words.slice(i).join(' ')
        const diff = Math.abs(line1.length - line2.length)
        if (diff < minDiff) {
          minDiff = diff
          bestSplit = i
        }
      }
      const line1 = words.slice(0, bestSplit).join(' ')
      const line2 = words.slice(bestSplit).join(' ')
      return [line1, line2, parenText]
    } else {
      return [mainText, parenText]
    }
  }

  // 2. If there are no parentheses, but the text is long (> 15 characters)
  if (text.length > 15) {
    const words = text.split(/\s+/)
    if (text.length > 25 && words.length >= 3) {
      // Split into 3 lines
      let bestSplits = [Math.floor(words.length / 3), Math.floor((2 * words.length) / 3)]
      let minDiff = Infinity
      for (let i = 1; i < words.length - 1; i++) {
        for (let j = i + 1; j < words.length; j++) {
          const line1 = words.slice(0, i).join(' ')
          const line2 = words.slice(i, j).join(' ')
          const line3 = words.slice(j).join(' ')
          const maxLen = Math.max(line1.length, line2.length, line3.length)
          const minLen = Math.min(line1.length, line2.length, line3.length)
          const diff = maxLen - minLen
          if (diff < minDiff) {
            minDiff = diff
            bestSplits = [i, j]
          }
        }
      }
      return [
        words.slice(0, bestSplits[0]).join(' '),
        words.slice(bestSplits[0], bestSplits[1]).join(' '),
        words.slice(bestSplits[1]).join(' ')
      ]
    } else {
      // Split into 2 lines
      let bestSplit = 1
      let minDiff = Infinity
      for (let i = 1; i < words.length; i++) {
        const line1 = words.slice(0, i).join(' ')
        const line2 = words.slice(i).join(' ')
        const diff = Math.abs(line1.length - line2.length)
        if (diff < minDiff) {
          minDiff = diff
          bestSplit = i
        }
      }
      return [
        words.slice(0, bestSplit).join(' '),
        words.slice(bestSplit).join(' ')
      ]
    }
  }

  // 3. For short text, keep it as 1 line
  return [text]
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
    if (isSpinning || spinMutation.isPending) return
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
            onSpinSuccess(data.prize, data.remainingSpins)
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
        className="self-end h-8 w-8 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95 cursor-pointer"
        title={muteSound ? "Activer le son" : "Désactiver le son"}
      >
        {muteSound ? (
          <VolumeX className="h-4 w-4 text-slate-400" />
        ) : (
          <Volume2 className="h-4 w-4 text-[#FF8C00]" />
        )}
      </button>

      {/* Wheel wrapper container */}
      <div 
        onClick={handleSpin}
        className={`relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center select-none transition-all duration-300 ${
          isSpinning || spinMutation.isPending 
            ? 'cursor-default pointer-events-none' 
            : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        
        {/* Pointer Indicator */}
        <div 
          className="absolute -top-4.5 z-30 drop-shadow-[0_4px_8px_rgba(255,140,0,0.35)] pointer-events-none"
          style={{
            width: 0,
            height: 0,
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderTop: '20px solid #FF8C00',
          }}
        />

        {/* Conic gradient rotating glow */}
        <div 
          className="absolute -inset-1 rounded-full opacity-35 blur-xs pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, #FF8C00, #FFFFFF, #FF8C00, #FFFFFF, #FF8C00)',
            animation: 'rotateGlow 8s linear infinite'
          }}
        />

        {/* Interactive SVG Wheel */}
        <svg
          className="w-[91%] h-[91%] rounded-full transform transition-transform"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionProperty: 'transform',
            transitionDuration: '4000ms',
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

              // White & Orange alternating theme colors
              let fillColor = '#FFFFFF'
              if (numPrizes % 2 === 0) {
                fillColor = index % 2 === 0 ? '#FFFFFF' : '#FFF6EE'
              } else {
                fillColor = index % 3 === 0 ? '#FFFFFF' : index % 3 === 1 ? '#FFF6EE' : '#FFEFE0'
              }
              const textColor = fillColor === '#FFFFFF' ? '#1A1A1A' : '#FF8C00'

              // Label placement coordinates for radial text
              const labelAngle = startAngle + segmentAngle / 2
              const labelRadius = 55
              const labelAngleRad = ((labelAngle - 90) * Math.PI) / 180.0
              const textX = 100 + labelRadius * Math.cos(labelAngleRad)
              const textY = 100 + labelRadius * Math.sin(labelAngleRad)

              const displayName = prize.name
              const lines = splitTextIntoLines(displayName)

              // Calculate font size dynamically based on length of the longest line
              const maxLineLength = Math.max(...lines.map(l => l.length))
              const baseMaxFontSize = numPrizes <= 4 ? 8.5 : numPrizes <= 6 ? 7.2 : numPrizes <= 8 ? 6.0 : 5.0
              const dynamicFontSize = 115 / maxLineLength
              const fontSize = Math.min(baseMaxFontSize, dynamicFontSize)

              return (
                <g key={prize.id}>
                  {/* Segment path */}
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
                    {lines.map((line, idx) => (
                      <tspan
                        key={idx}
                        x={textX}
                        dy={idx === 0 ? `${-((lines.length - 1) * 0.6)}em` : '1.2em'}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              )
            })}
          </g>

        </svg>

        {/* Static Bezel & LED Light Overlay (Does NOT rotate) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 200 200"
        >
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes rotateGlow {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes ledPulse {
              0%, 100% { opacity: 0.35; transform: scale(0.9); }
              50% { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 2.5px #FF8C00); }
            }
            .animate-led {
              animation: ledPulse 0.8s infinite ease-in-out;
            }
          `}} />

          {/* Outer Glass Bezel Ring */}
          <circle cx="100" cy="100" r="95.5" fill="none" stroke="#FFFFFF" strokeWidth="6" />
          <circle cx="100" cy="100" r="98.5" fill="none" stroke="#FFE4CC" strokeWidth="0.8" />
          <circle cx="100" cy="100" r="92.5" fill="none" stroke="#FFE4CC" strokeWidth="0.8" />

          {/* LED light bulbs marquee chase */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i * 360) / 20
            const rad = ((angle - 90) * Math.PI) / 180
            const cx = 100 + 95.5 * Math.cos(rad)
            const cy = 100 + 95.5 * Math.sin(rad)
            const delay = `${(i % 4) * 0.12}s`
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="1.8"
                fill={i % 2 === 0 ? '#FF8C00' : '#FFD700'}
                className="animate-led"
                style={{
                  animationDelay: delay,
                  transformOrigin: `${cx}px ${cy}px`
                }}
              />
            )
          })}
        </svg>

        {/* Decorative Center Cap (Static, does not block clicks) */}
        <div className="absolute h-12 w-12 rounded-full bg-white border-4 border-orange-100 flex items-center justify-center shadow-lg z-20 pointer-events-none">
          <div className="h-7 w-7 rounded-full bg-[#FF8C00] flex items-center justify-center">
            <Gift className="h-4 w-4 text-white" />
          </div>
        </div>
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
