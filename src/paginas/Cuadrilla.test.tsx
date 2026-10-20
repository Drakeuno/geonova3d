// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import parametrosJson from '../../public/datos/parametros.json'
import cuadrillasJson from '../../public/datos/cuadrillas.json'
import { MISIONES } from '@/datos/misiones'
import { useJuego } from '@/estado/juego'
import { useSesion } from '@/estado/sesion'
import { useViaje } from '@/estado/viaje'
import { viajeInicial } from '@/motor/progreso'
import Cuadrilla from './Cuadrilla'

// Ayuda entre compañeros de punta a punta (§14): el compañero simulado acepta y aprueba solo, y la
// ayuda pasa a contar para la insignia especial.

const { aceptaTrasSegundos, apruebaTrasSegundos } = cuadrillasJson.simulacion

beforeEach(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const datos = url.endsWith('cuadrillas.json') ? cuadrillasJson : url.endsWith('parametros.json') ? parametrosJson : null
    return datos ? new Response(JSON.stringify(datos)) : new Response('', { status: 404 })
  })
  localStorage.clear()
  // Camila aprobó la 1.1 y la 1.2: Diego (que la sigue) quedó atascado en la 1.2.
  const viaje = viajeInicial(MISIONES.map((m) => m.id))
  for (const id of ['1.1', '1.2']) viaje[id] = { estado: 'aprobada', fallas: 0, aprobadaEn: Date.now() }
  useViaje.setState({ viajes: { 'est-1': viaje }, logros: {}, evaluaciones: {} })
  useJuego.setState({ movimientos: {}, ayudas: [] })
  useSesion.setState({ usuarioId: 'est-1' })
})
/** Tarjeta del pedido de ayuda de un compañero (su nombre también sale en la lista de integrantes). */
async function pedidoDe(nombre: string) {
  const pedidos = await screen.findAllByText(/Pide ayuda con la/)
  return pedidos.map((p) => p.closest('li')!).find((li) => li.textContent?.includes(nombre))!
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Mi cuadrilla · ayuda entre compañeros', () => {
  it('se envía con 30 caracteres o más, el compañero la acepta y, al aprobar, cuenta', async () => {
    render(
      <MemoryRouter>
        <Cuadrilla />
      </MemoryRouter>,
    )
    const pedido = await pedidoDe('Diego Painemal')
    // Con la página cargada, el reloj pasa a manos de la prueba (la aceptación tarda unos segundos).
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const tarjeta = within(pedido)
    expect(tarjeta.getByText(/Pide ayuda con la 1\.2/)).toBeTruthy()

    const enviar = tarjeta.getByRole('button', { name: 'Enviar ayuda' })
    const mensaje = tarjeta.getByLabelText('Tu mensaje de ayuda para Diego')
    fireEvent.change(mensaje, { target: { value: 'Revisa el signo' } })
    expect(enviar.hasAttribute('disabled')).toBe(true)
    expect(tarjeta.getByText(/Faltan 15 caracteres/)).toBeTruthy()
    fireEvent.change(mensaje, { target: { value: 'Revisa el signo de cada desnivel por postura.' } })
    fireEvent.click(enviar)
    expect(tarjeta.getByRole('status').textContent).toMatch(/Enviada/)

    await act(async () => vi.advanceTimersByTime(aceptaTrasSegundos * 1000 + 100))
    expect(tarjeta.getByRole('status').textContent).toMatch(/Diego aceptó tu ayuda/)
    expect(screen.getByText('Compañeros ayudados: 0 de 3')).toBeTruthy()

    await act(async () => vi.advanceTimersByTime((apruebaTrasSegundos - aceptaTrasSegundos) * 1000))
    // Destrabado, Diego deja de pedir ayuda y la ayuda queda entre las que diste.
    expect(screen.getByText('Compañeros ayudados: 1 de 3')).toBeTruthy()
    expect(screen.getByText(/Diego Painemal aprobó la 1\.2: ayuda válida/)).toBeTruthy()
  })

  it('no deja ayudar en una misión que uno no ha aprobado', async () => {
    render(
      <MemoryRouter>
        <Cuadrilla />
      </MemoryRouter>,
    )
    const pedido = await pedidoDe('Antonia Fuentes')
    expect(within(pedido).getByText('Aprueba tú la 1.3 para poder ayudar.')).toBeTruthy()
    expect(within(pedido).queryByRole('button', { name: 'Enviar ayuda' })).toBeNull()
  })
})
