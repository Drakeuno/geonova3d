// Logo: la retícula del anteojo del nivel, con sus hilos estadimétricos.

export function LogoAnteojo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden className="shrink-0">
      <rect width="36" height="36" rx="9" className="fill-bosque-700" />
      <circle cx="18" cy="18" r="11" fill="none" stroke="white" strokeWidth="2" />
      <line x1="18" y1="7" x2="18" y2="29" stroke="white" strokeWidth="1.5" />
      <line x1="7" y1="18" x2="29" y2="18" stroke="white" strokeWidth="1.5" />
      <line x1="14" y1="13" x2="22" y2="13" className="stroke-buey-200" strokeWidth="1.2" />
      <line x1="14" y1="23" x2="22" y2="23" className="stroke-buey-200" strokeWidth="1.2" />
    </svg>
  )
}
