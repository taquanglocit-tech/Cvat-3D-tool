// pcd.js - Bộ giải mã định dạng PCD (Point Cloud Data) hỗ trợ toạ độ X, Y, Z và Cường độ phản xạ Intensity
// Hỗ trợ cả 3 định dạng: ascii, binary, binary_compressed (LZF)
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});

  function lzfDecompress(input, outLength) {
    const out = new Uint8Array(outLength);
    let ip = 0, op = 0;
    while (ip < input.length) {
      let ctrl = input[ip++];
      if (ctrl < 32) {
        ctrl += 1;
        if (op + ctrl > outLength) throw new Error('LZF: dữ liệu hỏng');
        out.set(input.subarray(ip, ip + ctrl), op);
        ip += ctrl; op += ctrl;
      } else {
        let len = ctrl >> 5;
        let ref = op - ((ctrl & 0x1f) << 8) - 1;
        if (len === 7) len += input[ip++];
        ref -= input[ip++];
        len += 2;
        if (ref < 0 || op + len > outLength) throw new Error('LZF: dữ liệu hỏng');
        for (let k = 0; k < len; k++) out[op++] = out[ref++];
      }
    }
    return out;
  }

  function reader(view, type, size) {
    if (type === 'F' && size === 4) return (o) => view.getFloat32(o, true);
    if (type === 'F' && size === 8) return (o) => view.getFloat64(o, true);
    if (type === 'I' && size === 1) return (o) => view.getInt8(o);
    if (type === 'I' && size === 2) return (o) => view.getInt16(o, true);
    if (type === 'I' && size === 4) return (o) => view.getInt32(o, true);
    if (type === 'U' && size === 1) return (o) => view.getUint8(o);
    if (type === 'U' && size === 2) return (o) => view.getUint16(o, true);
    if (type === 'U' && size === 4) return (o) => view.getUint32(o, true);
    throw new Error(`PCD: kiểu dữ liệu ${type}${size} chưa được hỗ trợ`);
  }

  function parse(bytes) {
    let headerEnd = -1;
    const limit = Math.min(bytes.length, 65536);
    let lineStart = 0;
    const header = {};
    const td = new TextDecoder();

    for (let i = 0; i < limit; i++) {
      if (bytes[i] !== 10) continue;
      const line = td.decode(bytes.subarray(lineStart, i)).trim();
      lineStart = i + 1;
      if (!line || line.startsWith('#')) continue;
      const [key, ...rest] = line.split(/\s+/);
      header[key.toUpperCase()] = rest;
      if (key.toUpperCase() === 'DATA') { headerEnd = i + 1; break; }
    }
    if (headerEnd < 0) throw new Error('PCD: không tìm thấy dòng DATA');

    const fields = header.FIELDS.map((f) => f.toLowerCase());
    const sizes = header.SIZE.map(Number);
    const types = header.TYPE;
    const counts = header.COUNT ? header.COUNT.map(Number) : fields.map(() => 1);
    const points = Number(header.POINTS?.[0] ?? (Number(header.WIDTH[0]) * Number(header.HEIGHT?.[0] ?? 1)));
    const mode = header.DATA[0].toLowerCase();

    const idxX = fields.indexOf('x');
    const idxY = fields.indexOf('y');
    const idxZ = fields.indexOf('z');
    if (idxX < 0 || idxY < 0 || idxZ < 0) throw new Error('PCD: thiếu trường toạ độ x/y/z');

    // Tìm trường cường độ phản xạ LiDAR
    const iFieldNames = ['intensity', 'i', 'reflectance', 'reflectivity'];
    const idxI = fields.findIndex((f) => iFieldNames.includes(f));

    const outXYZ = new Float32Array(points * 3);
    const outIntensity = new Float32Array(points);
    let n = 0;
    let nI = 0;

    if (mode === 'ascii') {
      const text = td.decode(bytes.subarray(headerEnd));
      const col = [];
      let c = 0;
      fields.forEach((_, k) => { col.push(c); c += counts[k]; });

      for (const line of text.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < c) continue;
        const x = +parts[col[idxX]];
        const y = +parts[col[idxY]];
        const z = +parts[col[idxZ]];
        const inten = idxI >= 0 ? +parts[col[idxI]] : 1.0;

        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
          outXYZ[n++] = x;
          outXYZ[n++] = y;
          outXYZ[n++] = z;
          outIntensity[nI++] = Number.isFinite(inten) ? inten : 1.0;
        }
      }
    } else {
      let data, view, offsetOf;
      if (mode === 'binary') {
        data = bytes.subarray(headerEnd);
        const stride = sizes.reduce((s, sz, k) => s + sz * counts[k], 0);
        const fieldOff = [];
        let o = 0;
        fields.forEach((_, k) => { fieldOff.push(o); o += sizes[k] * counts[k]; });
        offsetOf = (field, i) => i * stride + fieldOff[field];
      } else if (mode === 'binary_compressed') {
        const hv = new DataView(bytes.buffer, bytes.byteOffset + headerEnd, 8);
        const compressed = hv.getUint32(0, true);
        const uncompressed = hv.getUint32(4, true);
        data = lzfDecompress(bytes.subarray(headerEnd + 8, headerEnd + 8 + compressed), uncompressed);
        const fieldOff = [];
        let o = 0;
        fields.forEach((_, k) => { fieldOff.push(o); o += sizes[k] * counts[k] * points; });
        offsetOf = (field, i) => fieldOff[field] + i * sizes[field] * counts[field];
      } else {
        throw new Error(`PCD: kiểu DATA ${mode} chưa hỗ trợ`);
      }

      view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const rdX = reader(view, types[idxX], sizes[idxX]);
      const rdY = reader(view, types[idxY], sizes[idxY]);
      const rdZ = reader(view, types[idxZ], sizes[idxZ]);
      const rdI = idxI >= 0 ? reader(view, types[idxI], sizes[idxI]) : null;

      for (let i = 0; i < points; i++) {
        const x = rdX(offsetOf(idxX, i));
        const y = rdY(offsetOf(idxY, i));
        const z = rdZ(offsetOf(idxZ, i));
        const inten = rdI ? rdI(offsetOf(idxI, i)) : 1.0;

        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
          outXYZ[n++] = x;
          outXYZ[n++] = y;
          outXYZ[n++] = z;
          outIntensity[nI++] = Number.isFinite(inten) ? inten : 1.0;
        }
      }
    }

    const finalXYZ = outXYZ.subarray(0, n);
    const finalI = outIntensity.subarray(0, nI);

    // Chuẩn hoá intensity về khoảng [0.0, 1.0] để shader WebGL vẽ
    let maxI = 1.0;
    for (let i = 0; i < finalI.length; i++) {
      if (finalI[i] > maxI) maxI = finalI[i];
    }
    if (maxI > 1.0) {
      for (let i = 0; i < finalI.length; i++) {
        finalI[i] /= maxI;
      }
    }

    return {
      xyz: finalXYZ,
      intensity: finalI,
      points: n / 3,
    };
  }

  SP.pcd = { parse, lzfDecompress };
})();
