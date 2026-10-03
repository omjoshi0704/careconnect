// lib/router.js — a tiny router so we don't need the Express package.
"use strict";

class Router {
  constructor() {
    this.routes = [];
  }
  _add(method, pattern, handler) {
    const parts = pattern.split("/").filter(Boolean);
    this.routes.push({ method, parts, handler });
  }
  get(p, h) { this._add("GET", p, h); }
  post(p, h) { this._add("POST", p, h); }
  put(p, h) { this._add("PUT", p, h); }
  del(p, h) { this._add("DELETE", p, h); }

  match(method, pathname) {
    const segs = pathname.split("/").filter(Boolean);
    for (const r of this.routes) {
      if (r.method !== method) continue;
      if (r.parts.length !== segs.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < r.parts.length; i++) {
        const rp = r.parts[i], sp = segs[i];
        if (rp.startsWith(":")) params[rp.slice(1)] = decodeURIComponent(sp);
        else if (rp !== sp) { ok = false; break; }
      }
      if (ok) return { handler: r.handler, params };
    }
    return null;
  }
}

module.exports = Router;
