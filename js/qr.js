/* qr.js — Pembuat QR (salinan QR.gs backend, MIT gaya Nayuki) untuk menampilkan QR di peramban. */

var QR_ECC = { L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28] };
var QR_BLK = { L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49] };
var QR_FMT = { L: 1, M: 0 };

function qrUtf8_(s) {
  var out = [], str = String(s);
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) { c = 0x10000 + ((c - 0xD800) << 10) + (str.charCodeAt(++i) - 0xDC00); }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}
function qrRawModules_(v) {
  var r = (16 * v + 128) * v + 64;
  if (v >= 2) { var na = Math.floor(v / 7) + 2; r -= (25 * na - 10) * na - 55; if (v >= 7) r -= 36; }
  return r;
}
function qrDataCw_(v, e) { return Math.floor(qrRawModules_(v) / 8) - QR_ECC[e][v] * QR_BLK[e][v]; }
function qrMul_(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; }
function qrDivisor_(deg) {
  var r = []; for (var i = 0; i < deg - 1; i++) r.push(0); r.push(1);
  var root = 1;
  for (var k = 0; k < deg; k++) {
    for (var j = 0; j < r.length; j++) { r[j] = qrMul_(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
    root = qrMul_(root, 0x02);
  }
  return r;
}
function qrRemainder_(data, div) {
  var r = div.map(function () { return 0; });
  data.forEach(function (b) { var f = b ^ r.shift(); r.push(0); div.forEach(function (c, i) { r[i] ^= qrMul_(c, f); }); });
  return r;
}

/** Teks → matriks boolean (true = hitam). */
function qrMatriks_(teks, ecl) {
  ecl = ecl || 'M';
  var bytes = qrUtf8_(teks), ver = 0;
  for (var v = 1; v <= 40; v++) {
    var cc = v < 10 ? 8 : 16, need = 4 + cc + bytes.length * 8;
    if (need <= qrDataCw_(v, ecl) * 8) { ver = v; break; }
  }
  if (!ver) throw new Error('Teks terlalu panjang untuk QR.');
  // bit stream
  var bits = [];
  var push = function (val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(4, 4); push(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(function (b) { push(b, 8); });
  var cap = qrDataCw_(ver, ecl) * 8;
  push(0, Math.min(4, cap - bits.length));
  push(0, (8 - bits.length % 8) % 8);
  for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) push(pad, 8);
  var data = [];
  for (var bi = 0; bi < bits.length; bi += 8) { var x = 0; for (var k = 0; k < 8; k++) x = (x << 1) | bits[bi + k]; data.push(x); }
  // ECC & interleave
  var nb = QR_BLK[ecl][ver], el = QR_ECC[ecl][ver], raw = Math.floor(qrRawModules_(ver) / 8);
  var nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = qrDivisor_(el), blocks = [];
  for (var i2 = 0, kk = 0; i2 < nb; i2++) {
    var dat = data.slice(kk, kk + shortLen - el + (i2 < nShort ? 0 : 1)); kk += dat.length;
    var ecc = qrRemainder_(dat, div);
    if (i2 < nShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  var cw = [];
  for (var i3 = 0; i3 < blocks[0].length; i3++) blocks.forEach(function (b, j) { if (i3 !== shortLen - el || j >= nShort) cw.push(b[i3]); });
  // matriks
  var size = ver * 4 + 17, mod = [], fn = [];
  for (var y = 0; y < size; y++) { mod.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
  var setF = function (x, y, d) { mod[y][x] = d; fn[y][x] = true; };
  for (var t = 0; t < size; t++) { setF(6, t, t % 2 === 0); setF(t, 6, t % 2 === 0); }
  var finder = function (cx, cy) {
    for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
      var dist = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy;
      if (xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, dist !== 2 && dist !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  var align = [];
  if (ver > 1) {
    var na = Math.floor(ver / 7) + 2, step = Math.floor((ver * 8 + na * 3 + 5) / (na * 4 - 4)) * 2;
    align = [6];
    for (var pos = size - 7; align.length < na; pos -= step) align.splice(1, 0, pos);
  }
  for (var ai = 0; ai < align.length; ai++) for (var aj = 0; aj < align.length; aj++) {
    if ((ai === 0 && aj === 0) || (ai === 0 && aj === align.length - 1) || (ai === align.length - 1 && aj === 0)) continue;
    for (var ady = -2; ady <= 2; ady++) for (var adx = -2; adx <= 2; adx++) setF(align[ai] + adx, align[aj] + ady, Math.max(Math.abs(adx), Math.abs(ady)) !== 1);
  }
  var drawFormat = function (mask) {
    var d = QR_FMT[ecl] << 3 | mask, rem = d;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var b = (d << 10 | rem) ^ 0x5412, g = function (i) { return ((b >>> i) & 1) !== 0; };
    for (var i1 = 0; i1 <= 5; i1++) setF(8, i1, g(i1));
    setF(8, 7, g(6)); setF(8, 8, g(7)); setF(7, 8, g(8));
    for (var i4 = 9; i4 < 15; i4++) setF(14 - i4, 8, g(i4));
    for (var i5 = 0; i5 < 8; i5++) setF(size - 1 - i5, 8, g(i5));
    for (var i6 = 8; i6 < 15; i6++) setF(8, size - 15 + i6, g(i6));
    setF(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    var rv = ver; for (var q = 0; q < 12; q++) rv = (rv << 1) ^ ((rv >>> 11) * 0x1F25);
    var vb = ver << 12 | rv;
    for (var q2 = 0; q2 < 18; q2++) { var col = ((vb >>> q2) & 1) !== 0, a = size - 11 + q2 % 3, bb = Math.floor(q2 / 3); setF(a, bb, col); setF(bb, a, col); }
  }
  // codewords
  var idx = 0;
  for (var right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (var vert = 0; vert < size; vert++) for (var j2 = 0; j2 < 2; j2++) {
      var xq = right - j2, up = ((right + 1) & 2) === 0, yq = up ? size - 1 - vert : vert;
      if (!fn[yq][xq] && idx < cw.length * 8) { mod[yq][xq] = ((cw[idx >>> 3] >>> (7 - (idx & 7))) & 1) !== 0; idx++; }
    }
  }
  var maskFn = [function (x, y) { return (x + y) % 2 === 0; }, function (x, y) { return y % 2 === 0; }, function (x) { return x % 3 === 0; }, function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; }, function (x, y) { return x * y % 2 + x * y % 3 === 0; },
    function (x, y) { return (x * y % 2 + x * y % 3) % 2 === 0; }, function (x, y) { return ((x + y) % 2 + x * y % 3) % 2 === 0; }];
  var applyMask = function (m) { for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (!fn[y][x] && maskFn[m](x, y)) mod[y][x] = !mod[y][x]; };
  var penalty = function () {
    var p = 0, dark = 0;
    for (var y = 0; y < size; y++) {
      var runX = 1, runY = 1;
      for (var x = 0; x < size; x++) {
        if (mod[y][x]) dark++;
        if (x > 0) { if (mod[y][x] === mod[y][x - 1]) { runX++; if (runX === 5) p += 3; else if (runX > 5) p++; } else runX = 1; }
        if (x > 0) { if (mod[x][y] === mod[x - 1][y]) { runY++; if (runY === 5) p += 3; else if (runY > 5) p++; } else runY = 1; }
        if (x < size - 1 && y < size - 1) { var c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3; }
      }
    }
    var total = size * size, kk2 = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    return p + Math.max(0, kk2) * 10;
  };
  var best = 0, bestP = Infinity;
  for (var m = 0; m < 8; m++) { applyMask(m); drawFormat(m); var pp = penalty(); if (pp < bestP) { bestP = pp; best = m; } applyMask(m); }
  applyMask(best); drawFormat(best);
  return mod;
}

/* ---------- PNG 1-bit (deflate tersimpan, tanpa kompresi) ---------- */
var _CRC_T = null;
function qrCrc_(bytes) {
  if (!_CRC_T) { _CRC_T = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; _CRC_T[n] = c >>> 0; } }
  var crc = 0xFFFFFFFF;
  for (var i = 0; i < bytes.length; i++) crc = _CRC_T[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function qrU32_(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
/** Matriks → byte PNG (array 0..255). skala = piksel per modul, tepi = 4 modul putih. */
function qrPngBytes_(mod, skala) {
  skala = skala || 6;
  var n = mod.length, tepi = 4, w = (n + tepi * 2) * skala, rowBytes = Math.ceil(w / 8), raw = [];
  for (var py = 0; py < w; py++) {
    raw.push(0);
    var my = Math.floor(py / skala) - tepi;
    for (var bx = 0; bx < rowBytes; bx++) {
      var byte = 0;
      for (var bit = 0; bit < 8; bit++) {
        var px = bx * 8 + bit, mx = Math.floor(px / skala) - tepi;
        var hitam = px < w && my >= 0 && my < n && mx >= 0 && mx < n && mod[my][mx];
        byte = (byte << 1) | (hitam ? 0 : 1);
      }
      raw.push(byte);
    }
  }
  var z = [0x78, 0x01], a = 1, b = 0;
  for (var i = 0; i < raw.length; i += 65535) {
    var len = Math.min(65535, raw.length - i), fin = i + len >= raw.length ? 1 : 0;
    z.push(fin, len & 255, len >>> 8, (~len) & 255, ((~len) >>> 8) & 255);
    for (var j = 0; j < len; j++) z.push(raw[i + j]);
  }
  for (var q = 0; q < raw.length; q++) { a = (a + raw[q]) % 65521; b = (b + a) % 65521; }
  z = z.concat(qrU32_(((b << 16) | a) >>> 0));
  var chunk = function (type, data) {
    var t = [type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)], td = t.concat(data);
    return qrU32_(data.length).concat(td, qrU32_(qrCrc_(td)));
  };
  var ihdr = qrU32_(w).concat(qrU32_(w), [1, 0, 0, 0, 0]);
  return [137, 80, 78, 71, 13, 10, 26, 10].concat(chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', []));
}
