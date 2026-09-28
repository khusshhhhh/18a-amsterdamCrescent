// Builds the dwelling from data.js: walls + openings, windows, doors, floors,
// ceilings, columns, bulkheads, roof and wet-area linings.
import * as THREE from 'three';
import { Batch } from './batch.js';
import { M } from './materials.js';
import { buildHipRoof, offsetOrtho, pointInPoly } from './roof.js';
import { WALLS, COLUMNS, BULKHEADS, OUTLINE, HOUSE_OUTLINE, RAISED_CEILINGS, ROOMS, ROBES, H, LEVEL } from './data.js';

const k = v => v / 1000;

export const colliders = [];      // {x1,y1,x2,y2 (mm), y0,y1h (mm)} static
export const doors = [];          // dynamic doors
export const interactables = [];  // {mesh, label, action, get hint()}

function addCollider(x1, y1, x2, y2, h0, h1, tag) {
  colliders.push({ x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2), h0, h1, tag });
}

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------
function wallFrame(w) {
  const [x1, y1, x2, y2] = w.rect;
  const horiz = (x2 - x1) >= (y2 - y1);
  return {
    horiz,
    L0: horiz ? x1 : y1, L1: horiz ? x2 : y2,
    T0: horiz ? y1 : x1, T1: horiz ? y2 : x2,
  };
}

// map (along, thick) mm → world box
function wbox(batch, f, a0, a1, t0, t1, h0, h1, faces) {
  if (f.horiz) batch.box(k(a0), k(h0), k(t0), k(a1), k(h1), k(t1), faces);
  else batch.box(k(t0), k(h0), k(a0), k(t1), k(h1), k(a1), faces);
}

// Face map from wall-relative names: longA = T0 side, longB = T1 side, endA = L0 end, endB = L1 end
function F(f, longA, longB, endA, endB, top = 'poche', bottom = 'plaster') {
  return f.horiz
    ? { nz: longA, pz: longB, nx: endA, px: endB, py: top, ny: bottom }
    : { nx: longA, px: longB, nz: endA, pz: endB, py: top, ny: bottom };
}
function longFaces(w) {
  return [(w.ext === 'N' || w.ext === 'W') ? 'hp1' : 'plaster', (w.ext === 'S' || w.ext === 'E') ? 'hp1' : 'plaster'];
}
function wallFaces(w, f, { endA = null, endB = null } = {}) {
  const end = w.kind === 'ext' ? 'hp1' : 'plaster';
  const [LA, LB] = longFaces(w);
  return F(f, LA, LB, endA || end, endB || end);
}

