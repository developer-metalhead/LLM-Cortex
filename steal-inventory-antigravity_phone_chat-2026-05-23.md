# Steal Inventory — antigravity_phone_chat
**Audited**: 2026-05-23T00:00:00Z
**Target path**: C:\Users\kumsatwi\Desktop\StEp\personalProject\connect4private\antigravity_phone_chat
**Target type**: Node.js/Express + Python launcher (mobile monitor for Antigravity AI IDE)
**Last commit**: 65ed325 @ master
**Files scanned**: 7 source files + 7 .md docs
**Relevance gate**: <50 source files but rich docs + security/UX patterns relevant to Phase 22 and Phase 8.1. Proceeded.
**Spot-check**: 3/3 pass ✅

## Features found

| # | Feature | Source | Description | Bucket | Score |
|---|---------|--------|-------------|--------|-------|
| 1 | `isLocalRequest()` LAN bypass + proxy-header detect | `server.js:1548` — `isLocalRequest()` | Checks `x-forwarded-for`/`x-forwarded-host` FIRST (blocks tunnel bypass), then RFC-1918 range check. LAN devices auto-trusted, external devices zero-trust. | C | 36 |
| 2 | Hash-diff → skip WebSocket broadcast | `server.js:1614` — polling loop | `hashString(snapshot.html)` compared to `lastSnapshotHash`; broadcast only fires when content actually changed. | C | 30 |
| 3 | Startup warning for insecure defaults | `server.js:27` — startup | `console.warn` with ANSI color when `APP_PASSWORD`, `SESSION_SECRET`, or `AUTH_SALT` match known defaults. | C | 30 |
| 4 | Magic link + QR code auto-login with key-strip redirect | `server.js:1719` — auth middleware | `?key=PASSWORD` in URL sets signed `httpOnly` cookie, then redirects to `/` to strip key from URL (prevents browser-history leakage). | C | 27 |
| 5 | Signed `httpOnly` cookie auth with `cookieParser` | `server.js:1748` — `/login` handler | `cookieParser(sessionSecret)` + `{httpOnly: true, signed: true, maxAge: 30d}`. Token never in JS context. | C | 27 |
| 6 | QR code terminal print for connection URL | `launcher.py:84` — `print_qr()` | `qrcode.QRCode + print_ascii(invert=True)` — prints scannable QR in terminal. | C | 24 |
| 7 | LAN-first IP priority sort | `server.js:81` — `getLocalIP()` | Ranks interfaces: 192.168.x > 10.x > 172.x > others. Avoids WSL2/Docker virtual adapter confusion. | C | 24 |
| 8 | CSP zero-inline-JS enforcement | `public/index.html:15` — `<meta http-equiv="Content-Security-Policy">` | `script-src 'self'` with no `'unsafe-inline'`. Achieved by complete event handler refactor into `app.js`. | C | 24 |
| 9 | Port kill on startup (cross-platform) | `server.js:43` — `killPortProcess()` | `netstat -ano + taskkill` (Windows) / `lsof -ti + kill -9` (Linux/macOS). Prevents EADDRINUSE on restart. | C | 24 |
| 10 | Hybrid SSL generation (OpenSSL → Node.js crypto fallback) | `generate_ssl.js:57` — `getOpenSSLPath()` | Tries `openssl` in PATH, then Git-for-Windows bundled OpenSSL, falls to pure `node:crypto`. OpenSSL path gets IP SAN extensions. | C | 18 |
| 11 | ngrok skip-browser-warning header | `server.js:1700` — middleware | `res.setHeader('ngrok-skip-browser-warning', 'true')` on all responses. Small but required for ngrok tunneled API calls. | C | 15 |
| 12 | Multi-tunnel support (ngrok/Cloudflare/Pinggy) | `launcher.py` + README | Already in Cortex Phase 33.2 (Remote Operations). | A | — |
| 13 | CDP-based DOM mirroring + snapshot | `server.js:211` — `captureSnapshot()` | CDP `Runtime.evaluate` to clone DOM, strip UI chrome, base64 images. Browser automation specific. | D | — |
| 14 | Fuzzy element selection (3-tier fallback) | `server.js:558` — `setMode()` | data-tooltip-id → keyword+cursor-pointer → text-node walk upward. CDP/browser automation. | D | — |
| 15 | Leaf-node isolation + occurrence index | `server.js:700-708` — `clickElement()` | Filters parent elements when multiple matches; `elements[index]` for nth occurrence. CDP-specific. | D | — |
| 16 | Auto-reconnect CDP polling loop | `server.js:1583` — `startPolling()` | CDP reconnect on connection loss; throttled error logging (10s cooldown). | D | — |
| 17 | `fetchWithAuth` 401 → redirect | `public/js/app.js:47` | Client-side wrapper; redirects to login.html on 401. Standard web pattern; not MCP-relevant. | D | — |
| 18 | Hardcoded fallback credentials with console.warn | `server.js:23, 1684, 1691` | `APP_PASSWORD='antigravity'`, `AUTH_SALT='antigravity_default_salt_99'`, `SESSION_SECRET='antigravity_secret_key_1337'`. Even with warnings, predictable defaults remain active. | F | — |
| 19 | LAN mode: no rate limiting on /login | `server.js:1745` — `/login` | No `express-rate-limit` or similar on auth endpoint. | G (open Q) | — |
