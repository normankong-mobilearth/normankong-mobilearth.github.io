export type GlLevel = "webgl2" | "webgl" | null;

export function detectWebGL(): GlLevel {
  try {
    const canvas = document.createElement("canvas");
    if (canvas.getContext("webgl2")) return "webgl2";
    const gl1 = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl1) return "webgl";
    return null;
  } catch {
    return null;
  }
}