function buildWalls(batch, glassBatch) {
  for (const w of WALLS) {
    const f = wallFrame(w);
    const top = w.h, base = w.kind === 'header' ? H.arch : w.base;
    const ops = [...(w.openings || [])].sort((p, q) => p.a - q.a);
    let cur = f.L0;
    const jambKey = 'plaster';
    const segs = [];
    for (const op of ops) {
      if (op.a > cur) segs.push({ a: cur, b: op.a, h0: base, h1: top, endA: segs.length === 0 && cur === f.L0 ? null : jambKey, endB: jambKey });
      if (op.sill > base + 1) segs.push({ a: op.a, b: op.b, h0: base, h1: op.sill, endA: jambKey, endB: jambKey, sill: true });
      if (op.head < top - 1) segs.push({ a: op.a, b: op.b, h0: op.head, h1: top, endA: jambKey, endB: jambKey });
      cur = op.b;
    }
    if (cur < f.L1) segs.push({ a: cur, b: f.L1, h0: base, h1: top, endA: ops.length ? jambKey : null, endB: null });

    for (const s of segs) {
      // niche (recess) splitting
      const n = w.niche;
      if (n && s.h0 === base && s.h1 === top && n.x - n.w / 2 > s.a && n.x + n.w / 2 < s.b) {
        const na = n.x - n.w / 2, nb = n.x + n.w / 2, depth = w.kind === 'nib' ? 45 : 70;
        const [LA, LB] = longFaces(w);
        const endDef = w.kind === 'ext' ? 'hp1' : 'plaster';
        const onA = n.side === 'N' || n.side === 'W';
        wbox(batch, f, s.a, na, f.T0, f.T1, s.h0, s.h1, F(f, LA, LB, s.endA || endDef, 'plaster'));
        wbox(batch, f, nb, s.b, f.T0, f.T1, s.h0, s.h1, F(f, LA, LB, 'plaster', s.endB || endDef));
        wbox(batch, f, na, nb, f.T0, f.T1, s.h0, n.sill, F(f, LA, LB, null, null, 'plaster', 'plaster'));
        wbox(batch, f, na, nb, f.T0, f.T1, n.sill + n.h, s.h1, F(f, LA, LB, null, null, 'poche', 'plaster'));
        const t0 = onA ? f.T0 + depth : f.T0, t1 = onA ? f.T1 : f.T1 - depth;
        wbox(batch, f, na, nb, t0, t1, n.sill, n.sill + n.h, F(f, onA ? null : LA, onA ? LB : null, null, null, null, null));
        // niche back gets a feature tile
        if (onA) wbox(batch, f, na, nb, t0 - 4, t0, n.sill, n.sill + n.h, 'featureTile');
        else wbox(batch, f, na, nb, t1, t1 + 4, n.sill, n.sill + n.h, 'featureTile');
        addCollider(...(f.horiz ? [s.a, f.T0, s.b, f.T1] : [f.T0, s.a, f.T1, s.b]), s.h0, s.h1, w.id);
        continue;
      }
      wbox(batch, f, s.a, s.b, f.T0, f.T1, s.h0, s.h1, wallFaces(w, f, { endA: s.endA, endB: s.endB }));
      if (f.horiz) addCollider(s.a, f.T0, s.b, f.T1, s.h0, s.h1, w.id);
      else addCollider(f.T0, s.a, f.T1, s.b, s.h0, s.h1, w.id);
    }

    // openings
    for (const op of ops) {
      if (op.type === 'win') buildWindow(batch, glassBatch, w, f, op);
      else if (op.type === 'door') buildHingedDoor(batch, w, f, op);
      else if (op.type === 'slider') buildSlider(batch, w, f, op);
      else if (op.type === 'pld') buildPanelLift(w, f, op);
      else if (op.type === 'arch') { /* flat arch: plaster reveals only */ }
    }
  }
}

// ---------------------------------------------------------------------------
// Windows (static)
// ---------------------------------------------------------------------------
function buildWindow(batch, glassBatch, w, f, op) {
  const tc = (f.T0 + f.T1) / 2;
  const fw = 45, fd = 60, a = op.a, b = op.b, s = op.sill, h = op.head;
  const glassKey = op.obscure ? 'obscure' : 'glass';
  const fr = (a0, a1, h0, h1, d0 = tc - fd / 2, d1 = tc + fd / 2) => wbox(batch, f, a0, a1, d0, d1, h0, h1, 'frame');
  const gl = (a0, a1, h0, h1, dz = 0) => wbox(glassBatch, f, a0, a1, tc + dz - 3, tc + dz + 3, h0, h1, glassKey);
  // outer frame
  fr(a, a + fw, s, h); fr(b - fw, b, s, h); fr(a, b, s, s + fw); fr(a, b, h - fw, h);
  // external sill flashing
  const outSide = w.ext === 'N' || w.ext === 'W' ? -1 : 1;
  const sillD0 = outSide < 0 ? f.T0 - 25 : tc, sillD1 = outSide < 0 ? tc : f.T1 + 25;
  if (w.kind === 'ext') wbox(batch, f, a - 10, b + 10, sillD0, sillD1, s - 25, s, 'frame');
  const wid = b - a, ai = a + fw, bi = b - fw, si = s + fw, hi = h - fw;
  if (op.style === 'AFW') {
    gl(ai, bi, si, hi);
  } else if (op.style === 'ASW') {
    const m = (a + b) / 2;
    fr(m - 22, m + 22, si, hi, tc - fd / 2, tc + fd / 2);
    // sashes: slight depth offset (two tracks)
    fr(ai, m - 22, si, si + 35, tc - 25, tc - 5); fr(ai, m - 22, hi - 35, hi, tc - 25, tc - 5);
    fr(m + 22, bi, si, si + 35, tc + 5, tc + 25); fr(m + 22, bi, hi - 35, hi, tc + 5, tc + 25);
    gl(ai, m - 22, si + 35, hi - 35, -15); gl(m + 22, bi, si + 35, hi - 35, 15);
  } else { // AAW – awning: mullion + transom
    const tr = s + (h - s) * 0.35;
    fr(ai, bi, tr - 20, tr + 20);
    if (wid > 1000) {
      const m = (a + b) / 2;
      fr(m - 20, m + 20, si, hi);
      gl(ai, m - 20, si, tr - 20); gl(m + 20, bi, si, tr - 20); gl(ai, m - 20, tr + 20, hi); gl(m + 20, bi, tr + 20, hi);
    } else {
      gl(ai, bi, si, tr - 20); gl(ai, bi, tr + 20, hi);
    }
  }
}

