import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { compareImages } from '../tools/delivery-image-diff.mjs';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// Independently encode actual PNG fixtures, including arbitrary row filters
// and deliberate invalid envelopes. No comparator-private helper is imported.
function pngChunk(type, payload = Buffer.alloc(0)) {
  const typed = Buffer.concat([Buffer.from(type), payload]);
  let crc = 0xffffffff;
  for (const byte of typed) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const result = Buffer.alloc(payload.length + 12);
  result.writeUInt32BE(payload.length, 0);
  typed.copy(result, 4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
  return result;
}

function ihdr(width, height, { depth = 8, color = 6, compression = 0, filter = 0, interlace = 0 } = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([depth, color, compression, filter, interlace], 8);
  return pngChunk('IHDR', header);
}

function envelope(header, compressed, { before = [], after = [], split = false } = {}) {
  const chunks = split
    ? [pngChunk('IDAT', compressed.subarray(0, 2)), pngChunk('IDAT'), pngChunk('IDAT', compressed.subarray(2))]
    : [pngChunk('IDAT', compressed)];
  return Buffer.concat([signature, header, ...before, ...chunks, ...after, pngChunk('IEND')]);
}

function encode(width, height, pixels, { channels = 4, filters = [0], split = false } = {}) {
  const samples = Buffer.from(pixels);
  assert.equal(samples.length, width * height * channels);
  const stride = width * channels;
  const rows = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const filter = filters[y % filters.length];
    rows[y * (stride + 1)] = filter;
    for (let x = 0; x < stride; x += 1) {
      const index = y * stride + x;
      const a = x >= channels ? samples[index - channels] : 0;
      const b = y ? samples[index - stride] : 0;
      const c = y && x >= channels ? samples[index - stride - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a;
      if (filter === 2) predictor = b;
      if (filter === 3) predictor = Math.floor((a + b) / 2);
      if (filter === 4) {
        const p = a + b - c;
        const distances = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        predictor = [a, b, c][distances.indexOf(Math.min(...distances))];
      }
      rows[y * (stride + 1) + x + 1] = (samples[index] - predictor) & 255;
    }
  }
  return envelope(ihdr(width, height, { color: channels === 3 ? 2 : 6 }), deflateSync(rows), { split });
}

const onePixel = encode(1, 1, [10, 20, 30, 255]);
function rejects(bytes, pattern) {
  assert.throws(() => compareImages({ baseline: onePixel, current: bytes }), pattern);
}

test('equal PNG returns exact normalized dimensions and deterministic valid transparent diff', () => {
  const result = compareImages({ baseline: onePixel, current: onePixel });
  const { diffPng, ...metrics } = result;
  assert.deepEqual(metrics, { width: 1, height: 1, changedPixels: 0, maxChannelDelta: 0, boundingBox: null });
  assert.ok(Buffer.isBuffer(diffPng));
  assert.deepEqual(diffPng, compareImages({ baseline: onePixel, current: onePixel }).diffPng);
  assert.equal(compareImages({ baseline: diffPng, current: encode(1, 1, [0, 0, 0, 0]) }).changedPixels, 0);
});

test('changed samples count pixels once, include alpha, and bound all changed coordinates', () => {
  const pixels = Buffer.from(Array.from({ length: 6 }, () => [10, 20, 30, 255]).flat());
  const changed = Buffer.from(pixels);
  changed[4] = 15; // (1,0), RGB delta 5.
  changed[7] = 254; // Same pixel, alpha delta 1.
  changed[5 * 4 + 3] = 200; // (2,1), alpha-only delta 55.
  const result = compareImages({ baseline: encode(3, 2, pixels), current: encode(3, 2, changed) });
  assert.equal(result.changedPixels, 2);
  assert.equal(result.maxChannelDelta, 55);
  assert.deepEqual(result.boundingBox, { x: 1, y: 0, width: 2, height: 2 });
  const expected = Buffer.alloc(24);
  expected.set([255, 0, 255, 255], 4);
  expected.set([255, 0, 255, 255], 20);
  assert.equal(compareImages({ baseline: result.diffPng, current: encode(3, 2, expected) }).changedPixels, 0);
});

test('RGB normalizes alpha to 255; hidden RGB under zero alpha is compared exactly', () => {
  assert.equal(compareImages({ baseline: encode(1, 1, [10, 20, 30], { channels: 3 }), current: onePixel }).changedPixels, 0);
  const result = compareImages({ baseline: encode(1, 1, [0, 0, 0, 0]), current: encode(1, 1, [255, 0, 0, 0]) });
  assert.equal(result.changedPixels, 1);
  assert.equal(result.maxChannelDelta, 255);
});

test('all standard row filters restore RGB and RGBA samples across edges, wraparound and split IDAT', () => {
  for (const channels of [3, 4]) {
    const pixels = Array.from({ length: 4 * 5 * channels }, (_, index) => (index * 131 + 203) & 255);
    const baseline = encode(4, 5, pixels, { channels });
    for (let filter = 0; filter <= 4; filter += 1) {
      assert.equal(compareImages({ baseline, current: encode(4, 5, pixels, { channels, filters: [filter], split: true }) }).changedPixels, 0);
    }
    assert.equal(compareImages({ baseline, current: encode(4, 5, pixels, { channels, filters: [0, 1, 2, 3, 4] }) }).changedPixels, 0);
  }
});

test('dimension mismatch, zero/oversized dimensions and pixel/decoded budgets fail', () => {
  rejects(encode(2, 1, [10, 20, 30, 255, 10, 20, 30, 255]), /dimensions differ/);
  for (const [width, height] of [[0, 1], [1, 0], [8193, 1], [8192, 8192]]) {
    rejects(envelope(ihdr(width, height), deflateSync(Buffer.from([0]))), /dimension or pixel limit/);
  }
  rejects(envelope(ihdr(4096, 4096), deflateSync(Buffer.from([0]))), /decoded byte limit/);
  rejects(envelope(ihdr(4096, 4096, { color: 2 }), deflateSync(Buffer.from([0]))), /decoded byte limit/);
  rejects(Buffer.alloc(32 * 1024 * 1024 + 1), /input byte limit/);
});

test('input type, signature, CRC, truncation, invalid chunk names and lengths fail closed', () => {
  rejects(new Uint8Array(onePixel), /Buffer/);
  rejects(Buffer.alloc(8), /signature/);
  const badCrc = Buffer.from(onePixel);
  badCrc[29] ^= 1;
  rejects(badCrc, /CRC mismatch/);
  for (const length of [8, 10, 30, onePixel.length - 1, onePixel.length - 12]) {
    rejects(onePixel.subarray(0, length), /truncated|missing IEND/);
  }
  const excessiveLength = Buffer.from(onePixel);
  excessiveLength.writeUInt32BE(0xffffffff, 8);
  rejects(excessiveLength, /chunk length/);
  rejects(Buffer.concat([signature, pngChunk('IHdR', Buffer.alloc(13))]), /chunk type/);
  rejects(Buffer.concat([signature, pngChunk('IHD1', Buffer.alloc(13))]), /chunk type/);
});

test('critical chunk order, duplicates, missing data, invalid palette and trailing bytes fail', () => {
  const compressed = deflateSync(Buffer.from([0, 10, 20, 30, 255]));
  rejects(Buffer.concat([signature, pngChunk('IDAT', compressed), ihdr(1, 1), pngChunk('IEND')]), /IHDR must be first/);
  rejects(envelope(ihdr(1, 1), compressed, { before: [ihdr(1, 1)] }), /duplicate IHDR/);
  rejects(Buffer.concat([signature, ihdr(1, 1), pngChunk('IEND')]), /missing IDAT/);
  rejects(Buffer.concat([onePixel, Buffer.from([0])]), /after IEND/);
  rejects(Buffer.concat([onePixel.subarray(0, -12), pngChunk('IEND', Buffer.from([0]))]), /invalid IEND/);
  rejects(envelope(pngChunk('IHDR', Buffer.alloc(12)), compressed), /invalid.*IHDR/);
  rejects(envelope(ihdr(1, 1), compressed, { after: [pngChunk('PLTE', Buffer.from([0, 0, 0]))] }), /chunk order/);
  for (const payload of [Buffer.alloc(0), Buffer.alloc(2), Buffer.alloc(771)]) {
    rejects(envelope(ihdr(1, 1), compressed, { before: [pngChunk('PLTE', payload)] }), /invalid PLTE/);
  }
  rejects(envelope(ihdr(1, 1), compressed, { before: [pngChunk('PLTE', Buffer.alloc(3)), pngChunk('PLTE', Buffer.alloc(3))] }), /invalid PLTE/);
  assert.equal(compareImages({ baseline: onePixel, current: envelope(ihdr(1, 1), compressed, { before: [pngChunk('PLTE', Buffer.alloc(3))] }) }).changedPixels, 0);
});

test('unsupported depth, color, interlace, methods, profiles and ancillary transforms are rejected', () => {
  const compressed = deflateSync(Buffer.from([0, 10, 20, 30, 255]));
  for (const options of [{ depth: 16 }, { color: 0 }, { color: 3 }, { color: 4 }, { color: 7 }]) {
    rejects(envelope(ihdr(1, 1, options), compressed), /unsupported bit depth or color/);
  }
  rejects(envelope(ihdr(1, 1, { interlace: 1 }), compressed), /interlace/);
  for (const options of [{ compression: 1 }, { filter: 1 }]) {
    rejects(envelope(ihdr(1, 1, options), compressed), /compression or filter/);
  }
  for (const type of ['iCCP', 'sRGB', 'gAMA', 'cHRM', 'cICP', 'tRNS', 'acTL', 'tEXt', 'AAAA']) {
    rejects(envelope(ihdr(1, 1), compressed, { before: [pngChunk(type)] }), /unsupported chunk/);
  }
  rejects(envelope(ihdr(1, 1), deflateSync(Buffer.from([5, 10, 20, 30, 255]))), /row filter/);
});

test('zlib validates exact decoded size, expansion bound, stream checksum and consumed input', () => {
  rejects(envelope(ihdr(1, 1), deflateSync(Buffer.alloc(4))), /decoded size/);
  rejects(envelope(ihdr(1, 1), deflateSync(Buffer.alloc(1024 * 1024))), /oversized zlib/);
  const compressed = deflateSync(Buffer.from([0, 10, 20, 30, 255]));
  const corrupted = Buffer.from(compressed);
  corrupted[corrupted.length - 1] ^= 1;
  rejects(envelope(ihdr(1, 1), corrupted), /invalid.*zlib/);
  rejects(envelope(ihdr(1, 1), compressed.subarray(0, compressed.length - 1)), /invalid.*zlib/);
  rejects(envelope(ihdr(1, 1), Buffer.concat([compressed, Buffer.from([0])])), /trailing compressed data/);
  rejects(envelope(ihdr(1, 1), Buffer.concat([compressed, compressed])), /trailing compressed data/);
});
