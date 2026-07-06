// Animated "waves" backdrop, mounted globally (layout.tsx) on every public
// route. Pure CSS (transform-only keyframes in globals.css) — no Framer Motion,
// no JS animation loop — so it stays cheap on low-end mobile. Sits at
// z-index: 0 behind the content (which is explicitly z-10 where needed), never
// at a negative z-index, so it can't be pushed behind the page's own
// background across browsers.
// Blobs 4 and 5 are hidden below `sm:` — now that this runs persistently on
// every page rather than just once on the homepage, fewer blurred layers on
// weak mobile GPUs keeps compositing cheap.
export function WaveBackground() {
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      style={{ backgroundColor: 'var(--color-brand-warm-white)' }}
      aria-hidden="true"
    >
      <div
        className="animate-wave-1 absolute -top-16 -left-24 w-[300px] h-[300px] blur-[32px] sm:w-[480px] sm:h-[480px] sm:blur-[56px] lg:w-[640px] lg:h-[640px] lg:blur-[72px] rounded-full opacity-[0.18]"
        style={{
          background: 'radial-gradient(circle, var(--color-brand-orange) 0%, var(--color-brand-gold) 50%, transparent 75%)',
        }}
      />
      <div
        className="animate-wave-2 absolute top-[32%] -right-24 w-[280px] h-[280px] blur-[32px] sm:w-[450px] sm:h-[450px] sm:blur-[56px] lg:w-[600px] lg:h-[600px] lg:blur-[72px] rounded-full opacity-[0.16]"
        style={{
          background: 'radial-gradient(circle, var(--color-brand-gold) 0%, var(--color-brand-orange) 50%, transparent 75%)',
        }}
      />
      <div
        className="animate-wave-3 absolute bottom-[-8%] left-[15%] w-[280px] h-[280px] blur-[32px] sm:w-[450px] sm:h-[450px] sm:blur-[56px] lg:w-[600px] lg:h-[600px] lg:blur-[72px] rounded-full opacity-[0.17]"
        style={{
          background: 'radial-gradient(circle, var(--color-brand-orange) 0%, var(--color-brand-gold) 50%, transparent 75%)',
        }}
      />
      <div
        className="hidden sm:block animate-wave-4 absolute top-[8%] left-[45%] w-[380px] h-[380px] blur-[48px] lg:w-[500px] lg:h-[500px] lg:blur-[64px] rounded-full opacity-[0.12]"
        style={{
          background: 'radial-gradient(circle, var(--color-brand-gold) 0%, var(--color-brand-orange) 50%, transparent 75%)',
        }}
      />
      <div
        className="hidden sm:block animate-wave-5 absolute bottom-[5%] right-[10%] w-[380px] h-[380px] blur-[48px] lg:w-[500px] lg:h-[500px] lg:blur-[64px] rounded-full opacity-[0.14]"
        style={{
          background: 'radial-gradient(circle, var(--color-brand-orange) 0%, var(--color-brand-gold) 50%, transparent 75%)',
        }}
      />

      {/* Subtle grain — sits above the blobs, breaks up the flat gradient */}
      <div className="absolute inset-0 bg-grain-texture" />
    </div>
  )
}