// ---------------------------------------------------------------------------
// Doors
// ---------------------------------------------------------------------------
class Door {
  constructor({ pivot, meshes, kind, label, closedAngle = 0, openAngle = Math.PI / 2, collider, update, startOpen = 0 }) {
    this.pivot = pivot; this.meshes = meshes; this.kind = kind; this.label = label;
    this.closedAngle = closedAngle; this.openAngle = openAngle; this.collider = collider;
    this.t = startOpen; this.target = startOpen; this._update = update;
    this.apply();
    for (const m of meshes) {
      m.userData.door = this;
      interactables.push({ mesh: m, action: () => this.toggle(), get hint() { return `${this.door.target > 0.5 ? 'Close' : 'Open'} ${this.door.label}`; }, door: this });
    }
  }
  toggle() { this.target = this.target > 0.5 ? 0 : 1; }
  isClosed() { return this.t < 0.15; }
  apply() {
    if (this._update) this._update(this.t);
    else this.pivot.rotation.y = this.closedAngle + (this.openAngle - this.closedAngle) * ease(this.t);
  }
  step(dt) {
    if (this.t === this.target) return;
    const speed = this.kind === 'pld' ? 0.35 : 1.6;
    this.t += Math.sign(this.target - this.t) * Math.min(Math.abs(this.target - this.t), dt * speed);
    this.apply();
  }
}
const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

export const dynamicGroup = new THREE.Group();
dynamicGroup.name = 'dynamic';

function leafMesh(w, h, t, key, style) {
  const g = new THREE.Group();
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), M(key));
  leaf.position.set(w / 2, h / 2, 0);
  leaf.castShadow = true; leaf.receiveShadow = true;
  g.add(leaf);
  const meshes = [leaf];
  if (style === 'ED') {
    // vertical glass strip + long pull handle
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, h - 0.5, t + 0.004), M('glass'));
    strip.position.set(0.18, h / 2, 0); g.add(strip);
    for (const s of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.2, 0.03), M('black'));
      bar.position.set(w - 0.12, 1.05, s * (t / 2 + 0.06)); g.add(bar);
      for (const yy of [0.5, 1.6]) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.06), M('black'));
        st.position.set(w - 0.12, yy, s * (t / 2 + 0.03)); g.add(st);
      }
    }
  } else {
    for (const s of [-1, 1]) {
      const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 16), M('black'));
      rose.rotation.x = Math.PI / 2; rose.position.set(w - 0.065, 1.0, s * (t / 2 + 0.006)); g.add(rose);
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.018, 0.018), M('black'));
      lever.position.set(w - 0.11, 1.0, s * (t / 2 + 0.05)); g.add(lever);
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.05), M('black'));
      neck.position.set(w - 0.065, 1.0, s * (t / 2 + 0.028)); g.add(neck);
    }
  }
  return { group: g, meshes };
}

