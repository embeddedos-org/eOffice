#!/usr/bin/env node
// Generate icon.ico (256x256) and icon.png (512x512) for Electron desktop build

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

function drawPixel(size, x, y) {
  const cx = size / 2, cy = size / 2;
  const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
  const cornerR = Math.round(size * 0.17);
  const halfSize = size / 2 - Math.max(2, size * 0.01);

  let inside = false;
  if (dx <= halfSize - cornerR || dy <= halfSize - cornerR) {
    inside = dx <= halfSize && dy <= halfSize;
  } else {
    const cdx = dx - (halfSize - cornerR);
    const cdy = dy - (halfSize - cornerR);
    inside = (cdx * cdx + cdy * cdy) <= cornerR * cornerR;
  }

  if (!inside) return [0, 0, 0, 0];

  const t = (x + y) / (size * 2);
  let r = Math.round(99 + (139 - 99) * t);
  let g = Math.round(102 + (92 - 102) * t);
  let b = Math.round(241 + (246 - 241) * t);

  // "eO" text blocks
  const textY = y > size * 0.3 && y < size * 0.55;
  const textE = textY && x > size * 0.2 && x < size * 0.42;
  const textO = textY && x > size * 0.5 && x < size * 0.78;

  // Green circle (eBot indicator)
  const gcx = size * 0.78, gcy = size * 0.78, gr = size * 0.12;
  const gdx = x - gcx, gdy = y - gcy;
  const inGreen = (gdx * gdx + gdy * gdy) <= gr * gr;

  if (inGreen) return [34, 197, 94, 255];
  if (textE || textO) return [255, 255, 255, 230];
  return [r, g, b, 255];
}

// --- Generate ICO with embedded PNG (modern ICO format for 256x256) ---
function createIco() {
  // For 256x256, ICO uses embedded PNG data
  const pngData = createPngBuffer(256);

  // ICO Header (6 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: 1 = ICO
  header.writeUInt16LE(1, 4);      // count: 1 image

  // ICO Directory Entry (16 bytes)
  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(0, 0);       // width: 0 means 256
  dirEntry.writeUInt8(0, 1);       // height: 0 means 256
  dirEntry.writeUInt8(0, 2);       // color palette
  dirEntry.writeUInt8(0, 3);       // reserved
  dirEntry.writeUInt16LE(1, 4);    // color planes
  dirEntry.writeUInt16LE(32, 6);   // bits per pixel
  dirEntry.writeUInt32LE(pngData.length, 8);  // size of PNG data
  dirEntry.writeUInt32LE(22, 12);  // offset to PNG data (6 + 16 = 22)

  return Buffer.concat([header, dirEntry, pngData]);
}

// --- Generate PNG buffer for given size ---
function createPngBuffer(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(6, 9);   // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const rawData = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    rawData[rowStart] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const offset = rowStart + 1 + x * 4;
      const [r, g, b, a] = drawPixel(size, x, y);
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
      rawData[offset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Write files
const icoData = createIco();
const pngData = createPngBuffer(512);

fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoData);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngData);

console.log('Generated icon.ico (' + icoData.length + ' bytes) - 256x256 PNG-in-ICO');
console.log('Generated icon.png (' + pngData.length + ' bytes) - 512x512 PNG');
