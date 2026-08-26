const CIRCLE_LENGTH = 2 * Math.PI * 24
const CHECK_LENGTH = 24 * Math.sqrt(2)

export default function AnimatedCheckmark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" fill="none" className={className}>
      <circle
        cx="26"
        cy="26"
        r="24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray={CIRCLE_LENGTH}
        strokeDashoffset={CIRCLE_LENGTH}
        style={{
          animation: 'draw-stroke 0.4s ease-out forwards',
        }}
      />
      <path
        d="M14 27l7 7 17-17"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={CHECK_LENGTH}
        strokeDashoffset={CHECK_LENGTH}
        style={{
          animation: 'draw-stroke 0.3s ease-out 0.35s forwards',
        }}
      />
    </svg>
  )
}
