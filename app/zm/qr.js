/* QR-Code selbst erzeugt (ohne Bibliothek, nichts geht ins Internet): Byte-Modus, Fehlerkorrektur M, Version 1–20.
 * Gleiches Verfahren wie am Handy (MQr.kt), nach der QR-Norm wie im freien Generator von Nayuki.
 * ZMQr.svg(text, px) → SVG-Text (mit hellem Rand) */
(function (root) {
  'use strict';
  const ECC = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26];
  const BLK = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16];
  const raw = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
  const dataCw = (v) => Math.floor(raw(v) / 8) - ECC[v] * BLK[v];
  const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; };
  function align(v) {
    if (v === 1) return [];
    const n = Math.floor(v / 7) + 2, size = v * 4 + 17, step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, r = [6];
    for (let pos = size - 7; r.length < n; pos -= step) r.splice(1, 0, pos);
    return r;
  }
  function ecc(v, data) {
    const nb = BLK[v], el = ECC[v], rw = Math.floor(raw(v) / 8), nShort = nb - rw % nb, shortLen = Math.floor(rw / nb);
    const div = new Array(el).fill(0); div[el - 1] = 1; let root = 1;
    for (let i = 0; i < el; i++) { for (let j = 0; j < el; j++) { div[j] = mul(div[j], root); if (j + 1 < el) div[j] ^= div[j + 1]; } root = mul(root, 2); }
    const blocks = []; let k = 0;
    for (let i = 0; i < nb; i++) {
      const dat = data.slice(k, k + shortLen - el + (i < nShort ? 0 : 1)); k += dat.length;
      const rem = new Array(el).fill(0);
      for (const b of dat) { const f = b ^ rem.shift(); rem.push(0); div.forEach((c, j) => { rem[j] ^= mul(c, f); }); }
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(rem));
    }
    const out = [];
    for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - el || j >= nShort) out.push(b[i]); });
    return out;
  }
  function penalty(m) {
    const n = m.length; let s = 0;
    for (let y = 0; y < n; y++) { let run = 1; for (let x = 1; x < n; x++) { if (m[y][x] === m[y][x - 1]) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; } }
    for (let x = 0; x < n; x++) { let run = 1; for (let y = 1; y < n; y++) { if (m[y][x] === m[y - 1][x]) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; } }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) s += 3; }
    let dark = 0; m.forEach((r) => r.forEach((c) => { if (c) dark++; })); const total = n * n;
    return s + Math.floor((Math.abs(dark * 20 - total * 10) + total - 1) / total) * 10;
  }
  /** → Matrix [y][x] (true = dunkel) */
  function encode(text) {
    const bytes = Array.from(new TextEncoder().encode(String(text)));
    let v = 1;
    for (; ; v++) { if (v > 20) throw new Error('Text zu lang für einen QR-Code'); if (4 + (v <= 9 ? 8 : 16) + bytes.length * 8 <= dataCw(v) * 8) break; }
    const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v <= 9 ? 8 : 16); bytes.forEach((b) => put(b, 8));
    const cap = dataCw(v) * 8;
    put(0, Math.min(4, cap - bits.length)); put(0, (8 - bits.length % 8) % 8);
    for (let p = 0xEC; bits.length < cap; p ^= 0xEC ^ 0x11) put(p, 8);
    const data = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }
    const all = ecc(v, data);
    const size = v * 4 + 17, m = [], fn = [];
    for (let y = 0; y < size; y++) { m.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    const set = (x, y, d) => { m[y][x] = d; fn[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4); } };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const al = align(v);
    for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    const format = (mask) => {
      const d = (0 << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412, bit = (i) => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true);
    };
    format(0);
    if (v >= 7) {
      let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const b = (v << 12) | r;
      for (let i = 0; i < 18; i++) { const d = ((b >>> i) & 1) === 1, a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, d); set(c, a, d); }
    }
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vv = 0; vv < size; vv++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vv : vv;
        if (!fn[y][x] && i < all.length * 8) { m[y][x] = ((all[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
      }
    }
    const mask = (k) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let inv; switch (k) { case 0: inv = (x + y) % 2 === 0; break; case 1: inv = y % 2 === 0; break; case 2: inv = x % 3 === 0; break; case 3: inv = (x + y) % 3 === 0; break;
        case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break; case 5: inv = x * y % 2 + x * y % 3 === 0; break; case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break; default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0; }
      if (inv && !fn[y][x]) m[y][x] = !m[y][x]; } };
    let best = 0, bestScore = Infinity;
    for (let k = 0; k < 8; k++) { mask(k); format(k); const s = penalty(m); if (s < bestScore) { best = k; bestScore = s; } mask(k); }
    mask(best); format(best);
    return m;
  }
  function svg(text, px) {
    let m; try { m = encode(text); } catch (e) { return ''; }
    const n = m.length + 8; let d = '';
    m.forEach((r, y) => r.forEach((c, x) => { if (c) d += `M${x + 4} ${y + 4}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${px || 200}" height="${px || 200}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#111827"/></svg>`;
  }
  root.ZMQr = { encode, svg, _ecc: ecc };
})(window);
