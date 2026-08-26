import { detectWebGL } from "../detect";
import { prefersReducedMotion } from "../motion";
import { drawQrCanvas, overlayOpacity } from "../qr/draw2d";
import { buildQrMatrix, type QrMatrix } from "../qr/matrix";
import { decodeShare, embedSnippet, encodeShare, shareUrl } from "../qr/share";
import { hostLabel, parseDestination } from "../qr/url";
import { GroveScene, type GroveView } from "../scene/grove";
import { DEFAULT_PALETTE, PALETTES, PALETTE_IDS, type PaletteId } from "../scene/palettes";

const DEFAULT_URL = "https://www.hailicorn.com/";

type Elements = {
  form: HTMLFormElement;
  url: HTMLInputElement;
  error: HTMLElement;
  palettes: HTMLElement;
  stage: HTMLElement;
  grove: HTMLCanvasElement;
  scanQr: HTMLCanvasElement;
  fallback: HTMLCanvasElement;
  fallbackNote: HTMLElement;
  stageWait: HTMLElement;
  visit: HTMLAnchorElement;
  copy: HTMLButtonElement;
  embedBtn: HTMLButtonElement;
  flatten: HTMLButtonElement;
  hint: HTMLElement;
  live: HTMLElement;
  meta: HTMLElement;
};

function qs<T extends Element>(sel: string): T {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`Missing ${sel}`);
  return el as T;
}

