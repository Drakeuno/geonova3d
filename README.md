# GeoNova3D — Misión Topógrafo · Parte 1

**🔗 Demo en vivo: https://drakeuno.github.io/geonova3d/**

Juego web de la Parte 1, **"El Viaje del Cochayuyero"**: nivelación geométrica con nivel de
ingeniero, por el método de los desniveles (PID 2026, UC Temuco). Se construye según la
especificación técnica v1.1 (octubre 2026), documento interno del proyecto. Datos simulados: no
guarda nada fuera del navegador de quien lo usa.

Estado: **F0 a F3 terminadas**: estructura, paleta, ingreso demo, mapa del viaje, panel docente
provisorio, núcleo de cálculo, libreta de campo y base 3D (terreno, nivel, mira, anteojo, burbuja,
cinta). Las misiones jugables llegan en F4–F9.

## Probar el instrumento en 3D

Entra como **Camila Reyes** → **Probar el instrumento en 3D**. Cala la burbuja con los tres tornillos,
visa la mira y léela por el anteojo: decímetro (número), centímetros (barras de la E) y milímetros
estimados. Esta práctica muestra el error de cada lectura. `#/campo?semilla=424242` repite siempre el
mismo intento (con esa semilla y la burbuja calada, el recorrido 1.1 da LT 1,598 y LA 1,161).

## Probar la libreta

Entra como **Camila Reyes** → **Practicar con la libreta**. El portamira dicta un circuito de 4 puntos
(A–B–C–D–A, 210 m); regístralo en el modo que elijas. Con las lecturas dictadas el circuito cierra en
−4 mm (tolerancia 5,5 mm). Para ver el bloqueo, haz clic en un valor ya registrado: puedes corregir en
línea nueva (sin costo) o tachar (−20 XP).

## Ejecutar

```bash
pnpm install
pnpm dev         # http://localhost:5173
pnpm test        # pruebas (vitest)
pnpm typecheck
pnpm build       # genera dist/ (rutas relativas: sirve en cualquier carpeta)
```

Para reiniciar la demo, borra el almacenamiento local del navegador (claves `gn3d_sesion_v1`,
`gn3d_libretas_v1` y `gn3d_juego_v1`).

## Dónde está cada cosa

```
public/arte/      imágenes del Cochayuyero (provisorias, hasta el arte final)
public/datos/     archivos editables sin recompilar: parametros.json (§11)
src/datos/        catálogo de misiones y actos, esquema de parámetros, usuarios demo
src/estado/       sesión y parámetros (zustand)
src/estilos/      paleta: única fuente de colores (Tailwind, 3D y prueba de contraste AA)
src/escena3d/     escena 3D (three.js): terreno, nivel, mira tipo E, anteojo, cinta, cámaras
public/datos/escenarios/  terrenos de las misiones (campus-uct.json: misiones 1.1 y 1.2)
src/motor/        núcleo de cálculo puro, sin interfaz: método de los desniveles, cierre y
                  compensación, lecturas simuladas, perfiles, escenarios, decisiones del Acto 2,
                  misión cooperativa, auditoría, puntaje, estados de misión y evaluación oral
src/textos/       textos de la interfaz en español de Chile
```
