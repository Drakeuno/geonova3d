import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Zona con desplazamiento horizontal (tablas anchas, perfiles). Cuando desborda se vuelve una región
 * enfocable con nombre, para recorrerla con las flechas del teclado (WCAG 2.1.1); si cabe, no suma
 * una parada de tabulador. `relative`: los textos sr-only (absolutos) no ensanchan la página.
 */
export function Desplazable({ etiqueta, className = '', children }: { etiqueta: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [desborda, setDesborda] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const medir = () => setDesborda(el.scrollWidth > el.clientWidth + 1)
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    if (el.firstElementChild) observador.observe(el.firstElementChild)
    return () => observador.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={`relative overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-bosque-500 ${className}`}
      {...(desborda ? { tabIndex: 0, role: 'region', 'aria-label': etiqueta } : {})}
    >
      {children}
    </div>
  )
}
