// Draws the Ao Lume tile mark (components/brand/Azulejo.tsx: TileMark) at the sizes browsers and
// phones ask for, and writes them next to the app.
//
// Hand-rolled because the shape is four primitives and adding an image toolchain to a project
// that has none would cost more than it saves. Supersampled 4x, so the curves are not stepped.
//
//   node scripts/make-icons.mjs
import { deflateSync } from "node:zlib";
import fs from "node:fs";

const COBALT = [0x1d, 0x4a, 0xa1];
const WHITE = [0xff, 0xff, 0xff];
const YOLK = [0xf0, 0xb4, 0x29];

/** The mark, as colour-at-a-point. Coordinates are the SVG's own 24x24 space. */
function colourAt(x, y) {
  const r = 4; // corner radius
  // Outside the rounded square: transparent.
  const cx = Math.min(Math.max(x, r), 24 - r);
  const cy = Math.min(Math.max(y, r), 24 - r);
  if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return null;

  const d = Math.hypot(x - 12, y - 12);
  if (d <= 3) return YOLK;
  if (d <= 6.5) {
    // The white cross runs over the white disc too, so it only shows outside it.
    return WHITE;
  }
  // Cross lines at 55% opacity over cobalt.
  const onCross = Math.abs(x - 12) <= 0.6 || Math.abs(y - 12) <= 0.6;
  if (onCross) return COBALT.map((c, i) => Math.round(c + (WHITE[i] - c) * 0.55));
  return COBALT;
}

function render(size, scale = 4) {
  const px = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let pxi = 0; pxi < size; pxi += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const x = ((pxi + (sx + 0.5) / scale) / size) * 24;
          const y = ((py + (sy + 0.5) / scale) / size) * 24;
          const c = colourAt(x, y);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a += 255;
          }
        }
      }
      const n = scale * scale;
      const i = (py * size + pxi) * 4;
      const covered = a / 255;
      // Premultiplied average over the covered samples only, so edges keep their colour.
      px[i] = covered ? Math.round(r / covered) : 0;
      px[i + 1] = covered ? Math.round(g / covered) : 0;
      px[i + 2] = covered ? Math.round(b / covered) : 0;
      px[i + 3] = Math.round(a / n);
    }
  }
  return px;
}

// --- PNG ---------------------------------------------------------------------
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // Each scanline is prefixed with its filter type; 0 is "none".
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** An .ico holding PNGs, which every browser since Vista reads. */
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const e of entries) {
    const d = Buffer.alloc(16);
    d[0] = e.size >= 256 ? 0 : e.size;
    d[1] = e.size >= 256 ? 0 : e.size;
    d[4] = 1; // colour planes
    d.writeUInt16LE(32, 6); // bits per pixel
    d.writeUInt32BE(0, 8);
    d.writeUInt32LE(e.data.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += e.data.length;
    dir.push(d);
  }
  return Buffer.concat([header, ...dir, ...entries.map((e) => e.data)]);
}

const make = (size) => ({ size, data: png(size, render(size)) });

fs.writeFileSync("app/favicon.ico", ico([make(16), make(32), make(48)]));
fs.writeFileSync("app/apple-icon.png", make(180).data);
fs.writeFileSync("public/icon-192.png", make(192).data);
fs.writeFileSync("public/icon-512.png", make(512).data);

for (const f of ["app/favicon.ico", "app/apple-icon.png", "public/icon-192.png", "public/icon-512.png"]) {
  console.log(`  ${f} · ${fs.statSync(f).size} bytes`);
}
