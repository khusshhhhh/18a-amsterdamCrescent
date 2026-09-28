// ---------------------------------------------------------------------------
// Lyyden Court – 18A Amsterdam Cr, Salisbury Downs SA 5108
// Single storey dwelling for Bluemount Living (JDN Designs, job JDN26-852, PD-08)
//
// All geometry below was extracted from the vector data of drawing set PD-08
// (sheets 01–08). Plan coordinates are in millimetres:
//   x → to the right of the floor plan sheet, y → down the sheet.
//   Origin: outer face of the left (SW) wall = x −11, alfresco post line = y 0.
// Heights are millimetres above finished floor level (FFL = 0).
// In three.js: X = x/1000, Z = y/1000, Y = height/1000.
// ---------------------------------------------------------------------------

export const PROJECT = {
  title: 'Single Storey Dwelling',
  client: 'Bluemount Living',
  address: '18A Amsterdam Cr, Salisbury Downs SA 5108',
  job: 'JDN26-852',
  drawing: 'PD-08',
  designer: 'JDN Designs',
  lat: -34.7755,
  lon: 138.6230,
  // North arrow on sheets 01–08: 21.6° clockwise from "up" on the sheet.
  northAngleDeg: 21.6,
};

export const H = {
  ceiling: 2700,       // CL 2700 typical
  raised: 3000,        // CL 3000 – 300mm raised ceiling (family, lounge)
  lintel: 2400,        // lintel / window head height
  extDoor: 2400,       // external door heights 2400mm
  intDoor: 2100,       // internal door heights 2100mm
  arch: 2100,          // 2.1 x ... flat arch openings
  nib: 2100,           // 2100mm high nib walls
  pitchDeg: 22.5,      // Colorbond roof @ 22.5°
  eave: 450,           // 450mm eave
  eaveLevel: 2780,     // roof surface at the fascia line
  soffit: 2700,
};

// Floor levels (mm relative to FFL)
export const LEVEL = {
  house: 0,
  porch: -50,          // 50mm floor drop (plumbing layout)
  alfresco: -50,       // 50mm floor drop
  garage: -100,
  paving: -150,
  grass: -170,
  verge: -190,
  road: -330,
};

// Material colour schedule – sheet 03 (Elevations). "Schedule to be confirmed by client/builder."
export const SCHEDULE = [
  { code: 'HP1', material: '75mm THK Hebel panel finished external wall', colour: 'Charmed White', hex: '#ECE9E1', key: 'hp1' },
  { code: 'HP2', material: 'Hebel finished column', colour: 'Wayward Grey', hex: '#5D5B57', key: 'hp2' },
  { code: 'BH1', material: 'Timber feature bulkhead', colour: '— (natural timber)', hex: '#9A6A43', key: 'bh1' },
  { code: 'BH2', material: 'Hardieflex bulkhead', colour: 'Charmed White', hex: '#ECE9E1', key: 'bh2' },
  { code: 'DP', material: '75 dia. uPVC down pipe', colour: 'Monument', hex: '#323233', key: 'dp' },
  { code: 'RF', material: 'Colorbond roof @ 22.5° pitch', colour: 'Monument', hex: '#323233', key: 'roof' },
  { code: 'GT', material: "'D' Colorbond gutters fixed to Colorbond steel fascias", colour: 'Monument', hex: '#323233', key: 'gutter' },
  { code: 'ED', material: 'Entry door', colour: '— (feature)', hex: '#6B5847', key: 'entry' },
  { code: 'HD', material: 'Hinge door', colour: 'Dover White or similar', hex: '#EFEEE5', key: 'hd' },
  { code: 'PLD', material: 'Colorbond panel-lift door', colour: 'Basalt', hex: '#6D6C6E', key: 'pld' },
  { code: 'AAW', material: 'Awning aluminium window', colour: 'Monument', hex: '#323233', key: 'frame' },
  { code: 'ASW', material: 'Aluminium sliding window', colour: 'Monument', hex: '#323233', key: 'frame' },
  { code: 'ASD', material: 'Aluminium sliding door', colour: 'Monument', hex: '#323233', key: 'frame' },
  { code: 'AFW', material: 'Aluminium fix window', colour: 'Monument', hex: '#323233', key: 'frame' },
];

// ---------------------------------------------------------------------------
// WALLS
// rect: [x1, y1, x2, y2]; ext: which long face is external (N = −y, S = +y, E = +x, W = −x)
// openings are intervals along the wall's long axis.
//   type: 'win' | 'door' | 'arch' | 'slider' | 'pld'
//   style (windows): ASW sliding, AAW awning, AFW fixed; obscure = obscured glass
// ---------------------------------------------------------------------------
const W = (id, rect, opts = {}) => ({ id, rect, h: H.ceiling, base: 0, ext: null, kind: 'int', openings: [], ...opts });