function buildHingedDoor(batch, w, f, op) {
  const Wd = op.b - op.a;
  const leafW = op.style === 'ED' ? 1020 : 820;
  const jamb = (Wd - leafW) / 2 - 2;
  const head = op.head, t0 = f.T0, t1 = f.T1, tc = (t0 + t1) / 2;
  // jamb liners + head
  wbox(batch, f, op.a, op.a + jamb, t0, t1, 0, head, 'architrave');
  wbox(batch, f, op.b - jamb, op.b, t0, t1, 0, head, 'architrave');
  wbox(batch, f, op.a, op.b, t0, t1, head - 30, head, 'architrave');
  // architraves on interior faces
  const sides = w.kind === 'ext' ? [w.ext === 'N' || w.ext === 'W' ? 'T1' : 'T0'] : ['T0', 'T1'];
  for (const sd of sides) {
    const d0 = sd === 'T0' ? t0 - 16 : t1, d1 = sd === 'T0' ? t0 : t1 + 16;
    wbox(batch, f, op.a - 60, op.a + 10, d0, d1, 0, head + 60, 'architrave');
    wbox(batch, f, op.b - 10, op.b + 60, d0, d1, 0, head + 60, 'architrave');
    wbox(batch, f, op.a - 60, op.b + 60, d0, d1, head, head + 60, 'architrave');
  }
  const key = op.style === 'ED' ? 'entry' : op.style === 'HD' ? 'hd' : 'intDoor';
  const lh = (head - 30 - 12) / 1000;
  const { group, meshes } = leafMesh(leafW / 1000, lh, 0.038, key, op.style);
  group.position.y = 0.008;
  const pivot = new THREE.Group();
  const hingeAlong = op.hinge === 'a' ? op.a + jamb + 2 : op.b - jamb - 2;
  const px = f.horiz ? k(hingeAlong) : k(tc), pz = f.horiz ? k(tc) : k(hingeAlong);
  pivot.position.set(px, 0, pz);
  pivot.add(group);
  dynamicGroup.add(pivot);
  const u = f.horiz ? [op.hinge === 'a' ? 1 : -1, 0] : [0, op.hinge === 'a' ? 1 : -1];
  const sdir = f.horiz ? [0, op.swing] : [op.swing, 0];
  const ang = v => Math.atan2(v[1], v[0]);
  const base = -ang(u);
  let open = -(ang(sdir) - ang(u));
  while (open > Math.PI) open -= 2 * Math.PI;
  while (open < -Math.PI) open += 2 * Math.PI;
  const coll = f.horiz ? { x1: op.a, y1: tc - 25, x2: op.b, y2: tc + 25 } : { x1: tc - 25, y1: op.a, x2: tc + 25, y2: op.b };
  const d = new Door({ pivot, meshes, kind: 'hinge', label: op.label || 'door', closedAngle: base, openAngle: base + open * 0.95, collider: { ...coll, h0: 0, h1: head }, startOpen: op.style === 'ED' || op.style === 'HD' ? 0 : 1 });
  d.id = op.id;
  doors.push(d);
}

