import { describe, expect, it } from 'vitest'

// CP-08 · Buscar "altura instrumental" en la interfaz y los reportes: no debe existir (§3, RF-03).
// Recorre todo lo que llega al jugador: componentes y páginas, textos, catálogos y datos editables.
// El motor puede usar la línea de colimación solo como dato interno; ninguna función la expone.

const PROHIBIDOS = [
  /altura\s+instrumental/i,
  /altura\s+del\s+instrumento/i,
  /cota\s+(del\s+)?instrument/i,
  /horizonte\s+instrumental/i,
  /\bHI\b/,
]

const fuentesUi = import.meta.glob(['/src/**/*.tsx', '/src/textos/*.json', '/src/datos/*.ts', '!/src/**/*.test.*'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const datosEditables = import.meta.glob('../../public/datos/**/*.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const modulosMotor = import.meta.glob(['./*.ts', '!./*.test.ts'], { eager: true }) as Record<string, Record<string, unknown>>

describe('CP-08 · no existe la altura instrumental', () => {
  it('la búsqueda recorre la interfaz, los textos y los datos, con su contenido', () => {
    const textos = Object.entries(fuentesUi).find(([f]) => f.endsWith('es-CL.json'))?.[1] ?? ''
    expect(textos).toContain('Cochayuyero')
    expect(Object.keys(fuentesUi).some((f) => f.endsWith('.tsx'))).toBe(true)
    expect(Object.keys(datosEditables).some((f) => f.endsWith('parametros.json'))).toBe(true)
  })

  it('los patrones reconocen la frase prohibida en sus variantes', () => {
    for (const frase of ['Altura instrumental', 'altura  del instrumento', 'Cota del instrumento', 'HI = cota + LT']) {
      expect(PROHIBIDOS.some((p) => p.test(frase))).toBe(true)
    }
    expect(PROHIBIDOS.some((p) => p.test('Hilo medio · hito · Chile'))).toBe(false)
  })

  it('ningún texto de la interfaz ni dato editable la menciona', () => {
    const hallazgos = Object.entries({ ...fuentesUi, ...datosEditables }).flatMap(([archivo, contenido]) =>
      PROHIBIDOS.filter((p) => p.test(contenido)).map((p) => `${archivo}: ${p}`),
    )
    expect(hallazgos).toEqual([])
  })

  it('ninguna función ni constante del motor la expone', () => {
    const nombres = Object.values(modulosMotor).flatMap((m) => Object.keys(m))
    expect(nombres.length).toBeGreaterThan(30)
    expect(nombres.filter((n) => /alturaInstrumental|cotaInstrumento|^hi$/i.test(n))).toEqual([])
  })
})