export const WALLS = [
  // ----- External walls (outer face → inner face) -----
  W('ext-back', [-11, 1990, 8416, 2180], {
    kind: 'ext', ext: 'N', base: -200, openings: [
      { a: 715, b: 3763, type: 'slider', sill: 0, head: 2400, label: '2.4 x 3.048W ASD', id: 'asd' },
      { a: 5177, b: 7228, type: 'win', style: 'AFW', sill: 1000, head: 1600, label: '0.6 x 2.05W AFW' },
    ],
  }),
  W('ext-ldry-w', [8416, 790, 8604, 2180], { kind: 'ext', ext: 'W', base: -200 }),
  W('ext-top', [8416, 790, 16396, 980], {
    kind: 'ext', ext: 'N', base: -200, openings: [
      { a: 8706, b: 9654, type: 'door', sill: 0, head: 2400, style: 'HD', hinge: 'a', swing: +1, id: 'd-ldry-ext', label: "L'dry hinge door (HD)" },
      { a: 10505, b: 11455, type: 'door', sill: 0, head: 2400, style: 'HD', hinge: 'a', swing: +1, id: 'd-gar-ext', label: 'Garage hinge door (HD)' },
    ],
  }),
  W('ext-garage-e', [16205, 790, 16396, 6596], {
    kind: 'ext', ext: 'E', base: -200, openings: [
      { a: 1293, b: 6092, type: 'pld', sill: -100, head: 2400, id: 'pld', label: '2.4 x 4.8W panel lift door (PLD)' },
    ],
  }),
  W('ext-garage-s', [13301, 6405, 16396, 6596], { kind: 'ext', ext: 'S', base: -200 }),
  W('ext-east', [13301, 6496, 13490, 11466], {
    kind: 'ext', ext: 'E', base: -200, openings: [
      { a: 6830, b: 8041, type: 'win', style: 'ASW', sill: 1371, head: 2400, obscure: true, label: '1.029 x 1.21W ASW' },
      { a: 8918, b: 10969, type: 'win', style: 'AAW', sill: 343, head: 2400, label: '2.057 x 2.05W AAW' },
    ],
  }),
  W('ext-bed3-s', [9709, 11275, 13490, 11466], {
    kind: 'ext', ext: 'S', base: -200, openings: [
      { a: 10670, b: 12721, type: 'win', style: 'AAW', sill: 343, head: 2400, label: '2.057 x 2.05W AAW' },
    ],
  }),
  W('ext-step-e', [9709, 11466, 9900, 12865], { kind: 'ext', ext: 'E', base: -200 }),
  W('ext-bed2-s', [6221, 12675, 9900, 12865], {
    kind: 'ext', ext: 'S', base: -200, openings: [
      { a: 7129, b: 9180, type: 'win', style: 'AAW', sill: 343, head: 2400, label: '2.057 x 2.05W AAW' },
    ],
  }),
  W('ext-entry-e', [6221, 12865, 6409, 13365], { kind: 'ext', ext: 'E', base: -200 }),
  W('ext-entry-s', [3711, 13176, 6409, 13365], {
    kind: 'ext', ext: 'S', base: -200, openings: [
      { a: 4000, b: 5099, type: 'door', sill: 0, head: 2400, style: 'ED', hinge: 'a', swing: -1, id: 'd-entry', label: 'Entry door (ED)' },
      { a: 5260, b: 5870, type: 'win', style: 'AAW', sill: 343, head: 2400, label: '2.057 x 0.610W AAW' },
    ],
  }),
  W('ext-master-e', [3711, 13365, 3899, 14446], { kind: 'ext', ext: 'E', base: -200 }),
  W('ext-master-s', [-11, 14256, 3899, 14446], {
    kind: 'ext', ext: 'S', base: -200, openings: [
      { a: 730, b: 2779, type: 'win', style: 'AAW', sill: 343, head: 2400, label: '2.057 x 2.05W AAW' },
    ],
  }),
  W('ext-west', [-11, 1990, 180, 14446], {
    kind: 'ext', ext: 'W', base: -200, openings: [
      { a: 2955, b: 5006, type: 'win', style: 'ASW', sill: 600, head: 2400, label: '1.8 x 2.050W ASW' },
      { a: 6346, b: 8397, type: 'win', style: 'ASW', sill: 600, head: 2400, label: '1.8 x 2.050W ASW' },
      { a: 10086, b: 10937, type: 'win', style: 'ASW', sill: 1543, head: 2400, obscure: true, label: '0.857 x 0.850W ASW (obscured)' },
    ],
  }),

  // ----- Internal walls (90mm stud) -----
  W('int-gar-bath', [10406, 6405, 13301, 6496]),
  W('int-fam-bed4', [180, 5781, 3799, 5872]),
  W('int-hall-w', [3711, 5781, 3799, 13176], {
    openings: [
      { a: 7827, b: 8776, type: 'door', sill: 0, head: 2100, hinge: 'b', swing: -1, id: 'd-bed4', label: 'Bedroom 04 door 870' },
      { a: 11157, b: 12105, type: 'door', sill: 0, head: 2100, hinge: 'a', swing: -1, id: 'd-master', label: 'Master suite door 870' },
    ],
  }),
  W('int-bed4-ens', [180, 8877, 3711, 8966]),
  W('int-ens-wir', [2191, 8966, 2280, 10966], {
    openings: [{ a: 9917, b: 10867, type: 'door', sill: 0, head: 2100, hinge: 'b', swing: -1, id: 'd-ens', label: 'Ensuite door 870' }],
  }),
  W('int-ens-master', [180, 10966, 3711, 11057], {
    openings: [{ a: 2280, b: 3179, type: 'arch', sill: 0, head: 2100, label: '2.1 x 0.9W flat arch opening' }],
  }),
  W('int-bir4', [3109, 7631, 3711, 7722]),
  W('int-kit-e', [8515, 2180, 8604, 5156], {
    openings: [{ a: 3020, b: 3920, type: 'arch', sill: 0, head: 2100, label: '2.1 x 0.9W flat arch opening' }],
  }),
  W('int-ldry-wip', [8604, 2830, 10315, 2921], {
    openings: [{ a: 8706, b: 9605, type: 'arch', sill: 0, head: 2100, label: '2.1 x 0.9W flat arch opening' }],
  }),
  W('int-garage-w', [10315, 980, 10406, 6496], {
    openings: [{ a: 5205, b: 6081, type: 'door', sill: 0, head: 2100, hinge: 'b', swing: +1, id: 'd-garage', label: 'Garage door 870' }],
  }),
  W('int-wip-s', [8515, 5065, 10315, 5156]),
  W('int-bath-n', [8515, 6206, 10315, 6295], { niche: { x: 9250, w: 400, h: 600, sill: 1200, side: 'N', label: 'Niche C 400W x 600H' } }),
  W('int-bath-w', [8515, 6206, 8604, 8276]),
  W('int-shower-nib', [8604, 7195, 10315, 7286], { h: H.nib, kind: 'nib' }),
  W('int-bath-s', [8515, 8185, 13301, 8276], {
    openings: [{ a: 9205, b: 10156, type: 'door', sill: 0, head: 2100, hinge: 'a', swing: -1, id: 'd-bath', label: 'Bathroom door 870' }],
  }),
  W('int-nib-passage', [4919, 8185, 7315, 8276], { h: H.nib, kind: 'nib', niche: { x: 6117, w: 1750, h: 600, sill: 1200, side: 'N', through: false, label: 'Niche B 1750W x 600H' } }),
  W('int-arch-header', [7315, 8185, 8515, 8276], { base: H.arch, kind: 'header' }),
  W('int-bed3-w', [10156, 8276, 10245, 9385], {
    openings: [{ a: 8350, b: 9301, type: 'door', sill: 0, head: 2100, hinge: 'b', swing: +1, id: 'd-bed3', label: 'Bedroom 03 door 870' }],
  }),
  W('int-passage-s', [6221, 9385, 10399, 9476], {
    openings: [{ a: 6409, b: 7360, type: 'door', sill: 0, head: 2100, hinge: 'a', swing: +1, id: 'd-bed2', label: 'Bedroom 02 door 870' }],
  }),
  W('int-lounge-bed2', [6221, 9476, 6310, 12675]),
  W('int-bir2', [6310, 10374, 6911, 10465]),
  W('int-bed2-bed3', [9709, 9476, 9800, 11275]),
  W('int-ens-part', [1179, 8966, 1270, 9466], { h: H.nib, kind: 'nib' }),
  W('int-ens-nib', [180, 9967, 950, 10056], { h: H.nib, kind: 'nib' }),
];