function buildSlider(batch, w, f, op) {
  // 2.4 x 3.048W aluminium sliding door (ASD): left panel fixed (outer track), right panel slides.
  const tc = (f.T0 + f.T1) / 2, a = op.a, b = op.b, h = op.head;
  const fr = (a0, a1, h0, h1, d0, d1) => wbox(batch, f, a0, a1, d0, d1, h0, h1, 'frame');
  fr(a, a + 50, 0, h, tc - 40, tc + 40); fr(b - 50, b, 0, h, tc - 40, tc + 40);
  fr(a, b, h - 50, h, tc - 40, tc + 40); fr(a, b, 0, 20, tc - 40, tc + 40);
  const pw = (b - a - 100) / 2 + 30;
  const makePanel = (glassKey = 'glass') => {
    const g = new THREE.Group();
    const W = pw / 1000, Hh = (h - 70) / 1000;
    const parts = [[W, 0.05, 0, Hh - 0.025], [W, 0.07, 0, 0.035], [0.05, Hh, -W / 2 + 0.025, Hh / 2], [0.05, Hh, W / 2 - 0.025, Hh / 2]];
    for (const [pw2, ph, x, y] of parts) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(pw2, ph, 0.035), M('frame'));
      m.position.set(x, y, 0); m.castShadow = true; g.add(m);
    }
    const gl = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, Hh - 0.12, 0.008), M(glassKey));
    gl.position.set(0, Hh / 2, 0); g.add(gl);
    return g;
  };
  const fixed = makePanel(), slide = makePanel();
  const along0 = a + 50 + pw / 2, along1 = b - 50 - pw / 2;
  const outer = w.ext === 'N' || w.ext === 'W' ? -1 : 1;
  const place = (g, along, dz) => {
    if (f.horiz) { g.position.set(k(along), 0.02, k(tc + dz)); }
    else { g.position.set(k(tc + dz), 0.02, k(along)); g.rotation.y = Math.PI / 2; }
  };
  place(fixed, along0, outer * 18);
  place(slide, along1, -outer * 18);
  dynamicGroup.add(fixed, slide);
  const meshes = [];
  slide.traverse(o => { if (o.isMesh) meshes.push(o); });
  const coll = f.horiz ? { x1: a, y1: tc - 40, x2: b, y2: tc + 40 } : { x1: tc - 40, y1: a, x2: tc + 40, y2: b };
  const d = new Door({
    pivot: slide, meshes, kind: 'slide', label: 'sliding door (ASD)', collider: { ...coll, h0: 0, h1: h },
    update: t => { const al = along1 + (along0 - along1) * ease(t) * 0.97; place(slide, al, -outer * 18); },
  });
  d.openCollider = f.horiz ? { x1: a, y1: tc - 40, x2: (a + b) / 2, y2: tc + 40, h0: 0, h1: h } : { x1: tc - 40, y1: a, x2: tc + 40, y2: (a + b) / 2, h0: 0, h1: h };
  d.id = op.id;
  doors.push(d);
}

function buildPanelLift(w, f, op) {
  // Sectional Colorbond panel-lift door (Basalt) running on a vertical → curved → horizontal track.
  const x0 = k(f.T0) - 0.03; // inside face of the garage wall
  const zc = k((op.a + op.b) / 2), W = k(op.b - op.a) - 0.02;
  const bottom = k(op.sill), top = k(op.head);
  const n = 5, ph = (top - bottom) / n, r = 0.28, Lv = top - bottom;
  const group = new THREE.Group();
  dynamicGroup.add(group);
  const panels = [], meshes = [];
  for (let i = 0; i < n; i++) {
    const p = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, ph - 0.008, W), M('pld'));
    body.castShadow = true; body.receiveShadow = true;
    p.add(body);
    // pressed ribs
    for (const dy of [-ph / 4, ph / 4]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, W), M('pld'));
      rib.position.set(0.022, dy, 0); p.add(rib);
    }
    group.add(p); panels.push(p); meshes.push(body);
  }
  const trackPt = s => {
    if (s <= Lv) return [x0, bottom + s, 0, 1];
    const arc = Math.PI * r / 2;
    if (s <= Lv + arc) { const al = (s - Lv) / r; return [x0 - r + r * Math.cos(al), top + r * Math.sin(al), -Math.sin(al), Math.cos(al)]; }
    return [x0 - r - (s - Lv - arc), top + r, -1, 0];
  };
  const update = t => {
    for (let i = 0; i < n; i++) {
      const s = (i + 0.5) * ph + ease(t) * (Lv + 0.05);
      const [x, y, tx, ty] = trackPt(s);
      panels[i].position.set(x, y, zc);
      panels[i].rotation.set(0, 0, Math.atan2(-tx, ty));
    }
  };
  const d = new Door({ pivot: group, meshes, kind: 'pld', label: 'panel lift door (PLD)', update, collider: { x1: op.a > 0 ? f.T0 : 0, y1: op.a, x2: f.T1, y2: op.b, h0: op.sill, h1: op.head } });
  d.collider = { x1: f.T0 - 60, y1: op.a, x2: f.T0 + 20, y2: op.b, h0: op.sill, h1: op.head };
  d.id = op.id;
  doors.push(d);
  // track rails
  const railMat = M('steel');
  for (const side of [-1, 1]) {
    const z = zc + side * (W / 2 + 0.03);
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.04, Lv, 0.03), railMat); v.position.set(x0 - 0.02, bottom + Lv / 2, z);
    const hz = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.03, 0.04), railMat); hz.position.set(x0 - r - 1.4, top + r, z);
    group.add(v, hz);
  }
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.25), M('plastic'));
  motor.position.set(x0 - 3.1, top + r - 0.02, zc);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.04, 0.05), M('steel')); rail.position.set(x0 - 1.6, top + r + 0.02, zc);
  group.add(motor, rail);
}

