import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useSesion } from '@/estado/sesion'
import { claveMision, estadoVisible, useViaje, useViajeDe, type IntentoMision } from '@/estado/viaje'
import { crearRng } from '@/motor/azar'
import { mismoNombre, toleranciaCierreMm } from '@/motor/desniveles'
import { cotaVerdaderaMm, estacionesDelEje, longitudRecorridoM, planificarRecorrido, type Escenario } from '@/motor/escenarios'
import { rangoDesdeParametros } from '@/motor/lecturas'
import { filasVigentes, registroVacio } from '@/motor/libreta'
import { formatearMm, formatearNumero } from '@/motor/numeros'
import { recompensaPorAprobacion } from '@/motor/puntaje'
import { bloqueosLibreta, emparejar, textoTolerancia } from '@/misiones/comunes'
import { entregarMision, esJugable, MISIONES_JUGABLES } from '@/misiones/definiciones'
import { cierreDelCircuito } from '@/misiones/m12'
import { perfilDesdeLibreta } from '@/misiones/m13'
import type { IdMisionJugable } from '@/misiones/tipos'
import { PanelCampo } from '@/componentes/campo/PanelCampo'
import { DialogoCochayuyero } from '@/componentes/dialogo/DialogoCochayuyero'
import { Libreta } from '@/componentes/libreta/Libreta'
import { Compensacion } from '@/componentes/mision/Compensacion'
import { Entrega } from '@/componentes/mision/Entrega'
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
  const def = MISIONES_JUGABLES[id]
  const { escenario, parametros, error } = useEscenario(def.escenario)
  const { dialogos, error: errorDialogos } = useDialogos()
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
      ) : error || errorDialogos ? (
        <p role="alert" className="card mt-6 p-5 text-granate-700">
          {t.errorCarga}: {error ?? errorDialogos}
        </p>
      ) : escenario && parametros && dialogos && intento ? (
        <Jugar
          id={id}
          mision={mision}
          usuario={usuario}
          escenario={escenario}
          parametros={parametros}
          dialogo={dialogos.misiones[id]}
          intento={intento}
        />
      ) : (
        <p className="card mt-6 p-5 text-tierra-600">{t.cargando}</p>
      )}
    </div>
  )
}

interface PropsJugar {
  id: IdMisionJugable
  mision: MisionCatalogo
  usuario: UsuarioDemo
  escenario: Escenario
  parametros: Parametros
  dialogo: DialogoMision
  intento: IntentoMision
}

function Jugar({ id, mision, usuario, escenario, parametros, dialogo, intento }: PropsJugar) {
  const def = MISIONES_JUGABLES[id]
  const actualizarIntento = useViaje((s) => s.actualizarIntento)
  const nuevoIntento = useViaje((s) => s.nuevoIntento)
  const resolverEntrega = useViaje((s) => s.resolverEntrega)
  const evaluacion = useViaje((s) => s.evaluaciones[claveMision(usuario.id, id)])
  const progreso = useViajeDe(usuario.id)![id]
  const [verEncargo, setVerEncargo] = useState(true)
  const [bloqueos, setBloqueos] = useState<string[] | null>(null)
  const refEntrega = useRef<HTMLDivElement>(null)

  const recorrido = escenario.recorridos.find((r) => r.id === def.recorrido)!
  const lecturas = useMemo(
    () => planificarRecorrido(escenario, def.recorrido, rangoDesdeParametros(parametros.lectura), crearRng(intento.semilla)),
    [escenario, def.recorrido, parametros.lectura, intento.semilla],
  )
  const pr = useMemo(() => ({ punto: lecturas[0].punto, cotaMm: cotaVerdaderaMm(escenario, lecturas[0].punto) }), [escenario, lecturas])
  const claveLibreta = `${usuario.id}:${id}:${intento.numero}`
  const registro = useLibretas((s) => s.registros[claveLibreta]) ?? registroVacio(pr)
  const modo = parametros.modoDesnivel[`acto${mision.acto}` as keyof Parametros['modoDesnivel']] ?? 'manual'
  const plan = useMemo(() => lecturas.map(({ estacion, punto, tipo }) => ({ estacion, punto, tipo })), [lecturas])

  const longitudM = longitudRecorridoM(lecturas)
  const valores = {
    pr: pr.punto,
    cotaPr: formatearMm(pr.cotaMm),
    tolerancia: textoTolerancia(toleranciaCierreMm(longitudM, parametros.toleranciaCierre.coeficienteMm)),
    longitud: formatearNumero(longitudM, 0),
    estacionamiento: parametros.perfil.estacionamientoM,
    escalaH: parametros.perfil.escalaHorizontal,
    escalaV: parametros.perfil.escalaVertical,
  }

  const vigentes = filasVigentes(registro)
  const anotada = (l: (typeof lecturas)[number]) =>
    vigentes.some((f) => f.tipo === l.tipo && mismoNombre(f.estacion, l.estacion) && mismoNombre(f.punto, l.punto))
  const libretaLista = bloqueosLibreta(registro, modo, lecturas).length === 0

  const entregar = () => {
    const r = entregarMision(id, { escenario, parametros, registro, modo, lecturas, compensacion: intento.compensacion, perfil: intento.perfil })
    if (r.tipo === 'bloqueada') setBloqueos(r.motivos)
    else {
      setBloqueos(null)
      const recompensa = recompensaPorAprobacion({ mision, ...r.evaluacion.desempeno }, parametros.xp)
      resolverEntrega(usuario.id, id, r.evaluacion, recompensa)
    }
    refEntrega.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  const siguienteCatalogo = MISIONES[MISIONES.indexOf(mision) + 1]
  const siguiente = siguienteCatalogo && esJugable(siguienteCatalogo.id) ? siguienteCatalogo : null

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
        key={intento.numero}
        escenario={escenario}
        parametros={parametros}
        recorrido={recorrido}
        lecturas={lecturas}
        semilla={intento.semilla}
        burbujas={intento.burbujas}
        niveladas={intento.niveladas}
        onBurbuja={(estacion, b) => actualizarIntento(usuario.id, id, { burbujas: { ...intento.burbujas, [estacion]: b } })}
        onNivelar={(estacion, desviacion) => {
          const niveladas = { ...intento.niveladas }
          if (desviacion === null) delete niveladas[estacion]
          else niveladas[estacion] = desviacion
          actualizarIntento(usuario.id, id, { niveladas })
        }}
        anotada={anotada}
      >
        <Libreta
          key={claveLibreta}
          clave={claveLibreta}
          usuarioId={usuario.id}
          misionId={id}
          titulo={`${t.misionPrefijo} ${id} · ${mision.titulo}`}
          estudiante={usuario.nombre}
          pr={pr}
          modo={modo}
          parametros={parametros}
          plan={plan}
        />

        {def.etapa === 'compensacion' && (
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
        )}

        {def.etapa === 'perfil' && (
          <PlanillaPerfil
            eje={estacionesDelEje(escenario).map((e) => e.id)}
            estaciones={perfilDesdeLibreta(registro, lecturas, estacionesDelEje(escenario).map((e) => e.id))}
            entradas={intento.perfil}
            onCambio={(perfil) => actualizarIntento(usuario.id, id, { perfil })}
            parametros={parametros}
            estudiante={usuario.nombre}
            mision={`${id} ${mision.titulo}`}
          />
        )}

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
