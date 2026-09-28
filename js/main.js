import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

import { PROJECT, ROOMS, WALLS, SCHEDULE, SITE, ELEC_TYPES, ELECTRICAL, DOWNPIPES, H } from './data.js';
import { initMaterials, setColor, setFloor, setInteriorPaint, FLOOR_OPTIONS, COLORBOND, PAINT, TIMBER, getFloorChoice } from './materials.js';
import { buildHouse, colliders, doors, interactables, roomAt, houseLevelAt } from './house.js';
import { buildInterior } from './interior.js';
import { buildElectrical } from './electrical.js';
import { buildSite, segColliders } from './site.js';
import { Environment, WEATHER } from './sun.js';
import { Walker, Minimap } from './walk.js';
import { MeasureTool } from './measure.js';

const $ = s => document.querySelector(s);
const stage = $('#stage');
const setLoading = t => { const el = $('#loadmsg'); if (el) el.textContent = t; };

// ---------------------------------------------------------------------------
// Renderer, scene, cameras
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(stage.clientWidth, stage.clientHeight);
labelRenderer.domElement.className = 'labels';
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const persp = new THREE.PerspectiveCamera(50, stage.clientWidth / stage.clientHeight, 0.1, 6000);
persp.position.set(-6, 14, 30);
const ortho = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
let camera = persp;

const orbit = new OrbitControls(persp, renderer.domElement);
orbit.enableDamping = true; orbit.dampingFactor = 0.08;
orbit.target.set(8.2, 1.2, 7.5);
orbit.maxPolarAngle = Math.PI * 0.495; orbit.minDistance = 1.5; orbit.maxDistance = 160;
const orbitO = new OrbitControls(ortho, renderer.domElement);
orbitO.enableDamping = true; orbitO.enabled = false; orbitO.screenSpacePanning = true;
orbitO.minZoom = 0.3; orbitO.maxZoom = 12;

// ---------------------------------------------------------------------------
// Build the model
// ---------------------------------------------------------------------------
setLoading('Generating finishes…');
initMaterials();
setLoading('Building walls, openings & roof…');
const house = buildHouse();
scene.add(house.structGroup, house.glassGroup, house.ceilingGroup, house.roof, house.dynamicGroup);
const interior = buildInterior();
scene.add(interior);
const elec = buildElectrical(scene);
scene.add(elec.group, elec.ceilingItems);
const site = buildSite();
scene.add(site.group);

const env = new Environment(scene, renderer);
env.onNight = n => { elec.lights.setNight(n); refreshSunPanel(); };

const levelAt = (x, y) => { const h = houseLevelAt(x, y); return h !== null ? h : site.siteLevelAt(x, y); };

// shadows

// Room labels for plan mode
const roomLabels = new THREE.Group(); roomLabels.visible = false; scene.add(roomLabels);
for (const r of ROOMS) {
  let best = r.rects[0], area = 0;
  for (const q of r.rects) { const a = (q[2] - q[0]) * (q[3] - q[1]); area += a; if (a > (best[2] - best[0]) * (best[3] - best[1])) best = q; }
  const el = document.createElement('div'); el.className = 'rlbl';
  const short = { ens: 'ENS.', wir: 'W.I.R', wip: 'W.I.P', laundry: "L'DRY", lounge: 'ENTRY & LOUNGE', bed2: 'BEDROOM 02', bed3: 'BEDROOM 03', bed4: 'BEDROOM 04' }[r.id] || r.name.toUpperCase();
  el.innerHTML = `<b>${short}</b><span>${r.dims.replace(/ \(.*\)/, '')}</span>`;
  el.title = r.name + (r.note ? ' – ' + r.note : '');
  const o = new CSS2DObject(el); o.position.set((best[0] + best[2]) / 2000, 0.3, (best[1] + best[3]) / 2000);
  roomLabels.add(o);
}
// Roof labels
const roofLabels = new THREE.Group(); roofLabels.visible = false; scene.add(roofLabels);
{
  const el = document.createElement('div'); el.className = 'rlbl'; el.innerHTML = '<b>COLORBOND ROOF @ 22.5° PITCH</b><span>Monument · 450mm eave · \'D\' gutters</span>';
  const o = new CSS2DObject(el); o.position.set(2.3, 5.2, 7.0); roofLabels.add(o);
  for (const [x, y] of DOWNPIPES) {
    const d = document.createElement('div'); d.className = 'emk'; d.style.setProperty('--c', '#4a90d9'); d.textContent = 'DP'; d.title = '75 dia. uPVC down pipe (Monument)';
    const p = new CSS2DObject(d); p.position.set(x / 1000, 2.9, y / 1000); roofLabels.add(p);
  }
}

