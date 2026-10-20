# GeoNova3D — Misión Topógrafo · Parte 1

**🔗 Demo en vivo: https://drakeuno.github.io/geonova3d/**

Juego web de la Parte 1, **"El Viaje del Cochayuyero"**: nivelación geométrica con nivel de
ingeniero, por el método de los desniveles (PID 2026, UC Temuco). Se construye según la
especificación técnica v1.1 (octubre 2026), documento interno del proyecto. Datos simulados: no
guarda nada fuera del navegador de quien lo usa.

Estado: **Parte 1 completa (fases F0 a F9)**: las 9 misiones jugables en sus tres actos, con las
escenas del Cochayuyero; libreta de campo; terreno 3D; gamificación por cuadrilla (XP, insignias,
ayuda entre compañeros, clasificación); panel docente con seguimiento, comisión evaluadora y
configuración; accesibilidad WCAG 2.1 AA. Pendiente para el piloto (fase B): servidor con cuentas
reales y control de acceso por rol.

## Guion de demostración (5 minutos)

Desde un navegador limpio (o tras borrar los datos del sitio). Los valores de la misión 1.1 están en
[Valores verdaderos](#valores-verdaderos-de-cada-escenario).

| Minuto | Qué hacer | Qué mostrar |
|---|---|---|
| 0:00 | Entrar como **Camila Reyes**. | El viaje en tres actos, el XP, el puntaje y el lugar de la Cuadrilla 1, las 10 insignias por ganar. |
| 0:30 | **Jugar** la 1.1. Leer el encargo del Cochayuyero. Calar la burbuja con los tres tornillos (o Q/A, W/S, E/D) y **Listo**. | Sin calar la burbuja, la cruz se corre y la lectura sale con error (CP-01). |
| 1:00 | **LT a PR-1**: leer la mira por el anteojo (número = decímetro, barras de la E = centímetros, milímetros estimados) y anotarla. **LA a P1**, **Medir con cinta**, anotar lectura, distancia, Δh = LT − LA y cota. | Libreta del método de los desniveles: no existe la altura instrumental (CP-08). Lo registrado no se borra: se corrige en línea nueva (CP-03). |
| 2:00 | **Entregar al Cochayuyero**. | Insignia Bronce, XP por misión y +100 por cada lectura exacta (±1 mm). P1 = 100,437 m. |
| 2:30 | **Mi cuadrilla** y **Clasificación**. | Puntaje = promedio del XP de la cuadrilla + bonus grupal; compañeros que piden ayuda; tabla del curso. |
| 3:15 | **Salir** y entrar como **Claudio Gil**. **Seguimiento**: la 1.1 de Camila aprobada; descargar el CSV. **Configuración**: cambiar la piel del Acto 2 a Camino del Pehuén y guardar. | El docente ajusta tolerancias, XP, pendientes y escalas sin recompilar (RF-08, RF-12). |
| 4:30 | Botón del **proyector** en la barra. | Texto 25 % más grande para la sala. |

Para una demostración larga: en **Configuración → Demostración**, **Abrir todas las misiones**.

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

## Accesibilidad y equipos de la sala

- **WCAG 2.1 AA**: axe-core no encuentra violaciones en las 22 páginas (estudiante y docente), en
  escritorio, tablet, celular y modo proyector. El contraste de cada par de colores que usa la
  interfaz lo comprueba una prueba automática de la paleta.
- **Teclado**: todo el juego se juega sin mouse. En el terreno 3D, Tab lo selecciona; las flechas
  giran la cámara y + y − la acercan. El nivel esférico responde a Q/A, W/S y E/D. Las tablas anchas
  se recorren con las flechas cuando no caben.
- **Diálogos** del Cochayuyero en texto (cuando llegue la voz, el texto queda como subtítulo).
- **Sin WebGL**: el terreno 3D se reemplaza por un aviso y el anteojo se dibuja en 2D; las misiones
  se juegan igual.
- **Rendimiento**: con la CPU cuatro veces más lenta y el 3D por software, cada acción de lectura
  (visar, registrar, medir con cinta) responde en menos de 2 s (la más lenta, 1,5 s). Abrir una
  misión con el terreno 3D tarda unos 4 s en esas condiciones.

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

## Valores verdaderos de cada escenario

Para quien presenta o revisa. Las **lecturas** cambian en cada intento (el sistema elige la línea de
colimación al azar para que caigan entre 0,500 y 2,500 m); las **cotas** no. Con lecturas exactas,
todos los cierres dan 0 mm. Estos valores salen de `public/datos/escenarios/` y del motor del juego.

> Antes del piloto con estudiantes: estos datos viajan hoy al navegador (es una demo sin servidor).
> Con la fase B, el terreno y las respuestas deben quedar en el servidor.

### Respuesta esperada por misión

| Misión | Recorrido | Respuesta |
|---|---|---|
| 1.1 | PR-1 → P1, una postura, 31 m | PR-1 = 100,000 · Δh = +0,437 · **P1 = 100,437 m**. Tolerancia T = 2,1 mm. |
| 1.2 | A (PR-2) → B → C → D → A, 2 posturas (C punto de cambio), 210 m | B = 100,585 · C = 101,340 · D = 100,910 · e = 0 con lecturas exactas; T = 5,5 mm; compensación ±2 mm. |
| 1.3 | PR-3 → E0…E5 → PR-3, 3 posturas, 228 m | Cotas E0–E5 de la tabla; cierra volviendo al PR-3 (ΣΔh = 0), T = 5,7 mm; escalas 1:100 H y 1:20 V; plano de comparación 99,000 o 98,000 m. |
| 2.1 · Red del Agua | PR-R1 → F → V1…V4, 4 posturas | V4 − F = **4,031 m** en 400 m de trazado: P ≈ −1,0 % (la mínima por gravedad es 0,5 %) → **bombeo**. |
| 2.1 · Camino del Pehuén | PR-P1 → K0…K4, 4 posturas | Solo **K2–K3** pasa el 8 %: sube 1,730 m en 20 m = **8,65 %** → **no transitable**. |
| 2.1 · Cero Cota | PR-C1 → C1…C4, 3 posturas | Línea de seguridad 99,500 m: **C1 (99,120) y C3 (99,462)** quedan bajo ella. |
| 2.2 | PR-R2 → V1…V4 y T, 3 posturas, 338 m | Radier real 101,350; el plano trae **104,850 (3,500 m de más)**. Estanque real = 101,350 + torre 8,750 = 110,100: **V2 (9,68 m.c.a.) y V3 (9,12 m.c.a.)** bajo 10. **Cota óptima = máx(Vᵢ) + 10 = 110,980 m**. |
| 2.3 | Cuadrilla A: C → M → C; cuadrilla B: R → M → R; 400 m cada una | C = 101,800 · R = 99,950 · **M = 100,873**. El evento sembrado (mira dañada o trípode golpeado, > 30 mm) cambia con la semilla; el diagnóstico pide tramo, postura, causa y la cota común de M (±T). |
| 3.1 | Tabla de la contratista, sendero Los Copihues | Cotas verdaderas: E0 104,120 · E1 104,655 · E2 105,310 · E3 105,180 · E4 106,020 · E5 106,475 (cada 20 m). Cada intento siembra 5 errores: 2 lecturas groseras, 1 distancia, 1 signo invertido y 1 cota mal transcrita. |
| 3.2 | Sin terreno | Confirmar los 4 materiales y pedir la defensa. El docente carga la evidencia y la rúbrica: cada evaluador aprueba con ≥ 60 %, decide la mayoría. |
| 3.3 | Circuito E–B–L–M–R–Q–E (6 posturas, 553 m) y perfil E → M (4 posturas, 240 m, 13 estaciones) | PR E = 112,400 · **M = 115,020**; T del circuito = 8,9 mm. Tramo crítico **S07–S08 = 8,75 %** (el único sobre 8 %). Luego informe técnico y defensa ante la comisión. |

### Cotas de cada terreno

#### Campus UCT · campamento base (`campus-uct.json`)

| Punto | Cota (m) |
|---|---:|
| PR-1 (PR) | 100,000 |
| P1 | 100,437 |
| A (PR-2) (PR) | 100,120 |
| B | 100,585 |
| C | 101,340 |
| D | 100,910 |
| PR-3 (PR) | 99,640 |
| E0 | 99,812 |
| E1 | 100,071 |
| E2 | 100,395 |
| E3 | 100,548 |
| E4 | 100,903 |
| E5 | 101,217 |

| Recorrido | Posturas | Largo | T = 12√K |
|---|---:|---:|---:|
| 1.1 | 1 | 31 m | 2,1 mm |
| 1.2 | 2 | 210 m | 5,5 mm |
| 1.3 | 3 | 228 m | 5,7 mm |

| Tramo | Distancia | Δh (m) | Pendiente |
|---|---:|---:|---:|
| E0–E1 | 20 m | +0,259 | 1,30 % |
| E1–E2 | 20 m | +0,324 | 1,62 % |
| E2–E3 | 20 m | +0,153 | 0,77 % |
| E3–E4 | 20 m | +0,355 | 1,78 % |
| E4–E5 | 20 m | +0,314 | 1,57 % |

#### Parada rural · La Red del Agua (`rural-red-del-agua.json`)

| Punto | Cota (m) |
|---|---:|
| PR-R1 (PR) | 95,874 |
| F (vertiente) | 96,430 |
| V1 | 97,218 |
| V2 | 98,105 |
| V3 | 99,312 |
| V4 | 100,461 |

| Recorrido | Posturas | Largo | T = 12√K |
|---|---:|---:|---:|
| 2.1 | 4 | 415 m | 7,7 mm |

#### Parada rural · Camino del Pehuén (`rural-pehuen.json`)

| Punto | Cota (m) |
|---|---:|
| PR-P1 (PR) | 99,200 |
| K0 | 99,540 |
| K1 | 100,380 |
| K2 | 101,010 |
| K3 | 102,740 |
| K4 | 103,320 |

| Recorrido | Posturas | Largo | T = 12√K |
|---|---:|---:|---:|
| 2.1 | 4 | 195 m | 5,3 mm |

#### Parada rural · Operación Cero Cota (`rural-cero-cota.json`)

| Punto | Cota (m) |
|---|---:|
| PR-C1 (estribo del puente) (PR) | 98,700 |
| C1 | 99,120 |
| C2 | 99,870 |
| C3 | 99,462 |
| C4 | 100,240 |

| Recorrido | Posturas | Largo | T = 12√K |
|---|---:|---:|---:|
| 2.1 | 3 | 195 m | 5,3 mm |

#### Parada rural · El estanque elevado (`rural-estanque.json`)

| Punto | Cota (m) |
|---|---:|
| PR-R2 (PR) | 100,000 |
| V1 | 99,850 |
| V2 | 100,420 |
| V3 | 100,980 |
| V4 | 99,600 |
| T (radier del estanque) | 101,350 |

| Recorrido | Posturas | Largo | T = 12√K |
|---|---:|---:|---:|
| 2.2 | 3 | 338 m | 7,0 mm |

#### Parada rural · La línea de conducción (`rural-conduccion.json`)

| Punto | Cota (m) |
|---|---:|
| C (captación) (PR) | 101,800 |
| P1 | 101,320 |
| M (punto de encuentro) | 100,873 |
| Q1 | 100,410 |
| R (reservorio) (PR) | 99,950 |

| Recorrido | Posturas | Largo | T = 12√K |
|---|---:|---:|---:|
| 2.3-A | 4 | 400 m | 7,6 mm |
| 2.3-B | 4 | 400 m | 7,6 mm |

#### Cerro Ñielol · sendero principal (`nielol.json`)

| Punto | Cota (m) |
|---|---:|
| E (entrada · PR) (PR) | 112,400 |
| S01 | 112,480 |
| S02 | 112,590 |
| S03 | 112,650 |
| S04 | 112,760 |
| S05 | 112,840 |
| S06 | 112,930 |
| S07 | 113,010 |
| S08 | 114,760 |
| S09 | 114,830 |
| S10 | 114,880 |
| S11 | 114,960 |
| M (mirador) | 115,020 |
| B (bifurcación) | 112,950 |
| L (lago) | 114,200 |
| R (retorno) | 113,700 |
| Q | 113,050 |

| Recorrido | Posturas | Largo | T = 12√K |
|---|---:|---:|---:|
| 3.3-circuito | 6 | 553 m | 8,9 mm |
| 3.3-perfil | 4 | 240 m | 5,9 mm |

| Tramo | Distancia | Δh (m) | Pendiente |
|---|---:|---:|---:|
| E–S01 | 20 m | +0,080 | 0,40 % |
| S01–S02 | 20 m | +0,110 | 0,55 % |
| S02–S03 | 20 m | +0,060 | 0,30 % |
| S03–S04 | 20 m | +0,110 | 0,55 % |
| S04–S05 | 20 m | +0,080 | 0,40 % |
| S05–S06 | 20 m | +0,090 | 0,45 % |
| S06–S07 | 20 m | +0,080 | 0,40 % |
| S07–S08 | 20 m | +1,750 | 8,75 % |
| S08–S09 | 20 m | +0,070 | 0,35 % |
| S09–S10 | 20 m | +0,050 | 0,25 % |
| S10–S11 | 20 m | +0,080 | 0,40 % |
| S11–M | 20 m | +0,060 | 0,30 % |

#### Sendero ecológico Los Copihues (`public/datos/auditoria.json`, misión 3.1)

| Estación | Progresiva | Cota (m) |
|---|---:|---:|
| E0 | 0 m | 104,120 |
| E1 | 20 m | 104,655 |
| E2 | 40 m | 105,310 |
| E3 | 60 m | 105,180 |
| E4 | 80 m | 106,020 |
| E5 | 100 m | 106,475 |
