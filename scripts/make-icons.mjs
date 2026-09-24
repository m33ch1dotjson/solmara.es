/*
 * The app icons, generated from the mark itself.
 *
 * One master: the three arcs in components/ui/Logo.tsx, the same geometry the
 * portal draws on every screen. Everything here is rendered from that vector at the
 * size it will actually be used, so nothing is ever an enlarged PNG.
 *
 * Two treatments, because a home screen and a launcher crop differently:
 *
 *   ANY        the mark on its orange tile with rounded corners, which is what a
 *              browser tab, a desktop dock and an iPhone home screen show.
 *   MASKABLE   the same tile, square and full-bleed, with the mark shrunk into the
 *              middle so a circular Android mask cannot clip it.
 *
 * The wordmark is deliberately absent: "Solmavera" at 32 pixels is a grey smudge.
 *
 * Run where sharp lives (the container):
 *   node scripts/make-icons.mjs [output-directory]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

/** The brand mark's own orange. Same value as --brand-mark in app/tokens.css. */
const ORANGE = "#F16B3C";
const WHITE = "#FFFFFF";

/*
 * The mark's own bounding box inside its 976 viewBox, stroke included. It is taller
 * than it is wide, so centring on the raw viewBox would sit it left of centre and
 * high — this is what the icon is cropped to before being placed.
 */
const MARK = { x: 176, y: 105, width: 624, height: 766 };

const PATHS = [
  "M 394.5 148 A 176.5 176.5 0 0 0 747.5 148",
  "M 219 148 A 350 350 0 0 0 488 488 A 350 350 0 0 1 757 828",
  "M 218.5 828 A 173.5 173.5 0 0 1 565.5 828",
];

/**
 * @param size    pixels, square
 * @param padding share of the canvas left empty on each side
 * @param radius  corner radius as a share of the canvas; 0 is a full-bleed square
 */
function tile(size, { padding, radius }) {
  const inner = size * (1 - 2 * padding);
  // The mark is portrait, so height decides the fit and the width is centred.
  const drawnWidth = (inner * MARK.width) / MARK.height;
  const x = (size - drawnWidth) / 2;
  const y = size * padding;
  const r = size * radius;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${ORANGE}"/>
  <svg x="${x}" y="${y}" width="${drawnWidth}" height="${inner}"
       viewBox="${MARK.x} ${MARK.y} ${MARK.width} ${MARK.height}" preserveAspectRatio="xMidYMid meet">
    <g fill="none" stroke="${WHITE}" stroke-width="85">
      ${PATHS.map((d) => `<path d="${d}"/>`).join("\n      ")}
    </g>
  </svg>
</svg>`);
}

/*
 * An .ico that holds PNGs.
 *
 * Every browser still in use reads PNG-in-ICO, and writing the container by hand is
 * six bytes of header and sixteen per entry — considerably less trouble than adding
 * a dependency that does the same thing.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const out = process.argv[2] ?? "public";
await mkdir(out, { recursive: true });

/* Padding, chosen per use rather than once:
   - 0.06 on the favicons, because 16 pixels has none to spare;
   - 0.14 on the app icons, which is the "comfortable padding" of the brief;
   - 0.26 on the maskable ones, which keeps the mark inside the circle Android
     cuts out of the middle. */
const jobs = [
  { file: "favicon-16x16.png", size: 16, padding: 0.06, radius: 0.16 },
  { file: "favicon-32x32.png", size: 32, padding: 0.06, radius: 0.18 },
  { file: "apple-touch-icon.png", size: 180, padding: 0.14, radius: 0 },
  { file: "icon-192.png", size: 192, padding: 0.14, radius: 0.22 },
  { file: "icon-512.png", size: 512, padding: 0.14, radius: 0.22 },
  { file: "icon-192-maskable.png", size: 192, padding: 0.26, radius: 0 },
  { file: "icon-512-maskable.png", size: 512, padding: 0.26, radius: 0 },
];

for (const { file, size, padding, radius } of jobs) {
  const png = await sharp(tile(size, { padding, radius }), { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(out, file), png);
  console.log(`${file}  ${png.length} bytes`);
}

const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) {
  icoImages.push({
    size,
    data: await sharp(tile(size, { padding: 0.06, radius: 0.16 }), { density: 384 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer(),
  });
}
const icoFile = ico(icoImages);
await writeFile(join(out, "favicon.ico"), icoFile);
console.log(`favicon.ico  ${icoFile.length} bytes (${icoSizes.join(", ")})`);

/* The vector one, for the tab on a browser that prefers it. Same tile, drawn rather
   than sampled, so it stays sharp at any zoom. */
await writeFile(join(out, "icon.svg"), tile(512, { padding: 0.08, radius: 0.2 }));
console.log("icon.svg");
