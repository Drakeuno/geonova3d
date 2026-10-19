import * as THREE from 'three'
import { dibujarMira } from './dibujarMira'
import { LARGO_MIRA_M } from './geometriaMira'

// Textura de la mira completa (3 m). A 8192 px de alto son 2,7 px por milímetro: suficiente para
// leer al milímetro en el anteojo. Si la tarjeta gráfica no admite ese tamaño, se baja a lo que admita.

const lienzos = new Map<number, HTMLCanvasElement>()

function lienzoMira(altoPx: number): HTMLCanvasElement {
  let lienzo = lienzos.get(altoPx)
  if (!lienzo) {
    lienzo = document.createElement('canvas')
    lienzo.width = 128
    lienzo.height = altoPx
    const ctx = lienzo.getContext('2d')
    if (ctx) dibujarMira(ctx, lienzo.width, lienzo.height, 0, LARGO_MIRA_M)
    lienzos.set(altoPx, lienzo)
  }
  return lienzo
}

/** Una textura por renderer: cada lienzo WebGL sube su propia copia del mismo dibujo. */
export function crearTexturaMira(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const alto = Math.min(8192, renderer.capabilities.maxTextureSize)
  const textura = new THREE.CanvasTexture(lienzoMira(alto))
  textura.colorSpace = THREE.SRGBColorSpace
  textura.anisotropy = renderer.capabilities.getMaxAnisotropy()
  textura.minFilter = THREE.LinearMipmapLinearFilter
  textura.magFilter = THREE.LinearFilter
  return textura
}
