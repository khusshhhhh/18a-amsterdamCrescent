// Site (sheet 01): boundary, paving, lawns, streets, fences, trees, neighbours.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch } from './batch.js';
import { M } from './materials.js';
import { SITE } from './data.js';
import { buildHipRoof, pointInPoly, signedArea } from './roof.js';
import { colliders } from './house.js';

const k = v => v / 1000;
const Y = { ground: -0.24, road: -0.225, kerbTop: -0.11, verge: -0.19, footpath: -0.175, paving: -0.15, lawn: -0.125, path: -0.148, crossover: -0.16 };

export const segColliders = []; // {a:[x,y], b:[x,y], r, h0, h1} (mm)

// polyline offset (mm) with miter joins; side = +1 outward (relative to site polygon orientation)
function offsetLine(pts, d, ccw) {
  const out = [];
  const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return ccw ? [dy / L, -dx / L] : [-dy / L, dx / L]; };
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const n1 = i > 0 ? nrm(pts[i - 1], p) : nrm(p, pts[i + 1]);
    const n2 = i < pts.length - 1 ? nrm(p, pts[i + 1]) : n1;
    let mx = n1[0] + n2[0], my = n1[1] + n2[1];
    const ml = Math.hypot(mx, my); mx /= ml; my /= ml;
    const c = mx * n1[0] + my * n1[1];
    out.push([p[0] + mx * d / c, p[1] + my * d / c]);
  }
  return out;
}

function ribbon(batch, line, d0, d1, y, key, ccw, polys, level) {
  const A = offsetLine(line, d0, ccw), Bv = offsetLine(line, d1, ccw);
  for (let i = 0; i < line.length - 1; i++) {
    const quad = [A[i], A[i + 1], Bv[i + 1], Bv[i]];
    batch.poly(key, quad.map(p => [k(p[0]), k(p[1])]), y, true);
    polys.push({ poly: quad, level });
  }
  return { A, B: Bv };
}

const blobGeoCache = new Map();
function blobGeo(seed) {
  if (blobGeoCache.has(seed)) return blobGeoCache.get(seed);
  let geo = new THREE.IcosahedronGeometry(1, 3);
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  geo = mergeVertices(geo);
  const p = geo.attributes.position;
  let s = seed * 97 + 13;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const bumps = Array.from({ length: 6 }, () => [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1, 0.1 + rnd() * 0.15]);
  for (let v = 0; v < p.count; v++) {
    const vx = p.getX(v), vy = p.getY(v), vz = p.getZ(v);
    let f = 1;
    for (const [bx, by, bz, a] of bumps) f += a * Math.max(0, vx * bx + vy * by + vz * bz);
    f += (rnd() - 0.5) * 0.12;
    p.setXYZ(v, vx * f, vy * f * 0.85, vz * f);
  }
  geo.computeVertexNormals();
  blobGeoCache.set(seed, geo);
  return geo;
}

function tree(group, x, y, { h, can, trunk, kind }) {
  const g = new THREE.Group();
  const H = k(h), R = k(can) / 2, tr = Math.max(0.05, k(trunk) / 2);
  const trunkMat = kind === 'native' ? M('trunkGum') : M('trunk');
  const leafMats = kind === 'native' ? [M('leavesGum'), M('leaves')] : kind === 'crepe' ? [M('crepe'), M('leaves'), M('crepe')] : [M('leavesDark'), M('leaves')];
  const crownBase = kind === 'evergreen' ? H * 0.2 : H * 0.45;
  const trunkH = crownBase + (H - crownBase) * 0.4;
  const t = new THREE.Mesh(new THREE.CylinderGeometry(tr * 0.55, tr, trunkH, 12), trunkMat);
  t.position.y = trunkH / 2; t.castShadow = true; g.add(t);
  let s = Math.abs(Math.round(x * 0.37 + y * 0.11)) % 1000 + 7;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const n = Math.max(6, Math.min(34, Math.round(k(can) * 2.2)));
  const cy = (crownBase + H) / 2, ry = (H - crownBase) / 2;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * R * 0.72;
    const yy = cy + (rnd() * 2 - 1) * ry * 0.7;
    const taper = kind === 'evergreen' ? 1 - (yy - crownBase) / (H - crownBase) * 0.7 : 1;
    const r = R * (0.28 + rnd() * 0.16) * taper;
    const m = new THREE.Mesh(blobGeo(i % 5), leafMats[i % leafMats.length]);
    m.scale.setScalar(r);
    m.position.set(Math.cos(a) * rr * taper, yy, Math.sin(a) * rr * taper);
    m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    if (kind === 'native' && h > 10000 && i < 7) {
      const from = new THREE.Vector3(0, trunkH * 0.8, 0), to = new THREE.Vector3(Math.cos(a) * rr * 0.8, yy - r * 0.3, Math.sin(a) * rr * 0.8);
      const L = from.distanceTo(to);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(tr * 0.16, tr * 0.38, L, 6), trunkMat);
      br.position.copy(from).add(to).multiplyScalar(0.5);
      br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      br.castShadow = true;
      g.add(br);
    }
  }
  g.position.set(k(x), Y.lawn, k(y));
  g.userData.context = true;
  group.add(g);
  colliders.push({ x1: x - trunk, y1: y - trunk, x2: x + trunk, y2: y + trunk, h0: -300, h1: 3000, tag: 'tree' });
  return g;
}