// ---------------------------------------------------------------------------
// Drawing overlays (sheets exported from PD-08, aligned to the model)
// ---------------------------------------------------------------------------
const SHEETS = {
  none: { label: 'None' },
  plan: { label: '02 Floor plan', file: 'plan', win: [-3000, -2000, 19000, 17000] },
  electrical: { label: '04 Electrical', file: 'electrical', win: [-3000, -2000, 19000, 17000] },
  plumbing: { label: '05 Plumbing', file: 'plumbing', win: [-3000, -2000, 19000, 17000] },
  footing: { label: '06 Footing', file: 'footing', win: [-3000, -2000, 19000, 17000] },
  frame: { label: '07 Timber frame', file: 'frame', win: [-3000, -2000, 19000, 17000] },
  roof: { label: '08 Roof layout', file: 'roof', win: [-3000, -2000, 19000, 17000] },
  site: { label: '01 Site plan', file: 'site', win: [-14000, -14000, 34000, 30000] },
};
const overlay = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, toneMapped: false }));
overlay.rotation.x = -Math.PI / 2; overlay.renderOrder = 50; overlay.visible = false; scene.add(overlay);
const overlayCache = {};
let overlayKey = 'none';
function setOverlay(key) {
  overlayKey = key;
  const s = SHEETS[key];
  if (!s || !s.file) { overlay.visible = false; return; }
  const [x0, y0, x1, y1] = s.win;
  overlay.scale.set((x1 - x0) / 1000, (y1 - y0) / 1000, 1);
  overlay.position.set((x0 + x1) / 2000, 0.06, (y0 + y1) / 2000);
  const apply = t => { overlay.material.map = t; overlay.material.needsUpdate = true; overlay.visible = true; };
  if (overlayCache[key]) apply(overlayCache[key]);
  else {
    // Draw the PNG into a canvas first – some Intel/ANGLE drivers fail to sample large
    // image-element textures, whereas canvas textures upload reliably.
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      overlayCache[key] = t;
      if (overlayKey === key) apply(t);
    };
    img.src = `assets/overlays/${s.file}.png`;
  }
}

// ---------------------------------------------------------------------------
// Post-processing / HQ
// ---------------------------------------------------------------------------
const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType });
const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
let gtao = null;
try {
  gtao = new GTAOPass(scene, camera, stage.clientWidth, stage.clientHeight);
  gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.5, thickness: 1.0, scale: 1.0, samples: 16 });
  gtao.blendIntensity = 0.85;
  composer.addPass(gtao);
} catch (e) { console.warn('GTAO unavailable', e); gtao = null; }
composer.addPass(new OutputPass());
let HQ = false;
function setHQ(on) {
  HQ = on;
  renderer.setPixelRatio(on ? Math.min(devicePixelRatio, 2) : Math.min(devicePixelRatio, 1.25));
  env.setShadowSize(on ? 4096 : 2048, mode === 'site' ? 40 : 24);
  if (gtao) gtao.enabled = on && camera === persp;
  resize();
  $('#hqBtn').classList.toggle('active', on);
}

// ---------------------------------------------------------------------------
// Walker, minimap, measure
// ---------------------------------------------------------------------------
const walker = new Walker(persp, renderer.domElement, {
  colliders, segColliders, doors, levelAt, interactables,
  onLockChange: locked => { $('#playOverlay').hidden = locked || mode !== 'walk'; },
});
const minimap = new Minimap($('#minimap'), { walls: WALLS, rooms: ROOMS, northDeg: PROJECT.northAngleDeg });
walker.onKeyExtra = code => {
  if (code === 'KeyM') $('#minimap').classList.toggle('hide');
  if (code === 'KeyL') { const anyOn = [...elec.lights.rooms.values()].some(r => r.on); elec.lights.setAll(!anyOn); }
  if (code === 'KeyH') $('#help').classList.toggle('hide');
  if (code === 'KeyN') { env.setHours(env.hours >= 19 || env.hours < 6 ? 11.5 : 20.5); refreshSunPanel(); }
};

const measure = new MeasureTool(scene, renderer.domElement, () => camera, () => [house.structGroup, house.roof, interior, site.group, house.dynamicGroup, house.ceilingGroup].filter(g => g.visible), items => renderMeasureList(items));