// Hebel finished columns / piers (HP2 – Wayward Grey)
export const COLUMNS = [
  { rect: [-11, 0, 339, 350], h: H.ceiling, label: '350mm sq Hebel finished column' },
  { rect: [4150, 0, 4500, 350], h: H.ceiling, label: '350mm sq Hebel finished column' },
  { rect: [3520, 14446, 3899, 14965], h: H.ceiling, label: 'Hebel pier' },
  { rect: [6029, 14585, 6409, 14965], h: 2100, label: '380mm sq Hebel finished column' },
  { rect: [13490, 8041, 13871, 8420], h: H.ceiling, label: 'Hebel feature pier', base: -200 },
];

// Bulkheads: BH1 timber feature, BH2 Hardieflex (Charmed White)
export const BULKHEADS = [
  { rect: [339, 0, 4150, 350], bottom: 2350, top: 2700, type: 'bh2', label: '350H x 350W bulkhead (BH2)' },
  { rect: [-11, 350, 339, 1990], bottom: 2350, top: 2700, type: 'bh2', label: '350H x 350W bulkhead (BH2)' },
  { rect: [4150, 350, 4500, 1990], bottom: 2350, top: 2700, type: 'bh2', label: '350H x 350W bulkhead (BH2)' },
  { rect: [3899, 14585, 6029, 14965], bottom: 2100, top: 2700, type: 'bh1', label: '600H x 380W timber bulkhead (BH1)' },
  { rect: [6029, 13365, 6409, 14585], bottom: 2100, top: 2700, type: 'bh1', label: '600H x 380W timber bulkhead (BH1)' },
  { rect: [6029, 14585, 6409, 14965], bottom: 2100, top: 2700, type: 'bh1', label: '' },
];

