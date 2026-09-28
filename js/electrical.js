// Electrical layout (sheet 04): physical fittings, working lights and plan markers.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Batch } from './batch.js';
import { M } from './materials.js';
import { ELECTRICAL, ELEC_TYPES, RAISED_CEILINGS, H, ROOMS } from './data.js';
import { roomAt, snapToWall, interactables } from './house.js';

const k = v => v / 1000;

function ceilingAt(x, y) {
  for (const r of RAISED_CEILINGS) {
    const [x1, y1, x2, y2] = r.rect;
    if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return H.raised;
  }
  return H.ceiling;
}

// Light fittings are "sources"; a fixed pool of real PointLights is re-assigned to the
// switched-on sources nearest the camera. A constant light count keeps shaders from
// recompiling and keeps integrated GPUs fast.
const POOL = 8;
export class LightSystem {
  constructor() {
    this.rooms = new Map();   // id → {lights:[], mat, on}
    this.night = false;
    this.manual = new Map();  // id → forced state
    this.poolGroup = new THREE.Group(); this.poolGroup.name = 'light-pool'; this.poolGroup.visible = false;
    this.pool = [];
    for (let i = 0; i < POOL; i++) { const l = new THREE.PointLight('#ffe7c4', 0, 0, 2); this.pool.push(l); this.poolGroup.add(l); }
    this._tmp = [];
  }
  update(camPos) {
    const src = this._tmp; src.length = 0;
    for (const r of this.rooms.values()) if (r.on) for (const l of r.lights) {
      const d2 = Math.max(1, l.position.distanceToSquared(camPos));
      src.push([l.intensity / d2, l]);
    }
    const any = src.length > 0;
    if (this.poolGroup.visible !== any) this.poolGroup.visible = any;
    if (!any) return;
    src.sort((a, b) => b[0] - a[0]);
    for (let i = 0; i < POOL; i++) {
      const p = this.pool[i], s = src[i];
      if (s) { const l = s[1]; p.position.copy(l.position); p.intensity = l.intensity; p.color.copy(l.color); p.distance = l.distance; }
      else p.intensity = 0;
    }
  }
  room(id) {
    let r = this.rooms.get(id);
    if (!r) {
      const mat = M('lightOn').clone();
      r = { lights: [], mat, on: false, count: 0, sum: new THREE.Vector3() };
      this.rooms.set(id, r);
    }
    return r;
  }
  set(id, on) {
    const r = this.rooms.get(id); if (!r) return;
    r.on = on;
    r.mat.emissiveIntensity = on ? 3.0 : 0;
    r.mat.color.set(on ? '#fffaf0' : '#e9e9e6');
  }
  toggle(id) { const r = this.rooms.get(id); if (r) { this.manual.set(id, !r.on); this.set(id, !r.on); } }
  setAll(on) { this.manual.clear(); for (const id of this.rooms.keys()) this.set(id, on); }
  setNight(n) {
    this.night = n;
    for (const id of this.rooms.keys()) this.set(id, this.manual.has(id) ? this.manual.get(id) : n);
  }
}

