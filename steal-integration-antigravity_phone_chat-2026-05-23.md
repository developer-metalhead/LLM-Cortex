# Integration Scratch — antigravity_phone_chat
**Date**: 2026-05-23
**Target**: C:\Users\kumsatwi\Desktop\StEp\personalProject\connect4private\antigravity_phone_chat

---

## To paste into flaws.md

### Flaw #117 — Phase 22 must refuse to start with missing/default SESSION_SECRET
**Severity**: high (Phase 22 is a network-accessible server; predictable session secrets = auth bypass)
**Description**: `antigravity_phone_chat` has hardcoded fallback credentials (`APP_PASSWORD='antigravity'`, `SESSION_SECRET='antigravity_secret_key_1337'`) discoverable from the public GitHub repo. Even with `console.warn` at startup, users who skip terminal output remain exposed. When Cortex Phase 22 (`cortex server start`) ships, it MUST: (1) check that `SESSION_SECRET`, `CORTEX_ADMIN_TOKEN`, and any signing salt are set via env; (2) in production mode (`NODE_ENV=production` or `--prod` flag) refuse to start with actionable error: `"SESSION_SECRET not set. Run: cortex server init to generate secrets."`. Soft warning acceptable for local dev mode only.
**Source-of-lesson**: antigravity_phone_chat `server.js:23` — hardcoded `APP_PASSWORD`, `AUTH_SALT`, `SESSION_SECRET` fallbacks

---

## To paste into implementation_plan.md

### Phase 22 Refinement — LAN Trust Bypass with Proxy-Header-First Auth

When implementing Phase 22's auth middleware, adopt the `isLocalRequest()` pattern. The critical detail: check proxy/tunnel headers BEFORE checking the remote IP.

```typescript
function isLocalRequest(req: Request): boolean {
  // Tunnel headers (ngrok, Cloudflare, Tailscale) mean the request is external
  // even if the tunnel endpoint happens to be on a LAN IP. Check this FIRST.
  if (req.headers['x-forwarded-for'] || req.headers['x-forwarded-host'] || req.headers['x-real-ip']) {
    return false;
  }
  const ip = req.ip || req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' ||
         ip.startsWith('192.168.') || ip.startsWith('10.') ||
         ip.startsWith('172.16.') || ip.startsWith('172.17.') ||
         ip.startsWith('172.18.') || ip.startsWith('172.19.') ||
         ip.startsWith('172.2') || ip.startsWith('172.3') ||
         ip.startsWith('::ffff:192.168.') || ip.startsWith('::ffff:10.');
}
```

LAN devices skip auth for the Phase 22 dashboard (local dev convenience). External devices (including tunnel traffic) go through full JWT verification. Make LAN bypass opt-out via `CORTEX_LAN_BYPASS=false` for containerized/Kubernetes deployments where `192.168.x.x` is pod-network space.

**Note**: This is for the Phase 22 browser dashboard specifically. The MCP-over-HTTP REST API should always require Bearer JWT regardless of source IP (dashboard is human-facing; API is machine-facing).

**Source**: antigravity_phone_chat `server.js:1548` — `isLocalRequest()`

---

### Phase 8.1 Refinement — Hash-Diff Skip on WebSocket Broadcast

Add a content-hash check before broadcasting graph diff events to connected clients. Skip the broadcast when nothing has actually changed (e.g., file watcher fires on a no-op save):

```typescript
import { createHash } from 'crypto';

let lastGraphHash = '';

function shouldBroadcast(graphEvent: GraphDiffEvent): boolean {
  const hash = createHash('sha256')
    .update(JSON.stringify(graphEvent))
    .digest('hex')
    .slice(0, 16); // 16 hex chars sufficient for change detection
  if (hash === lastGraphHash) return false;
  lastGraphHash = hash;
  return true;
}

// In polling loop:
if (shouldBroadcast(diffEvent)) {
  connectionManager.broadcast(diffEvent);
}
```

Use SHA-256 (truncated) rather than djb2 — the source project uses a weak djb2 hash which has collision risk. This prevents unnecessary re-renders on idle clients and reduces WebSocket noise on high-frequency file watchers.

**Source**: antigravity_phone_chat `server.js:1614` — polling loop hash-diff check

---

### Phase 22 Refinement — Startup Warning for Insecure Defaults

When `cortex server start` launches, check that security-sensitive env vars are properly configured. Emit loud ANSI-colored warnings in dev mode; refuse to start in production mode:

```typescript
const SESSION_SECRET = process.env.CORTEX_SESSION_SECRET;
const KNOWN_INSECURE_DEFAULTS = ['cortex_default', 'change_me', 'secret', ''];

if (!SESSION_SECRET || KNOWN_INSECURE_DEFAULTS.includes(SESSION_SECRET)) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.CORTEX_PROD;
  const msg = '⚠️  SECURITY: CORTEX_SESSION_SECRET is missing or insecure. Run: cortex server init';
  if (isProduction) {
    console.error('\x1b[31m' + msg + '\x1b[0m');
    process.exit(1); // Hard fail in production
  } else {
    console.warn('\x1b[33m' + msg + '\x1b[0m'); // Soft warn in dev
  }
}
// Same pattern for CORTEX_API_TOKEN_SALT and CORTEX_ADMIN_PASSWORD
```

`cortex server init` generates and writes all required secrets to `.env` with `openssl rand -hex 32`.

**Source**: antigravity_phone_chat `server.js:27-30` + `server.js:1693-1696` — startup credential checks

---

### Phase 22 Refinement — LAN-First IP Priority Sort for URL Display

When `cortex server start` or `cortex remote enable` prints the dashboard URL, sort network interfaces to display the real home/office IP rather than a WSL2/Docker virtual adapter:

```typescript
import { networkInterfaces } from 'os';

function getDisplayIP(): string {
  const candidates: { address: string; priority: number }[] = [];
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push({
          address: iface.address,
          priority: iface.address.startsWith('192.168.') ? 1 :
                    iface.address.startsWith('10.')       ? 2 :
                    iface.address.startsWith('172.')      ? 3 : 4
        });
      }
    }
  }
  candidates.sort((a, b) => a.priority - b.priority);
  return candidates[0]?.address ?? 'localhost';
}
```

Skip the heuristic when `process.env.DOCKER_HOST` or `process.env.KUBERNETES_SERVICE_HOST` is set — in those environments trust the bound address directly.

**Source**: antigravity_phone_chat `server.js:81-103` — `getLocalIP()`

---

### Phase 33.2 Refinement — QR Code Terminal Print for Remote Enable

When `cortex remote enable` starts the tunnel and prints the public URL, also print a scannable QR code in the terminal. Developer scans with phone instead of typing a long URL:

```typescript
// npm install qrcode (already available as a lightweight dep)
import QRCode from 'qrcode';

async function printQR(url: string): Promise<void> {
  const qr = await QRCode.toString(url, { type: 'terminal', small: true });
  console.log(qr);
  console.log(`\n📱 Scan to connect, or visit: ${url}\n`);
}
```

Make it opt-in via `--qr` flag (block-character QR codes require adequate terminal contrast and monospace rendering; CI/SSH environments may garble them):
```
cortex remote enable --provider cloudflare --qr
```

**Source**: antigravity_phone_chat `launcher.py:84-93` — `print_qr()`
