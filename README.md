# 💻 Bit Develop

Action RPG idle en 2D donde un desarrollador lucha solo contra bugs, virus y
troyanos. Tú subes de nivel respondiendo preguntas de programación básica:
acierta para elegir una mejora o una pieza de equipamiento; consigue dos piezas
iguales y se fusionarán en una mejor.

Al caer ganas **monedas** según el nivel alcanzado y los enemigos derrotados.
Esas monedas se invierten fuera de la partida en **mejoras pasivas permanentes**
que se aplican a todas las runs siguientes.

## Stack

- [Astro 7](https://astro.build) con isla de React 19 (`client:only`)
- Tailwind CSS 4
- Canvas 2D para el combate (sprites 2D renderizados en Blender + VFX procedurales)
- WebAudio para efectos y música chiptune sintetizados en tiempo real
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

- El desarrollador está fijo en el centro de la arena y ataca automáticamente al
  enemigo más cercano dentro de su rango con su espada compiladora.
- Cada kill da XP. Al llenar la barra se pausa el combate y aparece una pregunta
  de programación con 4 opciones.
- **Acierto:** subes de nivel y eliges **1 de 3 mejoras de software** de un
  pool de 13 mejoras posibles.
- **Fallo:** pierdes el nivel pendiente y el 50 % del XP. Se muestra la respuesta
  correcta con explicación y el combate continúa.
- **Equipo:** 4 slots (arma, armadura, anillo, botas). Cada 2 niveles se instala
  una pieza de hardware automáticamente; dos piezas iguales se fusionan y suben
  de tier (máximo ★4).
- **Oleadas:** cada **45 segundos** sube la oleada. Los enemigos ganan vida,
  daño y velocidad, y aparecen más rápido. El HUD muestra la oleada actual y el
  tiempo hasta la siguiente; al subir aparece un aviso en pantalla.
- **Muerte:** la partida termina y se reinicia el progreso de la run, pero ganas
  monedas según el nivel alcanzado y los kills. El récord y las mejoras
  permanentes se conservan.
- **Meta-progresión:** desde la pantalla de inicio o la de derrota puedes abrir
  la tienda de mejoras permanentes (Refactor, Cafeína, Documentación, Linter y
  Firewall), con 5 niveles cada una.
- La partida se guarda en `localStorage` y se puede continuar al recargar.

Teclas: `1-4` para responder, `Enter`/`Espacio` para continuar, `1-3` para elegir
recompensa.

Sonido: el HUD y la pantalla de inicio permiten silenciar todo (`🔊`) o solo la
música (`🎵`). Las preferencias se guardan en `localStorage`.

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
│   ├── MetaShop.tsx           # tienda de mejoras permanentes
│   ├── GameOver.tsx           # resumen + monedas ganadas
│   └── StartScreen.tsx
└── game/
    ├── engine.ts              # bucle, enemigos, combate, partículas
    ├── sprites.ts             # carga y dibujo de hojas de sprites
    ├── progression.ts         # XP, niveles, recompensas
    ├── meta.ts                # monedas, costes y pasivas permanentes
    ├── equipment.ts           # items, tiers, fusión, loadout
    ├── questions.ts           # banco de 42 preguntas simples
    ├── save.ts                # localStorage validado
    ├── audio.ts               # SFX y música procedural con WebAudio
    └── types.ts
public/
└── sprites/                   # hojas PNG y manifiesto generados con Blender
tools/
└── blender/                   # scripts de modelado, render y empaquetado
```

## Balance del prototipo

- Vida base **128** (`2**7`), daño **8** (`2**3`), ataque cada **0,5 s**
  (`2**1/s`) y rango **256** (`2**8`) px. Las estadísticas se muestran como
  potencias de dos; las mejoras usan fracciones binarias (25 %, 12,5 %, 6,25 %,
  3,125 %) y cada tier de equipo duplica su bono.
- XP por kill: 15. XP para subir: `20 + 10 × nivel`.
- Enemigos: **bug** (rápido y frágil), **virus** (flotante y veloz) y
  **troyano** (lento y tanque); escalan con el nivel.
- XP por kill: bug 14, virus 20, troyano 36. Los **élites** (desde nivel 4)
  tienen 1.8× vida, dan 2.5× XP y llevan un anillo dorado.
- **Combo:** las kills encadenadas multiplican la XP hasta ×1.75 y se muestran
  en el HUD.
- Mejoras de build (pool de 13): **Overclock** (crítico), **Golpe cuántico**
  (daño crítico), **Multihilo** (+proyectil), **Paquete perforante**,
  **Auto-reparación**, **Compilación -O2**, **Parche en caliente** (regen),
  **Firewall local** (reducción de daño) y **Fibra óptica** (velocidad de
  proyectil), además de las cuatro estadísticas base.
- Escalado por oleada: vida ×1.35 y daño ×1.18 por oleada; la frecuencia de
  aparición baja un 6 % y la velocidad sube hasta un 45 %. Máximo 40 enemigos
  en pantalla.
- Monedas al morir: `8 + 5 × nivel + kills / 4` (mínimo 5).
- Mejoras permanentes: 5 categorías × 5 niveles. El coste escala con el nivel
  (`coste base × (nivel + 1)`).
- 42 preguntas en español de nivel inicial (variables, tipos, operadores,
  condicionales, bucles, funciones, arrays, objetos y binario), sin repetir
  hasta agotar el banco. El orden de las preguntas y de sus opciones es aleatorio.

## Notas técnicas

- Los personajes son **sprites 2D pre-renderizados en Blender**: un avatar de
  ejecución, un glitch de wireframe, un daemon orbital y un payload monolito.
  Son entidades digitales abstractas, no representaciones literales. El modelado, las animaciones idle/ataque y el render
  ortogonal viven en `tools/blender/make_sprites.py`; `pack_sprites.py` recorta,
  empaqueta y genera `public/sprites/manifest.json`. Se regeneran con
  `npm run sprites`.
- El motor carga las hojas de forma asíncrona y mantiene el arte procedural como
  fallback: si los sprites no están disponibles, el juego sigue funcionando.
- La arena es una **placa base**: rejilla PCB, pistas de circuito con pulsos de
  datos, chips con etiquetas (CPU, RAM, GPU, NET…), zócalo de procesador bajo el
  héroe, racks de servidores con LEDs y scanlines de monitor.
- Las estadísticas principales se muestran como potencias de dos (`2**3`,
  `2**7`, `2**8`…) mediante `pow2Label`; los valores reales siguen siendo números
  para la simulación y aparecen en el tooltip.
- La interfaz usa estética de terminal: `INTEGRIDAD`, `COMPILACIÓN`, `HARDWARE`,
  `BUILD`, `UPTIME`, `AUTO-EXEC`, prompts `root@bitdevelop:~$` y cursor
  parpadeante. Los enemigos sueltan `+DATA` y al subir de nivel aparece
  `COMPILED`.
- Las claves antiguas de `localStorage` (`bit-knight-*`) se migran
  automáticamente a las nuevas (`bit-develop-*`) para no perder partidas.
- La espada del avatar, las sombras, los portales de aparición, las partículas,
  los anillos de impacto, el combo y las barras de vida siguen dibujándose por código;
  así la espada apunta siempre al enemigo y los efectos se adaptan al combate.
- El audio es 100 % procedural con WebAudio: los SFX (disparo, impacto, muerte,
  subida de nivel, acierto/fallo, etc.) son osciladores y ruido filtrado; la
  música es un secuenciador chiptune con bajo, arpegio, pad, melodía y batería
  que gana intensidad con el nivel del jugador.
- El canvas usa un **mundo lógico fijo** definido al arrancar y una cámara con
  escala uniforme. Al cambiar el zoom del navegador o el tamaño de la ventana,
  el mundo se escala y centra; el desarrollador y los enemigos conservan su posición
  relativa en lugar de saltar.
- El combate, los proyectiles y las partículas viven en coordenadas del mundo;
  el HUD, los modales y el equipo son DOM (React + Tailwind).

## Próximos pasos posibles

- Más zonas, jefes y enemigos temáticos (gusanos, ransomware, bugs de producción).
- Sets de equipo con bonus y rarezas.
- Más preguntas y categorías configurables.
- Ranking local y estadísticas por partida.
