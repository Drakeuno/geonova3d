import { describe, expect, it } from 'vitest'
import { crearRng } from './azar'
import {
  aplicarMarcas,
  evaluarAuditoria,
  generarTablaPerfil,
  revisarTabla,
  sembrarErrores,
  tablasCoinciden,
  transcribirMal,
  type ErrorSembrado,
} from './auditoria'
import { rangoDesdeParametros } from './lecturas'
import { progresivas } from './perfil'

const rango = rangoDesdeParametros({ minimaM: 0.5, maximaM: 2.5 })
// Sendero del Ñielol, E0–E5 cada 20 m.
const cotas = [104_120, 104_655, 105_310, 105_180, 106_020, 106_475]
const estaciones = progresivas(6, 20).map((progresivaM, i) => ({ id: `E${i}`, progresivaM, cotaMm: cotas[i] }))

const marcasCorrectas = (errores: ErrorSembrado[]) =>
  errores.map((e) => ({ fila: e.fila, columna: e.columna, valorPropuesto: e.valorCorrecto }))

describe('tabla del perfil de la contratista', () => {
  const tabla = generarTablaPerfil(estaciones, rango, crearRng(1))

  it('sin errores, todas las comprobaciones cuadran', () => {
    expect(revisarTabla(tabla).every((r) => r.lecturasCuadran && r.cotaCuadra && r.distanciaCuadra)).toBe(true)
    expect(tabla.map((f) => f.desnivelMm)).toEqual([null, 535, 655, -130, 840, 455])
  })

  it('la cota mal transcrita intercambia decímetros y centímetros', () => {
    expect(transcribirMal(104_655)).toBe(104_565)
    expect(transcribirMal(105_330)).toBe(105_430)
  })
})

describe('CP-06 · auditoría con 5 errores sembrados', () => {
  // Se prueba con 300 semillas: la siembra tiene que ser detectable en todas.
  const casos = Array.from({ length: 300 }, (_, i) => {
    const rng = crearRng(i + 1)
    const correcta = generarTablaPerfil(estaciones, rango, rng)
    return { correcta, ...sembrarErrores(correcta, rng, rango) }
  })

  it('siembra 2 lecturas groseras (> 30 mm, dentro de la mira), 1 distancia, 1 signo y 1 cota', () => {
    for (const { errores } of casos) {
      const tipos = errores.map((e) => e.tipo).sort()
      expect(tipos).toEqual(['cota-transcrita', 'distancia', 'lectura-grosera', 'lectura-grosera', 'signo'])
      for (const e of errores.filter((x) => x.tipo === 'lectura-grosera')) {
        expect(Math.abs(e.valorSembrado - e.valorCorrecto)).toBeGreaterThan(30)
        expect(e.valorSembrado).toBeGreaterThanOrEqual(rango.minimaMm)
        expect(e.valorSembrado).toBeLessThanOrEqual(rango.maximaMm)
      }
    }
  })

  it('cada error deja exactamente la huella esperada en las comprobaciones', () => {
    for (const { tabla, errores } of casos) {
      const filaDe = (t: ErrorSembrado['tipo']) => errores.filter((e) => e.tipo === t).map((e) => e.fila)
      const [d] = filaDe('cota-transcrita')
      const [c] = filaDe('signo')
      const [k] = filaDe('distancia')
      const n = tabla.length - 1
      const esperado = {
        lecturas: [...filaDe('lectura-grosera'), c].sort(),
        cota: [c, d, d + 1].sort(),
        distancia: [k, k + 1].filter((f) => f <= n).sort(),
      }
      const revision = revisarTabla(tabla)
      expect({
        lecturas: revision.filter((r) => !r.lecturasCuadran).map((r) => r.fila).sort(),
        cota: revision.filter((r) => !r.cotaCuadra).map((r) => r.fila).sort(),
        distancia: revision.filter((r) => !r.distanciaCuadra).map((r) => r.fila).sort(),
      }).toEqual(esperado)
    }
  })

  it('con las 5 correcciones el perfil vuelve a ser el verdadero', () => {
    for (const { tabla, errores, correcta } of casos) {
      const marcas = marcasCorrectas(errores)
      expect(evaluarAuditoria(errores, marcas).aciertoPct).toBe(100)
      expect(tablasCoinciden(aplicarMarcas(tabla, marcas), correcta)).toBe(true)
      expect(tablasCoinciden(tabla, correcta)).toBe(false)
    }
  })
})

describe('evaluación de las marcas del jugador', () => {
  const rng = crearRng(77)
  const correcta = generarTablaPerfil(estaciones, rango, rng)
  const { tabla, errores } = sembrarErrores(correcta, rng, rango)

  it('da acierto parcial por error detectado con valor correcto', () => {
    const tres = marcasCorrectas(errores).slice(0, 3)
    const ev = evaluarAuditoria(errores, tres)
    expect(ev.aciertoPct).toBe(60)
    expect(ev.pendientes).toHaveLength(2)
  })

  it('distingue celda bien marcada con valor equivocado y marcas sobre celdas correctas', () => {
    const marcas = marcasCorrectas(errores)
    marcas[0] = { ...marcas[0], valorPropuesto: marcas[0].valorPropuesto + 50 }
    const filaSinError = [1, 2, 3, 4, 5].find((f) => !errores.some((e) => e.fila === f && e.columna === 'cotaMm'))!
    marcas.push({ fila: filaSinError, columna: 'cotaMm', valorPropuesto: 1 })
    const ev = evaluarAuditoria(errores, marcas)
    expect(ev.corregidos).toHaveLength(4)
    expect(ev.malCorregidos).toHaveLength(1)
    expect(ev.sobrantes).toHaveLength(1)
    // Una marca sobrante cambia una celda buena: el perfil corregido ya no coincide.
    expect(tablasCoinciden(aplicarMarcas(tabla, marcas), correcta)).toBe(false)
  })
})
