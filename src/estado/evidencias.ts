// Evidencia de la defensa oral (3.2 y 3.3): el archivo que carga el docente (presentación, video,
// acta…) queda en IndexedDB de este navegador. En la fase B irá al almacenamiento del servidor.

const BASE = 'gn3d_evidencias'
const TABLA = 'archivos'

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open(BASE, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(TABLA)
    pedido.onsuccess = () => resolver(pedido.result)
    pedido.onerror = () => rechazar(pedido.error)
  })
}

async function operar<T>(modo: IDBTransactionMode, accion: (tabla: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir()
  return new Promise((resolver, rechazar) => {
    const pedido = accion(db.transaction(TABLA, modo).objectStore(TABLA))
    pedido.onsuccess = () => resolver(pedido.result)
    pedido.onerror = () => rechazar(pedido.error)
  }).finally(() => db.close()) as Promise<T>
}

/** Clave de la evidencia de una entrega: persona, misión e intento. */
export const claveEvidencia = (usuarioId: string, misionId: string, intento: number) => `${usuarioId}:${misionId}:${intento}`

export const guardarEvidencia = (clave: string, archivo: File) => operar('readwrite', (t) => t.put(archivo, clave))

export const leerEvidencia = (clave: string) => operar<File | undefined>('readonly', (t) => t.get(clave))

/** Descarga la evidencia guardada (abre el diálogo de guardar del navegador). */
export async function descargarEvidencia(clave: string) {
  const archivo = await leerEvidencia(clave)
  if (!archivo) return false
  const url = URL.createObjectURL(archivo)
  const a = document.createElement('a')
  a.href = url
  a.download = archivo.name
  a.click()
  URL.revokeObjectURL(url)
  return true
}