// Building outline (outer face, incl. alfresco & porch) – used for slab & roof
export const OUTLINE = [
  [-11, 0], [4500, 0], [4500, 1990], [8416, 1990], [8416, 790], [16396, 790],
  [16396, 6596], [13490, 6596], [13490, 11466], [9900, 11466], [9900, 12865],
  [6409, 12865], [6409, 14965], [3520, 14965], [3520, 14446], [-11, 14446],
];

// Enclosed house outline (heated area + garage), no alfresco/porch
export const HOUSE_OUTLINE = [
  [-11, 1990], [8416, 1990], [8416, 790], [16396, 790], [16396, 6596], [13490, 6596],
  [13490, 11466], [9900, 11466], [9900, 12865], [6409, 12865], [6409, 13365],
  [3899, 13365], [3899, 14446], [-11, 14446],
];

// Raised ceiling (CL 3000) areas – dashed/blue hatched on floor plan
export const RAISED_CEILINGS = [
  { rect: [800, 2790, 3550, 5205], name: 'Family' },
  { rect: [4315, 9380, 5740, 12670], name: 'Lounge' },
];

// ---------------------------------------------------------------------------
// ROOMS (name, rects, floor finish zone, and drawing dimensions)
// ---------------------------------------------------------------------------
export const ROOMS = [
  { id: 'alfresco', name: 'Alfresco', rects: [[-11, 0, 4500, 1990]], floor: 'outdoorTile', level: LEVEL.alfresco, dims: '4500 x 2000', note: '9.00 m² · 50mm floor drop' },
  { id: 'family', name: 'Family', rects: [[180, 2180, 3711, 5781]], floor: 'living', dims: '3620 x 3600', note: 'CL 3000 raised ceiling' },
  { id: 'kitchen', name: 'Kitchen', rects: [[3711, 2180, 8515, 5156]], floor: 'living', dims: '4715 (dining & kitchen)', note: 'CL 2700' },
  { id: 'dining', name: 'Dining', rects: [[3799, 5156, 8515, 8185], [8515, 5156, 10315, 6206]], floor: 'living', dims: '4715 x 5970 (kitchen & dining)' },
  { id: 'wip', name: 'W.I.P (Walk-in pantry)', rects: [[8604, 2921, 10315, 5065]], floor: 'living', dims: '1710 x 2145' },
  { id: 'laundry', name: "L'dry (Laundry)", rects: [[8604, 980, 10315, 2830]], floor: 'wetTile', dims: '1710 x 1850', note: '50mm setdown to wet area' },
  { id: 'garage', name: 'Double Garage', rects: [[10406, 980, 16205, 6405]], floor: 'garage', level: LEVEL.garage, dims: '5800 x 5425', note: '34.19 m²' },
  { id: 'bath', name: 'Bath', rects: [[8604, 6295, 10315, 8185], [10315, 6496, 13301, 8185]], floor: 'wetTile', dims: '4695 x 1690', note: '50mm setdown to wet area' },
  { id: 'bed4', name: 'Bedroom 04', rects: [[180, 5872, 3711, 8877]], floor: 'bedroom', dims: '2930 x 3005 + B.I.R.' },
  { id: 'ens', name: 'Ensuite', rects: [[180, 8966, 2191, 10966]], floor: 'wetTile', dims: '2000 (ens & W.I.R)' },
  { id: 'wir', name: 'W.I.R (Walk-in robe)', rects: [[2280, 8966, 3711, 10966]], floor: 'bedroom', dims: '2000 (ens & W.I.R)' },
  { id: 'master', name: 'Master Suite', rects: [[180, 11057, 3711, 14256]], floor: 'bedroom', dims: '3530 x 3200' },
  { id: 'passage', name: 'Passage', rects: [[3799, 8276, 10156, 9385]], floor: 'living', dims: '6355' },
  { id: 'lounge', name: 'Entry & Lounge', rects: [[3799, 9385, 6221, 13176]], floor: 'living', dims: '2420 x 4900', note: 'CL 3000 raised ceiling' },
  { id: 'bed2', name: 'Bedroom 02', rects: [[6310, 9476, 9709, 12675]], floor: 'bedroom', dims: '2800 x 3200 + B.I.R.' },
  { id: 'bed3', name: 'Bedroom 03', rects: [[10245, 8276, 13301, 9476], [9800, 9476, 13301, 11275]], floor: 'bedroom', dims: '2900 x 3000 + B.I.R.' },
  { id: 'porch', name: 'Porch', rects: [[3899, 13365, 6409, 14965]], floor: 'outdoorTile', level: LEVEL.porch, dims: '2510 x 1600', note: '4.21 m² · 50mm floor drop' },
];

