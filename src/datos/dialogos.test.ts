import { describe, expect, it } from 'vitest'
import dialogosJson from '../../public/datos/dialogos/cochayuyero.json'
import { MISIONES_JUGABLES } from '@/misiones/definiciones'
import { esquemaDialogos, MARCAS_DIALOGO, pistaVigente } from './dialogos'

const dialogos = esquemaDialogos.parse(dialogosJson)

describe('guiones del Cochayuyero (RF-11)', () => {
  it('cada misión jugable tiene encargo, pistas, logro y un rechazo por cada motivo posible', () => {
    for (const m of Object.values(MISIONES_JUGABLES)) {
      const d = dialogos.misiones[m.id]
      expect(d, `faltan los diálogos de la ${m.id}`).toBeDefined()
      expect(Object.keys(d.rechazo).sort()).toEqual([...m.motivos].sort())
    }
  })

  it('solo usa marcas conocidas y escribe "Cochayuyero" (decisión del 19-oct-2026)', () => {
    const texto = JSON.stringify(dialogosJson)
    const marcas = [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
    expect(marcas.filter((m) => !(MARCAS_DIALOGO as readonly string[]).includes(m))).toEqual([])
    expect(texto).not.toMatch(/Cochayullero/i)
    expect(dialogos.personaje).toBe('Cochayuyero')
  })

  it('ofrece la pista tras 2 fallas y avanza una por falla, sin pasarse de la última', () => {
    const d = dialogos.misiones['1.1']
    expect(pistaVigente(d, 1, 2)).toBeNull()
    expect(pistaVigente(d, 2, 2)).toBe(d.pistas[0])
    expect(pistaVigente(d, 3, 2)).toBe(d.pistas[1])
    expect(pistaVigente(d, 9, 2)).toBe(d.pistas[d.pistas.length - 1])
  })
})
