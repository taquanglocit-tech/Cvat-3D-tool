// zip.js - Đọc và giải nén chunk dữ liệu ZIP từ CVAT bằng DecompressionStream nguyên bản
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});

  async function inflateRaw(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function findEOCD(view) {
    const min = Math.max(0, view.byteLength - 65557);
    for (let i = view.byteLength - 22; i >= min; i--) {
      if (view.getUint32(i, true) === 0x06054b50) return i;
    }
    throw new Error('Không phải file zip hợp lệ');
  }

  function listEntries(buffer) {
    const view = new DataView(buffer);
    const eocd = findEOCD(view);
    let count = view.getUint16(eocd + 10, true);
    let cdOffset = view.getUint32(eocd + 16, true);

    if (cdOffset === 0xffffffff || count === 0xffff) {
      const locator = eocd - 20;
      if (locator >= 0 && view.getUint32(locator, true) === 0x07064b50) {
        const z64 = Number(view.getBigUint64(locator + 8, true));
        count = Number(view.getBigUint64(z64 + 32, true));
        cdOffset = Number(view.getBigUint64(z64 + 48, true));
      }
    }

    const decoder = new TextDecoder();
    const entries = [];
    let p = cdOffset;
    for (let n = 0; n < count; n++) {
      if (view.getUint32(p, true) !== 0x02014b50) throw new Error('Central directory zip bị hỏng');
      const method = view.getUint16(p + 10, true);
      let compSize = view.getUint32(p + 20, true);
      const nameLen = view.getUint16(p + 28, true);
      const extraLen = view.getUint16(p + 30, true);
      const commentLen = view.getUint16(p + 32, true);
      let localOffset = view.getUint32(p + 42, true);
      const name = decoder.decode(new Uint8Array(buffer, p + 46, nameLen));

      let e = p + 46 + nameLen;
      const eEnd = e + extraLen;
      while (e + 4 <= eEnd) {
        const id = view.getUint16(e, true);
        const size = view.getUint16(e + 2, true);
        if (id === 0x0001) {
          let q = e + 4;
          if (view.getUint32(p + 24, true) === 0xffffffff) q += 8;
          if (compSize === 0xffffffff) { compSize = Number(view.getBigUint64(q, true)); q += 8; }
          if (localOffset === 0xffffffff) { localOffset = Number(view.getBigUint64(q, true)); }
        }
        e += 4 + size;
      }

      p += 46 + nameLen + extraLen + commentLen;
      entries.push({
        name,
        async read() {
          const lView = new DataView(buffer, localOffset);
          if (lView.getUint32(0, true) !== 0x04034b50) throw new Error(`Local header bị hỏng: ${name}`);
          const lNameLen = lView.getUint16(26, true);
          const lExtraLen = lView.getUint16(28, true);
          const dataOffset = localOffset + 30 + lNameLen + lExtraLen;
          const raw = new Uint8Array(buffer, dataOffset, compSize);
          if (method === 0) return raw;
          if (method === 8) return inflateRaw(raw);
          throw new Error(`Kiểu nén zip ${method} chưa được hỗ trợ: ${name}`);
        },
      });
    }
    return entries;
  }

  SP.zip = { listEntries };
})();