export async function boot(): Promise<void> {
  const el: Elements = {
    form: qs("#plant-form"),
    url: qs("#url"),
    error: qs("#url-error"),
    palettes: qs("#palettes"),
    stage: qs("#stage"),
    grove: qs("#grove"),
    scanQr: qs("#scan-qr"),
    fallback: qs("#fallback-qr"),
    fallbackNote: qs("#fallback-note"),
    stageWait: qs("#stage-wait"),
    visit: qs("#visit"),
    copy: qs("#copy-link"),
    embedBtn: qs("#copy-embed"),
    flatten: qs("#flatten"),
    hint: qs("#hint"),
    live: qs("#live"),
    meta: qs("#meta"),
  };

  const embed = new URLSearchParams(location.search).get("embed") === "1";
  if (embed) document.documentElement.classList.add("embed");

  let destination = DEFAULT_URL;
  let palette: PaletteId = DEFAULT_PALETTE;
  let matrix: QrMatrix = buildQrMatrix(destination);
  const shared = decodeShare(location.hash);
  if (shared) {
    destination = shared.destination;
    palette = shared.palette;
    matrix = buildQrMatrix(destination);
  }

  el.url.value = destination;
  renderSwatches(el.palettes, palette);

  const gl = detectWebGL();
  let grove: GroveScene | null = null;

  const applyOverlay = (t: number) => {
    const o = overlayOpacity(t);
    el.scanQr.style.opacity = String(o);
    el.scanQr.classList.toggle("is-on", o > 0.02);
    el.scanQr.setAttribute("aria-hidden", o < 0.5 ? "true" : "false");
  };

  const paintOverlay = () => {
    const box = el.stage.getBoundingClientRect();
    const css = Math.max(160, Math.min(box.width, box.height) * 0.9);
    drawQrCanvas(el.scanQr, matrix, css);
    el.scanQr.setAttribute("aria-label", `High-contrast QR code for ${destination}`);
  };

  const applyAria = (view: GroveView) => {
    const host = hostLabel(destination);
    const mode = view === "scan" ? "scannable top-down code" : "3D sculpture";
    el.stage.setAttribute("aria-label", `QR park for ${host}. Showing ${mode}. Press Enter or Space to switch.`);
    el.flatten.textContent = view === "scan" ? "Return to sculpture" : "Flatten to scan";
    el.hint.textContent =
      view === "scan"
        ? "Point a phone camera at the square. Tap again to return to the sculpture."
        : "Tap the park to flatten it into a scannable code.";
    el.live.textContent = view === "scan" ? `Scan view for ${host}.` : `Sculpture view for ${host}.`;
    document.documentElement.dataset.view = view;
  };

  const syncChrome = (view: GroveView) => {
    el.visit.href = destination;
    el.visit.setAttribute("aria-label", `Visit ${hostLabel(destination)}`);
    document.title = `Plot · ${hostLabel(destination)}`;
    el.meta.textContent = `${PALETTES[palette].name} · ${hostLabel(destination)}`;
    applyAria(view);
  };

  const paintFallback = () => {
    const size = Math.min(el.stage.clientWidth || 320, el.stage.clientHeight || 320, 560);
    drawQrCanvas(el.fallback, matrix, size);
    el.fallback.hidden = false;
    el.grove.hidden = true;
    el.scanQr.hidden = true;
    el.fallbackNote.hidden = false;
    el.fallback.setAttribute("aria-label", `Scannable QR code for ${destination}`);
  };

  const plant = (href: string, nextPalette: PaletteId, opts: { writeHash: boolean }) => {
    destination = href;
    palette = nextPalette;
    matrix = buildQrMatrix(href);
    paintOverlay();
    if (grove) {
      grove.plant(matrix, nextPalette);
    } else {
      paintFallback();
    }
    if (opts.writeHash) {
      const hash = encodeShare(href, nextPalette);
      history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
    }
    syncChrome(grove?.getView() ?? (grove ? "sculpture" : "scan"));
    highlightSwatch(el.palettes, nextPalette);
    el.stage.classList.add("is-ready");
    el.stageWait.hidden = true;
  };

  if (gl) {
    el.fallback.hidden = true;
    el.fallbackNote.hidden = true;
    el.grove.hidden = false;
    el.scanQr.hidden = false;
    grove = new GroveScene(el.grove, {
      onViewChange: (view) => {
        el.stage.dataset.view = view;
        applyAria(view);
      },
      onProgress: applyOverlay,
    });
    plant(destination, palette, { writeHash: !shared });
    const onResize = () => {
      grove?.resize();
      paintOverlay();
    };
    window.addEventListener("resize", onResize);
    new ResizeObserver(onResize).observe(el.stage);
    el.grove.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      grove?.dispose();
      grove = null;
      paintFallback();
      el.fallbackNote.hidden = false;
    });
  } else {
    plant(destination, palette, { writeHash: !shared });
    el.flatten.hidden = true;
    el.hint.textContent = "This browser cannot draw the 3D park. The code below is still scannable.";
    syncChrome("scan");
  }

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const parsed = parseDestination(el.url.value);
    if (!parsed.ok) {
      el.error.textContent = parsed.error;
      el.error.hidden = false;
      el.url.setAttribute("aria-invalid", "true");
      el.url.focus();
      return;
    }
    el.error.hidden = true;
    el.error.textContent = "";
    el.url.removeAttribute("aria-invalid");
    el.url.value = parsed.href;
    plant(parsed.href, palette, { writeHash: true });
  });

  el.url.addEventListener("input", () => {
    if (el.error.hidden) return;
    el.error.hidden = true;
    el.url.removeAttribute("aria-invalid");
  });

  el.palettes.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-palette]");
    if (!btn) return;
    const id = btn.dataset.palette;
    if (!id || !(id in PALETTES)) return;
    const parsed = parseDestination(el.url.value || destination);
    if (!parsed.ok) {
      el.error.textContent = parsed.error;
      el.error.hidden = false;
      return;
    }
    plant(parsed.href, id as PaletteId, { writeHash: true });
  });

  el.palettes.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const buttons = [...el.palettes.querySelectorAll<HTMLButtonElement>("[data-palette]")];
    const current = buttons.findIndex((b) => b.getAttribute("aria-checked") === "true");
    if (current < 0) return;
    e.preventDefault();
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const next = buttons[(current + delta + buttons.length) % buttons.length];
    next?.focus();
    next?.click();
  });

  el.copy.addEventListener("click", async () => {
    await copyText(shareUrl(destination, palette), el.copy, "Copy link", "Copied link");
  });

  el.embedBtn.addEventListener("click", async () => {
    await copyText(embedSnippet(destination, palette), el.embedBtn, "Copy embed", "Copied embed");
  });

  el.flatten.addEventListener("click", () => {
    grove?.toggleView();
  });

  el.stage.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (grove) grove.toggleView();
  });
  el.stage.addEventListener("pointerup", () => {
    el.stage.focus({ preventScroll: true });
  });

  window.addEventListener("hashchange", () => {
    const next = decodeShare(location.hash);
    if (!next) return;
    el.url.value = next.destination;
    plant(next.destination, next.palette, { writeHash: false });
  });

  if (prefersReducedMotion()) {
    el.hint.dataset.motion = "reduce";
  }
}

function renderSwatches(root: HTMLElement, selected: PaletteId): void {
  root.replaceChildren();
  for (const id of PALETTE_IDS) {
    const p = PALETTES[id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.dataset.palette = id;
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", String(id === selected));
    btn.title = `${p.name} — ${p.tag}`;
    btn.style.setProperty("--a", p.swatchA);
    btn.style.setProperty("--b", p.swatchB);
    const chip = document.createElement("span");
    chip.className = "swatch-chip";
    chip.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "swatch-name";
    name.textContent = p.name;
    btn.append(chip, name);
    root.append(btn);
  }
}

function highlightSwatch(root: HTMLElement, selected: PaletteId): void {
  root.querySelectorAll<HTMLButtonElement>("[data-palette]").forEach((btn) => {
    btn.setAttribute("aria-checked", String(btn.dataset.palette === selected));
  });
}

async function copyText(text: string, button: HTMLButtonElement, idle: string, done: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt("Copy this:", text);
  }
  button.textContent = done;
  window.setTimeout(() => {
    button.textContent = idle;
  }, 1600);
}
