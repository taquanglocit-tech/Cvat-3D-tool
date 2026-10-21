// api.js - Gọi các endpoint dữ liệu của CVAT bằng đúng phiên đăng nhập (Same-origin)
// Tác giả: taquanglocit-tech

(() => {
  const SP = (globalThis.CVATSuperPro ||= {});

  function cookie(name) {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function orgSlug() {
    try { return localStorage.getItem('currentOrganization') || ''; } catch { return ''; }
  }

  function buildUrl(path, params, withOrg) {
    const url = new URL(path, location.origin);
    if (url.origin !== location.origin) throw new Error(`Chặn request ra ngoài host: ${url.origin}`);
    const all = { ...(withOrg ? { org: orgSlug() } : {}), ...(params || {}) };
    for (const [k, v] of Object.entries(all)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    return url;
  }

  async function readWithProgress(res, onProgress) {
    if (!onProgress || !res.body) return res.arrayBuffer();
    const total = Number(res.headers.get('Content-Length')) || 0;
    const reader = res.body.getReader();
    const parts = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      loaded += value.length;
      onProgress(loaded, total);
    }
    const out = new Uint8Array(loaded);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out.buffer;
  }

  async function request(method, path, { params, body, responseType = 'json', withOrg = true, onProgress } = {}) {
    const headers = { Accept: 'application/vnd.cvat+json, application/json, */*' };
    const csrf = cookie('csrftoken');
    if (csrf) headers['X-CSRFToken'] = csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(buildUrl(path, params, withOrg), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      cache: 'no-store',
      referrerPolicy: 'same-origin',
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 300); } catch { /* Bỏ qua */ }
      throw new Error(`${method} ${path} → HTTP ${res.status} ${detail}`);
    }
    if (responseType === 'arraybuffer') return readWithProgress(res, onProgress);
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  SP.api = {
    getJob: (jid) => request('GET', `/api/jobs/${jid}`, { withOrg: false }),
    getMeta: (jid) => request('GET', `/api/jobs/${jid}/data/meta`),
    getAnnotations: (jid) => request('GET', `/api/jobs/${jid}/annotations`),
    getChunk: (jid, index, quality, onProgress) => request('GET', `/api/jobs/${jid}/data`, {
      params: { type: 'chunk', index, quality }, responseType: 'arraybuffer', onProgress,
    }),
    getContextImages: (jid, frame) => request('GET', `/api/jobs/${jid}/data`, {
      params: { type: 'context_image', number: frame, quality: 'original' }, responseType: 'arraybuffer',
    }),
    async getLabels(jid) {
      const out = [];
      let page = 1;
      for (;;) {
        const data = await request('GET', '/api/labels', { params: { job_id: jid, page_size: 500, page } });
        out.push(...(data.results || []));
        if (!data.next) break;
        page += 1;
      }
      return out;
    },
  };
})();
