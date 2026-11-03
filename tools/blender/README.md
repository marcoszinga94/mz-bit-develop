# Sprites 2D generados con Blender

El juego usa Canvas 2D, pero los personajes se renderizan en Blender y se
empaquetan como hojas de sprites. El motor los carga desde
`public/sprites/manifest.json` y, si fallan, vuelve al arte procedural.

## Requisitos

- Blender 4.2 o superior (probado con 5.2 LTS) disponible como `blender`.
- Python 3 con Pillow (`pip install pillow`) para empaquetar las hojas.

## Regenerar los sprites

```bash
npm run sprites
```

Equivale a:

```bash
blender --background --python tools/blender/make_sprites.py
python3 tools/blender/pack_sprites.py
```

- `make_sprites.py` crea una escena limpia en memoria (no toca el archivo
  abierto en Blender), modela al desarrollador, el bug, el virus y el troyano,
  anima idle/ataque y renderiza frames de 256×256 a `.sprites-raw/`.
- `pack_sprites.py` recorta los frames, calcula el bounding box común, empaqueta
  una hoja por personaje en `public/sprites/*.png` y escribe el manifiesto.

## Personajes

| Personaje | Animaciones | Tamaño máximo en pantalla |
| --- | --- | --- |
| `hero` | idle (8), attack (6) | 84×94 px |
| `bug` | idle (8), attack (6) | 62×52 px |
| `virus` | idle (8), attack (6) | 78×70 px |
| `trojan` | idle (8), attack (6) | 112×126 px |

El avatar no incluye la espada: el motor dibuja una espada compiladora
procedural para que apunte siempre al enemigo. Las sombras, partículas, portales,
barras de vida y demás VFX también siguen siendo procedurales.

La dirección de arte es abstracta y digital:

- **hero**: avatar de ejecución con armadura angular, visor, halo, escudo
  hexagonal de firewall y manto de fragmentos holográficos.
- **bug**: glitch de wireframe verde con ojo rojo, fragmentos flotantes y
  zarcillos de datos.
- **virus**: daemon oscuro con núcleo facetado, anillos orbitales y esquirla
  de datos.
- **trojan**: payload monolito negro/oro con paneles que se abren, núcleo rojo
  y fragmentos del cascarón.

## Formato del manifiesto

Cada personaje declara:

- `image`, `frameWidth`, `frameHeight`
- `anchorX`, `anchorY` (punto de anclaje dentro del frame)
- `maxWidth`, `maxHeight` (caja máxima de dibujo)
- `animations`: `idle` y `attack`, con fila, frames, fps y loop.

La fila 0 de cada hoja es `idle`; la fila 1 es `attack`.
