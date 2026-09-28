// Hip roof generator for orthogonal footprints.
// For equal-pitch hip roofs on an orthogonal footprint the roof height at any point is
// eaveLevel + tan(pitch) × (L∞ distance to the eave outline). That surface equals the
// upper envelope of simple hip roofs built on every maximal rectangle inside the
// outline, which is what we build here (ridges, hips and valleys fall out naturally
// and match the roof layout on sheet 08).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M } from './materials.js';

export function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

// Offset an orthogonal polygon outward by d (same units as the points)
export function offsetOrtho(pts, d) {
  const ccw = signedArea(pts) > 0;
  const n = pts.length, out = [];
  const nrm = (a, b) => {
    const dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
    return ccw ? [dy, -dx] : [-dy, dx];
  };
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const n1 = nrm(p0, p1), n2 = nrm(p1, p2);
    out.push([p1[0] + d * (n1[0] + n2[0]), p1[1] + d * (n1[1] + n2[1])]);
  }
  return out;
}

export function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function maximalRects(pts) {
  const xs = [...new Set(pts.map(p => p[0]))].sort((a, b) => a - b);
  const ys = [...new Set(pts.map(p => p[1]))].sort((a, b) => a - b);
  const nx = xs.length - 1, ny = ys.length - 1;
  const cell = [];
  for (let i = 0; i < nx; i++) {
    cell[i] = [];
    for (let j = 0; j < ny; j++) cell[i][j] = pointInPoly((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2, pts) ? 1 : 0;
  }
  // 2D prefix sums
  const S = Array.from({ length: nx + 1 }, () => new Array(ny + 1).fill(0));
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) S[i + 1][j + 1] = cell[i][j] + S[i][j + 1] + S[i + 1][j] - S[i][j];
  const full = (i1, j1, i2, j2) => {
    if (i1 < 0 || j1 < 0 || i2 > nx || j2 > ny) return false;
    const s = S[i2][j2] - S[i1][j2] - S[i2][j1] + S[i1][j1];
    return s === (i2 - i1) * (j2 - j1);
  };
  const rects = [];
  for (let i1 = 0; i1 < nx; i1++) for (let i2 = i1 + 1; i2 <= nx; i2++)
    for (let j1 = 0; j1 < ny; j1++) for (let j2 = j1 + 1; j2 <= ny; j2++) {
      if (!full(i1, j1, i2, j2)) continue;
      if (full(i1 - 1, j1, i2, j2) || full(i1, j1, i2 + 1, j2) || full(i1, j1 - 1, i2, j2) || full(i1, j1, i2, j2 + 1)) continue;
      rects.push([xs[i1], ys[j1], xs[i2], ys[j2]]);
    }
  return rects;
}

