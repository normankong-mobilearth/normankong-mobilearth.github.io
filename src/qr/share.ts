import { PALETTE_IDS, isPaletteId, type PaletteId } from "../scene/palettes";
import { parseDestination } from "./url";

const PREFIX = "#p/";

export function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function fromBase64Url(token: string): string | null {
  try {
    const padded = token + "=".repeat((4 - (token.length % 4)) % 4);
    const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function encodeShare(destination: string, palette: PaletteId): string {
  return `${PREFIX}${palette}/${toBase64Url(destination)}`;
}

export function decodeShare(hash: string): { destination: string; palette: PaletteId } | null {
  const raw = hash.startsWith("#") ? hash : `#${hash}`;
  if (!raw.startsWith(PREFIX)) return null;
  const rest = raw.slice(PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  const paletteToken = rest.slice(0, slash);
  const payload = rest.slice(slash + 1);
  if (!isPaletteId(paletteToken) || !payload) return null;
  const destination = fromBase64Url(payload);
  if (!destination) return null;
  const parsed = parseDestination(destination);
  if (!parsed.ok) return null;
  return { destination: parsed.href, palette: paletteToken };
}

export function shareUrl(destination: string, palette: PaletteId): string {
  const url = new URL(window.location.href);
  url.hash = encodeShare(destination, palette).slice(1);
  return url.toString();
}

export function embedSnippet(destination: string, palette: PaletteId): string {
  const url = new URL(window.location.href);
  url.searchParams.set("embed", "1");
  url.hash = encodeShare(destination, palette).slice(1);
  return `<iframe src="${url.toString()}" title="Plot — sculptural QR park" width="440" height="560" loading="lazy" referrerpolicy="no-referrer" style="border:0;border-radius:20px;max-width:100%;background:#12110f;"></iframe>`;
}

export { PALETTE_IDS };
