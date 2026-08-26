import type { QrMatrix } from "./matrix";

export const FALLBACK_DARK = "#000000";
export const FALLBACK_LIGHT = "#ffffff";

/**
 * Rasterize the QR matrix to a canvas.
 * Each module is an integer number of pixels (at least 8) so edges stay binary
 * for phone cameras. Quiet zone is already baked into `matrix`.
 */
export function drawQrCanvas(canvas: HTMLCanvasElement, matrix: QrMatrix, cssSize: number): number {
  const minModule = 8;
  const scale = Math.max(minModule, Math.floor(cssSize / matrix.size) || minModule);
  const px = matrix.size * scale;
  canvas.width = px;
  canvas.height = px;

  const ctx = canvas.getContext("2d");
  if (!ctx) return scale;

  ctx.fillStyle = FALLBACK_LIGHT;
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = FALLBACK_DARK;
  for (let y = 0; y < matrix.size; y++) {
    const row = matrix.modules[y];
    if (!row) continue;
    for (let x = 0; x < matrix.size; x++) {
      if (row[x]) ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return scale;
}

export function overlayOpacity(viewT: number): number {
  if (viewT <= 0.42) return 0;
  if (viewT >= 0.82) return 1;
  return (viewT - 0.42) / 0.4;
}