// ---------------------------------------------------------------------------
// Robes (sliding doors)
// ---------------------------------------------------------------------------
function buildRobes(batch) {
  for (const r of ROBES) {
    const [x1, y1, x2, y2] = r.rect;
    const alongZ = r.front === 'W' || r.front === 'E';
    const frontX = r.front === 'W' ? x1 : x2;
    const a = y1, b = y2, L = b - a;
    // bulkhead over robe front 2100–2700
    batch.box(k(frontX - 45), k(2100), k(a), k(frontX + 45), k(2700), k(b), { px: 'plaster', nx: 'plaster', ny: 'plaster', py: 'poche', pz: null, nz: null });
    // shelf + rail inside
    const inner0 = r.front === 'W' ? frontX + 50 : x1, inner1 = r.front === 'W' ? x2 : frontX - 50;
    batch.box(k(inner0), k(1700), k(a), k(inner1), k(1720), k(b), 'cabinet');
    batch.box(k((inner0 + inner1) / 2 - 10), k(1600), k(a + 20), k((inner0 + inner1) / 2 + 10), k(1620), k(b - 20), 'chrome');
    addCollider(x1, y1, x2, y2, 0, 2700, 'robe');
    // two sliding panels (mirror / white)
    const pw = L / 2 + 30;
    const mk = (key, dz) => {
      const g = new THREE.Group();
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 2.08, k(pw)), M(key));
      panel.position.set(0, 1.05, 0); panel.castShadow = true; g.add(panel);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.036, 2.08, 0.025), M('frame'));
      edge.position.set(0, 1.05, k(pw) / 2 - 0.012); g.add(edge);
      const edge2 = edge.clone(); edge2.position.z = -k(pw) / 2 + 0.012; g.add(edge2);
      g.position.set(k(frontX + dz), 0.01, 0);
      dynamicGroup.add(g);
      return { g, panel };
    };
    const outerSign = r.front === 'W' ? -1 : 1;
    const p1 = mk('mirror', outerSign * 20), p2 = mk('cabinet', -outerSign * 20);
    const zA = k(a + pw / 2), zB = k(b - pw / 2);
    p1.g.position.z = zA; p2.g.position.z = zB;
    const d = new Door({
      pivot: p2.g, meshes: [p1.panel, p2.panel], kind: 'robe', label: 'robe doors (' + r.name + ')',
      update: t => { p2.g.position.z = zB + (zA - zB) * ease(t) * 0.95; },
    });
    d.noCollide = true;
    doors.push(d);
  }
}

// ---------------------------------------------------------------------------
// Columns, bulkheads
// ---------------------------------------------------------------------------
function buildColumnsBulkheads(batch, upper) {
  for (const c of COLUMNS) {
    const [x1, y1, x2, y2] = c.rect;
    batch.box(k(x1), k(c.base ?? -150), k(y1), k(x2), k(c.h), k(y2), { px: 'hp2', nx: 'hp2', pz: 'hp2', nz: 'hp2', py: 'poche', ny: 'hp2' });
    addCollider(x1, y1, x2, y2, c.base ?? -150, c.h, 'column');
  }
  for (const b of BULKHEADS) {
    const [x1, y1, x2, y2] = b.rect;
    upper.box(k(x1), k(b.bottom), k(y1), k(x2), k(b.top), k(y2), { px: b.type, nx: b.type, pz: b.type, nz: b.type, ny: b.type, py: null });
  }
}

// ---------------------------------------------------------------------------
// Floors
// ---------------------------------------------------------------------------
const P_BASE = [[-11, 1990], [8416, 1990], [8416, 790], [10406, 790], [10406, 6405], [13490, 6405], [13490, 11466], [9900, 11466], [9900, 12865], [6409, 12865], [6409, 13365], [3899, 13365], [3899, 14446], [-11, 14446]];
const toM = pts => pts.map(p => [k(p[0]), k(p[1])]);

