// Phase 8 — `cortex serve` local graph viewer.
//
// Starts a local-only HTTP server on 127.0.0.1 (default) that serves:
//   GET /             → self-contained HTML+CSS+JS graph viewer (no CDN)
//   GET /api/graph    → KnowledgeGraph JSON
//   GET /api/entity/* → entity markdown page
//   GET /api/concept/* → concept markdown page
//
// Design constraints (from spec):
//   - Bind to 127.0.0.1 only. Optional --host flag for explicit network access.
//   - All JS/CSS is inline — no external CDN, no external requests.
//   - Read-only projection: no mutation endpoints.
//   - state.json is read on every /api/graph request (live data, no cache).

import http from "http";
import { KnowledgeManager } from "../knowledge/writer.js";
import { buildGraph, toJson } from "../knowledge/graph.js";

export interface ServeOptions {
  port?: number;
  host?: string;
  includeConcepts?: boolean;
}

export async function runServe(
  projectRoot: string,
  options: ServeOptions = {},
): Promise<void> {
  const km = new KnowledgeManager(projectRoot);

  if (!(await km.exists())) {
    console.error("Knowledge base not initialized. Run `cortex init` first.");
    process.exit(1);
  }

  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 7842;
  const includeConcepts = options.includeConcepts ?? false;

  const server = http.createServer(async (req, res) => {
    const url = req.url ?? "/";

    // ── API: graph JSON ──────────────────────────────────────────────────
    if (url === "/api/graph") {
      try {
        const state = await km.getState();
        const graph = buildGraph(state, { includeConcepts });
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(toJson(graph));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err.message) }));
      }
      return;
    }

    // ── API: entity page ─────────────────────────────────────────────────
    if (url.startsWith("/api/entity/")) {
      const name = decodeURIComponent(url.slice("/api/entity/".length));
      const content = await km.readEntity(name);
      if (!content) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Entity not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(content);
      return;
    }

    // ── API: concept page ────────────────────────────────────────────────
    if (url.startsWith("/api/concept/")) {
      const name = decodeURIComponent(url.slice("/api/concept/".length));
      const content = await km.readConcept(name);
      if (!content) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Concept not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(content);
      return;
    }

    // ── Root: serve the viewer HTML ──────────────────────────────────────
    if (url === "/" || url === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(VIEWER_HTML);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, () => resolve());
    server.once("error", reject);
  });

  const url = `http://${host}:${port}`;
  console.log(`\n  Cortex Graph Viewer → ${url}\n`);
  console.log("  Press Ctrl+C to stop.\n");

  // Keep alive until SIGINT/SIGTERM
  await new Promise<void>((resolve) => {
    process.once("SIGINT", () => { server.close(); resolve(); });
    process.once("SIGTERM", () => { server.close(); resolve(); });
  });
}

// ── Self-contained HTML viewer ───────────────────────────────────────────
// No external CDN. All JS/CSS is inline.
// Force-directed layout via vanilla JS + SVG (no external libs).
// ────────────────────────────────────────────────────────────────────────

