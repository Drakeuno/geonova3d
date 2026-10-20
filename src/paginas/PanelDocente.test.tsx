// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import parametrosJson from '../../public/datos/parametros.json'
import cuadrillasJson from '../../public/datos/cuadrillas.json'
import { useAjustes } from '@/estado/parametros'
import { useJuego } from '@/estado/juego'
import { useViaje } from '@/estado/viaje'
import PanelDocente from './PanelDocente'

// Panel docente (RF-08): un parámetro ajustado se guarda y rige; con errores no se guarda.

beforeEach(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const datos = url.endsWith('cuadrillas.json') ? cuadrillasJson : url.endsWith('parametros.json') ? parametrosJson : null
    return datos ? new Response(JSON.stringify(datos)) : new Response('', { status: 404 })
  })
  localStorage.clear()
  useAjustes.setState({ ajustes: {}, guardadosEn: null })
  useViaje.setState({ viajes: {}, logros: {}, evaluaciones: {}, intentos: {} })
  useJuego.setState({ movimientos: {}, ayudas: [] })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const montar = (seccion: string) =>
  render(
    <MemoryRouter initialEntries={[`/panel?seccion=${seccion}`]}>
      <PanelDocente />
    </MemoryRouter>,
  )

describe('Panel docente · configuración', () => {
  it('guarda un ajuste válido, que pasa a regir', async () => {
    montar('configuracion')
    const coeficiente = await screen.findByLabelText('Tolerancia de cierre: coeficiente')
    expect((coeficiente as HTMLInputElement).value).toBe('12')
    fireEvent.change(coeficiente, { target: { value: '10' } })
    expect(screen.getByText('Hay cambios sin guardar.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }))
    expect(useAjustes.getState().ajustes).toEqual({ 'toleranciaCierre.coeficienteMm': 10 })
    expect(await screen.findByText('Guardado. Los nuevos valores ya rigen.')).toBeTruthy()
    // Tras guardar, el formulario se rearma con lo guardado.
    expect(((await screen.findByLabelText('Tolerancia de cierre: coeficiente')) as HTMLInputElement).value).toBe('10')
  })

  it('con un valor fuera de rango muestra el error y no deja guardar', async () => {
    montar('configuracion')
    const montaje = await screen.findByLabelText('Error máximo por montaje')
    fireEvent.change(montaje, { target: { value: '8' } })
    expect(screen.getByText('Entre 0 y 5.')).toBeTruthy()
    expect(montaje.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('button', { name: /Guardar cambios/ }).hasAttribute('disabled')).toBe(true)
  })

  it('restablece todo a los valores del archivo tras confirmar', async () => {
    useAjustes.setState({ ajustes: { 'acto2.piel': 'cero-cota' }, guardadosEn: 1 })
    montar('configuracion')
    const piel = (await screen.findByLabelText('Piel de la misión 2.1')) as HTMLSelectElement
    expect(piel.value).toBe('cero-cota')
    fireEvent.click(screen.getByRole('button', { name: /Volver a los valores del archivo/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, restablecer' }))
    expect(useAjustes.getState().ajustes).toEqual({})
    expect(((await screen.findByLabelText('Piel de la misión 2.1')) as HTMLSelectElement).value).toBe('red-del-agua')
  })
})

describe('Panel docente · seguimiento', () => {
  it('muestra cada cuadrilla con sus integrantes y lo que requiere atención', async () => {
    montar('seguimiento')
    const atencion = (await screen.findByText('Requiere atención')).closest('div')!
    expect(within(atencion).getByText(/Martina Lefián \(Cuadrilla 3\) pide ayuda con la 3\.1/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Cuadrilla 2' })).toBeTruthy()
    expect(screen.getAllByText('Camila Reyes').length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: 'Seguimiento' }).getAttribute('aria-selected')).toBe('true')
  })
})