// Built-in robes (sliding doors) – front face line
export const ROBES = [
  { rect: [3109, 5872, 3711, 7631], front: 'W', name: 'Bed 04 B.I.R.' },
  { rect: [6310, 10465, 6911, 12675], front: 'E', name: 'Bed 02 B.I.R.' },
  { rect: [9800, 9476, 10399, 11275], front: 'E', name: 'Bed 03 B.I.R.' },
];

// ---------------------------------------------------------------------------
// FIXTURES & FURNITURE (plan positions read from sheets 02 and 05)
// ---------------------------------------------------------------------------
export const FIXTURES = {
  kitchenBench: { rect: [4300, 2180, 8515, 2780], h: 900 },
  fridgeSpace: { rect: [7420, 2180, 8515, 2900] },
  cooktop: { x: 6180, y: 2480, w: 900 },
  microwave: { x: 4650, y: 2480 },
  island: { rect: [5160, 3976, 7580, 4700], h: 900 },
  islandSink: { x: 5450, y: 4220 },
  dishwasher: { x: 6200, y: 4250 },
  overheads: { rect: [4300, 2180, 7420, 2530], bottom: 1650, top: 2400 },
  wipShelves: { rect: [8604, 2921, 10315, 5065] },
  laundryBench: { rect: [9730, 980, 10315, 2830], tub: { x: 10020, y: 1270 }, machines: { x: 10020, y: 1950 } },
  ensShower: { rect: [180, 8966, 1179, 9967] },
  ensVanity: { rect: [1270, 8966, 2191, 9466] },
  ensWC: { x: 450, y: 10450, facing: 'E' },
  bathShower: { rect: [8604, 6295, 10315, 7195] },
  bathVanity: { rect: [8604, 7286, 9150, 8185] },
  bathWC: { x: 11420, y: 6780, facing: 'S' },
  bathTub: { rect: [12530, 6560, 13301, 8150] },
  wirShelves: { rect: [2280, 8966, 3711, 10966] },
};

export const FURNITURE = [
  { type: 'sofa', rect: [1100, 2820, 3900, 3640], facing: 'S' },
  { type: 'coffeeTable', rect: [1560, 3980, 2450, 4870] },
  { type: 'tvUnit', rect: [1050, 5480, 3300, 5781] },
  { type: 'rug', rect: [900, 3700, 3500, 5200] },
  { type: 'dining', rect: [5250, 6350, 7030, 7110], chairs: 6 },
  { type: 'stools', xs: [5820, 6420, 7020], y: 4960 },
  { type: 'bed', rect: [880, 5872, 2560, 8000], head: 'N', size: 'queen', room: 'bed4' },
  { type: 'bedside', x: 560, y: 6120 }, { type: 'bedside', x: 2860, y: 6120 },
  { type: 'bed', rect: [180, 12000, 2240, 14040], head: 'W', size: 'king', room: 'master' },
  { type: 'bedside', x: 450, y: 11620 }, { type: 'bedside', x: 450, y: 14000 },
  { type: 'bed', rect: [8100, 9476, 9709, 11500], head: 'N', size: 'queen', room: 'bed2' },
  { type: 'bed', rect: [11440, 8276, 12800, 10200], head: 'N', size: 'double', room: 'bed3' },
  { type: 'outdoorSetting', rect: [700, 500, 3300, 1500] },
];