// ---------------------------------------------------------------------------
// Camera helpers
// ---------------------------------------------------------------------------
let tween = null;
function flyTo(pos, target, dur = 0.9) {
  const ctl = camera === ortho ? orbitO : orbit;
  tween = { cam: camera, ctl, p0: camera.position.clone(), p1: new THREE.Vector3(...pos), t0: ctl.target.clone(), t1: new THREE.Vector3(...target), t: 0, dur };
}
function useOrtho(on) {
  camera = on ? ortho : persp;
  orbit.enabled = !on && mode !== 'walk'; orbitO.enabled = on;
  renderPass.camera = camera; if (gtao) { gtao.camera = camera; gtao.enabled = HQ && !on; }
  resize();
}
function topView(extent = 12, center = [8.2, 7.5]) {
  tween = null;
  useOrtho(true);
  // keep camera.up = +Y (OrbitControls caches it); look straight down from a hair south so plan-up is screen-up
  ortho.position.set(center[0], 60, center[1] + 0.0005);
  orbitO.target.set(center[0], 0, center[1]);
  orbitO.enableRotate = false;
  orbitO.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  orbitO.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
  ortho.zoom = 1; ortho.userData.extent = extent;
  resize(); orbitO.update();
}
function orthoElevation(dir) {
  tween = null;
  useOrtho(true);
  const c = new THREE.Vector3(8.2, 2.4, 7.5);
  ortho.position.copy(c).addScaledVector(new THREE.Vector3(...dir).normalize(), 60);
  orbitO.target.copy(c);
  orbitO.enableRotate = true; orbitO.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  ortho.zoom = 1; ortho.userData.extent = 11;
  resize(); orbitO.update();
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------
let mode = 'exterior';
let orthoElev = false;
let context = true;
let elecFilter = new Set(Object.values(ELEC_TYPES).map(t => t.group));
const contextObjs = [];
site.group.traverse(o => { if (o.userData.context) contextObjs.push(o); });

const VIEWS = {
  A: { label: 'Street · Elev A', sub: 'South-East elevation · Amsterdam Cr', pos: [9.6, 1.7, 29.0], target: [7.4, 2.0, 7.4], dir: [0, 0, 1] },
  B: { label: 'Side · Elev B', sub: 'North-East elevation · Leyden Court', pos: [31, 1.7, 6.5], target: [8.2, 2.0, 7.2], dir: [1, 0, 0] },
  C: { label: 'Rear · Elev C', sub: 'North-West elevation · alfresco', pos: [6.5, 2.2, -14], target: [7.6, 2.0, 7.2], dir: [0, 0, -1], ctx: false },
  D: { label: 'Side · Elev D', sub: 'South-West elevation', pos: [-16, 1.9, 7.2], target: [8.2, 2.0, 7.2], dir: [-1, 0, 0], ctx: false },
  O: { label: 'Overhead', sub: 'Aerial', pos: [29, 17, 31], target: [7.6, 0.5, 7.2] },
};

function setContext(on) { context = on; for (const o of contextObjs) o.visible = on; env.sun.shadow.needsUpdate = true; renderViewbar(); }

function setVisibility({ roof = true, ceiling = true, markers = false, rooms = false, siteLabels = false, roofLbl = false } = {}) {
  env.sun.shadow.needsUpdate = true;
  house.roof.visible = roof;
  house.ceilingGroup.visible = ceiling;
  elec.markers.visible = markers;
  roomLabels.visible = rooms;
  site.labels.visible = siteLabels;
  roofLabels.visible = roofLbl;
}

function setMode(m, opts = {}) {
  if (mode === 'walk' && m !== 'walk') { walker.enable(false); persp.fov = 50; persp.updateProjectionMatrix(); }
  mode = m;
  document.querySelectorAll('#tabs [data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  $('#hud').classList.toggle('walking', m === 'walk');
  $('#playOverlay').hidden = m !== 'walk';
  measure.setActive(activeTool === 'measure' && m !== 'walk');
  orbit.enabled = m !== 'walk';
  if (m !== 'plan' && m !== 'roof' && m !== 'site' && m !== 'electrical' && overlayKey !== 'none') setOverlay('none');
  switch (m) {
    case 'exterior':
      setVisibility({});
      if (!orthoElev) { useOrtho(false); if (!opts.keepCam) applyView(opts.view || 'O'); }
      break;
    case 'plan':
      setVisibility({ roof: false, ceiling: false, rooms: true });
      if (opts.dollhouse) { useOrtho(false); flyTo([8.2, 17, 22], [8.2, 0, 7.8]); } else topView(11.5);
      break;
    case 'roof':
      setVisibility({ roofLbl: true });
      if (opts.threeD) { useOrtho(false); flyTo([22, 16, 26], [8.2, 1.5, 7.5]); } else topView(12);
      break;
    case 'site':
      setVisibility({ siteLabels: true });
      setContext(true);
      if (opts.top) topView(24, [9, 7]); else { useOrtho(false); flyTo([-16, 36, -20], [9, 0, 9]); }
      break;
    case 'electrical':
      setVisibility({ roof: false, ceiling: false, markers: true });
      if (opts.top) topView(11.5); else { useOrtho(false); flyTo([8.2, 15.5, 21], [8.2, 0.5, 7.8]); }
      applyElecFilter();
      break;
    case 'walk':
      tween = null;
      setVisibility({});
      useOrtho(false);
      orbit.enabled = false;
      persp.fov = 72; persp.updateProjectionMatrix(); walker.fovBase = 72;
      walker.enable(true);
      if (!walker._placed) { teleport('Street'); walker._placed = true; }
      else walker.teleport(walker.pos.x, walker.pos.z, walker.pos.y, THREE.MathUtils.radToDeg(persp.rotation.y));
      break;
  }
  env.setShadowSize(HQ ? 4096 : 2048, m === 'site' ? 40 : 24);
  renderViewbar();
  if (!activeTool) renderModePanel();
}

function applyView(key) {
  const v = VIEWS[key];
  if (v.ctx === false && context) setContext(false);
  if (v.ctx !== false && !context && key !== 'O') setContext(true);
  if (key === 'O' && !context) setContext(true);
  if (orthoElev && v.dir) { orthoElevation(v.dir); currentView = key; renderViewbar(); return; }
  if (camera !== persp) useOrtho(false);
  flyTo(v.pos, v.target);
  currentView = key; renderViewbar();
}
let currentView = 'O';

// ---------------------------------------------------------------------------
// Walk teleports
// ---------------------------------------------------------------------------
const SPOTS = {
  Street: [5.1, 21.0, 0], Porch: [5.0, 14.3, 0], 'Entry & lounge': [5.0, 12.4, 0], Passage: [6.0, 8.8, -90],
  Kitchen: [6.2, 5.6, 0], Family: [2.6, 4.9, 30], Alfresco: [3.9, 0.9, 150], Dining: [7.6, 7.6, 60],
  'W.I.P': [9.4, 4.2, 0], "L'dry": [9.2, 2.2, 0], Garage: [11.4, 5.4, -60], Bath: [11.0, 7.6, 60],
  'Bed 02': [8.0, 12.0, 30], 'Bed 03': [12.6, 10.8, 30], 'Bed 04': [2.6, 8.2, 0], Master: [3.0, 13.6, 45], Ensuite: [1.8, 10.5, 45], 'W.I.R': [2.8, 10.6, 0],
  'Leyden Ct': [23.5, 8.0, 90], Backyard: [2.4, -3.0, 180],
};
function teleport(name) {
  const [x, y, yaw] = SPOTS[name];
  const lvl = levelAt(x * 1000, y * 1000) / 1000;
  walker.teleport(x, y, lvl, yaw);
}

// ---------------------------------------------------------------------------
// UI: view bar
// ---------------------------------------------------------------------------
function chip(label, active, onclick, title = '') {
  const b = document.createElement('button'); b.className = 'chip' + (active ? ' active' : ''); b.textContent = label; b.title = title;
  b.onclick = onclick; return b;
}
function sep() { const s = document.createElement('span'); s.className = 'vsep'; return s; }

function renderViewbar() {
  const v = $('#views'); v.innerHTML = '';
  if (mode === 'exterior') {
    for (const key of ['A', 'B', 'C', 'D', 'O']) v.appendChild(chip(VIEWS[key].label, currentView === key, () => applyView(key), VIEWS[key].sub));
    v.appendChild(sep());
    v.appendChild(chip('Orthographic', orthoElev, () => { orthoElev = !orthoElev; if (!orthoElev) useOrtho(false); applyView(currentView === 'O' && orthoElev ? 'A' : currentView); }, 'True elevation projection (like sheet 03)'));
    v.appendChild(chip('Context', context, () => setContext(!context), 'Neighbours, fences & street trees'));
  } else if (mode === 'plan') {
    v.appendChild(chip('Plan · 2D', camera === ortho, () => setMode('plan')));
    v.appendChild(chip('Dollhouse · 3D', camera === persp, () => setMode('plan', { dollhouse: true })));
    v.appendChild(sep());
    for (const key of ['none', 'plan', 'plumbing', 'frame', 'footing']) v.appendChild(chip(key === 'none' ? 'No overlay' : 'Overlay ' + SHEETS[key].label, overlayKey === key, () => { setOverlay(key); renderViewbar(); }));
  } else if (mode === 'roof') {
    v.appendChild(chip('Roof · 2D', camera === ortho, () => setMode('roof')));
    v.appendChild(chip('Roof · 3D', camera === persp, () => setMode('roof', { threeD: true })));
    v.appendChild(sep());
    v.appendChild(chip('Overlay 08 Roof layout', overlayKey === 'roof', () => { setOverlay(overlayKey === 'roof' ? 'none' : 'roof'); renderViewbar(); }));
  } else if (mode === 'site') {
    v.appendChild(chip('Aerial', camera === persp, () => setMode('site')));
    v.appendChild(chip('Site · 2D', camera === ortho, () => setMode('site', { top: true })));
    v.appendChild(sep());
    v.appendChild(chip('Overlay 01 Site plan', overlayKey === 'site', () => { setOverlay(overlayKey === 'site' ? 'none' : 'site'); renderViewbar(); }));
    v.appendChild(chip('Labels', site.labels.visible, () => { site.labels.visible = !site.labels.visible; renderViewbar(); }));
  } else if (mode === 'electrical') {
    v.appendChild(chip('3D', camera === persp, () => setMode('electrical')));
    v.appendChild(chip('Top · 2D', camera === ortho, () => setMode('electrical', { top: true })));
    v.appendChild(sep());
    const anyOn = [...elec.lights.rooms.values()].some(r => r.on);
    v.appendChild(chip(anyOn ? 'Lights on' : 'Lights off', anyOn, () => { elec.lights.setAll(!anyOn); renderViewbar(); }));
    v.appendChild(chip('Overlay 04 Electrical', overlayKey === 'electrical', () => { setOverlay(overlayKey === 'electrical' ? 'none' : 'electrical'); renderViewbar(); }));
  } else if (mode === 'walk') {
    for (const name of ['Street', 'Porch', 'Entry & lounge', 'Kitchen', 'Family', 'Alfresco', 'Master', 'Bed 02', 'Bed 03', 'Bed 04', 'Bath', 'Ensuite', "L'dry", 'Garage', 'Backyard', 'Leyden Ct'])
      v.appendChild(chip(name, false, () => { teleport(name); }));
  }
}

// ---------------------------------------------------------------------------
// UI: side panel (mode panel or tool panel)
// ---------------------------------------------------------------------------
let activeTool = null;
const panel = $('#panel'), pbody = $('#pbody'), ptitle = $('#ptitle');
function openPanel(title, html) { ptitle.textContent = title; pbody.innerHTML = html; panel.hidden = false; }
$('#pclose').onclick = () => { if (activeTool) closeTool(); else panel.hidden = true; };

function closeTool() {
  if (activeTool === 'measure') measure.setActive(false);
  activeTool = null;
  document.querySelectorAll('#tabs [data-tool]').forEach(b => { if (b.dataset.tool !== 'hq') b.classList.remove('active'); });
  renderModePanel();
}

function renderModePanel() {
  if (mode === 'exterior') {
    openPanel('Exterior', `
      <p class="muted">${PROJECT.title} for <b>${PROJECT.client}</b><br>${PROJECT.address}<br>Job ${PROJECT.job} · Drawing ${PROJECT.drawing} · ${PROJECT.designer}</p>
      <div class="kv"><span>Ceiling height</span><b>2700 (CL 3000 family & lounge)</b></div>
      <div class="kv"><span>Lintel height</span><b>2400</b></div>
      <div class="kv"><span>Roof</span><b>Colorbond @ 22.5° · 450 eave</b></div>
      <div class="kv"><span>Building height</span><b>≈ 5085 above GL</b></div>
      <div class="kv"><span>External doors</span><b>2400 high</b></div>
      <div class="kv"><span>Internal doors</span><b>2100 high</b></div>
      <p class="tip">Drag to orbit · right-drag to pan · scroll to zoom. Click any door (or the garage door) to open/close it.</p>`);
  } else if (mode === 'plan') {
    const rows = ROOMS.map(r => `<tr><td>${r.name}</td><td>${r.dims}</td></tr>`).join('');
    openPanel('Floor plan', `<p class="muted">Single-storey dwelling – plan generated from sheet 02 (1:100). Toggle a drawing overlay from the view bar to compare with the original sheets.</p>
      <label class="row">Overlay opacity <input type="range" id="ovOp" min="0.1" max="1" step="0.05" value="${overlay.material.opacity}"></label>
      <table class="tbl"><tr><th>Room</th><th>Size (mm)</th></tr>${rows}</table>
      <label class="row"><input type="checkbox" id="furnT" checked> Show furniture</label>`);
    $('#ovOp').oninput = e => { overlay.material.opacity = +e.target.value; };
    $('#furnT').onchange = e => { interior.visible = e.target.checked; env.sun.shadow.needsUpdate = true; };
  } else if (mode === 'roof') {
    openPanel('Roof plan', `<p class="muted">Hip roof generated from the building outline + 450mm eave at 22.5° – ridges, hips and valleys follow sheet 08.</p>
      <div class="kv"><span>RF</span><b>Colorbond roof · Monument</b></div><div class="kv"><span>GT</span><b>'D' gutters / fascia · Monument</b></div><div class="kv"><span>DP</span><b>75 dia uPVC · Monument (6)</b></div>
      <p class="tip">Eave gutters to have continuous overflow provisions (BCA 7.4.4A).</p>
      <label class="row">Overlay opacity <input type="range" id="ovOp" min="0.1" max="1" step="0.05" value="${overlay.material.opacity}"></label>`);
    $('#ovOp').oninput = e => { overlay.material.opacity = +e.target.value; };
  } else if (mode === 'site') {
    openPanel('Site · 18A Amsterdam Cr', `<table class="tbl">${SITE.stats.map(([a, b]) => `<tr><td>${a}</td><td><b>${b}</b></td></tr>`).join('')}</table>
      <h4>Proposed landscape schedule</h4>
      <div class="legend"><i style="background:#c9608f"></i>Lagerstroemia indica – small tree</div>
      <div class="legend"><i style="background:#7b5aa6"></i>Salvia leucantha – shrub</div>
      <div class="legend"><i style="background:#5f7f35"></i>Stenotaphrum secundatum – ground cover</div>
      <div class="legend"><i style="background:#b9b6ae"></i>Concrete or slab on ground</div>
      <p class="tip">3000L combined retention & detention tank (2000L retention + 1000L detention). Storm water from paved areas directed to landscape areas.</p>
      <label class="row">Overlay opacity <input type="range" id="ovOp" min="0.1" max="1" step="0.05" value="${overlay.material.opacity}"></label>`);
    $('#ovOp').oninput = e => { overlay.material.opacity = +e.target.value; };
  } else if (mode === 'electrical') {
    const groups = {};
    for (const it of ELECTRICAL) { const t = ELEC_TYPES[it.type]; (groups[t.group] ||= {}); groups[t.group][it.type] = (groups[t.group][it.type] || 0) + 1; }
    let html = '<p class="muted">All symbols from sheet 04 placed in 3D. GPO heights (m above FFL) as annotated. Hover a marker for details. Lights actually work – toggle them here or with wall switches in Walk through.</p>';
    for (const [g, types] of Object.entries(groups)) {
      html += `<label class="row grp"><input type="checkbox" data-grp="${g}" ${elecFilter.has(g) ? 'checked' : ''}> <b>${g}</b></label>`;
      for (const [t, n] of Object.entries(types)) html += `<div class="legend"><i style="background:${ELEC_TYPES[t].color}"></i>${ELEC_TYPES[t].label}<em>${n}</em></div>`;
    }
    html += '<p class="tip">Notes: check the specification for appliances; add power points for all appliances incl. A/C compressor & hot water system; distribution board location may change per site condition.</p>';
    openPanel('Electrical layout', html);
    pbody.querySelectorAll('[data-grp]').forEach(cb => cb.onchange = () => { cb.checked ? elecFilter.add(cb.dataset.grp) : elecFilter.delete(cb.dataset.grp); applyElecFilter(); });
  } else if (mode === 'walk') {
    openPanel('Walk through', `
      <div class="keys">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</div>
        <div><kbd>Mouse</kbd> look</div>
        <div><kbd>Shift</kbd> run</div>
        <div><kbd>Space</kbd> jump</div>
        <div><kbd>C</kbd> crouch</div>
        <div><kbd>E</kbd>/<kbd>Click</kbd> open door · switch lights</div>
        <div><kbd>F</kbd> torch</div>
        <div><kbd>L</kbd> all lights</div>
        <div><kbd>N</kbd> day / night</div>
        <div><kbd>M</kbd> minimap</div>
        <div><kbd>Right mouse</kbd> zoom</div>
        <div><kbd>Esc</kbd> release mouse</div>
      </div>
      <label class="row"><input type="checkbox" id="sndT" ${walker.sound ? 'checked' : ''}> Footstep sounds</label>
      <label class="row">Mouse sensitivity <input type="range" id="sens" min="0.2" max="2" step="0.05" value="${walker.controls.pointerSpeed}"></label>
      <p class="tip">Use the view bar to teleport to any room.</p>`);
    $('#sndT').onchange = e => { walker.sound = e.target.checked; };
    $('#sens').oninput = e => { walker.controls.pointerSpeed = +e.target.value; };
  }
}

function applyElecFilter() {
  elec.markers.children.forEach(o => { const t = ELEC_TYPES[o.userData.type]; o.visible = !t || elecFilter.has(t.group); });
}

// ---------------- Tools ----------------
function openTool(tool) {
  if (tool === 'hq') { setHQ(!HQ); return; }
  if (activeTool === tool) { closeTool(); return; }
  if (activeTool === 'measure') measure.setActive(false);
  activeTool = tool;
  document.querySelectorAll('#tabs [data-tool]').forEach(b => { if (b.dataset.tool !== 'hq') b.classList.toggle('active', b.dataset.tool === tool); });
  if (tool === 'sun') renderSunPanel();
  if (tool === 'measure') {
    if (mode === 'walk') setMode('exterior', { keepCam: false });
    measure.setActive(true);
    openPanel('Measure', `<p class="muted">Click two points on any surface to measure. Results in millimetres (snapped to 10 mm). <kbd>Esc</kbd> cancels the current measurement.</p>
      <label class="row"><input type="checkbox" id="snapT" checked> Snap to 10 mm</label>
      <div id="mlist"></div><button class="btn" id="mclear">Clear all</button>
      <p class="tip">Tip: use Floor plan → Plan · 2D for accurate plan dimensions, or Exterior → Orthographic for heights.</p>`);
    $('#snapT').onchange = e => { measure.snap = e.target.checked; };
    $('#mclear').onclick = () => measure.clear();
    renderMeasureList(measure.items);
  }
  if (tool === 'finishes') renderFinishes();
}
function renderMeasureList(items) {
  const el = $('#mlist'); if (!el) return;
  el.innerHTML = items.length ? items.map((it, i) => `<div class="kv"><span>#${i + 1}</span><b>${it.mm.toLocaleString()} mm</b></div>`).join('') : '<p class="muted">No measurements yet.</p>';
}

function refreshSunPanel() { if (activeTool === 'sun') renderSunPanel(); renderViewbar(); }
function renderSunPanel() {
  const p = env.pos;
  const d = env.date, pad = n => String(n).padStart(2, '0');
  const hh = Math.floor(env.hours), mm = Math.round((env.hours - hh) * 60);
  openPanel('Sun & weather', `
    <label class="row">Date <input type="date" id="sDate" value="${d.y}-${pad(d.m + 1)}-${pad(d.d)}"></label>
    <label class="row col">Time <b id="sTime">${pad(hh)}:${pad(mm % 60)}</b><input type="range" id="sHour" min="4" max="22" step="0.0833" value="${env.hours}"></label>
    <div class="btnrow"><button class="btn" id="sPlay">${sunPlaying ? 'Pause' : 'Play day'}</button><button class="btn" id="sNow">Now</button>
    <button class="btn" data-pre="6">Summer solstice</button><button class="btn" data-pre="12">Winter solstice</button></div>
    <h4>Weather</h4><div class="btnrow">${Object.entries(WEATHER).map(([k, w]) => `<button class="btn ${env.weather === k ? 'on' : ''}" data-w="${k}">${w.label}</button>`).join('')}</div>
    <div class="kv"><span>Sun azimuth</span><b>${p.azimuth.toFixed(1)}° from N</b></div>
    <div class="kv"><span>Sun elevation</span><b>${p.elevation.toFixed(1)}°</b></div>
    <div class="kv"><span>North point</span><b>${PROJECT.northAngleDeg}° (from drawings)</b></div>
    <div class="kv"><span>Location</span><b>${PROJECT.lat.toFixed(3)}, ${PROJECT.lon.toFixed(3)}</b></div>
    <p class="tip">Times are Adelaide local time (daylight saving applied). Interior & exterior lights switch on automatically after dark.</p>`);
  $('#sHour').oninput = e => { env.setHours(+e.target.value); updateSunReadout(); };
  $('#sDate').onchange = e => { const [y, m, dd] = e.target.value.split('-').map(Number); env.setDate(y, m - 1, dd); renderSunPanel(); };
  $('#sPlay').onclick = () => { sunPlaying = !sunPlaying; renderSunPanel(); };
  $('#sNow').onclick = () => { const n = new Date(); env.date = { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() }; env.setHours(n.getHours() + n.getMinutes() / 60); renderSunPanel(); };
  pbody.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { const y = env.date.y; env.setDate(y, b.dataset.pre === '6' ? 11 : 5, 21); renderSunPanel(); });
  pbody.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { env.setWeather(b.dataset.w); renderSunPanel(); });
}
function updateSunReadout() {
  const el = $('#sTime'); if (!el) return;
  const hh = Math.floor(env.hours), mm = Math.floor((env.hours - hh) * 60), pad = n => String(n).padStart(2, '0');
  el.textContent = `${pad(hh)}:${pad(mm)}`;
  const kv = pbody.querySelectorAll('.kv b');
  if (kv[0]) kv[0].textContent = env.pos.azimuth.toFixed(1) + '° from N';
  if (kv[1]) kv[1].textContent = env.pos.elevation.toFixed(1) + '°';
}
let sunPlaying = false;

