# Bit Develop

> Action RPG idle en 2D donde un desarrollador combate bugs, virus y troyanos mientras responde preguntas de programación.

![Astro](https://img.shields.io/badge/Astro-FF5D01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)

## Características

- **Bucle de juego:** el héroe permanece en el centro de la arena y ataca automáticamente al enemigo más cercano dentro de su rango. Los enemigos son bugs, virus, troyanos y variantes elite.
- **Oleadas:** cada 45 segundos sube la oleada; aumentan vida, daño y velocidad enemigos, y la frecuencia de aparición. El HUD muestra oleada y tiempo restante.
- **Progresión por conocimiento:** al llenar la barra de XP el combate se pausa y aparece una pregunta de programación con 4 opciones.
- **Acierto:** sube de nivel y elige 1 de 3 mejoras de software. **Fallo:** la XP queda en el 50 % de lo necesario para el siguiente nivel y se muestra la respuesta correcta con explicación.
- **13 mejoras** con stacks: daño, cadencia, vitalidad, alcance, crítico, multihilo, perforación, lifesteal, XP, daño crítico, regeneración, armadura y velocidad de proyectil.
- **Equipamiento:** 4 slots (periférico, chasis, módulo I/O y acelerador). Cada 2 niveles cae una pieza automáticamente; dos piezas iguales se fusionan y suben de tier hasta ★4.
- **Meta-progresión:** al morir se ganan monedas según nivel y kills. La tienda permanente ofrece Refactor, Cafeína, Documentación, Linter y Firewall, con 5 niveles cada una.
- **Persistencia:** partida, récord, monedas y preferencias de sonido en `localStorage`; se puede continuar tras recargar.
- **Audio procedural:** efectos y música chiptune sintetizados con WebAudio, con silencio total o solo de música.
- **Sprites:** hojas PNG generadas en Blender y cargadas desde `public/sprites`; si fallan, el juego usa arte procedural.
- **Tests:** Vitest cubre equipamiento, progresión, cámara del mundo, meta-progresión y validación del banco de 42 preguntas.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Astro 7 con isla de React 19 (`client:only`) |
| Render | Canvas 2D para combate y VFX |
| Estilos | Tailwind CSS 4 |
| Audio | WebAudio sin assets externos |
| Herramientas | Blender y Python con Pillow para sprites |
| Tests | Vitest |

## Estructura del proyecto

```text
src/
  pages/index.astro     entrada y montaje del juego
  components/           HUD, modales, tienda, pantallas
  game/
    engine.ts           combate, oleadas y render
    progression.ts      XP, niveles y recompensas
    equipment.ts        slots, tiers y fusión
    meta.ts             monedas y mejoras permanentes
    questions.ts        banco de preguntas
    audio.ts            SFX y música
    save.ts             persistencia local
  styles/global.css     Tailwind y tema
public/sprites/         sprites y manifiesto
tests/                  suite de Vitest
tools/blender/          generación de sprites
```

## Puesta en marcha

### Requisitos

- Node.js 22 o superior y npm.
- Blender 4.2 o superior y Pillow solo para regenerar sprites.

### Instalación

```bash
npm install
npm run dev
```

Astro sirve el juego en `http://localhost:4321` por defecto.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build estático en `dist/` |
| `npm run preview` | Sirve el build generado |
| `npm run test` | Ejecuta la suite de Vitest |
| `npm run typecheck` | Chequeo de TypeScript sin emitir |
| `npm run sprites` | Regenera y empaqueta los sprites con Blender |

## Despliegue

El build es estático y no usa adapter: el contenido de `dist/` se puede publicar en
cualquier hosting de sitios estáticos.

## Estado del proyecto

Juego jugable con combate, progresión, equipamiento, meta-progresión y guardado local.
El balance y la variedad de contenido siguen en desarrollo.

## Licencia

Sin licencia definida.

## Autor

Marcos Zingaretti — https://github.com/marcoszinga94
