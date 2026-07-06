import { Plane } from 'lucide-react'

interface FlightLineProps {
  className?: string
  // Page-local usage (default): absolutely positioned inside a specific section.
  // Global usage: fixed to the viewport so it's present on every route.
  fixed?: boolean
  // Global usage is permanently on screen rather than a one-off accent inside
  // a single section, so it needs a noticeably lower opacity to stay discreet.
  dim?: boolean
}

// Decorative dashed flight line — a plane drifts across it in a slow loop.
// Pure CSS animation (see .animate-flight-cross in globals.css), no JS/Framer
// Motion needed since it's a simple one-axis loop. Pointer-events: none, so it
// never interferes with whatever it sits in front of.
export function FlightLine({ className = '', fixed = false, dim = false }: FlightLineProps) {
  return (
    <div
      className={`${fixed ? 'fixed' : 'absolute'} inset-x-0 flex items-center overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <div className={`h-px w-full bg-gradient-to-r from-transparent ${dim ? 'via-[#F97316]/12' : 'via-[#F97316]/25'} to-transparent`} />
      <div className={`absolute animate-flight-cross ${dim ? 'text-[#FF8C00]/22' : 'text-[#FF8C00]/45'}`}>
        <Plane className="h-4 w-4 rotate-90" strokeWidth={2} />
      </div>
    </div>
  )
}