// Downpipes (DP) – floor plan & roof plan
export const DOWNPIPES = [
  [-70, 2150], [7650, 1930], [16460, 1000], [13560, 8480], [6470, 12930], [-70, 13700],
];

// Other external services
export const SERVICES = [
  { type: 'hws', x: 7592, y: 1920, label: 'Hot water system (HWS)' },
  { type: 'ac', x: 8040, y: 1390, label: 'A/C compressor unit' },
  { type: 'meter', x: -11, y: 13108, label: 'Gas & ETSA meter / distribution board' },
  { type: 'tap', x: 4300, y: 1960, label: 'Garden tap' },
  { type: 'tap', x: -40, y: 12480, label: 'Garden tap' },
  { type: 'tank', x: -750, y: -2150, r: 600, h: 2000, label: '3000L combined retention & detention tank' },
  { type: 'bins', x: 3600, y: -3200, label: 'Bins' },
];

// ---------------------------------------------------------------------------
// ELECTRICAL (sheet 04). Positions clustered from the coloured symbols.
// h = height above FFL (mm). GPO heights are those annotated on the sheet.
// ---------------------------------------------------------------------------
const DL = (x, y, room) => ({ type: 'downlight', x, y, room });
export const ELECTRICAL = [
  DL(4965, 14057, 'Porch'), DL(5009, 10290, 'Lounge'), DL(5009, 8913, 'Passage'), DL(1062, 12739, 'Master'),
  DL(2827, 12739, 'Master'), DL(1646, 8130, 'Bed 04'), DL(1646, 6627, 'Bed 04'), DL(5009, 11935, 'Entry'),
  DL(7582, 8913, 'Passage'), DL(2744, 10298, 'W.I.R'), DL(3104, 4863, 'Family'), DL(3104, 3262, 'Family'),
  DL(1245, 3262, 'Family'), DL(1245, 4863, 'Family'), DL(4978, 3461, 'Kitchen'), DL(7335, 3461, 'Kitchen'),
  DL(4978, 6762, 'Dining'), DL(7335, 6762, 'Dining'), DL(8310, 11958, 'Bed 02'), DL(8310, 10357, 'Bed 02'),
  DL(11850, 10607, 'Bed 03'), DL(11850, 9108, 'Bed 03'), DL(9415, 5775, 'Hall'), DL(9235, 3850, 'W.I.P'),
  DL(9160, 1987, "L'dry"), DL(1289, 1247, 'Alfresco'), DL(3190, 1247, 'Alfresco'),
  { type: 'pendant', x: 5770, y: 4428, room: 'Kitchen island' },
  { type: 'pendant', x: 6970, y: 4428, room: 'Kitchen island' },
  { type: 'batten', x: 13157, y: 3693, len: 1200, room: 'Garage' },
  { type: 'hle', x: 1487, y: 10294, room: 'Ensuite' },
  { type: 'hle', x: 11344, y: 7627, room: 'Bath' },
  { type: 'smoke', x: 4053, y: 9963 }, { type: 'smoke', x: 9497, y: 8830 },
  { type: 'walllight', x: 13922, y: 624, h: 2150, room: 'External' },
  { type: 'walllight', x: 14945, y: 6760, h: 2150, room: 'External' },
  { type: 'walllight', x: 10065, y: 12162, h: 2150, room: 'External' },
  { type: 'walllight', x: -176, y: 9243, h: 2150, room: 'External' },
  { type: 'walllight', x: -176, y: 2474, h: 2150, room: 'External' },
  { type: 'walllight', x: 6199, y: 1824, h: 2150, room: 'Alfresco' },
  { type: 'walllight', x: 6220, y: 15119, h: 1900, room: 'Porch column', face: 'S' },
  { type: 'walllight', x: 3709, y: 15119, h: 1900, room: 'Porch pier', face: 'S' },
  // GPOs (double) with annotated heights
  { type: 'gpo', x: 15461, y: 1233, h: 300 }, { type: 'gpo', x: 15700, y: 1233, h: 1500, note: 'Power supply for modem' },
  { type: 'gpo', x: 13642, y: 3690, h: 2700, note: 'Panel lift door G.P.O.', ceiling: true },
  { type: 'gpo', x: 7820, y: 9737, h: 300 }, { type: 'gpo', x: 11283, y: 8537, h: 300 },
  { type: 'gpo', x: 337, y: 13774, h: 300 }, { type: 'gpo', x: 337, y: 11633, h: 300 },
  { type: 'gpo', x: 576, y: 6134, h: 300 }, { type: 'gpo', x: 2715, y: 6134, h: 300 },
  { type: 'gpo', x: 6064, y: 12445, h: 300 }, { type: 'gpo', x: 13143, y: 11013, h: 300 },
  { type: 'gpo', x: 9554, y: 12288, h: 300 }, { type: 'gpo', x: 2034, y: 9250, h: 1100 },
  { type: 'gpo', x: 8868, y: 7930, h: 1100 }, { type: 'gpo', x: 2152, y: 5534, h: 1100 },
  { type: 'gpo', x: 546, y: 1740, h: 300, ext: true }, { type: 'gpo', x: 7991, y: 2457, h: 1800 },
  { type: 'gpo', x: 7289, y: 2435, h: 1100 }, { type: 'gpo', x: 5117, y: 2435, h: 1100 },
  { type: 'gpo', x: 6393, y: 2436, h: 300, note: 'Oven' }, { type: 'gpo', x: 6015, y: 2441, h: 2100, note: 'Range hood' },
  { type: 'gpo', x: 6194, y: 4700, h: 300, note: 'Island' }, { type: 'gpo', x: 10034, y: 2008, h: 300 },
  { type: 'gpo', x: 7145, y: 7869, h: 300 }, { type: 'gpo', x: 8887, y: 4383, h: 1100 },
  { type: 'gpo', x: -287, y: 13567, h: 300, ext: true }, { type: 'gpo', x: 337, y: 2654, h: 300 },
  { type: 'gpo', x: 4641, y: 2435, h: 1500, note: 'Microwave' },
  // Switches (single/double/triple/four gang, 2-way)
  { type: 'switch', x: 2411, y: 10790 }, { type: 'switch', x: 10567, y: 4881 }, { type: 'switch', x: 3723, y: 7516, gang: 4 },
  { type: 'switch', x: 3548, y: 12171 }, { type: 'switch', x: 8737, y: 3912 }, { type: 'switch', x: 2028, y: 9699, gang: 3 },
  { type: 'switch', x: 7508, y: 9637 }, { type: 'switch', x: 10443, y: 9253 }, { type: 'switch', x: 10407, y: 8053, gang: 3 },
  { type: 'switch', x: 4142, y: 2341, gang: 2 }, { type: 'switch', x: 5222, y: 13012, gang: 3 }, { type: 'switch', x: 8768, y: 2600 },
  { type: 'switch', x: 3600, y: 7560 },
  { type: 'switch2', x: 3947, y: 7555 }, { type: 'switch2', x: 9869, y: 9237 }, { type: 'switch2', x: 5339, y: 13027 }, { type: 'switch2', x: 10553, y: 5006 },
  // Communications & services
  { type: 'tv', x: 2519, y: 5700, h: 300 }, { type: 'phone', x: 1447, y: 5700, h: 300 }, { type: 'nbnOutlet', x: 1824, y: 5700, h: 300 },
  { type: 'nbnBox', x: 14726, y: 1000, h: 1500 },
  { type: 'acPanel', x: 3860, y: 6372, h: 1500 },
  { type: 'security', x: 16420, y: 4300, h: 2400 },
];

