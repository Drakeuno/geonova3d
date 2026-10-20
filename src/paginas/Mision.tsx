import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Lock, Sparkles } from 'lucide-react'
import { MISIONES, type MisionCatalogo } from '@/datos/misiones'
import type { Parametros } from '@/datos/parametros'
import { pistaVigente, type DialogoMision } from '@/datos/dialogos'
import { usuarioPorId, type UsuarioDemo } from '@/datos/usuariosDemo'
import { useDialogos } from '@/estado/dialogos'
import { useEscenario } from '@/estado/escenarios'
import { useXpIndividual } from '@/estado/juego'
import { useLibretas } from '@/estado/libretas'
import { useParametros } from '@/estado/parametros'
import { useSesion } from '@/estado/sesion'
import { useEstadoSesion, useTramoVentana } from '@/estado/sesionCooperativa'
import { claveMision, estadoVisible, useViaje, useViajeDe, type IntentoMision } from '@/estado/viaje'
import { crearRng, derivarSemilla } from '@/motor/azar'
import type { Tramo } from '@/motor/cooperativa'
import { mismoNombre, toleranciaCierreMm } from '@/motor/desniveles'
import { cotaVerdaderaMm, estacionesDelEje, longitudRecorridoM, planificarRecorrido, type Escenario } from '@/motor/escenarios'
import { rangoDesdeParametros } from '@/motor/lecturas'
import { filasVigentes, registroVacio } from '@/motor/libreta'
import { formatearMm, formatearNumero } from '@/motor/numeros'
import { recompensaPorAprobacion } from '@/motor/puntaje'
import { bloqueosLibreta, emparejar, textoTolerancia } from '@/misiones/comunes'
import { configMision, entregarMision, esJugable, opcionesDesdeParametros, type ConfigMision } from '@/misiones/definiciones'
import { cierreDelCircuito } from '@/misiones/m12'
import { perfilDesdeLibreta } from '@/misiones/m13'
import { lineaSeguridadMm } from '@/misiones/m21'
import { datosEstanque } from '@/misiones/m22'
import { otroTramo, prepararSesion } from '@/misiones/m23'
import type { Formulario, IdMisionJugable } from '@/misiones/tipos'
import { PanelCampo } from '@/componentes/campo/PanelCampo'
import { DialogoCochayuyero } from '@/componentes/dialogo/DialogoCochayuyero'
import { Libreta } from '@/componentes/libreta/Libreta'
import { Compensacion } from '@/componentes/mision/Compensacion'
import { Entrega } from '@/componentes/mision/Entrega'
import { DecisionAgua, DecisionCeroCota, DecisionPehuen } from '@/componentes/mision/EtapasDecision'
import { InformeDetective } from '@/componentes/mision/InformeDetective'
import { ElegirCuadrilla, ElegirModo, PuntoDeEncuentro } from '@/componentes/mision/PuntoDeEncuentro'
import { PlanillaPerfil } from '@/componentes/perfil/PlanillaPerfil'
import { ChipMetal } from '@/componentes/ui/ChipMetal'
import { rellenar } from '@/textos/rellenar'
import textos from '@/textos/es-CL.json'

const t = textos.mision

export default function Mision() {
  const { id = '' } = useParams()
  const usuario = usuarioPorId(useSesion((s) => s.usuarioId))
  const mision = MISIONES.find((m) => m.id === id)
  if (!usuario || !mision || !esJugable(id)) return <Navigate to="/viaje" replace />
  return <AbrirMision key={id} id={id} mision={mision} usuario={usuario} />
}

