/**
 * Carga y dibuja los sprites 2D renderizados en Blender.
 *
 * El juego funciona sin ellos (arte procedural de respaldo); cuando el
 * manifiesto y las hojas están listos, el motor cambia automáticamente.
 */

export interface SpriteAnimation {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
}

export interface SpriteManifestEntry {
  image: string;
  frameWidth: number;
  frameHeight: number;
  anchorX: number;
  anchorY: number;
  maxWidth: number;
  maxHeight: number;
  animations: Record<string, SpriteAnimation>;
}

export interface SpriteSheet extends Omit<SpriteManifestEntry, 'image'> {
  image: HTMLImageElement;
  tint: HTMLCanvasElement | null;
}

class SpriteBank {
  private sheets = new Map<string, SpriteSheet>();
  private loading: Promise<void> | null = null;
  private loaded = false;

  get ready(): boolean {
    return this.loaded;
  }

  load(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (this.loading) return this.loading;

    this.loading = (async () => {
      try {
        const response = await fetch('/sprites/manifest.json', {
          cache: 'force-cache',
        });
        if (!response.ok) return;

        const manifest = (await response.json()) as Record<
          string,
          SpriteManifestEntry
        >;
        const sheets = await Promise.all(
          Object.entries(manifest).map(async ([key, data]) => {
            const image = new Image();
            image.decoding = 'async';
            await new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () => reject(new Error(`No se pudo cargar ${data.image}`));
              image.src = data.image;
            });
            return [key, { ...data, image, tint: null } as SpriteSheet] as const;
          }),
        );

        for (const [key, sheet] of sheets) this.sheets.set(key, sheet);
        this.loaded = true;
      } catch {
        // Sin sprites: el motor sigue usando el arte procedural.
        this.sheets.clear();
        this.loaded = false;
      }
    })();

    return this.loading;
  }

  get(key: string): SpriteSheet | undefined {
    return this.loaded ? this.sheets.get(key) : undefined;
  }

  /**
   * Silueta blanca de un frame para el flash de daño.
   * Se cachea por hoja y se reutiliza hasta cambiar de frame.
   */
  tintFrame(
    sheet: SpriteSheet,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
  ): HTMLCanvasElement {
    if (!sheet.tint) {
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      sheet.tint = canvas;
    }
    const canvas = sheet.tint;
    const context = canvas.getContext('2d');
    if (!context) return canvas;

    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, sw, sh);
    context.drawImage(sheet.image, sx, sy, sw, sh, 0, 0, sw, sh);
    context.globalCompositeOperation = 'source-in';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, sw, sh);
    context.globalCompositeOperation = 'source-over';
    return canvas;
  }
}

export const spriteBank = new SpriteBank();

export interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dw: number;
  dh: number;
}

/** Calcula el frame actual y el tamaño de dibujo en píxeles del mundo. */
export function getSpriteFrame(
  sheet: SpriteSheet,
  animationName: 'idle' | 'attack',
  time: number,
  attackProgress = 0,
): SpriteFrame {
  const animation =
    sheet.animations[animationName] ?? sheet.animations.idle;
  const frames = Math.max(1, animation.frames);
  const frame = animationName === 'attack'
    ? Math.min(frames - 1, Math.max(0, Math.floor(attackProgress * frames)))
    : Math.floor(time * animation.fps) % frames;

  const scale = Math.min(
    sheet.maxWidth / sheet.frameWidth,
    sheet.maxHeight / sheet.frameHeight,
  );

  return {
    sx: frame * sheet.frameWidth,
    sy: animation.row * sheet.frameHeight,
    sw: sheet.frameWidth,
    sh: sheet.frameHeight,
    dw: sheet.frameWidth * scale,
    dh: sheet.frameHeight * scale,
  };
}