export const ELEC_TYPES = {
  downlight: { label: 'Down light', color: '#b14bff', group: 'Lighting' },
  pendant: { label: 'Pendant (2-way circuit)', color: '#b14bff', group: 'Lighting' },
  walllight: { label: 'Wall / outdoor light', color: '#b14bff', group: 'Lighting' },
  batten: { label: 'Batten light', color: '#ff2fbf', group: 'Lighting' },
  hle: { label: 'Heat / light / exhaust', color: '#3050ff', group: 'Lighting' },
  smoke: { label: 'Smoke alarm', color: '#ff2b2b', group: 'Safety' },
  security: { label: 'Security sensor', color: '#222222', group: 'Safety' },
  gpo: { label: 'Double G.P.O.', color: '#00a040', group: 'Power' },
  switch: { label: 'Switch (1–4 gang)', color: '#00b8ff', group: 'Switches' },
  switch2: { label: '2-way switch', color: '#1060ff', group: 'Switches' },
  tv: { label: 'TV outlet', color: '#1060ff', group: 'Comms' },
  phone: { label: 'Telephone outlet', color: '#ff2b2b', group: 'Comms' },
  nbnOutlet: { label: 'N.B.N outlet', color: '#ff2fbf', group: 'Comms' },
  nbnBox: { label: 'NBN provision', color: '#1060ff', group: 'Comms' },
  acPanel: { label: 'A/C control panel', color: '#ff2fbf', group: 'HVAC' },
};

