export const PALETTE_IDS = ["limestone", "obsidian", "harbor", "kiln", "verdigris"] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export type Palette = {
  id: PaletteId;
  name: string;
  tag: string;
  /** Raised (dark) modules in sculpture view. */
  dark: number;
  /** Low (light) modules / soil in sculpture view. */
  light: number;
  trunk: number;
  canopy: number;
  stone: number;
  planter: number;
  planterLip: number;
  studio: number;
  hemiSky: number;
  hemiGround: number;
  sun: number;
  swatchA: string;
  swatchB: string;
};

/**
 * Scan-view module colors. These are unlit black and white so phone cameras
 * get a contrast ratio of 21:1 — well above typical QR decoder thresholds.
 */
export const SCAN_DARK = 0x000000;
export const SCAN_LIGHT = 0xffffff;

export const PALETTES: Record<PaletteId, Palette> = {
  limestone: {
    id: "limestone",
    name: "Limestone",
    tag: "Gallery plaster",
    dark: 0x2c2925,
    light: 0xe7dccb,
    trunk: 0x6a5344,
    canopy: 0x8fb15a,
    stone: 0xc3b6a2,
    planter: 0xd8cebf,
    planterLip: 0xb4a790,
    studio: 0x141311,
    hemiSky: 0xf2ece3,
    hemiGround: 0x8a8175,
    sun: 0xfff3e1,
    swatchA: "#2c2925",
    swatchB: "#8fb15a",
  },
  obsidian: {
    id: "obsidian",
    name: "Obsidian",
    tag: "Night studio",
    dark: 0x121417,
    light: 0xcfd5dc,
    trunk: 0x3c352f,
    canopy: 0x6f9a78,
    stone: 0x6a7178,
    planter: 0x2a2e34,
    planterLip: 0x171b20,
    studio: 0x0b0c0e,
    hemiSky: 0xd7dde4,
    hemiGround: 0x3d444c,
    sun: 0xe8eef6,
    swatchA: "#121417",
    swatchB: "#6f9a78",
  },
  harbor: {
    id: "harbor",
    name: "Harbor",
    tag: "Fog and tide",
    dark: 0x1a2b3a,
    light: 0xd5dce4,
    trunk: 0x5a5348,
    canopy: 0x7eb8a8,
    stone: 0x9aa6b0,
    planter: 0xc5cdd5,
    planterLip: 0x8e99a4,
    studio: 0x10161c,
    hemiSky: 0xe4eaf0,
    hemiGround: 0x5a6a78,
    sun: 0xf0f5fa,
    swatchA: "#1a2b3a",
    swatchB: "#7eb8a8",
  },
  kiln: {
    id: "kiln",
    name: "Kiln",
    tag: "Courtyard clay",
    dark: 0x4a2b22,
    light: 0xead7c0,
    trunk: 0x3d241c,
    canopy: 0x8d9a42,
    stone: 0xc4a888,
    planter: 0xd9c2a8,
    planterLip: 0xb08968,
    studio: 0x17110e,
    hemiSky: 0xf3e6d6,
    hemiGround: 0x8a6a55,
    sun: 0xffe6cc,
    swatchA: "#4a2b22",
    swatchB: "#8d9a42",
  },
  verdigris: {
    id: "verdigris",
    name: "Verdigris",
    tag: "Sculpture garden",
    dark: 0x1c2c28,
    light: 0xd3e2db,
    trunk: 0x8a5a38,
    canopy: 0x4ca890,
    stone: 0x8aa197,
    planter: 0xc5d4cc,
    planterLip: 0x6f8a80,
    studio: 0x101614,
    hemiSky: 0xe4f0ea,
    hemiGround: 0x4d6a60,
    sun: 0xf0fff8,
    swatchA: "#1c2c28",
    swatchB: "#4ca890",
  },
};

export const DEFAULT_PALETTE: PaletteId = "limestone";

export function isPaletteId(value: string): value is PaletteId {
  return (PALETTE_IDS as readonly string[]).includes(value);
}
