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
import { bloqueosLibreta, claveTramo, emparejar, textoTolerancia } from '@/misiones/comunes'
import { configMision, entregarMision, esJugable, opcionesDelIntento, type ConfigMision } from '@/misiones/definiciones'
import { cierreDelCircuito } from '@/misiones/m12'
import { perfilDesdeLibreta, planillaEsperada } from '@/misiones/m13'
import { lineaSeguridadMm } from '@/misiones/m21'
import { datosEstanque } from '@/misiones/m22'
import { otroTramo, prepararSesion } from '@/misiones/m23'
import { prepararAuditoria } from '@/misiones/m31'
import { cierreDelPerfil, PARTE_CIRCUITO, PARTE_PERFIL, tramosDelEje } from '@/misiones/m33'
import type { ContextoEntrega, Formulario, IdMisionJugable } from '@/misiones/tipos'
import { estacionesAuditoria } from '@/datos/auditoria'
import { useDatosAuditoria } from '@/estado/auditoria'
import { Asamblea } from '@/componentes/mision/Asamblea'
import { Auditoria, tablaCorregida } from '@/componentes/mision/Auditoria'
import { InformeIntegrador } from '@/componentes/mision/InformeIntegrador'
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
  const actualizarIntento = useViaje((s) => s.actualizarIntento)
  const opciones = opcionesDelIntento(p.parametros, p.intento, tramo ?? undefined)
  // La 2.1 guarda su piel al empezar: si el docente la cambia, la libreta en curso sigue en su terreno.
  const fijarPiel = p.id === '2.1' && !p.intento.piel
  useEffect(() => {
    if (fijarPiel) actualizarIntento(p.usuario.id, p.id, { piel: opciones.piel })
  }, [fijarPiel, actualizarIntento, p.usuario.id, p.id, opciones.piel])
  const config = configMision(p.id, opciones)
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
  const enviarAComision = useViaje((s) => s.enviarAComision)
  const evaluacion = useViaje((s) => s.evaluaciones[claveMision(usuario.id, id)])
  const intento31 = useViaje((s) => s.intentos[claveMision(usuario.id, '3.1')])
  const progreso = useViajeDe(usuario.id)![id]
  const registros = useLibretas((s) => s.registros)
  const [verEncargo, setVerEncargo] = useState(true)
  const [bloqueos, setBloqueos] = useState<string[] | null>(null)
  const [iParte, setIParte] = useState(0)
  const refEntrega = useRef<HTMLDivElement>(null)
  const rango = rangoDesdeParametros(parametros.lectura)
  const cooperativa = config.etapa === 'cooperativa'
  const varias = config.partes.length > 1
  const coop = intento.cooperativa
  const modo = parametros.modoDesnivel[`acto${mision.acto}` as keyof Parametros['modoDesnivel']] ?? 'manual'

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

  // 3.1 y 3.2: la tabla de la contratista (la de este intento, o la que se corrigió en la 3.1).
  const { datos: datosAuditoria } = useDatosAuditoria(config.etapa === 'auditoria' || config.etapa === 'asamblea')
  const auditoria = useMemo(
    () =>
      config.etapa === 'auditoria' && datosAuditoria
        ? prepararAuditoria(estacionesAuditoria(datosAuditoria), rango, intento.semilla, parametros.errorGroseroMm)
        : null,
    [config.etapa, datosAuditoria, intento.semilla, parametros.errorGroseroMm, rango.minimaMm, rango.maximaMm], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const corregida31 =
    config.etapa === 'asamblea' && datosAuditoria && intento31
      ? tablaCorregida(prepararAuditoria(estacionesAuditoria(datosAuditoria), rango, intento31.semilla, parametros.errorGroseroMm), intento31.formularios?._ ?? {})
      : null

  // Partes de terreno: ninguna (3.1, 3.2), una, o dos (3.3: circuito y perfil). Cada una con su
  // recorrido, sus lecturas, su libreta y su burbuja por postura.
  const partes = useMemo(
    () =>
      config.partes.map((p) => {
        const lecturas =
          cooperativa && prep
            ? prep.lecturas[tramo]
            : planificarRecorrido(escenario, p.recorrido, rango, crearRng(varias ? derivarSemilla(intento.semilla, p.id) : intento.semilla))
        return {
          id: p.id,
          recorrido: escenario.recorridos.find((r) => r.id === p.recorrido)!,
          lecturas,
          pr: { punto: lecturas[0].punto, cotaMm: cotaVerdaderaMm(escenario, lecturas[0].punto) },
          clave: `${usuario.id}:${id}:${intento.numero}${cooperativa ? `:${tramo}` : varias ? `:${p.id}` : ''}`,
          semillaCampo: cooperativa ? derivarSemilla(semillaSesion, `montaje:${tramo}`) : varias ? derivarSemilla(intento.semilla, `montaje:${p.id}`) : intento.semilla,
          // En la 2.3 las dos cuadrillas usan las mismas posturas y pueden compartir almacenamiento: la
          // burbuja de cada postura se guarda por tramo (y en la 3.3, por parte).
          prefijo: cooperativa ? `${tramo}:` : varias ? `${p.id}:` : '',
          plan: lecturas.map(({ estacion, punto, tipo }) => ({ estacion, punto, tipo })),
        }
      }),
    [config.partes, cooperativa, prep, tramo, escenario, varias, intento.semilla, intento.numero, usuario.id, id, semillaSesion, rango.minimaMm, rango.maximaMm], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const conRegistro = partes.map((p) => ({ ...p, registro: registros[p.clave] ?? registroVacio(p.pr) }))
  type ParteViva = (typeof conRegistro)[number]
  const principal: ParteViva | undefined = conRegistro[0]
  const activa: ParteViva | undefined = conRegistro[Math.min(iParte, conRegistro.length - 1)]
  const parte = (pid: string) => conRegistro.find((p) => p.id === pid)

  // Respuestas de las etapas de formulario: en la 2.3, una por cuadrilla (dos ventanas, un almacenamiento).
  const seccion = cooperativa ? tramo : '_'
  const formulario: Formulario = intento.formularios?.[seccion] ?? {}
  const cambiarFormulario = (clave: string, valor: string | null) => {
    const nuevo = { ...formulario }
    if (valor === null) delete nuevo[clave]
    else nuevo[clave] = valor
    actualizarIntento(usuario.id, id, { formularios: { ...intento.formularios, [seccion]: nuevo } })
  }

  const prEscenario = escenario.puntos.find((p) => p.pr) ?? escenario.puntos[0]
  const pr = principal?.pr ?? { punto: prEscenario.id, cotaMm: cotaVerdaderaMm(escenario, prEscenario.id) }
  const longitudM = principal ? longitudRecorridoM(principal.lecturas) : 0
  const T = toleranciaCierreMm(longitudM, parametros.toleranciaCierre.coeficienteMm)
  const sesion = useEstadoSesion({
    activa: cooperativa,
    escenario,
    prep,
    tramo,
    modo: coop?.modo ?? 'simulada',
    codigo: coop?.codigo ?? null,
    semilla: semillaSesion,
    registroPropio: principal?.registro ?? registroVacio(pr),
    formulario,
    textoBloqueoM: rellenar(textos.cooperativa.bloqueoM, { tramo: otroTramo(tramo) }),
  })

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

  const contexto = (): ContextoEntrega => ({
    escenario,
    parametros,
    registro: principal?.registro ?? registroVacio(pr),
    modo,
    lecturas: principal?.lecturas ?? [],
    partes: Object.fromEntries(conRegistro.map((p) => [p.id, { registro: p.registro, lecturas: p.lecturas }])),
    auditoria,
    compensacion: intento.compensacion,
    perfil: intento.perfil,
    formulario,
    cooperativa: sesion?.sesion ?? null,
  })

  const enComision = progreso.estado === 'en_evaluacion'
  const entregar = () => {
    if (enComision) return
    const r = entregarMision(config, contexto())
    if (r.tipo === 'bloqueada') setBloqueos(r.motivos)
    else {
      setBloqueos(null)
      // 3.2 y 3.3: aprobada la parte automática, la decide la comisión (el docente registra el veredicto).
      if (config.evaluacionDocente && r.evaluacion.aprobada) enviarAComision(usuario.id, id, r.evaluacion)
      else resolverEntrega(usuario.id, id, r.evaluacion, recompensaPorAprobacion({ mision, ...r.evaluacion.desempeno }, parametros.xp))
    }
    refEntrega.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  // Al aprobar, el viaje sigue; entre actos pasa por su tramo narrativo y, al final, "Misión cumplida".
  const siguienteCatalogo = MISIONES[MISIONES.indexOf(mision) + 1]
  const siguiente = !siguienteCatalogo
    ? { a: '/acto/fin', texto: textos.cutscene.irFin }
    : siguienteCatalogo.acto !== mision.acto
      ? mision.acto === 0
        ? { a: '/acto/1', texto: textos.cutscene.irActo1 }
        : { a: `/acto/${siguienteCatalogo.acto}`, texto: textos.cutscene.irActo3 }
      : esJugable(siguienteCatalogo.id)
        ? { a: `/mision/${siguienteCatalogo.id}`, texto: rellenar(t.siguienteMision, { id: siguienteCatalogo.id, titulo: siguienteCatalogo.titulo }) }
        : null

  const compensacionDe = (p: ParteViva | undefined) => {
    if (!p) return null
    const lista = bloqueosLibreta(p.registro, modo, p.lecturas).length === 0
    return (
      <Compensacion
        cierre={lista ? cierreDelCircuito(p.registro, p.lecturas, parametros.toleranciaCierre.coeficienteMm) : null}
        cotasLibreta={
          lista
            ? Object.fromEntries(emparejar(p.registro, p.lecturas).filter((x) => x.lectura.tipo === 'LA').map((x) => [x.lectura.punto, x.fila.cotaMm ?? x.calculo.cotaMm]))
            : {}
        }
        entradas={intento.compensacion}
        onCambio={(compensacion) => actualizarIntento(usuario.id, id, { compensacion })}
      />
    )
  }
  const eje = escenario.sendero ? estacionesDelEje(escenario).map((e) => e.id) : []
  const perfilDe = (p: ParteViva | undefined) =>
    p ? (
      <PlanillaPerfil
        eje={eje}
        estaciones={escenario.sendero ? perfilDesdeLibreta(p.registro, p.lecturas, eje) : []}
        entradas={intento.perfil}
        onCambio={(perfil) => actualizarIntento(usuario.id, id, { perfil })}
        parametros={parametros}
        estudiante={usuario.nombre}
        mision={`${id} ${mision.titulo}`}
      />
    ) : null

  const exportarInformeTecnico = () => {
    const c = parte(PARTE_CIRCUITO)
    const pf = parte(PARTE_PERFIL)
    if (!c || !pf) return
    const cierre = cierreDelCircuito(c.registro, c.lecturas, parametros.toleranciaCierre.coeficienteMm)
    const tramos = tramosDelEje({ escenario })
    const critico = formulario.tramoCritico === 'ninguno' ? textos.integrador.ninguno : (formulario.tramoCritico ?? '').replace('|', '–')
    void import('@/componentes/mision/exportarInforme').then((m) =>
      m.exportarInforme({
        titulo: formulario.tituloInforme?.trim() || textos.integrador.ejemploTitulo,
        estudiante: usuario.nombre,
        cuadrilla: usuario.cuadrilla ?? '',
        conclusiones: formulario.conclusiones ?? '',
        pr: c.pr,
        modo,
        circuito: { registro: c.registro, errorMm: cierre.errorMm, toleranciaMm: cierre.toleranciaMm, longitudM: cierre.longitudM, compensados: cierre.compensados, entradas: intento.compensacion },
        perfil: {
          registro: pf.registro,
          planilla: planillaEsperada(perfilDesdeLibreta(pf.registro, pf.lecturas, eje)),
          pendientes: tramos.map(([a, b]) => ({ tramo: `${a}–${b}`, texto: formulario[claveTramo('p', a, b)] ?? '' })),
          tramoCritico: critico || '—',
          cierre: cierreDelPerfil(contexto()),
        },
        archivo: `informe-3.3-${usuario.nombre.replace(/\s+/g, '-')}.pdf`,
      }),
    )
  }

  const props = { formulario, onCambio: cambiarFormulario }
  // Cada etapa se construye solo si es la de esta misión (algunas piden datos que otros terrenos no tienen).
  const etapas: Record<ConfigMision['etapa'], () => ReactNode> = {
    ninguna: () => null,
    compensacion: () => compensacionDe(principal),
    perfil: () => perfilDe(principal),
    'decision-agua': () => <DecisionAgua {...props} pendienteMinimaPct={parametros.acto2.pendienteMinimaGravedadPct} />,
    'decision-pehuen': () => <DecisionPehuen {...props} pendienteMaximaPct={parametros.acto2.pendienteMaximaTransitablePct} />,
    'decision-cero-cota': () => <DecisionCeroCota {...props} lineaMm={lineaSeguridadMm({ escenario })} />,
    detective: () => (
      <InformeDetective {...props} radierPlanoMm={radierPlanoMm} alturaTorreMm={alturaTorreMm} presionMinimaMca={parametros.acto2.presionMinimaMca} />
    ),
    cooperativa: () =>
      sesion && principal ? (
        <PuntoDeEncuentro
          {...props}
          estado={sesion}
          escenario={escenario}
          tramo={tramo}
          registroPropio={principal.registro}
          lecturasPropias={principal.lecturas}
          modo={coop?.modo ?? 'simulada'}
          codigo={coop?.codigo ?? null}
          toleranciaMm={T}
          coeficienteMm={parametros.toleranciaCierre.coeficienteMm}
        />
      ) : null,
    auditoria: () =>
      auditoria ? (
        <Auditoria {...props} sesion={auditoria} sendero={datosAuditoria?.sendero ?? ''} parametros={parametros} estudiante={usuario.nombre} />
      ) : (
        <p className="card p-5 text-tierra-600">{t.cargando}</p>
      ),
    asamblea: () => <Asamblea {...props} parametros={parametros} tablaCorregida={corregida31} sendero={datosAuditoria?.sendero ?? ''} estudiante={usuario.nombre} />,
    integrador: () => (
      <>
        {compensacionDe(parte(PARTE_CIRCUITO))}
        {perfilDe(parte(PARTE_PERFIL))}
        <InformeIntegrador {...props} tramos={tramosDelEje({ escenario })} maximoPct={parametros.acto2.pendienteMaximaTransitablePct} onExportar={exportarInformeTecnico} />
      </>
    ),
  }

  const entrega = (
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
        enComision={enComision}
        textoEntregar={config.etapa === 'asamblea' ? t.pedirDefensa : config.evaluacionDocente ? t.entregarYDefender : undefined}
      />
    </div>
  )
  const nombreParte = (pid: string) => (textos.entrega.m33.partes as Record<string, string>)[pid] ?? pid

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

      {!activa ? (
        <div className="mx-auto max-w-5xl space-y-4">
          {etapas[config.etapa]()}
          {entrega}
        </div>
      ) : (
        <>
          {varias && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t.partes}>
              {conRegistro.map((p, i) => (
                <button key={p.id} type="button" aria-pressed={p.id === activa.id} onClick={() => setIParte(i)} className={p.id === activa.id ? 'btn-primario' : 'btn-neutro'}>
                  {rellenar(t.parteN, { n: i + 1, nombre: nombreParte(p.id) })}
                </button>
              ))}
            </div>
          )}
          <PanelCampo
            key={`${intento.numero}:${tramo}:${activa.id}`}
            escenario={escenario}
            parametros={parametros}
            recorrido={activa.recorrido}
            lecturas={activa.lecturas}
            semilla={activa.semillaCampo}
            burbujas={delPrefijo(intento.burbujas, activa.prefijo)}
            niveladas={delPrefijo(intento.niveladas, activa.prefijo)}
            onBurbuja={(estacion, b) => actualizarIntento(usuario.id, id, { burbujas: { ...intento.burbujas, [activa.prefijo + estacion]: b } })}
            onNivelar={(estacion, desviacion) => {
              const niveladas = { ...intento.niveladas }
              if (desviacion === null) delete niveladas[activa.prefijo + estacion]
              else niveladas[activa.prefijo + estacion] = desviacion
              actualizarIntento(usuario.id, id, { niveladas })
            }}
            anotada={(l) => filasVigentes(activa.registro).some((f) => f.tipo === l.tipo && mismoNombre(f.estacion, l.estacion) && mismoNombre(f.punto, l.punto))}
            bloqueo={sesion?.bloqueo}
            desplazamientoExtra={sesion?.desplazamiento}
          >
            <Libreta
              key={activa.clave}
              clave={activa.clave}
              usuarioId={usuario.id}
              misionId={id}
              titulo={`${t.misionPrefijo} ${id} · ${mision.titulo}${cooperativa ? ` · ${rellenar(textos.cooperativa.tramoN, { tramo })}` : ''}${varias ? ` · ${nombreParte(activa.id)}` : ''}`}
              estudiante={usuario.nombre}
              pr={activa.pr}
              modo={modo}
              parametros={parametros}
              plan={activa.plan}
            />
            {etapas[config.etapa]()}
            {entrega}
          </PanelCampo>
        </>
      )}
    </div>
  )
}

/** Burbujas o niveladas de una parte (o tramo): sus claves llevan el prefijo. */
function delPrefijo<T>(m: Record<string, T>, prefijo: string): Record<string, T> {
  if (!prefijo) return m
  return Object.fromEntries(Object.entries(m).flatMap(([k, v]) => (k.startsWith(prefijo) ? [[k.slice(prefijo.length), v]] : [])))
}
