import { useEffect } from 'react'

export interface MensajeAviso {
  id: number
  texto: string
  tono: 'exito' | 'penalizacion'
}

/** Aviso breve en una esquina, anunciado a lectores de pantalla. Se cierra solo a los 4 s. */
export function Aviso({ mensaje, onCerrar }: { mensaje: MensajeAviso | null; onCerrar: () => void }) {
  useEffect(() => {
    if (!mensaje) return
    const temporizador = window.setTimeout(onCerrar, 4000)
    return () => window.clearTimeout(temporizador)
  }, [mensaje, onCerrar])

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50">
      {mensaje && (
        <p
          key={mensaje.id}
          className={`animate-slide-up rounded-xl px-4 py-3 font-semibold text-white shadow-pop ${
            mensaje.tono === 'penalizacion' ? 'bg-granate-700' : 'bg-bosque-700'
          }`}
        >
          {mensaje.texto}
        </p>
      )}
    </div>
  )
}