function AbrirMision({ id, mision, usuario }: { id: IdMisionJugable; mision: MisionCatalogo; usuario: UsuarioDemo }) {
  const { parametros } = useParametros()
  const viaje = useViajeDe(usuario.id)!
  const todasAbiertas = useViaje((s) => s.todasAbiertas)
  const comenzar = useViaje((s) => s.comenzar)
  const intento = useViaje((s) => s.intentos[claveMision(usuario.id, id)])
  const xp = useXpIndividual(usuario.id)
  const estado = estadoVisible(viaje[id], todasAbiertas)

  // Abrir la misión la pone en curso (o la retoma tras una entrega fallida). Solo al entrar: si
  // falla una entrega, el estado "por reintentar" se mantiene mientras el jugador corrige.
  const bloqueada = estado === 'bloqueada'
  useEffect(() => {
    if (!bloqueada) comenzar(usuario.id, id)
  }, [bloqueada, comenzar, usuario.id, id])

  const anterior = MISIONES[MISIONES.indexOf(mision) - 1]
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link to="/viaje" className="inline-flex items-center gap-1 text-sm font-semibold text-bosque-700 hover:underline">
        <ArrowLeft size={16} aria-hidden /> {t.volver}
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-3xl font-bold text-tierra-900">
          <span className="mr-2 font-mono text-2xl text-poncho-700">{id}</span>
          {mision.titulo}
        </h1>
        <span className="chip bg-buey-100 text-buey-800">
          <Sparkles size={13} aria-hidden /> {rellenar(t.xpTotal, { xp })}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="chip bg-tierra-100 text-tierra-800">{textos.estados[estado]}</span>
        {intento && <span className="chip bg-tierra-100 text-tierra-800">{rellenar(t.intento, { n: intento.numero })}</span>}
        {mision.ra.map((ra) => (
          <span key={ra} className="chip bg-poncho-100 text-poncho-800">
            {ra}
          </span>
        ))}
        <ChipMetal metal={mision.insignia.metal} nombre={mision.insignia.nombre} grupal={mision.insignia.grupal} />
        <span className="chip bg-white text-tierra-700 ring-1 ring-tierra-200">{mision.competencia}</span>
      </div>

      {bloqueada ? (
        <p className="card mt-6 flex items-center gap-2 p-5 text-tierra-800">
          <Lock size={18} aria-hidden /> {rellenar(t.bloqueadaTexto, { id: anterior?.id ?? '', titulo: anterior?.titulo ?? '' })}
        </p>
      ) : parametros && intento ? (
        id === '2.3' ? (
          <PrepararCooperativa id={id} mision={mision} usuario={usuario} parametros={parametros} intento={intento} />
        ) : (
          <Cargar id={id} mision={mision} usuario={usuario} parametros={parametros} intento={intento} tramo={null} />
        )
      ) : (
        <p className="card mt-6 p-5 text-tierra-600">{t.cargando}</p>
      )}
    </div>
  )
}

interface PropsCarga {
  id: IdMisionJugable
  mision: MisionCatalogo
  usuario: UsuarioDemo
  parametros: Parametros
  intento: IntentoMision
}

/** 2.3: antes de salir al terreno, cómo se juega (cuadrilla simulada u otra ventana) y qué cuadrilla es esta. */
function PrepararCooperativa(p: PropsCarga) {
  const actualizarIntento = useViaje((s) => s.actualizarIntento)
  const [tramoVentana, setTramoVentana] = useTramoVentana(`gn3d_tramo:${p.usuario.id}:2.3:${p.intento.numero}`)
  const coop = p.intento.cooperativa
  const elegir = (cooperativa: IntentoMision['cooperativa']) => actualizarIntento(p.usuario.id, p.id, { cooperativa })

  if (!coop) {
    return (
      <ElegirModo
        onSimulada={() => elegir({ modo: 'simulada', codigo: null })}
        onVentanas={() => {
          setTramoVentana('A')
          elegir({ modo: 'ventanas', codigo: String(1000 + Math.floor(Math.random() * 9000)) })
        }}
      />
    )
  }
  if (coop.modo === 'ventanas' && !tramoVentana) {
    return <ElegirCuadrilla codigo={coop.codigo ?? ''} onElegir={setTramoVentana} onSimulada={() => elegir({ modo: 'simulada', codigo: null })} />
  }
  return <Cargar {...p} tramo={coop.modo === 'simulada' ? 'A' : tramoVentana!} />
}