function buildFloors(batch) {
  batch.poly('floor_living', toM(P_BASE), 0, true);
  // garage slab
  batch.box(k(10406), k(-250), k(790), k(16396), k(LEVEL.garage), k(6596), { py: 'garageFloor', px: 'paving' });
  // alfresco + porch slabs (50mm floor drop) with slab edges
  batch.box(k(-11), k(-230), k(0), k(4500), k(LEVEL.alfresco), k(1990), { py: 'floor_outdoor', nz: 'paving', nx: 'paving', px: 'paving' });
  batch.box(k(3520), k(-230), k(13365), k(6409), k(LEVEL.porch), k(14965), { py: 'floor_outdoor', pz: 'paving', px: 'paving', nx: 'paving' });
  // porch step down to path
  batch.box(k(4400), k(-240), k(14965), k(5700), k(-100), k(15300), { py: 'paving', pz: 'paving', px: 'paving', nx: 'paving' });
  const zoneKey = { bedroom: 'floor_bedroom', wetTile: 'floor_wet' };
  for (const r of ROOMS) {
    const key = zoneKey[r.floor];
    if (!key) continue;
    for (const [x1, y1, x2, y2] of r.rects) batch.poly(key, toM([[x1, y1], [x2, y1], [x2, y2], [x1, y2]]), 0.006, true);
  }
  // door thresholds for bedrooms / wet areas sit on the base floor (fine)
}

// Floor level function (mm) for the walk controller
export function houseLevelAt(x, y) {
  if (x >= 3520 && x <= 6409 && y >= 13365 && y <= 14965) return LEVEL.porch;
  if (x >= 4400 && x <= 5700 && y > 14965 && y <= 15300) return -100;
  if (x >= -11 && x <= 4500 && y >= 0 && y < 1990) return LEVEL.alfresco;
  if (x >= 10406 && x <= 16396 && y >= 790 && y <= 6596) return LEVEL.garage;
  if (pointInPoly(x, y, P_BASE)) return 0;
  return null;
}

// ---------------------------------------------------------------------------
// Ceilings & soffits
// ---------------------------------------------------------------------------
export const EAVE_OUTLINE = offsetOrtho(OUTLINE, H.eave);

function buildCeilings(upper) {
  const holes = RAISED_CEILINGS.map(r => { const [x1, y1, x2, y2] = r.rect; return toM([[x1, y1], [x1, y2], [x2, y2], [x2, y1]]); });
  upper.poly('ceiling', toM(EAVE_OUTLINE), k(H.soffit), false, holes);
  for (const r of RAISED_CEILINGS) {
    const [x1, y1, x2, y2] = r.rect.map(k);
    upper.poly('ceiling', [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], k(H.raised), false);
    const y0 = k(H.ceiling), yh = k(H.raised);
    // tray sides facing inward (strip faces the (−dz, dx) side of a→b)
    upper.strip('ceiling', [x1, y1], [x2, y1], y0, yh);
    upper.strip('ceiling', [x2, y2], [x1, y2], y0, yh);
    upper.strip('ceiling', [x1, y2], [x1, y1], y0, yh);
    upper.strip('ceiling', [x2, y1], [x2, y2], y0, yh);
  }
}

// ---------------------------------------------------------------------------
// Wet-area linings (tiles)
// ---------------------------------------------------------------------------
function buildLinings(batch) {
  const T = 8;
  const lin = (x1, y1, x2, y2, h0, h1, key = 'wallTile') => batch.box(k(x1), k(h0), k(y1), k(x2), k(h1), k(y2), key);
  // Ensuite shower (1000 x 1000) – full height feature tile
  lin(180, 8966, 180 + T, 9967, 0, 2400, 'featureTile');
  lin(180, 8966, 1179, 8966 + T, 0, 2400, 'featureTile');
  lin(1179 - T, 8966, 1179, 9466, 0, 2100, 'featureTile');
  lin(180, 9967 - T, 950, 9967, 0, 2100, 'featureTile');
  // Ensuite vanity splashback + skirting tiles
  lin(1270, 8966, 2191, 8966 + T, 850, 1250);
  // Bath shower (1.7 x 0.9)
  lin(8604, 6295, 8604 + T, 7195, 0, 2400, 'featureTile');
  lin(8604, 6295, 10315, 6295 + T, 0, 2400, 'featureTile');
  lin(8604, 7195 - T, 10315, 7195, 0, 2100, 'featureTile');
  // Bath: behind tub (east wall, below window sill) and tub end wall
  lin(13301 - T, 6496, 13301, 8185, 0, 1300);
  lin(12530, 6496, 13301, 6496 + T, 0, 1300);
  lin(8604, 7286, 8604 + T, 8185, 850, 1250);
  // Laundry splashback
  lin(10315 - T, 980, 10315, 1600, 900, 1500);
  // Kitchen splashback below the AFW window & beside it
  lin(4950, 2180, 5177, 2180 + T, 900, 1650, 'splashback');
  lin(7228, 2180, 7420, 2180 + T, 900, 1650, 'splashback');
  lin(5177, 2180, 7228, 2180 + T, 900, 1000, 'splashback');
}

