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

    // Tìm trường cường độ phản xạ LiDAR (bao quát các định dạng cảm biến phổ biến)
    const iFieldNames = ['intensity', 'i', 'reflectance', 'reflectivity', 'intensities', 'scalar_intensity', 'remission', 'confidence', 'signal', 'intensity_float'];
    const idxI = fields.findIndex((f) => iFieldNames.includes(f));

    // Tìm trường màu sắc RGB/RGBA (được hợp nhất từ ảnh Camera 2D)
    const rgbFieldNames = ['rgb', 'rgba', 'colors', 'color'];
    const idxRGB = fields.findIndex((f) => rgbFieldNames.includes(f));
    const hasRGB = idxRGB >= 0;

    const outXYZ = new Float32Array(points * 3);
    const outIntensity = new Float32Array(points);
    const outRGB = hasRGB ? new Float32Array(points * 3) : null;
    let n = 0;
    let nI = 0;
    let nRGB = 0;

    // Buffer 4-byte giải mã trường packed float32/uint32 RGB
    const f32Buf = new Float32Array(1);
    const u32Buf = new Uint32Array(f32Buf.buffer);

    function unpackRgb(val) {
      f32Buf[0] = val;
      const u32 = u32Buf[0];
      return [(u32 >> 16) & 0xff, (u32 >> 8) & 0xff, u32 & 0xff];
    }

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

        let r = 255, g = 255, b = 255;
        if (hasRGB) {
          const rawRGB = +parts[col[idxRGB]];
          if (Number.isFinite(rawRGB)) {
            const rgbArr = unpackRgb(rawRGB);
            r = rgbArr[0]; g = rgbArr[1]; b = rgbArr[2];
          }
        }

        let inten = 1.0;
        if (idxI >= 0) {
          const rawI = +parts[col[idxI]];
          inten = Number.isFinite(rawI) ? rawI : 1.0;
        } else if (hasRGB) {
          // Trích xuất mức xám / độ phản xạ từ RGB Camera khi file thiếu kênh intensity riêng
          inten = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        }

        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
          outXYZ[n++] = x;
          outXYZ[n++] = y;
          outXYZ[n++] = z;
          outIntensity[nI++] = Number.isFinite(inten) ? inten : 1.0;
          if (outRGB) {
            outRGB[nRGB++] = r / 255.0;
            outRGB[nRGB++] = g / 255.0;
            outRGB[nRGB++] = b / 255.0;
          }
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
      const rdRGB = hasRGB ? (offset) => view.getUint32(offset, true) : null;

      for (let i = 0; i < points; i++) {
        const x = rdX(offsetOf(idxX, i));
        const y = rdY(offsetOf(idxY, i));
        const z = rdZ(offsetOf(idxZ, i));

        let r = 255, g = 255, b = 255;
        if (rdRGB) {
          const u32 = rdRGB(offsetOf(idxRGB, i));
          r = (u32 >> 16) & 0xff;
          g = (u32 >> 8) & 0xff;
          b = u32 & 0xff;
        }

        let inten = 1.0;
        if (rdI) {
          const rawI = rdI(offsetOf(idxI, i));
          inten = Number.isFinite(rawI) ? rawI : 1.0;
        } else if (hasRGB) {
          // Trích xuất mức xám / độ phản xạ từ RGB Camera khi file thiếu kênh intensity riêng
          inten = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
        }

        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
          outXYZ[n++] = x;
          outXYZ[n++] = y;
          outXYZ[n++] = z;
          outIntensity[nI++] = Number.isFinite(inten) ? inten : 1.0;
          if (outRGB) {
            outRGB[nRGB++] = r / 255.0;
            outRGB[nRGB++] = g / 255.0;
            outRGB[nRGB++] = b / 255.0;
          }
        }
      }
    }

    const finalXYZ = outXYZ.subarray(0, n);
    const finalI = outIntensity.subarray(0, nI);
    const finalRGB = outRGB ? outRGB.subarray(0, nRGB) : null;

    const hasIntensity = (idxI >= 0) || hasRGB;

    // Chuẩn hoá intensity về khoảng [0.0, 1.0] bằng phân vị P98 (Robust Normalization)
    // Loại bỏ điểm nhiễu cực quang (outlier) và biển báo phản quang siêu mạnh,
    // giúp toàn bộ chi tiết xe hơi (vỏ xe, kính xe, bánh xe) trải đều dải màu Heatmap
    if (hasIntensity && finalI.length > 0) {
      // Lấy mẫu nhanh tối đa 2048 điểm để tìm phân vị P98 trong < 0.1ms
      const sampleSize = Math.min(finalI.length, 2048);
      const step = Math.max(1, Math.floor(finalI.length / sampleSize));
      const sample = new Float32Array(sampleSize);
      let sCount = 0;
      for (let i = 0; i < finalI.length && sCount < sampleSize; i += step) {
        const v = finalI[i];
        if (Number.isFinite(v) && v >= 0 && v < 1e6) sample[sCount++] = v;
      }
      const validSample = sample.subarray(0, sCount);
      validSample.sort();

      const p98Idx = Math.min(validSample.length - 1, Math.floor(validSample.length * 0.98));
      const p98Val = validSample[p98Idx] || 0;
      const robustMax = p98Val > 0.05 ? p98Val : (validSample[validSample.length - 1] || 1.0);

      // Nếu dữ liệu đã chuẩn hoá sẵn [0.0, 1.0] (robustMax <= 1.05) thì giữ nguyên
      if (robustMax > 1.05) {
        const invMax = 1.0 / robustMax;
        for (let i = 0; i < finalI.length; i++) {
          finalI[i] = Math.min(1.0, Math.max(0.0, finalI[i] * invMax));
        }
      } else {
        for (let i = 0; i < finalI.length; i++) {
          finalI[i] = Math.min(1.0, Math.max(0.0, finalI[i]));
        }
      }
    }

    return {
      xyz: finalXYZ,
      intensity: finalI,
      rgb: finalRGB,
      hasRGB,
      hasIntensity,
      points: n / 3,
    };
  }

  SP.pcd = { parse, lzfDecompress };
})();