function Cargar({ tramo, ...p }: PropsCarga & { tramo: Tramo | null }) {
  const config = configMision(p.id, opcionesDesdeParametros(p.parametros, tramo ?? undefined))
  const { escenario, error } = useEscenario(config.escenario)
  const { dialogos, error: errorDialogos } = useDialogos()
  if (error || errorDialogos) {
    return (
      <p role="alert" className="card mt-6 p-5 text-granate-700">
        {t.errorCarga}: {error ?? errorDialogos}
      </p>
    )
  }
  if (!escenario || !dialogos) return <p className="card mt-6 p-5 text-tierra-600">{t.cargando}</p>
  return <Jugar {...p} config={config} escenario={escenario} dialogo={dialogos.misiones[config.dialogo]} tramo={tramo ?? 'A'} />
}

interface PropsJugar extends PropsCarga {
  config: ConfigMision
  escenario: Escenario
  dialogo: DialogoMision
  tramo: Tramo
}

function Jugar({ id, mision, usuario, escenario, parametros, dialogo, intento, config, tramo }: PropsJugar) {
  const actualizarIntento = useViaje((s) => s.actualizarIntento)
  const nuevoIntento = useViaje((s) => s.nuevoIntento)
  const resolverEntrega = useViaje((s) => s.resolverEntrega)
  const evaluacion = useViaje((s) => s.evaluaciones[claveMision(usuario.id, id)])
  const progreso = useViajeDe(usuario.id)![id]
  const [verEncargo, setVerEncargo] = useState(true)
  const [bloqueos, setBloqueos] = useState<string[] | null>(null)
  const refEntrega = useRef<HTMLDivElement>(null)
  const rango = rangoDesdeParametros(parametros.lectura)
  const cooperativa = config.etapa === 'cooperativa'
  const coop = intento.cooperativa

  // 2.3: lecturas de ambos tramos y evento sembrado salen de la semilla de la sesión. Con dos ventanas,
  // la semilla sale del código: así las dos ven lo mismo.
  const semillaSesion = coop?.modo === 'ventanas' && coop.codigo ? derivarSemilla(0, `sesion:${coop.codigo}`) : intento.semilla
  const prep = useMemo(
    () =>
      cooperativa
        ? prepararSesion(escenario, rango, semillaSesion, coop?.modo === 'ventanas' ? ['A', 'B'] : [tramo], parametros.errorGroseroMm)
        : null,
    [cooperativa, escenario, rango.minimaMm, rango.maximaMm, semillaSesion, coop?.modo, tramo, parametros.errorGroseroMm], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const recorrido = escenario.recorridos.find((r) => r.id === config.recorrido)!
  const lecturas = useMemo(
    () => prep?.lecturas[tramo] ?? planificarRecorrido(escenario, config.recorrido, rango, crearRng(intento.semilla)),
    [prep, tramo, escenario, config.recorrido, intento.semilla, rango.minimaMm, rango.maximaMm], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const pr = useMemo(() => ({ punto: lecturas[0].punto, cotaMm: cotaVerdaderaMm(escenario, lecturas[0].punto) }), [escenario, lecturas])
  const claveLibreta = cooperativa ? `${usuario.id}:${id}:${intento.numero}:${tramo}` : `${usuario.id}:${id}:${intento.numero}`
  const registro = useLibretas((s) => s.registros[claveLibreta]) ?? registroVacio(pr)
  const modo = parametros.modoDesnivel[`acto${mision.acto}` as keyof Parametros['modoDesnivel']] ?? 'manual'
  const plan = useMemo(() => lecturas.map(({ estacion, punto, tipo }) => ({ estacion, punto, tipo })), [lecturas])

  // En la 2.3 las dos cuadrillas usan las mismas posturas (S1–S4) y pueden compartir almacenamiento
  // (dos ventanas): la burbuja de cada postura se guarda por tramo.
  const prefijo = cooperativa ? `${tramo}:` : ''
  const delTramo = <T,>(m: Record<string, T>): Record<string, T> =>
    cooperativa ? Object.fromEntries(Object.entries(m).flatMap(([k, v]) => (k.startsWith(prefijo) ? [[k.slice(prefijo.length), v]] : []))) : m

  // Respuestas de las etapas de formulario: en la 2.3, una por cuadrilla (dos ventanas, un almacenamiento).
  const seccion = cooperativa ? tramo : '_'
  const formulario: Formulario = intento.formularios?.[seccion] ?? {}
  const cambiarFormulario = (clave: string, valor: string) =>
    actualizarIntento(usuario.id, id, { formularios: { ...intento.formularios, [seccion]: { ...formulario, [clave]: valor } } })

  const T = toleranciaCierreMm(longitudRecorridoM(lecturas), parametros.toleranciaCierre.coeficienteMm)
  const sesion = useEstadoSesion({
    activa: cooperativa,
    escenario,
    prep,
    tramo,
    modo: coop?.modo ?? 'simulada',
    codigo: coop?.codigo ?? null,
    semilla: semillaSesion,
    registroPropio: registro,
    formulario,
    textoBloqueoM: rellenar(textos.cooperativa.bloqueoM, { tramo: otroTramo(tramo) }),
  })

  const longitudM = longitudRecorridoM(lecturas)
  const { radierPlanoMm, alturaTorreMm } = datosEstanque({ escenario })
  const valores = {
    pr: pr.punto,
    cotaPr: formatearMm(pr.cotaMm),
    tolerancia: textoTolerancia(T),
    longitud: formatearNumero(longitudM, 0),
    estacionamiento: parametros.perfil.estacionamientoM,
    escalaH: parametros.perfil.escalaHorizontal,
    escalaV: parametros.perfil.escalaVertical,
    pendienteMinima: formatearNumero(parametros.acto2.pendienteMinimaGravedadPct, 1),
    pendienteMaxima: formatearNumero(parametros.acto2.pendienteMaximaTransitablePct, 0),
    presionMinima: formatearNumero(parametros.acto2.presionMinimaMca, 0),
    linea: formatearMm(lineaSeguridadMm({ escenario })),
    alturaTorre: formatearMm(alturaTorreMm),
    cotaPlano: formatearMm(radierPlanoMm),
    tramo,
    otroTramo: otroTramo(tramo),
  }

  const vigentes = filasVigentes(registro)
  const anotada = (l: (typeof lecturas)[number]) =>
    vigentes.some((f) => f.tipo === l.tipo && mismoNombre(f.estacion, l.estacion) && mismoNombre(f.punto, l.punto))
  const libretaLista = bloqueosLibreta(registro, modo, lecturas).length === 0

  const entregar = () => {
    const r = entregarMision(config, {
      escenario,
      parametros,
      registro,
      modo,
      lecturas,
      compensacion: intento.compensacion,
      perfil: intento.perfil,
      formulario,
      cooperativa: sesion?.sesion ?? null,
    })
    if (r.tipo === 'bloqueada') setBloqueos(r.motivos)
    else {
      setBloqueos(null)
      const recompensa = recompensaPorAprobacion({ mision, ...r.evaluacion.desempeno }, parametros.xp)
      resolverEntrega(usuario.id, id, r.evaluacion, recompensa)
    }
    refEntrega.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  // Al aprobar, el viaje sigue: entre el Acto 0 y el Acto 2 está el tramo de Puerto Saavedra.
  const siguienteCatalogo = MISIONES[MISIONES.indexOf(mision) + 1]
  const siguiente = !siguienteCatalogo
    ? null
    : siguienteCatalogo.acto === 2 && mision.acto === 0
      ? { a: '/acto/1', texto: textos.cutscene.irActo1 }
      : esJugable(siguienteCatalogo.id)
        ? { a: `/mision/${siguienteCatalogo.id}`, texto: rellenar(t.siguienteMision, { id: siguienteCatalogo.id, titulo: siguienteCatalogo.titulo }) }
        : null

  const props = { formulario, onCambio: cambiarFormulario }
  const etapa: Record<ConfigMision['etapa'], ReactNode> = {
    ninguna: null,
    compensacion: (
      <Compensacion
        cierre={libretaLista ? cierreDelCircuito(registro, lecturas, parametros.toleranciaCierre.coeficienteMm) : null}
        cotasLibreta={
          libretaLista
            ? Object.fromEntries(emparejar(registro, lecturas).filter((p) => p.lectura.tipo === 'LA').map((p) => [p.lectura.punto, p.fila.cotaMm ?? p.calculo.cotaMm]))
            : {}
        }
        entradas={intento.compensacion}
        onCambio={(compensacion) => actualizarIntento(usuario.id, id, { compensacion })}
      />
    ),
    perfil: (
      <PlanillaPerfil
        eje={escenario.sendero ? estacionesDelEje(escenario).map((e) => e.id) : []}
        estaciones={escenario.sendero ? perfilDesdeLibreta(registro, lecturas, estacionesDelEje(escenario).map((e) => e.id)) : []}
        entradas={intento.perfil}
        onCambio={(perfil) => actualizarIntento(usuario.id, id, { perfil })}
        parametros={parametros}
        estudiante={usuario.nombre}
        mision={`${id} ${mision.titulo}`}
      />
    ),
    'decision-agua': <DecisionAgua {...props} pendienteMinimaPct={parametros.acto2.pendienteMinimaGravedadPct} />,
    'decision-pehuen': <DecisionPehuen {...props} pendienteMaximaPct={parametros.acto2.pendienteMaximaTransitablePct} />,
    'decision-cero-cota': <DecisionCeroCota {...props} lineaMm={lineaSeguridadMm({ escenario })} />,
    detective: (
      <InformeDetective {...props} radierPlanoMm={radierPlanoMm} alturaTorreMm={alturaTorreMm} presionMinimaMca={parametros.acto2.presionMinimaMca} />
    ),
    cooperativa: sesion && (
      <PuntoDeEncuentro
        {...props}
        estado={sesion}
        escenario={escenario}
        tramo={tramo}
        registroPropio={registro}
        lecturasPropias={lecturas}
        modo={coop?.modo ?? 'simulada'}
        codigo={coop?.codigo ?? null}
        toleranciaMm={T}
        coeficienteMm={parametros.toleranciaCierre.coeficienteMm}
      />
    ),
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <button
          type="button"
          className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-tierra-700 hover:underline"
          aria-expanded={verEncargo}
          onClick={() => setVerEncargo(!verEncargo)}
        >
          {verEncargo ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />} {verEncargo ? t.ocultarEncargo : t.verEncargo}
        </button>
        {verEncargo && <DialogoCochayuyero lineas={dialogo.encargo} valores={valores} etiqueta={t.etiquetaEncargo} />}
      </div>

      <PanelCampo
        key={`${intento.numero}:${tramo}`}
        escenario={escenario}
        parametros={parametros}
        recorrido={recorrido}
        lecturas={lecturas}
        semilla={cooperativa ? derivarSemilla(semillaSesion, `montaje:${tramo}`) : intento.semilla}
        burbujas={delTramo(intento.burbujas)}
        niveladas={delTramo(intento.niveladas)}
        onBurbuja={(estacion, b) => actualizarIntento(usuario.id, id, { burbujas: { ...intento.burbujas, [prefijo + estacion]: b } })}
        onNivelar={(estacion, desviacion) => {
          const niveladas = { ...intento.niveladas }
          if (desviacion === null) delete niveladas[prefijo + estacion]
          else niveladas[prefijo + estacion] = desviacion
          actualizarIntento(usuario.id, id, { niveladas })
        }}
        anotada={anotada}
        bloqueo={sesion?.bloqueo}
        desplazamientoExtra={sesion?.desplazamiento}
      >
        <Libreta
          key={claveLibreta}
          clave={claveLibreta}
          usuarioId={usuario.id}
          misionId={id}
          titulo={`${t.misionPrefijo} ${id} · ${mision.titulo}${cooperativa ? ` · ${rellenar(textos.cooperativa.tramoN, { tramo })}` : ''}`}
          estudiante={usuario.nombre}
          pr={pr}
          modo={modo}
          parametros={parametros}
          plan={plan}
        />

        {etapa[config.etapa]}

        <div ref={refEntrega} className="scroll-mt-24">
          <Entrega
            mision={mision}
            dialogo={dialogo}
            valores={valores}
            intento={intento.numero}
            evaluacion={evaluacion}
            bloqueos={bloqueos}
            pista={pistaVigente(dialogo, progreso.fallas, parametros.reintentos.fallasAntesDePista)}
            siguiente={siguiente}
            onEntregar={entregar}
            onNuevoIntento={() => {
              nuevoIntento(usuario.id, id)
              setBloqueos(null)
            }}
          />
        </div>
      </PanelCampo>
    </div>
  )
}
