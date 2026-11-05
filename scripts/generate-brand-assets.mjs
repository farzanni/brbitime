import sharp from "sharp";
import fs from "fs";

const SOURCE_IMAGE = process.argv[2] || process.env.SOURCE_IMAGE || "/home/farzan/.gemini/antigravity/brain/13115ae4-c771-4b7e-84fe-7face6777683/muu_cut_mc_monogram_1793901618518.jpg";

function createIco(pngBuffers) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(pngBuffers.length, 4); // count

  const entries = [];
  let offset = 6 + pngBuffers.length * 16;

  for (const { buffer, size } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)]);
}

async function main() {
  console.log("Generating brand assets from:", SOURCE_IMAGE);

  // 1. Load source and extract transparent alpha channel
  const { data, info } = await sharp(SOURCE_IMAGE)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const rgbaBuffer = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * 3;
    const destIdx = i * 4;
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];
    const brightness = (r + g + b) / 3;

    rgbaBuffer[destIdx] = r;
    rgbaBuffer[destIdx + 1] = g;
    rgbaBuffer[destIdx + 2] = b;

    // Smooth alpha ramp to cleanly isolate pure black without clipping metallic bevels
    if (brightness <= 3) {
      rgbaBuffer[destIdx + 3] = 0;
    } else if (brightness < 32) {
      rgbaBuffer[destIdx + 3] = Math.round(((brightness - 3) / 29) * 255);
    } else {
      rgbaBuffer[destIdx + 3] = 255;
    }
  }

  // Trim transparent edges so the emblem is snugly measured
  const trimmedBuffer = await sharp(rgbaBuffer, { raw: { width, height, channels: 4 } })
    .png()
    .trim()
    .toBuffer();

  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  console.log("Trimmed emblem dimensions:", trimmedMeta.width, "x", trimmedMeta.height);

  // 2. High-res transparent emblem centered on 1024x1024 square canvas
  const logo1024 = await sharp(trimmedBuffer)
    .resize(840, 840, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 92,
      bottom: 92,
      left: 92,
      right: 92,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Write public/logo.webp & public/logo.png
  await sharp(logo1024)
    .webp({ quality: 95, alphaQuality: 100 })
    .toFile("public/logo.webp");
  await sharp(logo1024)
    .png({ compressionLevel: 9 })
    .toFile("public/logo.png");
  console.log("Created public/logo.webp and public/logo.png");

  // 3. 256x256 emblem for small logos / headers
  const emblem256 = await sharp(trimmedBuffer)
    .resize(210, 210, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 23,
      bottom: 23,
      left: 23,
      right: 23,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(emblem256)
    .webp({ quality: 95, alphaQuality: 100 })
    .toFile("public/emblem.webp");
  await sharp(emblem256)
    .png({ compressionLevel: 9 })
    .toFile("public/emblem.png");
  console.log("Created public/emblem.webp and public/emblem.png");

  // 4. Tab Icon & App Badge (512x512 squircle badge with subtle metallic border)
  const badgeSize = 512;
  const emblemOnBadge = await sharp(trimmedBuffer)
    .resize(360, 360, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const badgeSvg = Buffer.from(`
    <svg width="${badgeSize}" height="${badgeSize}" viewBox="0 0 ${badgeSize} ${badgeSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="38%" r="75%">
          <stop offset="0%" stop-color="#1e1e22"/>
          <stop offset="60%" stop-color="#0c0c0e"/>
          <stop offset="100%" stop-color="#020202"/>
        </radialGradient>
        <linearGradient id="border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.45)"/>
          <stop offset="45%" stop-color="rgba(212,175,55,0.4)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0.15)"/>
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="${badgeSize - 12}" height="${badgeSize - 12}" rx="115" fill="url(#bg)" stroke="url(#border)" stroke-width="8"/>
    </svg>
  `);

  const badge512Buffer = await sharp(badgeSvg)
    .composite([{ input: emblemOnBadge, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  // Save app/icon.png and public/icon.png (512x512)
  await sharp(badge512Buffer).toFile("app/icon.png");
  await sharp(badge512Buffer).toFile("public/icon.png");

  // Save 192x192 PWA icon
  await sharp(badge512Buffer).resize(192, 192).toFile("public/icon-192.png");

  // Save Apple Touch Icon (180x180)
  const apple180Buffer = await sharp(badge512Buffer).resize(180, 180).toBuffer();
  await sharp(apple180Buffer).toFile("app/apple-icon.png");
  await sharp(apple180Buffer).toFile("public/apple-icon.png");
  console.log("Created app/icon.png, public/icon.png, app/apple-icon.png");

  // 5. Multi-size ICO for browser tab favicon (16, 32, 48, 64)
  const icoSizes = [16, 32, 48, 64];
  const pngStreams = [];
  for (const s of icoSizes) {
    const buf = await sharp(badge512Buffer).resize(s, s).png().toBuffer();
    pngStreams.push({ buffer: buf, size: s });
  }

  const icoBuffer = createIco(pngStreams);
  fs.writeFileSync("app/favicon.ico", icoBuffer);
  fs.writeFileSync("public/favicon.ico", icoBuffer);
  console.log("Created app/favicon.ico and public/favicon.ico with multi-resolution PNGs");

  // 6. Generate sleek OpenGraph card (1200x630)
  const ogWidth = 1200;
  const ogHeight = 630;
  const ogEmblemSize = 400;

  const ogEmblem = await sharp(trimmedBuffer)
    .resize(ogEmblemSize, ogEmblemSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const ogSvg = Buffer.from(`
    <svg width="${ogWidth}" height="${ogHeight}" viewBox="0 0 ${ogWidth} ${ogHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ogbg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#18181c"/>
          <stop offset="50%" stop-color="#0a0a0c"/>
          <stop offset="100%" stop-color="#020202"/>
        </radialGradient>
      </defs>
      <rect width="${ogWidth}" height="${ogHeight}" fill="url(#ogbg)"/>
      <rect x="16" y="16" width="${ogWidth - 32}" height="${ogHeight - 32}" rx="24" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    </svg>
  `);

  await sharp(ogSvg)
    .composite([{
      input: ogEmblem,
      top: Math.round((ogHeight - ogEmblemSize) / 2),
      left: Math.round((ogWidth - ogEmblemSize) / 2),
    }])
    .jpeg({ quality: 92 })
    .toFile("public/og.jpg");

  console.log("Created public/og.jpg");
  console.log("All brand assets successfully built!");
}

main().catch((err) => {
  console.error("Error generating brand assets:", err);
  process.exit(1);
});
