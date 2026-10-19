import * as THREE from 'three'
import { paleta } from '@/estilos/paleta'

// Sombreado "toon" de tres tonos, con contornos en los objetos principales: recoge el trazo a tinta
// de la ilustración de Puerto Saavedra.

let gradiente: THREE.DataTexture | null = null

export function gradienteToon(): THREE.DataTexture {
  if (!gradiente) {
    gradiente = new THREE.DataTexture(new Uint8Array([140, 200, 255]), 3, 1, THREE.RedFormat)
    gradiente.minFilter = THREE.NearestFilter
    gradiente.magFilter = THREE.NearestFilter
    gradiente.needsUpdate = true
  }
  return gradiente
}

export const COLORES_3D = {
  cielo: paleta.costa[50],
  bruma: paleta.costa[100],
  pasto: paleta.bosque[300],
  pastoOscuro: paleta.bosque[400],
  camino: paleta.tierra[300],
  muro: paleta.tierra[100],
  techo: paleta.granate[700],
  copa: paleta.bosque[600],
  copaOscura: paleta.bosque[700],
  tronco: paleta.tierra[700],
  contorno: paleta.tierra[900],
  madera: paleta.buey[400],
  metal: paleta.costa[300],
  cuerpoNivel: paleta.tierra[50],
  detalleNivel: paleta.poncho[700],
  estaca: paleta.buey[500],
  hito: paleta.costa[200],
  cinta: '#E8C33A',
  visual: paleta.granate[500],
  ponchoPortamira: paleta.poncho[700],
  piel: paleta.buey[200],
}