// ---------------- Finishes ----------------
const finishState = {};
function optionsFor(code) {
  if (['HP1', 'BH2', 'HD'].includes(code)) return PAINT;
  if (code === 'HP2') return { ...PAINT, ...COLORBOND };
  if (code === 'BH1') return TIMBER;
  return COLORBOND;
}
function renderFinishes() {
  const seen = new Set();
  let rows = '';
  for (const s of SCHEDULE) {
    if (s.key === 'entry') { rows += `<tr><td><b>${s.code}</b></td><td>${s.material}</td><td><span class="sw" style="background:${s.hex}"></span>${s.colour}</td></tr>`; continue; }
    const grpKey = s.key;
    const opts = optionsFor(s.code);
    const cur = finishState[grpKey] || s.colour.split(' or ')[0].replace(/^'|'$/g, '');
    const sel = seen.has(grpKey) ? `<span class="muted">as above</span>` : `<select data-key="${grpKey}" data-code="${s.code}">${Object.keys(opts).map(n => `<option ${n === cur || (n === 'Spotted Gum' && s.code === 'BH1' && !finishState[grpKey]) ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
    seen.add(grpKey);
    const hex = opts[cur] || s.hex;
    rows += `<tr><td><b>${s.code}</b></td><td>${s.material}</td><td><span class="sw" style="background:${hex}"></span>${sel}</td></tr>`;
  }
  const fc = getFloorChoice();
  const fsel = (zone, label) => `<label class="row col">${label}<select data-floor="${zone}">${FLOOR_OPTIONS[zone].map(o => `<option value="${o.id}" ${fc[zone] === o.id ? 'selected' : ''}>${o.label}</option>`).join('')}</select></label>`;
  openPanel('Finishes', `
    <h4>Material colour schedule <span class="badge">sheet 03</span></h4>
    <p class="muted">Schedule to be confirmed by client/builder – try alternatives live.</p>
    <table class="tbl fin"><tr><th>Code</th><th>Material</th><th>Colour</th></tr>${rows}</table>
    <button class="btn" id="finReset">Reset to drawing schedule</button>
    <h4>Interior <span class="badge warn">not specified on PD-08</span></h4>
    <p class="muted">Wet areas, laundry, alfresco & porch are shown tiled (hatched on sheet 02). Other interior finishes are selectable options.</p>
    ${fsel('living', 'Living, kitchen, dining, entry & passage')}
    ${fsel('bedroom', 'Bedrooms & robes')}
    ${fsel('wet', 'Bath, ensuite & laundry tiles')}
    ${fsel('outdoor', 'Alfresco & porch tiles')}
    <label class="row col">Internal walls & ceilings<select id="intPaint">${['Lexicon Quarter', 'Natural White', 'Vivid White', 'Hog Bristle', 'Grey Pail'].map(n => `<option>${n}</option>`).join('')}</select></label>`);
  pbody.querySelectorAll('select[data-key]').forEach(sel => sel.onchange = () => {
    const opts = optionsFor(sel.dataset.code), hex = opts[sel.value];
    finishState[sel.dataset.key] = sel.value;
    setColor(sel.dataset.key, hex);
    renderFinishes();
  });
  pbody.querySelectorAll('select[data-floor]').forEach(sel => sel.onchange = () => setFloor(sel.dataset.floor, sel.value));
  $('#intPaint').onchange = e => setInteriorPaint(PAINT[e.target.value]);
  $('#finReset').onclick = () => {
    for (const s of SCHEDULE) { if (s.key === 'entry') continue; setColor(s.key, s.hex); delete finishState[s.key]; }
    renderFinishes();
  };
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
document.querySelectorAll('#tabs [data-mode]').forEach(b => b.onclick = () => {
  if (b.dataset.mode === mode && mode !== 'walk') { if (activeTool) closeTool(); else { panel.hidden = !panel.hidden; if (!panel.hidden) renderModePanel(); } return; }
  if (activeTool && activeTool !== 'sun' && activeTool !== 'finishes') closeTool();
  setMode(b.dataset.mode);
});
document.querySelectorAll('#tabs [data-tool]').forEach(b => b.onclick = () => openTool(b.dataset.tool));
$('#playOverlay').onclick = () => walker.controls.lock();
$('#shot').onclick = () => {
  render(0);
  renderer.domElement.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `lyyden-court-${mode}.png`; a.click(); });
};

