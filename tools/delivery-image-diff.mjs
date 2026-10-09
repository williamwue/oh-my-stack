import { deflateSync, inflateSync } from 'node:zlib';

// Deliberately bounded original PNG subset. No color management, palette,
// transparency chunks, interlace, masks or conversion fallback is performed.
// Each input is at most 32 MiB, each dimension at most 8192, and each image
// at most 16M pixels. Original and normalized RGBA scanlines each fit 64 MiB.
const MAX_INPUT_BYTES = 32 * 1024 * 1024;
const MAX_DIMENSION = 8192;
const MAX_PIXELS = 16 * 1024 * 1024;
const MAX_DECODED_BYTES = 64 * 1024 * 1024;
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, byte) => {
  let crc = byte;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});

function fail(message) {
  throw new Error(`PNG comparison: ${message}`);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(input) {
  if (!Buffer.isBuffer(input)) fail('input must be a Buffer');
  if (input.length > MAX_INPUT_BYTES) fail('input byte limit exceeded');
  if (input.length < SIGNATURE.length || !input.subarray(0, 8).equals(SIGNATURE)) {
    fail('invalid signature');
  }

  let offset = 8;
  let width;
  let height;
  let channels;
  let scanlineBytes;
  let seenHeader = false;
  let seenPalette = false;
  let seenData = false;
  let seenEnd = false;
  const data = [];

  while (offset < input.length) {
    if (input.length - offset < 12) fail('truncated chunk');
    const length = input.readUInt32BE(offset);
    if (length > 0x7fffffff || length > input.length - offset - 12) {
      fail('invalid or truncated chunk length');
    }
    const typeBytes = input.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString('ascii');
    if (![...typeBytes].every((byte) => (byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122))
      || (typeBytes[2] & 32)) fail('invalid chunk type');
    const body = input.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = input.readUInt32BE(offset + 8 + length);
    if (crc32(input.subarray(offset + 4, offset + 8 + length)) !== expectedCrc) {
      fail(`CRC mismatch in ${type}`);
    }
    offset += length + 12;
    if (!seenHeader && type !== 'IHDR') fail('IHDR must be first');
    if (seenEnd) fail('data after IEND');

    if (type === 'IHDR') {
      if (seenHeader || length !== 13) fail('invalid or duplicate IHDR');
      seenHeader = true;
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (!width || !height || width > MAX_DIMENSION || height > MAX_DIMENSION
        || width * height > MAX_PIXELS) fail('dimension or pixel limit exceeded');
      if (body[8] !== 8 || ![2, 6].includes(body[9])) fail('unsupported bit depth or color encoding');
      if (body[10] !== 0 || body[11] !== 0) fail('unsupported compression or filter method');
      if (body[12] !== 0) fail('unsupported interlace');
      channels = body[9] === 2 ? 3 : 4;
      scanlineBytes = (width * channels + 1) * height;
      if (scanlineBytes > MAX_DECODED_BYTES || (width * 4 + 1) * height > MAX_DECODED_BYTES) {
        fail('decoded byte limit exceeded');
      }
    } else if (type === 'PLTE') {
      // PNG permits an optional suggested palette for truecolor images. It
      // does not affect RGB/RGBA samples, unlike tRNS and profile chunks.
      if (seenPalette || seenData || !length || length % 3 || length > 768) {
        fail('invalid PLTE or chunk order');
      }
      seenPalette = true;
    } else if (type === 'IDAT') {
      seenData = true;
      data.push(body);
    } else if (type === 'IEND') {
      if (length || !seenData) fail('invalid IEND or missing IDAT');
      seenEnd = true;
      if (offset !== input.length) fail('data after IEND');
    } else {
      // Fail closed even for ancillary chunks: accepting an unimplemented
      // profile or transparency transform would misrepresent equivalence.
      fail(`unsupported chunk ${type}`);
    }
  }
  if (!seenEnd) fail('missing IEND');

  const compressed = Buffer.concat(data);
  let decoded;
  try {
    const inflated = inflateSync(compressed, { maxOutputLength: scanlineBytes, info: true });
    decoded = inflated.buffer;
    if (inflated.engine.bytesWritten !== compressed.length) fail('trailing compressed data');
  } catch (error) {
    fail(`invalid or oversized zlib data (${error.message})`);
  }
  if (decoded.length !== scanlineBytes) fail('decoded size does not match dimensions');

  const stride = width * channels;
  const samples = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = decoded[y * (stride + 1)];
    if (filter > 4) fail('unsupported row filter');
    for (let x = 0; x < stride; x += 1) {
      const index = y * stride + x;
      const a = x >= channels ? samples[index - channels] : 0;
      const b = y > 0 ? samples[index - stride] : 0;
      const c = y > 0 && x >= channels ? samples[index - stride - channels] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b
        : filter === 3 ? Math.floor((a + b) / 2) : paeth(a, b, c);
      samples[index] = (decoded[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  }
  if (channels === 4) return { width, height, rgba: samples };
  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    samples.copy(rgba, pixel * 4, pixel * 3, pixel * 3 + 3);
    rgba[pixel * 4 + 3] = 255;
  }
  return { width, height, rgba };
}

function chunk(type, body) {
  const bytes = Buffer.alloc(body.length + 12);
  bytes.writeUInt32BE(body.length, 0);
  bytes.write(type, 4, 4, 'ascii');
  body.copy(bytes, 8);
  bytes.writeUInt32BE(crc32(bytes.subarray(4, bytes.length - 4)), bytes.length - 4);
  return bytes;
}

function encodeDiff(width, height, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let row = 0; row < height; row += 1) {
    rgba.copy(scanlines, row * (stride + 1) + 1, row * stride, (row + 1) * stride);
  }
  return Buffer.concat([
    SIGNATURE, chunk('IHDR', header), chunk('IDAT', deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Compare original PNG bytes using exact normalized RGBA samples, including
 * alpha. RGB receives alpha 255. Equal dimensions are required. Unchanged
 * diff pixels are transparent black; changed pixels are opaque magenta.
 * This pure operation writes nothing and makes no capture-authenticity claim.
 */
export function compareImages({ baseline, current }) {
  const before = decodePng(baseline);
  const after = decodePng(current);
  if (before.width !== after.width || before.height !== after.height) fail('image dimensions differ');
  const { width, height } = before;
  const diff = Buffer.alloc(width * height * 4);
  let changedPixels = 0;
  let maxChannelDelta = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    let changed = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const index = pixel * 4 + channel;
      const delta = Math.abs(before.rgba[index] - after.rgba[index]);
      maxChannelDelta = Math.max(maxChannelDelta, delta);
      changed ||= delta !== 0;
    }
    if (changed) {
      changedPixels += 1;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      diff.set([255, 0, 255, 255], pixel * 4);
    }
  }
  return {
    width, height, changedPixels, maxChannelDelta,
    boundingBox: changedPixels ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null,
    diffPng: encodeDiff(width, height, diff),
  };
}