// ---------------------------------------------------------------------------
export function buildHouse() {
  const structure = new Batch('structure');
  const glass = new Batch('glass');
  const upper = new Batch('ceiling');
  buildWalls(structure, glass);
  buildColumnsBulkheads(structure, upper);
  buildFloors(structure);
  buildCeilings(upper);
  buildLinings(structure);
  buildRobes(structure);

  const structGroup = structure.build();
  const glassGroup = glass.build({ castShadow: false, receiveShadow: false });
  glassGroup.traverse(o => { if (o.isMesh) o.renderOrder = 2; });
  const ceilingGroup = upper.build({ castShadow: true });

  const eaveM = toM(EAVE_OUTLINE);
  const roof = buildHipRoof(eaveM, { eaveY: k(H.eaveLevel), pitchDeg: H.pitchDeg });

  return { structGroup, glassGroup, ceilingGroup, roof, dynamicGroup };
}

// ---------------------------------------------------------------------------
// Helpers for other modules
// ---------------------------------------------------------------------------
export function roomAt(x, y) {
  for (const r of ROOMS) for (const [x1, y1, x2, y2] of r.rects) if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return r;
  return null;
}

// Snap a plan point to the nearest wall face. Returns metres + outward normal.
export function snapToWall(x, y, { prefer = null } = {}) {
  let best = null;
  for (const w of WALLS) {
    const [x1, y1, x2, y2] = w.rect;
    const horiz = (x2 - x1) >= (y2 - y1);
    const faces = horiz
      ? [{ c: y1, n: [0, -1], lo: x1, hi: x2, along: x, d: Math.abs(y - y1) }, { c: y2, n: [0, 1], lo: x1, hi: x2, along: x, d: Math.abs(y - y2) }]
      : [{ c: x1, n: [-1, 0], lo: y1, hi: y2, along: y, d: Math.abs(x - x1) }, { c: x2, n: [1, 0], lo: y1, hi: y2, along: y, d: Math.abs(x - x2) }];
    for (const f of faces) {
      if (f.along < f.lo - 30 || f.along > f.hi + 30) continue;
      // must be on the outside of the wall on that face
      const side = horiz ? (y - f.c) * f.n[1] : (x - f.c) * f.n[0];
      if (side < -60) continue;
      if (w.kind === 'nib' && prefer === 'full') continue;
      if (!best || f.d < best.d) {
        best = { d: f.d, x: horiz ? Math.min(Math.max(x, f.lo + 40), f.hi - 40) : f.c, y: horiz ? f.c : Math.min(Math.max(y, f.lo + 40), f.hi - 40), n: f.n, wall: w };
      }
    }
  }
  for (const c of [...COLUMNS]) {
    const [x1, y1, x2, y2] = c.rect;
    const cands = [{ x: Math.min(Math.max(x, x1), x2), y: y2, n: [0, 1], d: Math.abs(y - y2) }, { x: Math.min(Math.max(x, x1), x2), y: y1, n: [0, -1], d: Math.abs(y - y1) }];
    for (const f of cands) if (x >= x1 - 50 && x <= x2 + 50 && (!best || f.d < best.d)) best = { ...f, wall: null };
  }
  return best;
}
