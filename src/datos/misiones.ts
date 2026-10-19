// Catálogo del viaje (§2, §4 y §5 de la especificación técnica v1.1).
// Solo describe la estructura; la jugabilidad de cada misión vive en `src/misiones/`.

export type Acto = 0 | 1 | 2 | 3
export type Ra = 'RA1' | 'RA2' | 'RA3'
export type Metal = 'bronce' | 'plata' | 'oro' | 'platino'
/** Clave de `parametros.xp.porInsignia` con el XP base de la misión. */
export type NivelXp = 'bronce' | 'plata' | 'oro' | 'integrador'

export const RESULTADOS: Record<Ra, string> = {
  RA1: 'Aplica procedimientos de nivelación geométrica para determinar cotas y desniveles con precisión, con nivel topográfico.',
  RA2: 'Controla la calidad de levantamientos altimétricos, detectando errores sistemáticos y accidentales, e interpreta perfiles y planos para decisiones técnicas.',
  RA3: 'Comunica y defiende resultados técnicos de manera efectiva ante comisiones evaluadoras.',
}

export interface ActoViaje {
  id: Acto
  nombre: string
  lugar: string
  escenario: string
  /** El Acto 1 es un tramo narrativo sin jugabilidad propia. */
  cutscene?: boolean
}

export const ACTOS: ActoViaje[] = [
  { id: 0, nombre: 'Campamento base', lugar: 'Campus UCT, Temuco', escenario: 'Campus controlado' },
  {
    id: 1,
    nombre: 'Puerto Saavedra',
    lugar: 'Costa, parada de inicio',
    escenario: 'El PR marítimo de Puerto Saavedra',
    cutscene: true,
  },
  { id: 2, nombre: 'Parada rural', lugar: 'Camino al interior', escenario: 'Simulación digital rural' },
  { id: 3, nombre: 'Cerro Ñielol', lugar: 'Temuco', escenario: 'Cerro Ñielol (115 ha, 90–130 msnm)' },
]

export interface MisionCatalogo {
  id: string
  acto: Exclude<Acto, 1>
  titulo: string
  ra: Ra[]
  competencia: string
  insignia: { nombre: string; metal: Metal; grupal: boolean }
  nivelXp: NivelXp
  /** 2.3: dos cuadrillas en sesión sincrónica. */
  cooperativa?: boolean
  /** 3.2 y 3.3: defensa oral evaluada por el docente fuera del simulador. */
  evidenciaExterna?: boolean
  /** Circuitos cerrados con bonus por precisión del cierre (§6.2): 1.2 y 3.3. */
  bonusPrecision?: boolean
}

export const MISIONES: MisionCatalogo[] = [
  {
    id: '1.1',
    acto: 0,
    titulo: 'El Primer Coteo',
    ra: ['RA1'],
    competencia: 'Montaje, nivelación y lectura LT/LA',
    insignia: { nombre: 'Primer Coteo', metal: 'bronce', grupal: false },
    nivelXp: 'bronce',
  },
  {
    id: '1.2',
    acto: 0,
    titulo: 'Circuito Cerrado',
    ra: ['RA1'],
    competencia: 'Cierre y compensación proporcional',
    insignia: { nombre: 'Circuito Cerrado', metal: 'plata', grupal: false },
    nivelXp: 'plata',
    bonusPrecision: true,
  },
  {
    id: '1.3',
    acto: 0,
    titulo: 'El Perfil del Sendero',
    ra: ['RA1', 'RA3'],
    competencia: 'Perfil longitudinal y registro técnico',
    insignia: { nombre: 'Dibujante de Perfiles', metal: 'plata', grupal: false },
    nivelXp: 'plata',
  },
  {
    id: '2.1',
    acto: 2,
    titulo: 'La gran decisión técnica',
    ra: ['RA1'],
    competencia: 'Aplicación de desniveles a decisiones de diseño',
    insignia: { nombre: 'Juez de Pendientes', metal: 'oro', grupal: false },
    nivelXp: 'oro',
  },
  {
    id: '2.2',
    acto: 2,
    titulo: 'Detective de Cotas',
    ra: ['RA1', 'RA2'],
    competencia: 'Verificación, detección de errores y cota óptima',
    insignia: { nombre: 'Detective de Cotas', metal: 'oro', grupal: false },
    nivelXp: 'oro',
  },
  {
    id: '2.3',
    acto: 2,
    titulo: 'Punto de Encuentro',
    ra: ['RA1', 'RA3'],
    competencia: 'Nivelación colaborativa y resolución de discrepancias',
    insignia: { nombre: 'Punto de Encuentro', metal: 'oro', grupal: true },
    nivelXp: 'oro',
    cooperativa: true,
  },
  {
    id: '3.1',
    acto: 3,
    titulo: 'El Error Crítico',
    ra: ['RA2'],
    competencia: 'Auditoría de perfiles con errores intencionales',
    insignia: { nombre: 'Ojo Crítico', metal: 'oro', grupal: false },
    nivelXp: 'oro',
  },
  {
    id: '3.2',
    acto: 3,
    titulo: 'Asamblea de la Brigada',
    ra: ['RA3'],
    competencia: 'Defensa oral (evidencia externa)',
    insignia: { nombre: 'Voz de la Brigada', metal: 'oro', grupal: false },
    nivelXp: 'oro',
    evidenciaExterna: true,
  },
  {
    id: '3.3',
    acto: 3,
    titulo: 'La Cota del Ñielol',
    ra: ['RA1', 'RA2', 'RA3'],
    competencia: 'Nivelación integral (integrador grupal)',
    insignia: { nombre: 'Ingeniero del Ñielol', metal: 'platino', grupal: true },
    nivelXp: 'integrador',
    evidenciaExterna: true,
    bonusPrecision: true,
  },
]

export const misionesDelActo = (acto: Acto) => MISIONES.filter((m) => m.acto === acto)
