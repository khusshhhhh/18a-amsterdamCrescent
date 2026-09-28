// Material library. Geometry uses world-space UVs (1 UV unit = 1 metre), so each
// texture's repeat is set to 1/size-in-metres.
import * as THREE from 'three';
import { TEX } from './textures.js';

export const COLORBOND = {
  Monument: '#323233', Basalt: '#6D6C6E', 'Woodland Grey': '#4B4C46', 'Night Sky': '#1D1D1F', Surfmist: '#E4E2D5',
  'Shale Grey': '#BDBFBA', Windspray: '#888B8A', Dune: '#B1ADA3', Jasper: '#6C6153', Ironstone: '#3E434C',
  Wallaby: '#7F7C78', 'Evening Haze': '#C5C2AA', 'Classic Cream': '#E9DCB8', Paperbark: '#CABFA4',
  'Deep Ocean': '#364152', 'Cottage Green': '#304C3C', 'Manor Red': '#5E1D0E', Terrain: '#67432E',
  'Pale Eucalypt': '#7C846A', Gully: '#857E71', Bluegum: '#969799', Cove: '#A59F8A', Southerly: '#D2D1CB',
};

export const PAINT = {
  'Charmed White': '#ECE9E1', 'Lexicon Quarter': '#F1F1EC', 'Natural White': '#F5F0E3', 'Hog Bristle': '#E4DCC6',
  'Grey Pail': '#D5D4CF', 'Wayward Grey': '#5D5B57', Domino: '#39393A', 'Dover White': '#EFEEE5', 'Vivid White': '#F7F7F5',
  'Timeless Grey': '#C9C7C0', 'Western Myall': '#8C8676',
};

export const TIMBER = { 'Spotted Gum': '#9a6a43', Blackbutt: '#c29a6b', Merbau: '#6e3b24', 'Charcoal stain': '#3a3531', 'Natural Oak': '#b48a5e' };

// Interior finishes are NOT specified on PD-08 → offered as selectable options.
export const FLOOR_OPTIONS = {
  living: [
    { id: 'oak', label: 'Hybrid timber – Natural Oak', make: () => TEX.planks({ base: '#b48a5e' }), rough: 0.55 },
    { id: 'greyoak', label: 'Hybrid timber – Grey Oak', make: () => TEX.planks({ base: '#9c9285' }), rough: 0.55 },
    { id: 'tile', label: 'Porcelain 600x600 – Warm Grey', make: () => TEX.tiles({ base: '#cfcac1', grout: '#b3aea5', veins: true }), rough: 0.35 },
    { id: 'concrete', label: 'Polished concrete', make: () => TEX.concrete('#b5b2ab', { spots: true, size: 4 }), rough: 0.25 },
  ],
  bedroom: [
    { id: 'carpet', label: 'Carpet – Pebble Grey', make: () => TEX.carpet('#8d8a85'), rough: 1 },
    { id: 'carpet2', label: 'Carpet – Oatmeal', make: () => TEX.carpet('#b3a58f'), rough: 1 },
    { id: 'oak', label: 'Hybrid timber – Natural Oak', make: () => TEX.planks({ base: '#b48a5e' }), rough: 0.55 },
  ],
  wet: [
    { id: 'grey', label: 'Porcelain 600x600 – Light Grey', make: () => TEX.tiles({ base: '#d4d2cc', grout: '#aaa7a0' }), rough: 0.4 },
    { id: 'white', label: 'Porcelain 300x600 – White Matt', make: () => TEX.tiles({ base: '#eeede9', grout: '#c8c6c0', tileW: 0.6, tileH: 0.3 }), rough: 0.45 },
    { id: 'terrazzo', label: 'Terrazzo look 600x600', make: () => TEX.tiles({ base: '#dcd8cf', grout: '#b9b4aa', veins: false, vary: 0.02 }), rough: 0.3 },
  ],
  outdoor: [
    { id: 'charcoal', label: 'Outdoor porcelain 600x600 – Charcoal', make: () => TEX.tiles({ base: '#77746f', grout: '#5d5a56' }), rough: 0.7 },
    { id: 'grey', label: 'Outdoor porcelain 600x600 – Grey', make: () => TEX.tiles({ base: '#a19d96', grout: '#85817a' }), rough: 0.7 },
  ],
};

const lib = new Map();
const floorChoice = { living: 'oak', bedroom: 'carpet', wet: 'grey', outdoor: 'charcoal' };

