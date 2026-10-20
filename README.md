# GeoNova3D — Misión Topógrafo · Parte 1

**🔗 Demo en vivo: https://drakeuno.github.io/geonova3d/**

Juego web de la Parte 1, **"El Viaje del Cochayuyero"**: nivelación geométrica con nivel de
ingeniero, por el método de los desniveles (PID 2026, UC Temuco). Se construye según la
especificación técnica v1.1 (octubre 2026), documento interno del proyecto. Datos simulados: no
guarda nada fuera del navegador de quien lo usa.

Estado: **F0 a F8 terminadas**: las 9 misiones jugables en sus tres actos (con las escenas del
Cochayuyero), libreta de campo, base 3D, gamificación transversal (XP, insignias, cuadrillas con
puntaje promedio + bonus, ayuda entre compañeros, clasificación) y el panel docente completo:
seguimiento por cuadrilla con CSV, comisión evaluadora y configuración de los parámetros. Falta F9
(pulido).

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

## Probar la cuadrilla y la clasificación

Entra como **Camila Reyes** → **Mi cuadrilla**. El resto del curso es simulado
(`public/datos/cuadrillas.json`): los compañeros de la Cuadrilla 1 aprueban lo mismo que Camila,
salvo en la misión donde se atascan y piden ayuda (Diego en la 1.2, Antonia en la 1.3, Matías en la
2.1). Para ayudar hay que haber aprobado esa misión. El compañero acepta el mensaje a los 4 s y
aprueba a los 15 s: ahí la ayuda es válida y cuenta para la insignia especial; si es de otra
cuadrilla, suma +50 XP a la de Camila. **Clasificación** (también desde la sesión docente) ordena por
puntos, misiones completadas por toda la cuadrilla, insignias (promedio por integrante) y % de
precisión del Ñielol.

## Probar el panel docente

Entra como **Claudio Gil**. **Seguimiento**: cada integrante en cada misión, lo que requiere atención
(defensas por evaluar, pistas ya ofrecidas, pedidos de ayuda) y descarga en CSV. **Comisión**: las
defensas de la 3.2 y la 3.3. **Configuración**: los parámetros de la §11 sobre `parametros.json`;
se guardan en este navegador y rigen para las entregas siguientes (p. ej., con el coeficiente en 6, un
circuito de la 1.2 que cerraba en +4 mm ya no aprueba). La piel del Acto 2 rige desde el próximo
intento de la 2.1. Desde ahí también se abren todas las misiones para una demostración.

## Ejecutar

```bash
pnpm install
pnpm dev         # http://localhost:5173
pnpm test        # pruebas (vitest)
pnpm typecheck
pnpm build       # genera dist/ (rutas relativas: sirve en cualquier carpeta)
```

Para reiniciar la demo, borra el almacenamiento local del navegador (claves `gn3d_sesion_v1`,
`gn3d_viaje_v1`, `gn3d_libretas_v1`, `gn3d_juego_v1` y `gn3d_parametros_v1`).

## Dónde está cada cosa

```
public/arte/      imágenes del Cochayuyero (provisorias, hasta el arte final)
public/datos/     archivos editables sin recompilar: parametros.json (§11), cuadrillas.json
                  (curso simulado), diálogos del Cochayuyero, tabla de la auditoría 3.1
src/datos/        catálogo de misiones y actos, esquema de parámetros, usuarios demo
src/estado/       sesión, parámetros, viaje, libretas, XP y ayudas, curso (zustand)
src/misiones/     reglas de cada misión (1.1 a 3.3) sobre un shell común
src/estilos/      paleta: única fuente de colores (Tailwind, 3D y prueba de contraste AA)
src/escena3d/     escena 3D (three.js): terreno, nivel, mira tipo E, anteojo, cinta, cámaras
public/datos/escenarios/  terrenos de las misiones (campus UCT, parada rural, Ñielol)
src/motor/        núcleo de cálculo puro, sin interfaz: método de los desniveles, cierre y
                  compensación, lecturas simuladas, perfiles, escenarios, decisiones del Acto 2,
                  misión cooperativa, auditoría, puntaje, cuadrillas y clasificación, estados de
                  misión y evaluación oral
src/textos/       textos de la interfaz en español de Chile
```