function shrub(group, x, y, r, key = 'shrub', ctx = false) {
  const geo = new THREE.IcosahedronGeometry(k(r), 1);
  const m = new THREE.Mesh(geo, M(key));
  m.scale.set(1, 0.8, 1);
  m.position.set(k(x), Y.lawn + k(r) * 0.7, k(y)); m.castShadow = true; m.userData.context = ctx;
  group.add(m);
}

function fence(group, f) {
  const [x1, y1] = f.from, [x2, y2] = f.to;
  const L = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
  const mat = M(f.type === 'metal' ? 'fenceMetal' : 'fenceBoard').clone();
  mat.map = mat.map.clone(); mat.map.needsUpdate = true;
  mat.map.repeat.set(k(L) / (f.type === 'metal' ? 1 : 1), f.type === 'metal' ? 1 : k(f.h));
  if (f.type === 'board') { mat.map.repeat.set(k(L) * 1.5, 1); }
  const geo = new THREE.BoxGeometry(k(L), k(f.h), 0.035);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(k(x1 + x2) / 2, Y.paving + k(f.h) / 2, k(y1 + y2) / 2);
  m.rotation.y = -ang;
  m.castShadow = true; m.receiveShadow = true;
  m.userData.label = f.label;
  m.userData.context = true;
  group.add(m);
  // posts
  const n = Math.max(1, Math.round(L / 2400));
  for (let i = 0; i <= n; i++) {
    const px = x1 + (x2 - x1) * i / n, py = y1 + (y2 - y1) * i / n;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, k(f.h) + 0.05, 0.06), M(f.type === 'metal' ? 'fenceMetal' : 'wood'));
    p.position.set(k(px), Y.paving + k(f.h) / 2, k(py)); p.rotation.y = -ang; p.userData.context = true; group.add(p);
  }
  segColliders.push({ a: [x1, y1], b: [x2, y2], r: 40, h0: -300, h1: f.h - 150 });
}

function neighbour(group, n) {
  const g = new THREE.Group();
  const b = new Batch('neighbour');
  const w = k(n.w), d = k(n.d);
  b.box(-w / 2, -0.2, -d / 2, w / 2, 2.55, d / 2, { px: 'neighbourWall', nx: 'neighbourWall', pz: 'neighbourWall', nz: 'neighbourWall', py: 'poche' });
  // windows
  for (let i = -1; i <= 1; i++) {
    b.box(i * w / 3 - 0.9, 0.9, d / 2, i * w / 3 + 0.9, 2.1, d / 2 + 0.02, 'blackGlass');
    b.box(i * w / 3 - 0.9, 0.9, -d / 2 - 0.02, i * w / 3 + 0.9, 2.1, -d / 2, 'blackGlass');
  }
  b.box(w / 2, 0.9, -d / 4 - 0.8, w / 2 + 0.02, 2.1, -d / 4 + 0.8, 'blackGlass');
  b.box(-w / 2 - 0.02, 0.9, d / 4 - 0.8, -w / 2, 2.1, d / 4 + 0.8, 'blackGlass');
  g.add(b.build());
  const eave = [[-w / 2 - 0.45, -d / 2 - 0.45], [w / 2 + 0.45, -d / 2 - 0.45], [w / 2 + 0.45, d / 2 + 0.45], [-w / 2 - 0.45, d / 2 + 0.45]];
  const roof = buildHipRoof(eave, { eaveY: 2.62, pitchDeg: 22.5, roofKey: n.label.includes('Existing') ? 'neighbourRoof' : 'neighbourRoof2', name: 'nroof' });
  g.add(roof);
  g.position.set(k(n.x), 0, k(n.y));
  g.rotation.y = -n.rot * Math.PI / 180;
  g.userData.context = true;
  group.add(g);
  // collider (axis-aligned approximation of the rotated footprint)
  const c = Math.abs(Math.cos(n.rot * Math.PI / 180)), s = Math.abs(Math.sin(n.rot * Math.PI / 180));
  const hw = (n.w * c + n.d * s) / 2 * 0.85, hd = (n.w * s + n.d * c) / 2 * 0.85;
  colliders.push({ x1: n.x - hw, y1: n.y - hd, x2: n.x + hw, y2: n.y + hd, h0: -300, h1: 3000, tag: 'neighbour' });
  if (n.label) {
    const el = document.createElement('div'); el.className = 'slbl'; el.textContent = n.label;
    const o = new CSS2DObject(el); o.position.set(k(n.x), 3.6, k(n.y)); o.userData.siteLabel = true; group.add(o);
  }
}

