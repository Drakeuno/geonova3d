// CSV según RFC 4180 (traído de la maqueta): una celda con coma, comilla o salto de línea va entre
// comillas. Sin esto, un nombre como "Reyes, Camila" corre todas las columnas siguientes y asigna
// datos a la persona equivocada.

export function escaparCelda(valor: unknown): string {
  const s = valor === null || valor === undefined ? '' : String(valor)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const aCsv = (cabecera: string[], filas: unknown[][]) => [cabecera, ...filas].map((f) => f.map(escaparCelda).join(',')).join('\r\n')

/** Descarga el CSV. El BOM inicial hace que Excel en Windows lea bien las tildes (UTF-8). */
export function descargarCsv(nombre: string, csv: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}
