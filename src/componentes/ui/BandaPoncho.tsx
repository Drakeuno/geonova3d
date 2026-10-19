import { useId } from 'react'
import { paleta } from '@/estilos/paleta'

// Banda geométrica inspirada en el poncho del Cochayuyero: fondo azul marino, zigzag claro y
// rombos granate. Es un motivo genérico; su forma final se valida en co-diseño.

export function BandaPoncho({ className = '' }: { className?: string }) {
  const id = `poncho-${useId().replace(/:/g, '')}`
  const { poncho, granate } = paleta
  return (
    <svg aria-hidden className={`block h-3 w-full ${className}`} preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="24" height="12" patternUnits="userSpaceOnUse">
          <rect width="24" height="12" fill={poncho[800]} />
          <rect width="24" height="1.5" fill={granate[600]} />
          <rect y="10.5" width="24" height="1.5" fill={granate[600]} />
          <polyline points="0,9 6,3 12,9 18,3 24,9" fill="none" stroke={poncho[200]} strokeWidth="1.2" />
          <polygon points="12,3.5 14.5,6 12,8.5 9.5,6" fill={granate[400]} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