export function buildSite() {
  const group = new THREE.Group(); group.name = 'site';
  const labels = new THREE.Group(); labels.name = 'site-labels'; labels.visible = false;
  const b = new Batch('site');
  const levelPolys = [];
  const bnd = SITE.boundary;
  const ccw = signedArea(bnd) > 0;

  // ground (surrounding lots)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M('grassVerge').clone());
  ground.material.map = ground.material.map.clone(); ground.material.map.repeat.set(400 / 2.5, 400 / 2.5); ground.material.map.needsUpdate = true;
  ground.rotation.x = -Math.PI / 2; ground.position.set(8, Y.ground, 8);
  ground.receiveShadow = true; ground.name = 'ground';
  group.add(ground);

  // inside the boundary: concrete / slab-on-ground paving + buffalo lawns
  b.poly('paving', bnd.map(p => [k(p[0]), k(p[1])]), Y.paving, true);
  for (const l of SITE.lawns) b.poly('grass', l.map(p => [k(p[0]), k(p[1])]), Y.lawn, true);
  // boundary edge (small upstand face)
  for (let i = 0; i < bnd.length; i++) {
    const a = bnd[i], c = bnd[(i + 1) % bnd.length];
    b.strip('paving', ccw ? [k(c[0]), k(c[1])] : [k(a[0]), k(a[1])], ccw ? [k(a[0]), k(a[1])] : [k(c[0]), k(c[1])], Y.ground, Y.paving);
  }

  // streets – frontage polyline B→C→D→E→F→G extended both ways
  const [Bp, Cp, Dp, Ep, Fp, Gp] = [bnd[2], bnd[3], bnd[4], bnd[5], bnd[6], bnd[7]];
  const ext = (p, q, L) => { const dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy); return [p[0] + dx / l * L, p[1] + dy / l * L]; };
  const line = [ext(Bp, Cp, 60000), Bp, Cp, Dp, Ep, Fp, Gp, ext(Gp, Fp, 60000)];
  ribbon(b, line, 0, 1300, Y.verge, 'grassVerge', ccw, levelPolys, -190);
  ribbon(b, line, 1300, 2800, Y.footpath, 'pavers', ccw, levelPolys, -175);
  ribbon(b, line, 2800, 3900, Y.verge, 'grassVerge', ccw, levelPolys, -190);
  const kerb = ribbon(b, line, 3900, 4100, Y.kerbTop, 'kerb', ccw, levelPolys, -110);
  ribbon(b, line, 4100, 11600, Y.road, 'asphalt', ccw, levelPolys, -225);
  const kerb2 = ribbon(b, line, 11600, 11800, Y.kerbTop, 'kerb', ccw, levelPolys, -110);
  ribbon(b, line, 11800, 16000, Y.verge, 'grassVerge', ccw, levelPolys, -190);
  // kerb faces toward the road
  for (let i = 0; i < line.length - 1; i++) {
    const a = kerb.B[i], c = kerb.B[i + 1];
    b.strip('kerb', ccw ? [k(c[0]), k(c[1])] : [k(a[0]), k(a[1])], ccw ? [k(a[0]), k(a[1])] : [k(c[0]), k(c[1])], Y.road, Y.kerbTop);
    const a2 = kerb2.A[i], c2 = kerb2.A[i + 1];
    b.strip('kerb', ccw ? [k(a2[0]), k(a2[1])] : [k(c2[0]), k(c2[1])], ccw ? [k(c2[0]), k(c2[1])] : [k(a2[0]), k(a2[1])], Y.road, Y.kerbTop);
  }
  // centre line dashes
  const mid = offsetLine(line, 7850, ccw);
  for (let i = 0; i < mid.length - 1; i++) {
    const a = mid[i], c = mid[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const ux = (c[0] - a[0]) / L, uy = (c[1] - a[1]) / L;
    for (let s = 0; s < L - 3000; s += 6000) {
      const p0 = [a[0] + ux * s, a[1] + uy * s], p1 = [a[0] + ux * (s + 3000), a[1] + uy * (s + 3000)];
      const w = 50;
      b.poly('road-line', [[p0[0] - uy * w, p0[1] + ux * w], [p1[0] - uy * w, p1[1] + ux * w], [p1[0] + uy * w, p1[1] - ux * w], [p0[0] + uy * w, p0[1] - ux * w]].map(p => [k(p[0]), k(p[1])]), Y.road + 0.012, true);
    }
  }
  // existing crossover (to be extended as per council specifications)
  b.poly('paving', SITE.crossover.map(p => [k(p[0]), k(p[1])]), Y.crossover, true);
  levelPolys.unshift({ poly: SITE.crossover, level: -160 });

  group.add(b.build());

  // fences, trees, shrubs, neighbours
  for (const f of SITE.fences) fence(group, f);
  for (const [x, y] of SITE.lagerstroemia) tree(group, x, y, { h: 4000, can: 3000, trunk: 120, kind: 'crepe' });
  for (const t of SITE.trees) tree(group, t.x, t.y, t);
  for (const [x, y] of SITE.salvia) { shrub(group, x, y, 380, 'shrub'); shrub(group, x + 60, y - 40, 250, 'salvia'); }
  for (const [a, c] of SITE.shrubRows) {
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.round(L / 900);
    for (let i = 0; i <= n; i++) shrub(group, a[0] + (c[0] - a[0]) * i / n, a[1] + (c[1] - a[1]) * i / n, 550 + (i % 3) * 120, 'shrub', true);
  }
  // mulch beds under the crepe myrtle & salvias
  for (const n of SITE.neighbours) neighbour(group, n);

  // boundary line + dimension labels (site mode)
  const bl = bnd.map(p => new THREE.Vector3(k(p[0]), Y.paving + 0.02, k(p[1])));
  bl.push(bl[0].clone());
  const lineGeo = new THREE.BufferGeometry().setFromPoints(bl);
  const dash = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: '#e0342f', dashSize: 0.6, gapSize: 0.25 }));
  dash.computeLineDistances();
  labels.add(dash);
  const lbls = SITE.boundaryLabels;
  for (let i = 0; i < bnd.length; i++) {
    const a = bnd[i], c = bnd[(i + 1) % bnd.length];
    const el = document.createElement('div'); el.className = 'dimlbl'; el.textContent = 'BOUNDARY ' + lbls[i] + ' m';
    const o = new CSS2DObject(el); o.position.set(k(a[0] + c[0]) / 2, 0.3, k(a[1] + c[1]) / 2); labels.add(o);
  }
  for (const s of SITE.streets) {
    const el = document.createElement('div'); el.className = 'street'; el.textContent = s.name.toUpperCase();
    const o = new CSS2DObject(el); o.position.set(k(s.label[0]), 0.2, k(s.label[1])); labels.add(o);
  }
  const tl = [...SITE.trees.map(t => [t.x, t.y, t.label, t.h]), [SITE.lagerstroemia[0][0], SITE.lagerstroemia[0][1], 'Lagerstroemia indica (small tree)', 4000], [SITE.salvia[1][0], SITE.salvia[1][1], 'Salvia leucantha (shrub)', 900], [-750, -2150, '3000L retention & detention tank', 2200]];
  for (const [x, y, t, h] of tl) {
    const el = document.createElement('div'); el.className = 'slbl small'; el.textContent = t;
    const o = new CSS2DObject(el); o.position.set(k(x), Math.min(k(h) + 0.4, 8), k(y)); labels.add(o);
  }
  const fl = SITE.fences.map(f => [(f.from[0] + f.to[0]) / 2, (f.from[1] + f.to[1]) / 2, f.label]);
  fl.push([20200, 3600, 'Existing crossover (to be extended per council)'], [5100, 17200, 'Path'], [9800, 15500, 'Stenotaphrum secundatum (buffalo)']);
  for (const [x, y, t] of fl) {
    const el = document.createElement('div'); el.className = 'slbl small'; el.textContent = t;
    const o = new CSS2DObject(el); o.position.set(k(x), 2.2, k(y)); labels.add(o);
  }
  group.add(labels);
  // hide the per-neighbour labels until site mode
  const toMove = [];
  group.traverse(o => { if (o.userData.siteLabel) toMove.push(o); });
  for (const o of toMove) labels.attach(o);

  const siteLevelAt = (x, y) => {
    if (pointInPoly(x, y, bnd)) return Y.paving * 1000;
    for (const p of levelPolys) if (pointInPoly(x, y, p.poly)) return p.level;
    return Y.ground * 1000;
  };
  return { group, labels, siteLevelAt };
}
