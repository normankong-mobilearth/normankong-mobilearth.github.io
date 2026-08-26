import { encode } from "uqr";

/** Modules of quiet zone on each side. Spec minimum is 4; we keep it for camera scanning. */
export const QUIET_ZONE = 4;

export type QrMatrix = {
  /** true = dark module. Includes the quiet zone. */
  modules: boolean[][];
  size: number;
  version: number;
  destination: string;
};

export function buildQrMatrix(destination: string): QrMatrix {
  const qr = encode(destination, {
    ecc: "Q",
    boostEcc: false,
    minVersion: 2,
    maxVersion: 12,
    border: 0,
  });

  const inner = qr.size;
  const size = inner + QUIET_ZONE * 2;
  const modules: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  for (let y = 0; y < inner; y++) {
    const row = qr.data[y];
    if (!row) continue;
    for (let x = 0; x < inner; x++) {
      modules[y + QUIET_ZONE]![x + QUIET_ZONE] = Boolean(row[x]);
    }
  }

  return { modules, size, version: qr.version, destination };
}
