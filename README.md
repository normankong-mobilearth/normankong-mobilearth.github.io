# Plot

A tiny sculptural park you can drop onto a company website. Paste a URL, and Plot grows a 3D landscape from its QR code: dark modules rise as blocks, light modules stay low, and a geometric tree sits in the tray. Tap the park to flatten it into a high-contrast, camera-scannable code.

This is an **original implementation** of the QR-as-terrain idea. It is not affiliated with ICQR Magic Tree, and it does not copy that project’s assets, shaders, L-system, branding, or look.

Destination URLs never leave the browser except as the QR payload encoded on this device.

## Live site (GitHub Pages)

https://normankong-mobilearth.github.io/

GitHub is the static host. The workflow in `.github/workflows/pages.yml` runs `npm ci && npm run build` and deploys the Vite `dist` output. Origin remains the source of truth for development.

The Pages site is a **public** GitHub user-pages repo because GitHub Pages on a private repository requires a paid GitHub plan.

- Public host: https://github.com/normankong-mobilearth/normankong-mobilearth.github.io
- Private copy (same account, not the Pages host): https://github.com/normankong-mobilearth/plot

## Run locally

```bash
npm install
npm run dev
```

The dev server binds to port **47331**.

```bash
npm test
npm run build
npm run preview
```

Open the app, plant `https://www.hailicorn.com`, then tap the scene (or press Enter / Space) to flatten the park. The QR encodes that destination.

## Embed on hailicorn.com — or any site

1. Generate a park for the destination you want (for hailicorn.com, plant `https://www.hailicorn.com`).
2. Click **Copy embed**, or use the snippet below after replacing the origin and hash.

```html
<iframe
  src="https://normankong-mobilearth.github.io/?embed=1#p/limestone/aHR0cHM6Ly93d3cuaGFpbGljb3JuLmNvbS8"
  title="Plot — sculptural QR park"
  width="440"
  height="560"
  loading="lazy"
  referrerpolicy="no-referrer"
  style="border:0;border-radius:20px;max-width:100%;background:#12110f;"
></iframe>
```

`?embed=1` hides the creator chrome, fills the iframe, and keeps Visit / Copy / flatten controls as a light overlay.

The app is static and client-side only. There is no backend, no cookies, and no analytics.

## Share encoding

Share links keep destination + palette in the URL hash so static hosts do not need routing:

```
https://normankong-mobilearth.github.io/#p/{palette}/{base64url(destination)}
```

- `{palette}` is one of `limestone`, `obsidian`, `harbor`, `kiln`, `verdigris`.
- `{base64url(destination)}` is UTF-8 text, Base64 URL-safe (no padding). Example: `https://www.hailicorn.com/` → `aHR0cHM6Ly93d3cuaGFpbGljb3JuLmNvbS8`.
- Opening a share URL rebuilds the same tree and destination. The tree shape is seeded from the destination + palette, so it is deterministic.

Query and hash can combine: `/?embed=1#p/harbor/...`.

## QR and scan view

- Error correction **Q** (~25% recovery), smallest version that fits, no ECC boosting.
- Quiet zone of **4** modules.
- Sculpture view uses the selected palette.
- During the flatten animation the 3D mesh and camera lerp toward a top-down shot. In the last part of that motion a **crisp 2D QR overlay** fades in — unlit **#000000 / #ffffff**, integer module pixels (at least 8px), quiet zone of 4, plus extra white padding — so iOS/Android cameras get 21:1 contrast even if WebGL antialiasing would fringe the 3D modules.
- `prefers-reduced-motion: reduce` skips the animation and snaps between views.
- If WebGL is unavailable (or the context is lost), the same 2D canvas QR is shown on its own.

## Palettes

| Id | Name | Character |
| --- | --- | --- |
| `limestone` | Limestone | Gallery plaster |
| `obsidian` | Obsidian | Night studio |
| `harbor` | Harbor | Fog and tide |
| `kiln` | Kiln | Courtyard clay |
| `verdigris` | Verdigris | Sculpture garden |

## Keyboard and privacy

- Focus the park and press **Enter** or **Space** to toggle sculpture ↔ scan.
- Visit opens the destination in a new tab.
- Copy link copies the share URL. Copy embed copies the iframe snippet.
- No accounts, cookies, or telemetry. The destination is not sent to a server.