// Click doors in orbit modes
{
  const ray = new THREE.Raycaster(); let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (mode === 'walk' || measure.active || !down || e.button !== 0) return;
    if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hits = ray.intersectObjects(interactables.map(i => i.mesh), false);
    const blockers = ray.intersectObjects([house.structGroup, house.roof].filter(g => g.visible), true);
    if (hits.length && (!blockers.length || hits[0].distance <= blockers[0].distance + 0.05)) {
      const it = interactables.find(i => i.mesh === hits[0].object); if (it) it.action();
    }
  });
}

// ---------------------------------------------------------------------------
// Resize + loop
// ---------------------------------------------------------------------------
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (w < 2 || h < 2) return; // pane hidden / minimised
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  persp.aspect = w / h; persp.updateProjectionMatrix();
  const ext = ortho.userData.extent || 12, a = w / h;
  ortho.left = -ext * a; ortho.right = ext * a; ortho.top = ext; ortho.bottom = -ext; ortho.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

const clock = new THREE.Clock();
let hudTimer = 0;
const hudCache = { room: '', hint: null };
function render(dt) {
  if (tween) {
    tween.t += dt / tween.dur;
    const e = tween.t >= 1 ? 1 : 1 - Math.pow(1 - tween.t, 3);
    tween.cam.position.lerpVectors(tween.p0, tween.p1, e);
    tween.ctl.target.lerpVectors(tween.t0, tween.t1, e);
    if (tween.cam !== camera) tween.t = 1;
    if (tween.t >= 1) tween = null;
  }
  if (mode === 'walk') walker.update(dt);
  else { for (const d of doors) d.step(dt); (camera === ortho ? orbitO : orbit).update(); }
  if (sunPlaying) { let h = env.hours + dt * 0.35; if (h > 21) h = 5; env.setHours(h); updateSunReadout(); }
  env.update(dt, camera);
  {
    const cx = camera.position.x * 1000, cz = camera.position.z * 1000;
    const lv = houseLevelAt(cx, cz);
    const inside = (mode === 'walk' && (lv === 0 || lv === -100)) || (mode !== 'walk' && camera === persp && lv !== null && camera.position.y < 2.7);
    env.setInterior(inside ? 0.4 : 1, dt);
  }
  if (env.rain.visible && mode === 'walk') {
    const inside = houseLevelAt(walker.pos.x * 1000, walker.pos.z * 1000) === 0 || houseLevelAt(walker.pos.x * 1000, walker.pos.z * 1000) === -100;
    env.rain.material.opacity = inside ? 0 : 0.45;
  } else env.rain.material.opacity = 0.45;
  elec.lights.update(camera.position);
  if (doors.some(d => d.t !== d.target)) env.sun.shadow.needsUpdate = true;
  if (HQ) composer.render(); else renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

function hud(dt) {
  if (mode !== 'walk') return;
  hudTimer += dt;
  const x = walker.pos.x * 1000, y = walker.pos.z * 1000;
  const r = roomAt(x, y);
  const roomHtml = r ? `${r.name}<span>${r.dims}${r.note ? ' · ' + r.note : ''}</span>` : (x > 18100 || y > 19000 ? 'Street' : 'Outside<span>18A Amsterdam Cr</span>');
  if (roomHtml !== hudCache.room) { $('#roomName').innerHTML = roomHtml; hudCache.room = roomHtml; }
  const f = walker.focus;
  const hintHtml = f ? `<kbd>E</kbd> ${f.hint}` : '';
  if (hintHtml !== hudCache.hint) { $('#hint').innerHTML = hintHtml; $('#hint').hidden = !f; hudCache.hint = hintHtml; }
  if (hudTimer > 0.05) { hudTimer = 0; const d = new THREE.Vector3(); persp.getWorldDirection(d); minimap.draw(x, y, Math.atan2(-d.x, -d.z), doors); }
}

let fpsFrames = 0, fpsTime = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.1);
  fpsFrames++; fpsTime += dt;
  if (fpsTime > 1) { $('#fps').textContent = Math.round(fpsFrames / fpsTime) + ' fps'; fpsFrames = 0; fpsTime = 0; }
  render(dt);
  hud(dt);
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
resize();
setHQ(false);
persp.position.set(46, 34, 52);
setMode('exterior', { view: 'O' });
loop();
setTimeout(() => $('#loading').classList.add('done'), 200);
window.__app = { scene, env, walker, setMode, elec, doors, house, H, ortho, persp, orbit, orbitO, setOverlay, measure };
