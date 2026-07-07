'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { trpc } from '@/utils/trpc'
import { RefreshCw, Trophy, Volume2, VolumeX } from 'lucide-react'

interface Prize {
  id: string
  name: string
  type: string
  totalStock: number
  remainingStock: number
  winProbability: number
  fallbackPrizeId: string | null
  color?: string | null
  imageData?: string | null
  imageMimeType?: string | null
}

interface RouletteWheelProps {
  campaignId: string
  prizes: Prize[]
  email: string
  onSpinSuccess: (prize: Prize, remainingSpins: number) => void
  // Larger responsive sizing for the premium standalone /play page (default keeps the compact widget size)
  size?: 'default' | 'premium'
  // Simulates a spin entirely client-side (weighted by winProbability) — used by the
  // wizard's live preview / "Tester" button and by the admin config screen, never hits the backend.
  previewMode?: boolean
  // Shows a 3-2-1-GO countdown overlay before the wheel actually starts spinning
  showCountdown?: boolean
  // Increment this number from the parent to programmatically trigger a spin
  // (used by the wizard's "Tester" button)
  spinTrigger?: number
  // Set by the parent when the player has 0 spins left — blocks both click and
  // keyboard activation client-side (the server already rejects it either way).
  disabled?: boolean
}

// Relative luminance (WCAG) to pick a readable black/white label color against a custom segment color
function getContrastTextColor(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return '#1A1A1A'
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.6 ? '#1A1A1A' : '#FFFFFF'
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

// Suspense beat before the wheel appears — a hand-drawn SVG gift box whose lid
// flies open with a light burst. Purely decorative (no game logic), skippable
// by clicking, and shown only once per mount (see `showIntro` in the parent).
function GiftBoxIntro({ onSkip, size }: { onSkip: () => void; size: 'default' | 'premium' }) {
  return (
    <div
      onClick={onSkip}
      className={`relative ${size === 'premium' ? 'w-[90%] max-w-[560px] aspect-square sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px]' : 'w-72 h-72 sm:w-80 sm:h-80'} flex flex-col items-center justify-center select-none cursor-pointer`}
      title="Cliquez pour passer"
    >
      {/* Light burst behind the box */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255,196,102,0.9) 0%, rgba(249,115,22,0.35) 45%, transparent 75%)',
          willChange: 'width, height, opacity',
        }}
        initial={{ width: 20, height: 20, opacity: 0 }}
        animate={{ width: 260, height: 260, opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.9, delay: 0.45, ease: 'easeOut' }}
      />

      <svg width="140" height="140" viewBox="0 0 140 140" className="relative">
        <defs>
          <linearGradient id="giftBoxBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="giftBoxLid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FDBA74" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>

        {/* Box body */}
        <motion.rect
          x="30" y="65" width="80" height="60" rx="8"
          fill="url(#giftBoxBody)"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: [1, 1.04, 1] }}
          style={{ transformOrigin: '70px 125px' }}
          transition={{ duration: 0.4, delay: 0.05 }}
        />
        <rect x="62" y="65" width="16" height="60" fill="#C2410C" opacity="0.85" />

        {/* Lid — flies up and rotates open, revealing the burst */}
        <motion.g
          initial={{ y: 0, rotate: 0, opacity: 1 }}
          animate={{ y: -70, rotate: -35, opacity: 0 }}
          style={{ transformOrigin: '70px 60px', willChange: 'transform, opacity' }}
          transition={{ duration: 0.55, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <rect x="24" y="50" width="92" height="20" rx="6" fill="url(#giftBoxLid)" />
          <rect x="62" y="50" width="16" height="20" fill="#C2410C" opacity="0.85" />
          <circle cx="70" cy="48" r="9" fill="#FDBA74" />
        </motion.g>
      </svg>

      <motion.p
        className="absolute -bottom-1 text-[11px] font-bold text-slate-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Cliquez pour passer
      </motion.p>
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

export function RouletteWheel({ campaignId, prizes, email, onSpinSuccess, size = 'default', previewMode = false, showCountdown = false, spinTrigger, disabled = false }: RouletteWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [muteSound, setMuteSound] = useState(false)
  const [winningPrize, setWinningPrize] = useState<Prize | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [countdownValue, setCountdownValue] = useState<number | 'GO' | null>(null)
  const [lastRemainingSpins, setLastRemainingSpins] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  // Shown once per mount, never again on subsequent spins/relaunches within the
  // same session (this state only resets if the component itself remounts).
  // Skipped entirely in previewMode (admin "Tester" button).
  const [showIntro, setShowIntro] = useState(!previewMode)

  // useReducedMotion() resolves to null/false during the very first render (it
  // only knows the real value after mount), so it's checked here rather than
  // baked into the useState initializer above.
  useEffect(() => {
    if (prefersReducedMotion) setShowIntro(false)
  }, [prefersReducedMotion])

  useEffect(() => {
    if (!showIntro) return
    const t = setTimeout(() => setShowIntro(false), 1300)
    return () => clearTimeout(t)
  }, [showIntro])

  // Small celebratory buzz on mobile when the result reveals — silently a no-op
  // wherever the Vibration API isn't available (desktop browsers, iOS Safari).
  useEffect(() => {
    if (showResult && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 30, 40, 30, 80])
    }
  }, [showResult])

  const rotationRef = useRef(0)
  const spinMutation = trpc.spinRoulette.useMutation()

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev)
    }, 5000)
  }

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

  // Animates the wheel to land on `data.prize` — shared by both the real
  // backend-verified spin and the client-only preview simulation.
  const animateToResult = (data: { prize: Prize; prizeIndex: number; remainingSpins: number }) => {
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
      setLastRemainingSpins(data.remainingSpins)
      playWinSound()
      // Callback to update parent layout
      onSpinSuccess(data.prize, data.remainingSpins)
    }, animationDuration)
  }

  // Client-only weighted random draw — mirrors the backend's cumulative-probability
  // logic, but never touches stock/tokens. Only used in previewMode.
  const simulatePreviewSpin = () => {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    const randomValue = array[0] / 4294967295
    let selected = prizes[prizes.length - 1]
    let cumulative = 0
    for (const prize of prizes) {
      cumulative += prize.winProbability
      if (randomValue <= cumulative) {
        selected = prize
        break
      }
    }
    const prizeIndex = prizes.findIndex((p) => p.id === selected.id)
    animateToResult({ prize: selected, prizeIndex, remainingSpins: 0 })
  }

  const startSpin = () => {
    setIsSpinning(true)
    setShowResult(false)
    setWinningPrize(null)

    if (previewMode) {
      simulatePreviewSpin()
      return
    }

    // Call backend to draw and decrement stock atomically
    spinMutation.mutate(
      { campaignId, email },
      {
        onSuccess: (data) => animateToResult(data),
        onError: (err) => {
          setIsSpinning(false)
          showToast(err.message)
        },
      }
    )
  }

  const handleSpin = () => {
    if (disabled || isSpinning || spinMutation.isPending || countdownValue !== null) return

    if (!showCountdown) {
      startSpin()
      return
    }

    // 3-2-1-GO countdown overlay, then trigger the real spin
    let step = 3
    setCountdownValue(step)
    const tick = () => {
      step -= 1
      if (step > 0) {
        setCountdownValue(step)
        setTimeout(tick, 600)
      } else {
        setCountdownValue('GO')
        setTimeout(() => {
          setCountdownValue(null)
          startSpin()
        }, 500)
      }
    }
    setTimeout(tick, 600)
  }

  // Lets a parent (the wizard's "Tester" button) trigger a spin imperatively
  useEffect(() => {
    if (spinTrigger !== undefined && spinTrigger > 0) {
      handleSpin()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinTrigger])

  const numPrizes = prizes.length
  const segmentAngle = 360 / numPrizes

  return (
    <div className="flex flex-col items-center gap-6 py-4 w-full relative">
      {/* Screen-reader-only announcement of the spin result — visually hidden,
          read aloud by assistive tech the moment showResult flips to true. */}
      <div role="status" aria-live="polite" className="sr-only">
        {showResult && winningPrize
          ? `Félicitations, vous avez remporté : ${winningPrize.name}.`
          : isSpinning
            ? 'La roulette tourne...'
            : ''}
      </div>

      {/* Toast message notification */}
      {toastMessage && (
        <div className="absolute top-0 inset-x-0 z-50 bg-slate-900 border border-slate-800 text-white text-[11px] font-black px-4 py-3 rounded-xl shadow-xl flex items-center justify-between gap-3 animate-fade-in">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

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

      {/* Suspense beat before the wheel — shown once per mount, click to skip */}
      {showIntro ? (
        <GiftBoxIntro onSkip={() => setShowIntro(false)} size={size} />
      ) : (
      <motion.div
        ref={wheelRef}
        onClick={handleSpin}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={disabled ? 'Roulette — plus aucun lancer disponible' : 'Lancer la roulette'}
        aria-disabled={disabled || isSpinning || spinMutation.isPending || countdownValue !== null}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleSpin()
          }
        }}
        initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`relative ${size === 'premium' ? 'w-[90%] max-w-[560px] aspect-square sm:w-[500px] sm:h-[500px] lg:w-[600px] lg:h-[600px]' : 'w-72 h-72 sm:w-80 sm:h-80'} flex items-center justify-center select-none transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF8C00]/40 rounded-full ${
          disabled || isSpinning || spinMutation.isPending || countdownValue !== null
            ? 'cursor-default pointer-events-none opacity-60'
            : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {/* 3-2-1-GO countdown overlay */}
        {countdownValue !== null && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-full">
            <span className="text-6xl font-black text-[#FF8C00] animate-fade-in" key={countdownValue}>
              {countdownValue}
            </span>
          </div>
        )}

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

              // Use the admin-configured segment color when set, otherwise fall
              // back to a vivid, high-contrast rotating palette so every
              // segment reads as a clearly distinct wedge (classic wheel look)
              // instead of near-white tones blending into each other.
              const FALLBACK_PALETTE: [fill: string, text: string][] = [
                ['#F58220', '#FFFFFF'],
                ['#1F1F1F', '#FFFFFF'],
                ['#FFFFFF', '#1A1A1A'],
                ['#C25612', '#FFFFFF'],
              ]
              const [fillColor, fallbackTextColor] = prize.color
                ? [prize.color, getContrastTextColor(prize.color)]
                : FALLBACK_PALETTE[index % FALLBACK_PALETTE.length]
              const textColor = fallbackTextColor

              // Label placement coordinates for radial text
              const labelAngle = startAngle + segmentAngle / 2
              const labelRadius = 55
              const labelAngleRad = ((labelAngle - 90) * Math.PI) / 180.0
              const textX = 100 + labelRadius * Math.cos(labelAngleRad)
              const textY = 100 + labelRadius * Math.sin(labelAngleRad)

              const hasImage = !!prize.imageData
              const wedgePathD = `M 100 100 L ${start.x} ${start.y} A 95 95 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`

              const displayName = prize.name
              const lines = splitTextIntoLines(displayName)

              // Calculate font size dynamically based on length of the longest line
              const maxLineLength = Math.max(...lines.map(l => l.length))
              const baseMaxFontSize = numPrizes <= 4 ? 8.5 : numPrizes <= 6 ? 7.2 : numPrizes <= 8 ? 6.0 : 5.0
              const dynamicFontSize = 115 / maxLineLength
              const fontSize = Math.min(baseMaxFontSize, dynamicFontSize)

              return (
                <g key={prize.id}>
                  {/* Segment path — flat color fill, or left transparent so the
                      admin's photo (clipped to this same wedge shape below) shows instead */}
                  <path
                    d={wedgePathD}
                    fill={hasImage ? 'none' : fillColor}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  {hasImage && (
                    <>
                      <defs>
                        <clipPath id={`wedge-photo-clip-${prize.id}`}>
                          <path d={wedgePathD} />
                        </clipPath>
                      </defs>
                      <image
                        href={`data:${prize.imageMimeType || 'image/jpeg'};base64,${prize.imageData}`}
                        x="2"
                        y="2"
                        width="196"
                        height="196"
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#wedge-photo-clip-${prize.id})`}
                      />
                      {/* Re-stroke the wedge border on top of the photo for a crisp edge */}
                      <path d={wedgePathD} fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
                    </>
                  )}
                  {/* Segment Prize Text */}
                  <text
                    x={textX}
                    y={textY}
                    fill={hasImage ? '#FFFFFF' : textColor}
                    fontSize={fontSize}
                    fontWeight="850"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${labelAngle - 90}, ${textX}, ${textY})`}
                    className="tracking-wide"
                    style={hasImage ? { paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.65)', strokeWidth: fontSize * 0.3, strokeLinejoin: 'round' } : undefined}
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

          {/* Outer solid ring — thick brand-colored band, like a classic prize wheel rim */}
          <circle cx="100" cy="100" r="96" fill="none" stroke="#F58220" strokeWidth="7" />
          <circle cx="100" cy="100" r="99.5" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="100" cy="100" r="92.5" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />

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
                fill={i % 2 === 0 ? '#FFFFFF' : '#FFD700'}
                className="animate-led"
                style={{
                  animationDelay: delay,
                  transformOrigin: `${cx}px ${cy}px`
                }}
              />
            )
          })}
        </svg>

        {/* Decorative Center Cap (Static, does not block clicks) — bold "JOUER"
            disc, sized and styled like a classic wheel's "GO" button. */}
        <div
          className={`absolute rounded-full flex items-center justify-center shadow-lg z-20 pointer-events-none border-4 border-white ${size === 'premium' ? 'h-24 w-24' : 'h-16 w-16'}`}
          style={{ background: 'radial-gradient(circle at 35% 30%, #FFAB5C, #F58220 55%, #C25612 100%)' }}
        >
          <span className={`font-black tracking-wide text-white ${size === 'premium' ? 'text-base' : 'text-xs'}`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
            JOUER
          </span>
        </div>
      </motion.div>
      )}

      {/* Result overlay modal (White & Orange) */}
      {showResult && winningPrize && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in z-40 rounded-[28px] shadow-inner overflow-hidden">
          {/* Light burst explosion behind the trophy */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,196,102,0.85) 0%, rgba(249,115,22,0.3) 45%, transparent 75%)',
              willChange: 'width, height, opacity',
            }}
            initial={prefersReducedMotion ? { opacity: 0 } : { width: 20, height: 20, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 0 } : { width: 420, height: 420, opacity: [0, 1, 0] }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />

          <div className="inline-flex p-3.5 rounded-full bg-orange-50 border border-orange-100 text-[#FF8C00] mb-4 animate-bounce relative">
            <Trophy className="h-7 w-7" />
          </div>
          <h4 className="text-lg font-extrabold text-[#FF8C00] relative">Félicitations !</h4>
          <p className="text-slate-550 text-xs mt-1 relative">Vous avez remporté :</p>

          {/* Prize card — 3D flip reveal */}
          <div className="relative mt-3" style={{ perspective: 800 }}>
            <motion.div
              initial={prefersReducedMotion ? undefined : { rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
              className="text-xs font-black text-[#1A1A1A] tracking-wide px-5 py-3 rounded-xl bg-orange-50 border border-orange-100 inline-block shadow-sm leading-normal max-w-[250px]"
            >
              {winningPrize.name}
            </motion.div>
          </div>

          <p className="text-[10px] text-slate-450 mt-4 leading-relaxed max-w-[230px] relative">
            {winningPrize.type === 'DIGITAL' 
              ? 'Un e-mail de confirmation vient de vous être envoyé pour activer votre gain.' 
              : 'Notre équipe vous contactera par téléphone pour organiser la remise de votre lot.'}
          </p>
          
          <div className="relative mt-6 flex items-center gap-3">
            {lastRemainingSpins > 0 && (
              <button
                onClick={() => {
                  setShowResult(false)
                  handleSpin()
                }}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Relancer
              </button>
            )}
            <button
              onClick={() => {
                setShowResult(false)
                wheelRef.current?.focus()
              }}
              className="px-6 py-2.5 bg-[#FF8C00] hover:bg-[#e07b00] text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/10 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