// ---------------------------------------------------------------------------
// SITE (sheet 01, 1:200) – boundary vertices derived from the bearing lengths
// 28.55 / 12.43 / 10.00 / 6.34 / 5.50 / 5.50 / 5.50 / 9.23 m
// ---------------------------------------------------------------------------
export const SITE = {
  boundary: [
    [-1721, -7764], [8081, -126], [18082, -126], [18135, 6207],
    [16583, 11464], [13249, 15839], [8433, 18467], [-510, 20760],
  ],
  boundaryLabels: ['12.43', '10.00', '6.34', '5.50', '5.50', '5.50', '9.23', '28.55'],
  stats: [
    ['Total site area', '364.81 m²'],
    ['Living', '138.14 m²'], ['Alfresco', '9.00 m²'], ['Porch', '4.21 m²'], ['Double garage', '34.19 m²'],
    ['Total building area', '185.54 m²'], ['Total building coverage', '50.86 %'],
    ['Total private open space', '53.59 m² (14.69 %)'], ['Soft landscaping', '102.24 m² (28.03 %)'],
  ],
  // Stenotaphrum secundatum (buffalo) – soft landscape areas
  lawns: [
    [[-1721, -7764], [8081, -126], [8081, 1100], [5200, 1100], [5200, -1000], [-900, -1000], [-900, 15000], [-755, 15000]],
    [[-755, 15250], [4600, 15250], [4600, 19450], [-510, 20760]],
    [[5600, 19240], [5600, 15450], [7200, 15450], [7200, 13900], [10900, 13900], [10900, 12500], [14900, 12500], [14900, 7200], [17840, 7200], [16583, 11464], [13249, 15839], [8433, 18467]],
  ],
  path: [[4600, 14965], [5600, 14965], [5600, 19240], [4600, 19450]],
  crossover: [[18100, 1000], [22200, 1000], [22200, 6200], [18120, 6200]],
  lagerstroemia: [[-350, -4700]],
  salvia: [[-170, 16200], [-150, 17150], [-130, 18100], [-110, 19050]],
  trees: [
    { x: 1500, y: 22800, h: 25000, can: 15000, trunk: 800, kind: 'native', label: 'Native · canopy 15m · height 25m' },
    { x: 12500, y: -6500, h: 5000, can: 3000, trunk: 200, kind: 'evergreen', label: 'Evergreen · canopy 3m · height 5m' },
    { x: 21800, y: -7800, h: 6000, can: 2000, trunk: 200, kind: 'native', label: 'Native · canopy 2m · height 6m' },
    { x: 16800, y: -1500, h: 3000, can: 1000, trunk: 100, kind: 'evergreen', label: 'Evergreen · canopy 1m · height 3m' },
  ],
  shrubRows: [
    [[1200, -8200], [6800, -3900]],
    [[19400, -9000], [19400, -1200]],
  ],
  fences: [
    { from: [-1721, -7764], to: [-755, 15000], h: 1800, type: 'metal', label: '1.8m existing metal fence' },
    { from: [-1721, -7764], to: [8081, -126], h: 1800, type: 'metal', label: '1.8m existing metal fence' },
    { from: [8081, -126], to: [18082, -126], h: 1000, type: 'board', label: '1.0m existing horizontal board fence' },
  ],
  neighbours: [
    { x: -8500, y: 7500, w: 10000, d: 15000, rot: -2.4, label: 'House under construction · single storey (lock-up stage)' },
    { x: 1500, y: -15500, w: 13000, d: 9000, rot: 37.9, label: 'Existing house · single storey' },
    { x: 13200, y: -9500, w: 9000, d: 10000, rot: 0, label: 'Unit 4 No 18A' },
    { x: 44500, y: 2000, w: 12000, d: 15000, rot: 0, label: '' },
    { x: 44500, y: 22500, w: 12000, d: 14000, rot: 0, label: '' },
  ],
  streets: [
    { name: 'Leyden Court', label: [25500, -2000] },
    { name: 'Amsterdam Cr', label: [6500, 25500] },
  ],
};
