/** Reemplaza las marcas {nombre} de un texto por sus valores: rellenar('Fila {n}', { n: 3 }). */
export const rellenar = (plantilla: string, valores: Record<string, string | number>) =>
  plantilla.replace(/\{(\w+)\}/g, (marca, nombre: string) => (nombre in valores ? String(valores[nombre]) : marca))