export function buildElectrical(scene) {
  const fittings = new Batch('electrical');
  const group = new THREE.Group(); group.name = 'electrical';
  const ceilingItems = new THREE.Group(); ceilingItems.name = 'ceiling-fittings';
  const markers = new THREE.Group(); markers.name = 'elec-markers'; markers.visible = false;
  const lights = new LightSystem();

  const dlGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20);
  const trimGeo = new THREE.TorusGeometry(0.05, 0.006, 6, 20);

  const addMarker = (item, x, y, h) => {
    const t = ELEC_TYPES[item.type];
    const el = document.createElement('div');
    el.className = 'emk';
    el.style.setProperty('--c', t.color);
    const code = { downlight: 'DL', pendant: 'PD', walllight: 'WL', batten: 'BL', hle: 'HLE', smoke: 'SA', security: 'SS', gpo: 'GPO', switch: 'SW', switch2: '2W', tv: 'TV', phone: 'TEL', nbnOutlet: 'NBN', nbnBox: 'NBN', acPanel: 'A/C' }[item.type];
    el.textContent = item.type === 'gpo' ? (h / 1000).toFixed(1) : item.type === 'switch' && item.gang > 1 ? item.gang + 'G' : code;
    el.title = `${t.label}${item.h ? ` @ ${(item.h / 1000).toFixed(1)} m AFL` : ''}${item.note ? ' – ' + item.note : ''}${item.room ? ' · ' + item.room : ''}`;
    el.dataset.type = item.type;
    const o = new CSS2DObject(el);
    o.position.set(k(x), k(h) + 0.02, k(y));
    o.userData.type = item.type;
    markers.add(o);
  };

  const wallItem = (item, w, hgt, depth, key = 'plastic', gang = 1) => {
    const s = snapToWall(item.x, item.y, { prefer: item.type === 'gpo' ? null : 'full' });
    if (!s) return null;
    const [nx, ny] = s.n;
    const x = s.x, y = s.y, h = item.h ?? 1050;
    // plate on the wall face
    if (nx === 0) fittings.box(k(x - w / 2), k(h - hgt / 2), k(y), k(x + w / 2), k(h + hgt / 2), k(y + ny * depth), key);
    else fittings.box(k(x), k(h - hgt / 2), k(y - w / 2), k(x + nx * depth), k(h + hgt / 2), k(y + w / 2), key);
    return { x, y, h, nx, ny };
  };

  for (const item of ELECTRICAL) {
    const t = item.type;
    if (t === 'downlight') {
      const ch = ceilingAt(item.x, item.y);
      const room = roomAt(item.x, item.y);
      const id = room ? room.id : 'external';
      const L = lights.room(id);
      const m = new THREE.Mesh(dlGeo, L.mat);
      m.position.set(k(item.x), k(ch) - 0.006, k(item.y));
      const trim = new THREE.Mesh(trimGeo, M('plastic'));
      trim.rotation.x = Math.PI / 2; trim.position.copy(m.position); trim.position.y -= 0.004;
      ceilingItems.add(m, trim);
      L.count++; L.sum.add(new THREE.Vector3(k(item.x), k(ch) - 0.3, k(item.y)));
      addMarker(item, item.x, item.y, ch);
    } else if (t === 'pendant') {
      const L = lights.room('kitchen');
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.95, 6), M('black'));
      cord.position.set(k(item.x), k(H.ceiling) - 0.475, k(item.y));
      const shade = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('black'));
      shade.material = M('black'); shade.position.set(k(item.x), k(H.ceiling) - 1.0, k(item.y));
      const shadeIn = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), L.mat);
      shadeIn.rotation.x = Math.PI / 2; shadeIn.position.copy(shade.position); shadeIn.position.y += 0.001;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), L.mat); bulb.position.copy(shade.position); bulb.position.y += 0.03;
      ceilingItems.add(cord, shade, shadeIn, bulb);
      const pl = new THREE.PointLight('#ffe2b8', 1.2, 6, 2); pl.position.copy(shade.position); pl.position.y -= 0.1; pl.visible = false;
      L.lights.push(pl);
      addMarker(item, item.x, item.y, 1700);
    } else if (t === 'batten') {
      const L = lights.room('garage');
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, k(item.len)), L.mat);
      m.position.set(k(item.x), k(H.ceiling) - 0.03, k(item.y));
      ceilingItems.add(m);
      L.count += 2; L.sum.add(new THREE.Vector3(k(item.x), k(H.ceiling) - 0.4, k(item.y)).multiplyScalar(2));
      addMarker(item, item.x, item.y, H.ceiling);
    } else if (t === 'hle') {
      const room = roomAt(item.x, item.y); const L = lights.room(room ? room.id : 'bath');
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.3), M('plastic'));
      plate.position.set(k(item.x), k(H.ceiling) - 0.01, k(item.y));
      ceilingItems.add(plate);
      for (const d of [-0.085, 0.085]) {
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.022, 16), L.mat);
        lamp.position.set(k(item.x) + d, k(H.ceiling) - 0.012, k(item.y) - 0.06); ceilingItems.add(lamp);
      }
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.022, 16), M('lightOff'));
      fan.position.set(k(item.x), k(H.ceiling) - 0.012, k(item.y) + 0.08); ceilingItems.add(fan);
      L.count++; L.sum.add(new THREE.Vector3(k(item.x), k(H.ceiling) - 0.3, k(item.y)));
      addMarker(item, item.x, item.y, H.ceiling);
    } else if (t === 'smoke') {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.04, 20), M('plastic'));
      m.position.set(k(item.x), k(H.ceiling) - 0.02, k(item.y)); ceilingItems.add(m);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3030' }));
      led.position.set(k(item.x) + 0.03, k(H.ceiling) - 0.042, k(item.y)); ceilingItems.add(led);
      addMarker(item, item.x, item.y, H.ceiling);
    } else if (t === 'walllight') {
      const face = item.face;
      let x = item.x, y = item.y, nx = 0, ny = 0;
      if (face === 'S') { ny = 1; y = item.y > 14800 ? 14965 : item.y; }
      else { const s = snapToWall(item.x, item.y); if (s) { x = s.x; y = s.y; [nx, ny] = s.n; } }
      const L = lights.room('ext-' + Math.round(item.x));
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 16), M('black'));
      body.position.set(k(x + nx * 70), k(item.h), k(y + ny * 70));
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(nx ? 0.07 : 0.05, 0.05, ny ? 0.07 : 0.05), M('black'));
      bracket.position.set(k(x + nx * 35), k(item.h), k(y + ny * 35));
      for (const s of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), L.mat);
        lens.rotation.x = s > 0 ? -Math.PI / 2 : Math.PI / 2;
        lens.position.set(body.position.x, body.position.y + s * 0.121, body.position.z);
        group.add(lens);
      }
      body.castShadow = true;
      group.add(body, bracket);
      const pl = new THREE.PointLight('#ffd9a8', 1.3, 7, 2);
      pl.position.set(k(x + nx * 250), k(item.h) - 0.1, k(y + ny * 250)); pl.visible = false;
      L.lights.push(pl);
      addMarker(item, x, y, item.h);
    } else if (t === 'gpo') {
      if (item.ceiling) {
        fittings.box(k(item.x - 60), k(H.ceiling - 40), k(item.y - 35), k(item.x + 60), k(H.ceiling), k(item.y + 35), 'plastic');
        addMarker(item, item.x, item.y, item.h);
        continue;
      }
      const p = wallItem(item, 120, 72, 9);
      if (p) {
        // two socket outlines
        for (const s of [-1, 1]) {
          if (p.nx === 0) fittings.box(k(p.x + s * 28 - 9), k(p.h - 12), k(p.y + p.ny * 9), k(p.x + s * 28 + 9), k(p.h + 12), k(p.y + p.ny * 10), 'black');
          else fittings.box(k(p.x + p.nx * 9), k(p.h - 12), k(p.y + s * 28 - 9), k(p.x + p.nx * 10), k(p.h + 12), k(p.y + s * 28 + 9), 'black');
        }
        addMarker(item, p.x, p.y, p.h);
      }
    } else if (t === 'switch' || t === 'switch2') {
      const gang = item.gang || 1;
      const p = wallItem({ ...item, h: 1050 }, 72, 118, 9);
      if (p) {
        for (let g = 0; g < gang; g++) {
          const off = (g - (gang - 1) / 2) * 15;
          if (p.nx === 0) fittings.box(k(p.x + off - 5), k(p.h - 10), k(p.y + p.ny * 9), k(p.x + off + 5), k(p.h + 10), k(p.y + p.ny * 12), 'plastic');
          else fittings.box(k(p.x + p.nx * 9), k(p.h - 10), k(p.y + off - 5), k(p.x + p.nx * 12), k(p.h + 10), k(p.y + off + 5), 'plastic');
        }
        // interaction hit-box: toggles lights of the room in front of the switch
        const hit = new THREE.Mesh(new THREE.BoxGeometry(p.nx ? 0.04 : 0.12, 0.16, p.nx ? 0.12 : 0.04), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.set(k(p.x + p.nx * 20), k(p.h), k(p.y + p.ny * 20));
        group.add(hit);
        const room = roomAt(p.x + p.nx * 300, p.y + p.ny * 300);
        if (room) {
          interactables.push({ mesh: hit, action: () => lights.toggle(room.id), get hint() { const r = lights.rooms.get(room.id); return `Switch ${r && r.on ? 'off' : 'on'} lights – ${room.name}`; } });
        }
        addMarker(item, p.x, p.y, p.h);
      }
    } else if (t === 'tv' || t === 'phone' || t === 'nbnOutlet') {
      const p = wallItem(item, 72, 118, 9);
      if (p) addMarker(item, p.x, p.y, p.h);
    } else if (t === 'nbnBox') {
      const p = wallItem(item, 420, 520, 90, 'plastic');
      if (p) addMarker(item, p.x, p.y, p.h);
    } else if (t === 'acPanel') {
      const p = wallItem(item, 90, 120, 14, 'plastic');
      if (p) {
        if (p.nx !== 0) fittings.box(k(p.x + p.nx * 14), k(p.h - 35), k(p.y - 30), k(p.x + p.nx * 15), k(p.h + 35), k(p.y + 30), 'screen');
        addMarker(item, p.x, p.y, p.h);
      }
    } else if (t === 'security') {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10), M('plastic'));
      m.position.set(k(16396) + 0.06, k(item.h), k(item.y)); group.add(m);
      addMarker(item, 16450, item.y, item.h);
    }
  }

  // one warm point light per room, at the centroid of that room's fittings
  const areaOf = id => { const r = ROOMS.find(q => q.id === id); if (!r) return 8; return r.rects.reduce((s, [a, b, c, d]) => s + (c - a) * (d - b) / 1e6, 0); };
  for (const [id, L] of lights.rooms) {
    if (!L.count) continue;
    const p = L.sum.clone().multiplyScalar(1 / L.count);
    const intensity = 1.2 + areaOf(id) * 0.35;
    const pl = new THREE.PointLight('#ffe7c4', intensity, 0, 2);
    pl.position.copy(p);
    pl.visible = false;
    L.lights.push(pl);
  }

  group.add(fittings.build({ castShadow: false }), markers, lights.poolGroup);
  lights.setNight(false);
  return { group, ceilingItems, markers, lights };
}