function applyTex(mat, t) {
  const rep = 1 / t.size;
  for (const k of ['map', 'normalMap', 'roughnessMap']) {
    if (t[k]) { t[k].repeat.set(rep, rep); mat[k] = t[k]; }
  }
  mat.needsUpdate = true;
}

function std(key, opts, tex) {
  const m = new THREE.MeshStandardMaterial(opts);
  if (tex) applyTex(m, tex);
  m.name = key;
  lib.set(key, m);
  return m;
}

export function initMaterials() {
  // --- External finishes per the Material Colour Schedule (sheet 03) ---
  std('hp1', { color: 0xffffff, roughness: 0.92 }, TEX.render('#ECE9E1'));
  std('hp2', { color: 0xffffff, roughness: 0.9 }, TEX.render('#5D5B57'));
  std('bh1', { color: 0xffffff, roughness: 0.7 }, TEX.battens({ base: '#9a6a43' }));
  std('bh2', { color: 0xffffff, roughness: 0.9 }, TEX.render('#ECE9E1'));
  std('roof', { color: '#323233', roughness: 0.48, metalness: 0.35 }, TEX.ribNormal());
  lib.get('roof').normalScale = new THREE.Vector2(1.2, 1.2);
  std('gutter', { color: '#323233', roughness: 0.45, metalness: 0.35 });
  std('dp', { color: '#323233', roughness: 0.6, metalness: 0.1 });
  std('frame', { color: '#323233', roughness: 0.4, metalness: 0.5 });
  std('hd', { color: '#EFEEE5', roughness: 0.5 });
  std('entry', { color: 0xffffff, roughness: 0.55 }, TEX.battens({ base: '#6B5847', w: 0.12, gap: 0.006, sizeM: 1.1 }));
  std('pld', { color: '#6D6C6E', roughness: 0.45, metalness: 0.3 });

  // --- Glass ---
  std('glass', { color: '#a9c4d4', roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.22, envMapIntensity: 1.6, depthWrite: false });
  std('obscure', { color: '#e8eef2', roughness: 0.6, metalness: 0, transparent: true, opacity: 0.82 }, TEX.frosted());
  std('mirror', { color: '#dfe7ea', roughness: 0.02, metalness: 1.0, envMapIntensity: 1.4 });

  // --- Interior surfaces ---
  std('plaster', { color: 0xffffff, roughness: 0.95 }, TEX.plaster('#F1F1EC'));
  std('ceiling', { color: '#f7f7f3', roughness: 1 });
  std('poche', { color: '#2b2b2d', roughness: 1 });
  std('wallTile', { color: 0xffffff, roughness: 0.25 }, TEX.tiles({ base: '#efeeea', grout: '#cfcdc7', tileW: 0.3, tileH: 0.6, sizeM: 1.2, px: 512, gloss: true }));
  std('featureTile', { color: 0xffffff, roughness: 0.35 }, TEX.tiles({ base: '#8f8b84', grout: '#6d6a65', tileW: 0.075, tileH: 0.3, sizeM: 0.6, px: 512 }));
  std('intDoor', { color: '#F4F3EE', roughness: 0.45 });
  std('architrave', { color: '#F7F7F4', roughness: 0.4 });
  std('skirting', { color: '#F7F7F4', roughness: 0.4 });

  // --- Floors (selectable) ---
  for (const zone of Object.keys(FLOOR_OPTIONS)) {
    const opt = FLOOR_OPTIONS[zone].find(o => o.id === floorChoice[zone]);
    std('floor_' + zone, { color: 0xffffff, roughness: opt.rough }, opt.make());
  }
  std('garageFloor', { color: 0xffffff, roughness: 0.8 }, TEX.concrete('#b3b0a9', { size: 4 }));

  // --- Joinery & fittings ---
  std('benchtop', { color: '#eeece7', roughness: 0.25 }, TEX.tiles({ base: '#f0eee9', grout: '#f0eee9', tileW: 3, tileH: 3, sizeM: 3, veins: true, vary: 0 }));
  std('cabinet', { color: '#f3f2ee', roughness: 0.55 });
  std('cabinetDark', { color: '#3b3a38', roughness: 0.6 });
  std('woodVeneer', { color: 0xffffff, roughness: 0.6 }, TEX.planks({ base: '#a67a52', plankW: 0.6, plankL: 2.4, sizeM: 2.4 }));
  std('splashback', { color: '#e9eef0', roughness: 0.08, metalness: 0.1 });
  std('steel', { color: '#c9ccce', roughness: 0.28, metalness: 0.9 });
  std('blackGlass', { color: '#0e0e10', roughness: 0.08, metalness: 0.2 });
  std('ceramic', { color: '#fbfbf9', roughness: 0.12 });
  std('chrome', { color: '#e8e8e8', roughness: 0.1, metalness: 1 });
  std('black', { color: '#141414', roughness: 0.5, metalness: 0.2 });
  std('fabric', { color: '#8c8479', roughness: 1 });
  std('fabricDark', { color: '#4a4c50', roughness: 1 });
  std('linen', { color: '#ecebe6', roughness: 1 });
  std('throw', { color: '#9c8d77', roughness: 1 });
  std('rug', { color: 0xffffff, roughness: 1 }, TEX.carpet('#c6bdb0'));
  std('wood', { color: 0xffffff, roughness: 0.55 }, TEX.planks({ base: '#8a6242', plankW: 0.3, plankL: 2, sizeM: 2 }));
  std('screen', { color: '#050608', roughness: 0.15, metalness: 0.5 });
  std('lightOff', { color: '#e9e9e6', roughness: 0.3, emissive: '#000000' });
  std('lightOn', { color: '#fffaf0', roughness: 0.3, emissive: '#fff4dc', emissiveIntensity: 0 });
  std('plastic', { color: '#f2f2ef', roughness: 0.4 });
  std('ac', { color: '#e4e4e0', roughness: 0.5 });

  // --- Site ---
  std('paving', { color: 0xffffff, roughness: 0.9 }, TEX.concrete('#b9b6ae', { size: 5 }));
  std('grass', { color: 0xffffff, roughness: 1 }, TEX.grass());
  std('grassVerge', { color: '#dfe8cf', roughness: 1 }, TEX.grass());
  std('asphalt', { color: 0xffffff, roughness: 0.95 }, TEX.asphalt());
  std('pavers', { color: 0xffffff, roughness: 0.9 }, TEX.pavers());
  std('kerb', { color: '#b8b5ad', roughness: 0.9 });
  std('fenceMetal', { color: 0xffffff, roughness: 0.5, metalness: 0.3 }, TEX.corrugatedFence('#56595a'));
  std('fenceBoard', { color: 0xffffff, roughness: 0.85 }, TEX.boardFence());
  std('tank', { color: '#BDBFBA', roughness: 0.5, metalness: 0.2 });
  std('binLid', { color: '#c9a21a', roughness: 0.6 });
  std('binBody', { color: '#2f4d33', roughness: 0.6 });
  std('neighbourWall', { color: 0xffffff, roughness: 0.95 }, TEX.render('#d8cfc2'));
  std('neighbourRoof', { color: 0xffffff, roughness: 0.8 }, TEX.roofTile());
  std('neighbourRoof2', { color: '#8a8c8b', roughness: 0.5, metalness: 0.3 }, TEX.ribNormal());
  std('trunk', { color: '#6d5a48', roughness: 1 });
  std('trunkGum', { color: '#cfc4b3', roughness: 1 });
  std('leaves', { color: '#4f6b35', roughness: 0.9 });
  std('leavesGum', { color: '#6f8363', roughness: 0.9 });
  std('leavesDark', { color: '#35502c', roughness: 0.9 });
  std('crepe', { color: '#c9608f', roughness: 0.9 });
  std('salvia', { color: '#7b5aa6', roughness: 0.9 });
  std('shrub', { color: '#51703b', roughness: 0.95 });
  std('mulch', { color: '#4f3b2a', roughness: 1 });
  std('road-line', { color: '#f2f2f2', roughness: 0.8 });
  std('boundary', { color: '#ff3b3b', roughness: 1, emissive: '#aa0000', emissiveIntensity: 0.4 });
  return lib;
}

export function M(key) {
  const m = lib.get(key);
  if (!m) { console.warn('missing material', key); return lib.get('plaster'); }
  return m;
}

export function setColor(key, hex) {
  const m = lib.get(key);
  if (!m) return;
  if (m.map && ['hp1', 'hp2', 'bh2'].includes(key)) {
    const t = TEX.render(hex); applyTex(m, t);
  } else if (key === 'bh1') {
    applyTex(m, TEX.battens({ base: hex }));
  } else {
    m.color.set(hex);
  }
}

export function setFloor(zone, id) {
  const opt = FLOOR_OPTIONS[zone].find(o => o.id === id);
  const m = lib.get('floor_' + zone);
  if (!opt || !m) return;
  floorChoice[zone] = id;
  m.roughness = opt.rough;
  applyTex(m, opt.make());
}

export function setInteriorPaint(hex) {
  applyTex(lib.get('plaster'), TEX.plaster(hex));
}

export function getFloorChoice() { return { ...floorChoice }; }
