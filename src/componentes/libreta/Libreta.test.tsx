// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import parametrosJson from '../../../public/datos/parametros.json'
import { esquemaParametros } from '@/datos/parametros'
import { PRACTICA_LIBRETA } from '@/datos/practicaLibreta'
import { useLibretas } from '@/estado/libretas'
import { useJuego } from '@/estado/juego'
import type { ModoCalculo } from '@/motor/libreta'
import { Libreta } from './Libreta'

const parametros = esquemaParametros.parse(parametrosJson)
const plan = PRACTICA_LIBRETA.dictado.map(({ estacion, punto, tipo }) => ({ estacion, punto, tipo }))
const CLAVE = 'est-1:prueba'

function montar(modo: ModoCalculo = 'manual') {
  return render(
    <Libreta
      clave={CLAVE}
      usuarioId="est-1"
      misionId="1.2"
      titulo="Prueba"
      estudiante="Camila Reyes"
      pr={PRACTICA_LIBRETA.pr}
      modo={modo}
      parametros={parametros}
      plan={plan}
    />,
  )
}

async function registrarLectura(user: ReturnType<typeof userEvent.setup>, lectura: string, extra: Record<string, string> = {}) {
  await user.type(screen.getByLabelText('Lectura de mira (m)'), lectura)
  for (const [etiqueta, valor] of Object.entries(extra)) await user.type(screen.getByLabelText(etiqueta), valor)
  await user.click(screen.getByRole('button', { name: 'Registrar en la libreta' }))
}

beforeEach(() => {
  localStorage.clear()
  useLibretas.setState({ registros: {}, borradores: {} })
  useJuego.setState({ movimientos: {} })
})
afterEach(cleanup)

describe('CP-03 · intentar corregir tachando una celda', () => {
  it('la celda registrada no se edita: aparece el aviso de bloqueo', async () => {
    const user = userEvent.setup()
    montar()
    await registrarLectura(user, '1,500')
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Fila 1, lectura: 1,500. Registrada.' }))
    const dialogo = screen.getByRole('dialog', { name: 'Esta fila ya está registrada' })
    expect(within(dialogo).getByText(/no se borra ni se tacha/)).toBeTruthy()
    expect(within(dialogo).getByText('Tachar cuesta 20 XP.')).toBeTruthy()
  })

  it('corregir en línea nueva no cuesta XP y deja ambas filas a la vista', async () => {
    const user = userEvent.setup()
    montar()
    await registrarLectura(user, '1,550')
    await user.click(screen.getByRole('button', { name: 'Fila 1, lectura: 1,550. Registrada.' }))
    await user.click(screen.getByRole('button', { name: 'Corregir en línea nueva' }))

    expect(screen.getByRole('heading', { name: 'Corrección en línea nueva de la fila 1' })).toBeTruthy()
    const lectura = screen.getByLabelText('Lectura de mira (m)')
    expect((lectura as HTMLInputElement).value).toBe('1,550')
    await user.clear(lectura)
    await registrarLectura(user, '1,500')

    expect(screen.getByText('Anulada · ver fila 2')).toBeTruthy()
    expect(screen.getByText('Corrige la fila 1')).toBeTruthy()
    expect(screen.getByText('Corrección registrada en la fila 2, sin penalización')).toBeTruthy()
    expect(useJuego.getState().movimientos['est-1'] ?? []).toEqual([])
  })

  it('tachar igual resta 20 XP y deja el valor anterior tachado', async () => {
    const user = userEvent.setup()
    montar()
    await registrarLectura(user, '1,500')
    await user.click(screen.getByRole('button', { name: 'Fila 1, lectura: 1,500. Registrada.' }))
    await user.click(screen.getByRole('button', { name: 'Tachar igual' }))
    await user.type(screen.getByLabelText('Nuevo valor (m)'), '1,501')
    await user.click(screen.getByRole('button', { name: 'Tachar y escribir encima (−20 XP)' }))

    expect(useJuego.getState().movimientos['est-1']).toEqual([
      { tipo: 'penalizacion-tachadura', xp: -20, ambito: 'individual', misionId: '1.2' },
    ])
    expect(screen.getByText('−20 XP · tachadura en la fila 1')).toBeTruthy()
    const celda = screen.getByRole('button', { name: 'Fila 1, lectura: 1,501. Registrada.' })
    expect(celda.querySelector('s')?.textContent).toBe('1,500')
    expect(screen.getByText('Con tachadura')).toBeTruthy()
  })
})

describe('guardado fila a fila', () => {
  it('al volver, la libreta y la línea a medio escribir siguen ahí', async () => {
    const user = userEvent.setup()
    const { unmount } = montar()
    await registrarLectura(user, '1,500')
    await user.type(screen.getByLabelText('Lectura de mira (m)'), '0,65')
    unmount()

    expect(localStorage.getItem('gn3d_libretas_v1')).toContain('"lecturaMm":1500')
    montar()
    expect(screen.getByRole('button', { name: 'Fila 1, lectura: 1,500. Registrada.' })).toBeTruthy()
    expect((screen.getByLabelText('Lectura de mira (m)') as HTMLInputElement).value).toBe('0,65')
  })
})

describe('modos de cálculo', () => {
  it('asistido: revisa el Δh apenas se escribe', async () => {
    const user = userEvent.setup()
    montar('asistido')
    await registrarLectura(user, '1,500')
    await user.type(screen.getByLabelText('Lectura de mira (m)'), '0,650')
    const dh = screen.getByLabelText('Δh (m)')
    await user.type(dh, '0,800')
    expect(screen.getByText('No cuadra: revisa el cálculo')).toBeTruthy()
    await user.clear(dh)
    await user.type(dh, '+0,850')
    expect(screen.getByText('Cuadra con tus lecturas')).toBeTruthy()
  })

  it('automático: no pide Δh ni cota y muestra lo que calculará el sistema', async () => {
    const user = userEvent.setup()
    montar('automatico')
    await registrarLectura(user, '1,500')
    expect(screen.queryByLabelText('Δh (m)')).toBeNull()
    await user.type(screen.getByLabelText('Lectura de mira (m)'), '0,650')
    expect(screen.getByText('El sistema calculará: Δh = +0,850 · Cota = 100,850')).toBeTruthy()
  })

  it('la revisión para entregar bloquea si falta una distancia', async () => {
    const user = userEvent.setup()
    montar('automatico')
    await registrarLectura(user, '1,500')
    await registrarLectura(user, '0,650')
    await user.click(screen.getByRole('button', { name: 'Revisar para entregar' }))
    expect(screen.getByText('faltan distancias en las filas 2')).toBeTruthy()
  })
})

describe('CP-08 · la libreta solo muestra LT, LA, Δh, cotas y distancias', () => {
  it('columnas de la §6.1 y ninguna mención a la altura instrumental', async () => {
    const user = userEvent.setup()
    const { container } = montar('automatico')
    await registrarLectura(user, '1,500')
    await registrarLectura(user, '0,650', { 'Distancia (m)': '45' })

    const columnas = screen.getAllByRole('columnheader').map((c) => c.textContent)
    expect(columnas).toEqual(['N°', 'Estación', 'Punto', 'LT (m)', 'LA (m)', 'Δh (m)', 'Cota (m)', 'Distancia (m)', 'Observaciones'])
    const texto = container.textContent ?? ''
    expect(texto).toContain('100,850')
    expect(texto).not.toMatch(/altura\s+instrumental|altura\s+del\s+instrumento|cota\s+del\s+instrumento|\bHI\b/i)
  })
})