const VIEWER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cortex — Knowledge Graph</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;height:100vh;display:flex;flex-direction:column}
#toolbar{padding:10px 16px;background:#1e293b;border-bottom:1px solid #334155;display:flex;align-items:center;gap:12px;flex-shrink:0}
#toolbar h1{font-size:14px;font-weight:600;color:#94a3b8;letter-spacing:.05em;text-transform:uppercase}
#toolbar span{font-size:12px;color:#64748b}
#legend{display:flex;gap:10px;margin-left:auto;align-items:center}
.leg{display:flex;align-items:center;gap:4px;font-size:11px;color:#94a3b8}
.leg-dot{width:10px;height:10px;border-radius:50%}
.lg{background:#22c55e}.la{background:#f59e0b}.lr{background:#ef4444}.ls{background:#9ca3af}.lc{background:#a78bfa}
#main{display:flex;flex:1;overflow:hidden}
#graph-wrap{flex:1;position:relative;overflow:hidden}
#graph{width:100%;height:100%}
#detail{width:380px;background:#1e293b;border-left:1px solid #334155;display:none;flex-direction:column;overflow:hidden}
#detail.open{display:flex}
#detail-header{padding:12px 16px;border-bottom:1px solid #334155;display:flex;align-items:center;gap:8px}
#detail-title{font-size:13px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#close-btn{background:none;border:none;color:#64748b;cursor:pointer;font-size:18px;line-height:1;padding:2px 6px}
#close-btn:hover{color:#e2e8f0}
#detail-body{flex:1;overflow-y:auto;padding:14px 16px}
#detail-body pre{font-size:11px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:#cbd5e1}
#quality-bar{padding:10px 16px;border-top:1px solid #334155;background:#0f172a}
.qrow{display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:4px}
.qval{color:#e2e8f0;font-variant-numeric:tabular-nums}
#tooltip{position:fixed;background:#1e293b;border:1px solid #334155;border-radius:6px;padding:8px 10px;font-size:11px;color:#e2e8f0;pointer-events:none;display:none;z-index:100;max-width:220px;line-height:1.5}
.loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#64748b;font-size:14px}
</style>
</head>
<body>
<div id="toolbar">
  <h1>Cortex Knowledge Graph</h1>
  <span id="node-count"></span>
  <div id="legend">
    <div class="leg"><div class="leg-dot lg"></div>High quality (≥80%)</div>
    <div class="leg"><div class="leg-dot la"></div>Medium (50–80%)</div>
    <div class="leg"><div class="leg-dot lr"></div>Low (&lt;50%)</div>
    <div class="leg"><div class="leg-dot ls"></div>Stale</div>
    <div class="leg"><div class="leg-dot lc"></div>Concept</div>
  </div>
</div>
<div id="main">
  <div id="graph-wrap">
    <div class="loading" id="loading">Loading graph…</div>
    <svg id="graph"></svg>
  </div>
  <div id="detail">
    <div id="detail-header">
      <span id="detail-title"></span>
      <button id="close-btn">×</button>
    </div>
    <div id="detail-body"><pre id="detail-pre"></pre></div>
    <div id="quality-bar" id="quality-section" style="display:none">
      <div class="qrow"><span>Overall</span><span class="qval" id="q-overall"></span></div>
      <div class="qrow"><span>Evidence</span><span class="qval" id="q-evidence"></span></div>
      <div class="qrow"><span>Staleness</span><span class="qval" id="q-staleness"></span></div>
      <div class="qrow"><span>Age</span><span class="qval" id="q-age"></span></div>
      <div class="qrow"><span>Contradictions</span><span class="qval" id="q-contradiction"></span></div>
      <div class="qrow"><span>Human review</span><span class="qval" id="q-human"></span></div>
    </div>
  </div>
</div>
<div id="tooltip"></div>
<script>
(function(){
'use strict';

const COLOR = { green:'#22c55e', amber:'#f59e0b', red:'#ef4444', stale:'#9ca3af', concept:'#a78bfa' };
const STROKE = { green:'#16a34a', amber:'#d97706', red:'#dc2626', stale:'#6b7280', concept:'#7c3aed' };
const NODE_R = 14;
const IDEAL_LEN = 140;
const K_REP = 6000;
const K_SPRING = 0.008;
const DAMP = 0.82;
const MAX_ITER = 400;

let graph = null;
let positions = {};
let svg, W, H;

async function init() {
  svg = document.getElementById('graph');
  const wrap = document.getElementById('graph-wrap');
  W = wrap.clientWidth; H = wrap.clientHeight;
  svg.setAttribute('viewBox', \`0 0 \${W} \${H}\`);
  svg.setAttribute('width', W); svg.setAttribute('height', H);

  try {
    const res = await fetch('/api/graph');
    graph = await res.json();
  } catch(e) {
    document.getElementById('loading').textContent = 'Failed to load graph: ' + e.message;
    return;
  }

  document.getElementById('loading').style.display = 'none';
  document.getElementById('node-count').textContent =
    graph.nodes.length + ' entities · ' + graph.edges.length + ' edges';

  layout();
  render();
}

function layout() {
  const n = graph.nodes.length;
  if (n === 0) return;

  // Circle init
  graph.nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / n;
    const r = Math.min(W, H) * 0.3;
    positions[node.id] = {
      x: W/2 + r * Math.cos(angle),
      y: H/2 + r * Math.sin(angle),
      vx: 0, vy: 0
    };
  });

  // Force simulation
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let totalKE = 0;
    const ids = graph.nodes.map(n => n.id);

    // Repulsion between all pairs
    for (let i = 0; i < ids.length; i++) {
      for (let j = i+1; j < ids.length; j++) {
        const a = positions[ids[i]], b = positions[ids[j]];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
        const f = K_REP / (d * d);
        const fx = f * dx/d, fy = f * dy/d;
        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy += fy;
      }
    }

    // Spring along edges
    for (const e of graph.edges) {
      const a = positions[e.source], b = positions[e.target];
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
      const f = K_SPRING * (d - IDEAL_LEN);
      const fx = f * dx/d, fy = f * dy/d;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    // Gravity to center
    for (const id of ids) {
      const p = positions[id];
      p.vx += (W/2 - p.x) * 0.0008;
      p.vy += (H/2 - p.y) * 0.0008;
    }

    // Integrate
    for (const id of ids) {
      const p = positions[id];
      p.vx *= DAMP; p.vy *= DAMP;
      p.x = Math.max(NODE_R+2, Math.min(W-NODE_R-2, p.x + p.vx));
      p.y = Math.max(NODE_R+2, Math.min(H-NODE_R-2, p.y + p.vy));
      totalKE += p.vx*p.vx + p.vy*p.vy;
    }

    if (totalKE < 0.05) break;
  }
}

function render() {
  svg.innerHTML = '';

  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg','marker');
  marker.setAttribute('id','arrow');
  marker.setAttribute('viewBox','0 0 10 10');
  marker.setAttribute('refX','10');
  marker.setAttribute('refY','5');
  marker.setAttribute('markerWidth','6');
  marker.setAttribute('markerHeight','6');
  marker.setAttribute('orient','auto-start-reverse');
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d','M 0 0 L 10 5 L 0 10 z');
  path.setAttribute('fill','#475569');
  marker.appendChild(path);
  defs.appendChild(marker);
  svg.appendChild(defs);

  // Edges
  const nodeMap = new Map(graph.nodes.map(n=>[n.id,n]));
  const drawn = new Set();
  for (const e of graph.edges) {
    const key = e.source+'~'+e.target;
    if (drawn.has(key)) continue;
    drawn.add(key);
    const a = positions[e.source], b = positions[e.target];
    if (!a || !b) continue;

    // Shorten line to node radius
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
    const ox = (dx/d)*NODE_R, oy = (dy/d)*NODE_R;

    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1', a.x + ox);
    line.setAttribute('y1', a.y + oy);
    line.setAttribute('x2', b.x - ox);
    line.setAttribute('y2', b.y - oy);
    line.setAttribute('stroke','#334155');
    line.setAttribute('stroke-width','1.5');
    line.setAttribute('marker-end','url(#arrow)');
    if (e.kind === 'called_by') { line.setAttribute('stroke-dasharray','4 3'); }
    svg.appendChild(line);
  }

  // Nodes
  const tooltip = document.getElementById('tooltip');
  for (const node of graph.nodes) {
    const p = positions[node.id];
    if (!p) continue;

    const fillKey = node.isStale ? 'stale' : (node.type === 'concept' ? 'concept' : node.qualityColor);
    const fill = COLOR[fillKey];
    const stroke = STROKE[fillKey];

    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    g.style.cursor = 'pointer';

    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx', p.x);
    circle.setAttribute('cy', p.y);
    circle.setAttribute('r', NODE_R);
    circle.setAttribute('fill', fill);
    circle.setAttribute('stroke', stroke);
    circle.setAttribute('stroke-width', '2');

    const label = document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('x', p.x);
    label.setAttribute('y', p.y + NODE_R + 11);
    label.setAttribute('text-anchor','middle');
    label.setAttribute('font-size','10');
    label.setAttribute('fill','#94a3b8');
    label.setAttribute('pointer-events','none');
    const short = node.id.length > 18 ? node.id.slice(0,16)+'…' : node.id;
    label.textContent = short;

    g.appendChild(circle);
    g.appendChild(label);

    // Hover tooltip
    g.addEventListener('mouseenter', (ev) => {
      const pct = n => Math.round(n * 100) + '%';
      let tip = '<strong>' + escHtml(node.id) + '</strong>';
      if (node.type === 'entity') {
        tip += '<br>Quality: ' + pct(node.qualityScore);
        if (node.isStale) tip += ' <span style="color:#f87171">[STALE]</span>';
        tip += '<br>Evidence: ' + pct(node.qualityBreakdown.evidenceFreshness);
        tip += '  Age: ' + pct(node.qualityBreakdown.age);
        tip += '<br>Human review: ' + pct(node.qualityBreakdown.humanReview);
      } else {
        tip += '<br><em>concept</em>';
      }
      if (node.sourceFile) tip += '<br><span style="color:#64748b;font-size:10px">' + escHtml(node.sourceFile) + '</span>';
      tooltip.innerHTML = tip;
      tooltip.style.display = 'block';
      moveTooltip(ev);
    });
    g.addEventListener('mousemove', moveTooltip);
    g.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

    // Click → open detail
    g.addEventListener('click', () => openDetail(node));

    svg.appendChild(g);
  }
}

function moveTooltip(ev) {
  const tt = document.getElementById('tooltip');
  tt.style.left = (ev.clientX + 14) + 'px';
  tt.style.top  = (ev.clientY - 10) + 'px';
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function openDetail(node) {
  const panel = document.getElementById('detail');
  const title = document.getElementById('detail-title');
  const pre   = document.getElementById('detail-pre');
  const qsec  = document.getElementById('quality-bar');

  title.textContent = node.id;
  pre.textContent = 'Loading…';
  panel.classList.add('open');

  const ep = node.type === 'entity' ? '/api/entity/' : '/api/concept/';
  try {
    const res = await fetch(ep + encodeURIComponent(node.id));
    pre.textContent = res.ok ? (await res.text()) : '(not found)';
  } catch(e) {
    pre.textContent = 'Error: ' + e.message;
  }

  // Quality breakdown footer (entities only)
  if (node.type === 'entity') {
    const pct = n => Math.round(n * 100) + '%';
    document.getElementById('q-overall').textContent    = pct(node.qualityScore);
    document.getElementById('q-evidence').textContent   = pct(node.qualityBreakdown.evidenceFreshness);
    document.getElementById('q-staleness').textContent  = pct(node.qualityBreakdown.staleness);
    document.getElementById('q-age').textContent        = pct(node.qualityBreakdown.age);
    document.getElementById('q-contradiction').textContent = pct(node.qualityBreakdown.contradiction);
    document.getElementById('q-human').textContent      = pct(node.qualityBreakdown.humanReview);
    qsec.style.display = '';
  } else {
    qsec.style.display = 'none';
  }
}

document.getElementById('close-btn').addEventListener('click', () => {
  document.getElementById('detail').classList.remove('open');
});

init();
})();
</script>
</body>
</html>`;
