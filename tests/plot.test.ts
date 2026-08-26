import { describe, expect, it } from "vitest";
import { buildQrMatrix, QUIET_ZONE } from "../src/qr/matrix";
import { decodeShare, encodeShare, fromBase64Url, toBase64Url } from "../src/qr/share";
import { parseDestination } from "../src/qr/url";
import { overlayOpacity } from "../src/qr/draw2d";
import { isPaletteId } from "../src/scene/palettes";

describe("destination parsing", () => {
  it("accepts hailicorn https", () => {
    const parsed = parseDestination("https://www.hailicorn.com");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.href).toMatch(/^https:\/\/www\.hailicorn\.com\/?/);
  });

  it("rejects missing protocol", () => {
    const parsed = parseDestination("hailicorn.com");
    expect(parsed.ok).toBe(false);
  });

  it("rejects a bare word like not-a-url", () => {
    const parsed = parseDestination("not-a-url");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error.toLowerCase()).toMatch(/http/);
  });

  it("rejects javascript urls", () => {
    const parsed = parseDestination("javascript:alert(1)");
    expect(parsed.ok).toBe(false);
  });
});

describe("share encoding", () => {
  it("round-trips destination and palette", () => {
    const href = "https://www.hailicorn.com/";
    const hash = encodeShare(href, "kiln");
    expect(hash.startsWith("#p/kiln/")).toBe(true);
    const decoded = decodeShare(hash);
    expect(decoded).toEqual({ destination: href, palette: "kiln" });
  });

  it("uses base64url without padding", () => {
    const token = toBase64Url("https://www.hailicorn.com/");
    expect(token).toBe("aHR0cHM6Ly93d3cuaGFpbGljb3JuLmNvbS8");
    expect(token.includes("+") || token.includes("/") || token.includes("=")).toBe(false);
    expect(fromBase64Url(token)).toBe("https://www.hailicorn.com/");
  });

  it("rejects unknown palettes", () => {
    expect(isPaletteId("spring")).toBe(false);
    expect(decodeShare("#p/cherry/aaaa")).toBeNull();
  });
});

describe("QR matrix", () => {
  it("encodes hailicorn at a compact Q version with a 4-module quiet zone", () => {
    const qr = buildQrMatrix("https://www.hailicorn.com/");
    expect(qr.version).toBeGreaterThanOrEqual(2);
    expect(qr.version).toBeLessThanOrEqual(5);
    expect(qr.size).toBe(qr.modules.length);
    expect(qr.size).toBeGreaterThan(QUIET_ZONE * 2);

    const inner = qr.size - QUIET_ZONE * 2;
    for (let i = 0; i < qr.size; i++) {
      expect(qr.modules[0]?.[i]).toBe(false);
      expect(qr.modules[qr.size - 1]?.[i]).toBe(false);
      expect(qr.modules[i]?.[0]).toBe(false);
      expect(qr.modules[i]?.[qr.size - 1]).toBe(false);
    }

    const finder = qr.modules[QUIET_ZONE]?.[QUIET_ZONE];
    expect(finder).toBe(true);
    expect(inner).toBe(qr.version * 4 + 17);
  });
});

describe("scan overlay", () => {
  it("stays hidden in sculpture and opaque in scan", () => {
    expect(overlayOpacity(0)).toBe(0);
    expect(overlayOpacity(1)).toBe(1);
    expect(overlayOpacity(0.62)).toBeGreaterThan(0.4);
    expect(overlayOpacity(0.62)).toBeLessThan(1);
  });
});