// Build a roof mesh group. eavePts in metres ([x,z]); eaveY = roof surface height at eave line.
export function buildHipRoof(eavePts, { eaveY, pitchDeg = 22.5, roofKey = 'roof', capKey = 'gutter', gutters = true, fasciaKey = 'gutter', name = 'roof' } = {}) {
  const t = Math.tan(pitchDeg * Math.PI / 180);
  const sec = 1 / Math.cos(pitchDeg * Math.PI / 180);
  const rects = maximalRects(eavePts);
  const pos = [], nor = [], uv = [];

  const face = (verts, slopeAxis) => {
    // compute normal; flip so it points up
    const a = new THREE.Vector3(...verts[0]), b = new THREE.Vector3(...verts[1]), c = new THREE.Vector3(...verts[2]);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    if (n.y < 0) { verts = verts.slice().reverse(); n.negate(); }
    const tris = verts.length === 3 ? [[0, 1, 2]] : [[0, 1, 2], [0, 2, 3]];
    for (const tr of tris) for (const k of tr) {
      const v = verts[k];
      pos.push(...v); nor.push(n.x, n.y, n.z);
      // ribs run down the slope: u across the ribs, v along the slope
      if (slopeAxis === 'z') uv.push(v[0], v[2] * sec); else uv.push(v[2], v[0] * sec);
    }
  };

  for (const [x1, z1, x2, z2] of rects) {
    const w = x2 - x1, d = z2 - z1;
    if (w >= d) {
      const zc = (z1 + z2) / 2, R = eaveY + t * d / 2, xa = x1 + d / 2, xb = x2 - d / 2;
      face([[x1, eaveY, z1], [x2, eaveY, z1], [xb, R, zc], [xa, R, zc]], 'z');
      face([[x2, eaveY, z2], [x1, eaveY, z2], [xa, R, zc], [xb, R, zc]], 'z');
      face([[x1, eaveY, z2], [x1, eaveY, z1], [xa, R, zc]], 'x');
      face([[x2, eaveY, z1], [x2, eaveY, z2], [xb, R, zc]], 'x');
    } else {
      const xc = (x1 + x2) / 2, R = eaveY + t * w / 2, za = z1 + w / 2, zb = z2 - w / 2;
      face([[x1, eaveY, z2], [x1, eaveY, z1], [xc, R, za], [xc, R, zb]], 'x');
      face([[x2, eaveY, z1], [x2, eaveY, z2], [xc, R, zb], [xc, R, za]], 'x');
      face([[x1, eaveY, z1], [x2, eaveY, z1], [xc, R, za]], 'z');
      face([[x2, eaveY, z2], [x1, eaveY, z2], [xc, R, zb]], 'z');
    }
  }

  const group = new THREE.Group();
  group.name = name;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const roof = new THREE.Mesh(geo, M(roofKey));
  roof.castShadow = true; roof.receiveShadow = true; roof.name = name + ':sheet';
  group.add(roof);

  // Height function of the finished roof
  const heightAt = (x, z) => {
    let best = -Infinity;
    for (const [x1, z1, x2, z2] of rects) {
      if (x < x1 || x > x2 || z < z1 || z > z2) continue;
      const dd = Math.min(x - x1, x2 - x, z - z1, z2 - z);
      best = Math.max(best, eaveY + t * dd);
    }
    return best;
  };

  // Ridge / hip capping – only where the envelope forms a convex crease
  const caps = [];
  const segs = [];
  for (const r of rects) {
    const [x1, z1, x2, z2] = r;
    const w = x2 - x1, d = z2 - z1;
    const add = (a, b) => { const s = [a, b]; s.rect = r; segs.push(s); };
    if (w >= d) {
      const zc = (z1 + z2) / 2, xa = x1 + d / 2, xb = x2 - d / 2;
      if (xb > xa) add([xa, zc], [xb, zc]);
      add([x1, z1], [xa, zc]); add([x1, z2], [xa, zc]); add([x2, z1], [xb, zc]); add([x2, z2], [xb, zc]);
    } else {
      const xc = (x1 + x2) / 2, za = z1 + w / 2, zb = z2 - w / 2;
      if (zb > za) add([xc, za], [xc, zb]);
      add([x1, z1], [xc, za]); add([x2, z1], [xc, za]); add([x1, z2], [xc, zb]); add([x2, z2], [xc, zb]);
    }
  }
  const key = s => s.flat().map(v => v.toFixed(3)).join(',');
  const seen = new Set();
  const step = 0.08;
  for (const s of segs) {
    const k = key(s), k2 = key([s[1], s[0]]);
    if (seen.has(k) || seen.has(k2)) continue;
    seen.add(k);
    const [a, b] = s;
    const [rx1, rz1, rx2, rz2] = s.rect;
    const own = (x, z) => eaveY + t * Math.min(x - rx1, rx2 - x, z - rz1, rz2 - z);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(L / step));
    const px = -(b[1] - a[1]) / L, pz = (b[0] - a[0]) / L;
    let runStart = null;
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
      const h = heightAt(x, z);
      const e = 0.12;
      const hl = heightAt(x + px * e, z + pz * e), hr = heightAt(x - px * e, z - pz * e);
      const onTop = isFinite(hl) && isFinite(hr) && h > (hl + hr) / 2 + 0.004 && Math.abs(h - own(x, z)) < 1e-4 && h >= eaveY + 0.02;
      if (onTop && runStart === null) runStart = f;
      if ((!onTop || i === n) && runStart !== null) {
        const fe = onTop ? f : (i - 1) / n;
        if (fe - runStart > 0.001) caps.push([runStart, fe, a, b]);
        runStart = null;
      }
    }
  }
  const capGeos = [];
  for (const [f0, f1, a, b] of caps) {
    const p0 = new THREE.Vector3(a[0] + (b[0] - a[0]) * f0, 0, a[1] + (b[1] - a[1]) * f0);
    const p1 = new THREE.Vector3(a[0] + (b[0] - a[0]) * f1, 0, a[1] + (b[1] - a[1]) * f1);
    p0.y = heightAt(p0.x, p0.z) + 0.03; p1.y = heightAt(p1.x, p1.z) + 0.03;
    const len = p0.distanceTo(p1);
    if (len < 0.02) continue;
    const g = new THREE.BoxGeometry(len + 0.04, 0.05, 0.2);
    const m = new THREE.Matrix4();
    const dir = new THREE.Vector3().subVectors(p1, p0).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    m.compose(p0.clone().add(p1).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    capGeos.push(g);
  }
  if (capGeos.length) {
    const capMesh = new THREE.Mesh(mergeGeometries(capGeos), M(capKey));
    capMesh.castShadow = true; capMesh.name = name + ':caps';
    group.add(capMesh);
  }

  // Fascia + 'D' gutters along the eave outline
  if (gutters) {
    const gGeos = [], fGeos = [];
    const ccw = signedArea(eavePts) > 0;
    for (let i = 0; i < eavePts.length; i++) {
      const a = eavePts[i], b = eavePts[(i + 1) % eavePts.length];
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
      const ux = dx / L, uz = dz / L;
      const nx = ccw ? uz : -uz, nz = ccw ? -ux : ux; // outward
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const ang = Math.atan2(-uz, ux);
      // fascia
      const f = new THREE.BoxGeometry(L + 0.05, 0.24, 0.025);
      f.applyMatrix4(new THREE.Matrix4().makeRotationY(ang));
      f.translate(mid[0] + nx * 0.0125, eaveY - 0.1, mid[1] + nz * 0.0125);
      fGeos.push(f);
      // gutter body (D profile approximated with a lathe-like extrusion)
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(0, -0.13); shape.lineTo(0.07, -0.13);
      shape.quadraticCurveTo(0.125, -0.12, 0.125, -0.05); shape.lineTo(0.125, 0.0); shape.lineTo(0.115, 0);
      shape.lineTo(0.115, -0.05); shape.quadraticCurveTo(0.115, -0.11, 0.07, -0.118); shape.lineTo(0.012, -0.118); shape.lineTo(0.012, 0);
      const ext = new THREE.ExtrudeGeometry(shape, { depth: L + 0.25, bevelEnabled: false, curveSegments: 4 });
      ext.translate(0, 0, -(L + 0.25) / 2);
      // shape x → outward normal, extrude z → along edge
      // right-handed basis: x = outward, y = up, z = x × y (along the edge)
      const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(nx, 0, nz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-nz, 0, nx));
      ext.applyMatrix4(basis);
      ext.translate(mid[0] + nx * 0.025, eaveY + 0.0, mid[1] + nz * 0.025);
      gGeos.push(ext);
    }
    const fm = new THREE.Mesh(mergeGeometries(fGeos), M(fasciaKey));
    fm.castShadow = true; fm.name = name + ':fascia';
    const gm = new THREE.Mesh(mergeGeometries(gGeos.map(g => g.index ? g.toNonIndexed() : g)), M(fasciaKey));
    gm.castShadow = true; gm.name = name + ':gutter';
    group.add(fm, gm);
  }

  group.userData.heightAt = heightAt;
  group.userData.rects = rects;
  return group;
}
