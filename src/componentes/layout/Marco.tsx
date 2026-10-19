import { Outlet } from 'react-router-dom'
import { BarraSuperior } from './BarraSuperior'
import { BandaPoncho } from '@/componentes/ui/BandaPoncho'
import textos from '@/textos/es-CL.json'

export function Marco() {
  return (
    <div className="flex min-h-full flex-col">
      <BarraSuperior />
      <BandaPoncho />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-tierra-200 bg-white py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-tierra-600">
          <span>
            <span className="font-semibold text-tierra-800">
              {textos.app.nombre} — {textos.app.subtitulo}
            </span>{' '}
            · {textos.app.pie}
          </span>
          <span>{textos.app.aviso}</span>
        </div>
      </footer>
    </div>
  )
}
