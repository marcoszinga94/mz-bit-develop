# ⚔️ Bit Knight

Action RPG idle en 2D donde el héroe lucha solo y tú subes de nivel respondiendo
preguntas de programación básica. Acierta para elegir una mejora o una pieza de
equipamiento; consigue dos piezas iguales y se fusionarán en una mejor.

## Stack

- [Astro 7](https://astro.build) con isla de React 19 (`client:only`)
- Tailwind CSS 4
- Canvas 2D para el combate (sin assets externos, arte procedural)
- Vitest para la lógica de progresión y equipamiento

## Arrancar

```bash
npm install
npm run dev
```

Abre la URL que indique Astro (por defecto `http://localhost:4321`).

```bash
npm run build     # build estático en dist/
npm run preview   # sirve el build
npm test          # tests de lógica
npm run typecheck # TypeScript sin emitir
```

## Cómo se juega

- El héroe está fijo en el centro de la arena y ataca automáticamente al enemigo
  más cercano dentro de su rango.
- Cada kill da XP. Al llenar la barra se pausa el combate y aparece una pregunta
  de programación con 4 opciones.
- **Acierto:** subes de nivel y eliges 1 de 3 recompensas (mejora de estadística
  o pieza de equipo).
- **Fallo:** pierdes el nivel pendiente y el 50 % del XP. Se muestra la respuesta
  correcta con explicación y el combate continúa.
- **Equipo:** 4 slots (arma, armadura, anillo, botas). Dos piezas iguales se
  fusionan automáticamente y suben de tier (máximo ★4).
- **Muerte:** la partida termina y se reinicia el progreso.
- La partida se guarda en `localStorage` y se puede continuar al recargar.

Teclas: `1-4` para responder, `Enter`/`Espacio` para continuar, `1-3` para elegir
recompensa.

## Estructura

```
src/
├── pages/index.astro          # entrada, monta el juego
├── styles/global.css          # Tailwind + tema visual
├── components/
│   ├── GameShell.tsx          # estados, XP, guardado, callbacks
│   ├── HUD.tsx                # vida, XP, nivel, kills, tiempo
│   ├── QuestionModal.tsx      # pregunta y feedback
│   ├── RewardModal.tsx        # elección de recompensa
│   ├── EquipmentPanel.tsx     # slots y stats derivadas
│   ├── GameOver.tsx
│   └── StartScreen.tsx
└── game/
    ├── engine.ts              # bucle, enemigos, combate, partículas
    ├── progression.ts         # XP, niveles, recompensas
    ├── equipment.ts           # items, tiers, fusión, loadout
    ├── questions.ts           # banco de 20 preguntas
    ├── save.ts                # localStorage validado
    ├── audio.ts               # SFX sintetizados con WebAudio
    └── types.ts
```

## Balance del prototipo

- Vida base 100, daño 10, ataque cada 0,8 s, rango 280 px.
- XP por kill: 15. XP para subir: `20 + 10 × nivel`.
- Enemigos: slime, murciélago y gólem; escala con el nivel.
- 20 preguntas en español (variables, operadores, condicionales, bucles,
  funciones, arrays, alcance y recursión), sin repetir hasta agotar el banco.

## Notas técnicas

- El canvas usa un **mundo lógico fijo** definido al arrancar y una cámara con
  escala uniforme. Al cambiar el zoom del navegador o el tamaño de la ventana,
  el mundo se escala y centra; el héroe y los enemigos conservan su posición
  relativa en lugar de saltar.
- El combate, los proyectiles y las partículas viven en coordenadas del mundo;
  el HUD, los modales y el equipo son DOM (React + Tailwind).

## Próximos pasos posibles

- Más zonas, jefes y tipos de enemigo.
- Sets de equipo con bonus y rarezas.
- Más preguntas y categorías configurables.
- Ranking local y estadísticas por partida.
