// Kitchen, wet-area fixtures, joinery and loose furniture (positions from sheets 02 & 05).
import * as THREE from 'three';
import { Batch } from './batch.js';
import { M } from './materials.js';
import { FIXTURES as FX, FURNITURE, SERVICES, DOWNPIPES, H } from './data.js';
import { colliders } from './house.js';

const k = v => v / 1000;
let bt, grp;

const B = (x1, y1, x2, y2, h0, h1, key) => bt.box(k(x1), k(h0), k(y1), k(x2), k(h1), k(y2), key);
const col = (x1, y1, x2, y2, h0, h1, tag = 'furniture') =>
  colliders.push({ x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2), h0, h1, tag });

function cyl(x, y, h0, h1, r, key, seg = 24, rTop = null) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(k(rTop ?? r), k(r), k(h1 - h0), seg), M(key));
  m.position.set(k(x), k((h0 + h1) / 2), k(y));
  m.castShadow = true; m.receiveShadow = true;
  grp.add(m);
  return m;
}
function sph(x, y, h, r, key, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(k(r), 20, 14), M(key));
  m.position.set(k(x), k(h), k(y)); m.scale.set(sx, sy, sz); m.castShadow = true;
  grp.add(m); return m;
}

function kitchen() {
  // Tower (M/W) – GPO at 1.5 m
  B(4300, 2180, 4950, 2780, 0, 2400, 'cabinet');
  B(4360, 2780, 4890, 2792, 1380, 1760, 'blackGlass');
  B(4360, 2780, 4890, 2792, 1320, 1370, 'steel');
  // Base run + benchtop
  B(4950, 2180, 7420, 2730, 0, 100, 'cabinetDark');
  B(4950, 2180, 7420, 2780, 100, 870, 'cabinet');
  for (let x = 4950 + 600; x < 7420; x += 600) B(x - 2, 2780, x + 2, 2783, 110, 860, 'cabinetDark');
  B(4950, 2180, 7440, 2800, 870, 900, 'benchtop');
  // Cooktop, oven & integrated rangehood
  B(5730, 2260, 6630, 2720, 900, 906, 'blackGlass');
  for (const [cx, cy, r] of [[5930, 2390, 90], [6430, 2390, 90], [5930, 2600, 70], [6430, 2600, 70], [6180, 2490, 110]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(k(r), 0.004, 6, 24), M('steel'));
    ring.rotation.x = Math.PI / 2; ring.position.set(k(cx), k(908), k(cy)); grp.add(ring);
  }
  B(5780, 2780, 6580, 2790, 160, 760, 'blackGlass');
  B(5820, 2790, 6540, 2812, 700, 720, 'steel');
  B(5730, 2180, 6630, 2500, 1560, 1650, 'steel');
  // Overhead cupboards over bench & window
  B(4950, 2180, 7420, 2530, 1650, 2400, 'cabinet');
  for (let x = 4950 + 617; x < 7420; x += 617) B(x - 2, 2530, x + 2, 2533, 1660, 2390, 'cabinetDark');
  // Fridge + cupboard over
  B(7480, 2200, 8460, 2900, 0, 1800, 'steel');
  B(7968, 2900, 7972, 2904, 20, 1780, 'black');
  for (const x of [7920, 8020]) B(x - 8, 2900, x + 8, 2940, 800, 1400, 'steel');
  B(7420, 2180, 8515, 2780, 1850, 2400, 'cabinet');
  col(4300, 2180, 8515, 2900, 0, 2400, 'kitchen');

  // Island with waterfall ends, sink & D/W
  const [ix1, iy1, ix2, iy2] = FX.island.rect;
  B(ix1 + 40, iy1 + 50, ix2 - 40, iy1 + 420, 0, 100, 'cabinetDark');
  B(ix1 + 40, iy1, ix2 - 40, iy1 + 470, 100, 870, 'cabinet');
  for (let x = ix1 + 640; x < ix2 - 100; x += 600) B(x - 2, iy1 - 3, x + 2, iy1, 110, 860, 'cabinetDark');
  B(ix1, iy1, ix2, iy2, 870, 910, 'benchtop');
  B(ix1, iy1, ix1 + 40, iy2, 0, 870, 'benchtop');
  B(ix2 - 40, iy1, ix2, iy2, 0, 870, 'benchtop');
  B(ix1 + 40, iy1 + 470, ix2 - 40, iy1 + 490, 0, 870, 'woodVeneer');
  B(5260, 4070, 5660, 4390, 906, 912, 'steel');
  B(5290, 4100, 5630, 4360, 912, 913, 'black');
  cyl(5460, 4030, 910, 1200, 14, 'chrome', 12);
  const spout = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 16, Math.PI), M('chrome'));
  spout.position.set(k(5460), k(1200), k(4110)); spout.rotation.y = Math.PI / 2; grp.add(spout);
  B(5900, iy1 - 4, 6500, iy1, 110, 860, 'steel'); // D/W panel
  col(ix1, iy1, ix2, iy2, 0, 910, 'island');

  // Bar stools on the dining side
  for (const x of [5820, 6420, 7020]) {
    const y = 4960;
    cyl(x, y, 620, 680, 180, 'fabricDark');
    cyl(x, y, 20, 620, 18, 'black', 8);
    cyl(x, y, 0, 20, 200, 'black');
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.008, 6, 20), M('black'));
    ring.rotation.x = Math.PI / 2; ring.position.set(k(x), 0.28, k(y)); grp.add(ring);
    col(x - 190, y - 190, x + 190, y + 190, 0, 680, 'stool');
  }
}

function pantryLaundry() {
  // W.I.P – bench + open shelving
  B(9915, 2921, 10315, 5065, 0, 880, 'cabinet');
  B(9900, 2921, 10315, 5065, 880, 910, 'benchtop');
  B(8604, 4665, 9915, 5065, 0, 880, 'cabinet');
  B(8604, 4650, 9915, 5065, 880, 910, 'benchtop');
  for (const h of [1350, 1750, 2150]) {
    B(9965, 2921, 10315, 5065, h, h + 22, 'cabinet');
    B(8604, 4715, 9965, 5065, h, h + 22, 'cabinet');
  }
  const jarCols = ['plastic', 'wood', 'steel', 'binLid', 'ceramic'];
  for (let i = 0; i < 18; i++) {
    const y = 3050 + i * 110, h = [1372, 1772, 2172][i % 3];
    cyl(10140, y, h, h + 160 + (i % 4) * 30, 40, jarCols[i % 5], 12);
  }
  col(9915, 2921, 10315, 5065, 0, 2400); col(8604, 4650, 9915, 5065, 0, 2400);

  // Laundry bench, tub, stacked washer/dryer
  const L = FX.laundryBench;
  B(9730, 980, 10315, 1650, 100, 870, 'cabinet');
  B(9730, 980, 10265, 1650, 0, 100, 'cabinetDark');
  B(9710, 980, 10315, 1650, 870, 900, 'benchtop');
  B(9800, 1060, 10220, 1500, 900, 905, 'steel');
  B(9830, 1090, 10190, 1470, 905, 906, 'black');
  cyl(10260, 1280, 900, 1180, 12, 'chrome', 10);
  B(9965, 980, 10315, 1650, 1600, 2400, 'cabinet');
  B(9730, 1700, 10315, 2330, 0, 850, 'plastic');
  B(9730, 1700, 10315, 2330, 880, 1740, 'plastic');
  for (const h of [430, 1310]) {
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 32), M('blackGlass'));
    door.rotation.z = Math.PI / 2; door.position.set(k(9718), k(h), k(2015)); grp.add(door);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 8, 32), M('steel'));
    rim.rotation.y = Math.PI / 2; rim.position.set(k(9712), k(h), k(2015)); grp.add(rim);
  }
  col(9710, 980, 10315, 2330, 0, 1740);
}

function wc(x, y, facing) {
  // facing: direction the user faces when seated (pan points that way)
  const d = { S: [0, 1], E: [1, 0], N: [0, -1], W: [-1, 0] }[facing];
  const back = [x - d[0] * 330, y - d[1] * 330];
  const cw = d[0] === 0 ? [back[0] - 200, back[1] - 90, back[0] + 200, back[1] + 90] : [back[0] - 90, back[1] - 200, back[0] + 90, back[1] + 200];
  B(cw[0], cw[1], cw[2], cw[3], 380, 820, 'ceramic');
  B(back[0] - 30, back[1] - 30, back[0] + 30, back[1] + 30, 820, 835, 'chrome');
  const px = x + d[0] * 10, py = y + d[1] * 10;
  cyl(px, py, 0, 360, 150, 'ceramic', 24, 170);
  const bowl = cyl(px + d[0] * 40, py + d[1] * 40, 360, 420, 190, 'ceramic', 28);
  bowl.scale.set(d[0] ? 1.25 : 1, 1, d[1] ? 1.25 : 1);
  const seat = cyl(px + d[0] * 40, py + d[1] * 40, 420, 440, 190, 'plastic', 28);
  seat.scale.copy(bowl.scale);
  col(Math.min(cw[0], px - 200), Math.min(cw[1], py - 200), Math.max(cw[2], px + 200), Math.max(cw[3], py + 200), 0, 800);
}

function vanity(x1, y1, x2, y2, mirrorFace) {
  B(x1, y1, x2, y2, 450, 850, 'woodVeneer');
  B(x1, y1, x2, y2, 850, 870, 'benchtop');
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const basin = cyl(cx, cy, 870, 990, 190, 'ceramic', 28, 200);
  basin.scale.set(x2 - x1 > y2 - y1 ? 1.3 : 1, 1, y2 - y1 > x2 - x1 ? 1.3 : 1);
  cyl(cx, cy, 988, 991, 150, 'blackGlass', 24).scale.copy(basin.scale);
  col(x1, y1, x2, y2, 450, 1000);
  return { cx, cy };
}

function wetAreas() {
  // ---------------- Bath ----------------
  const v = vanity(8604, 7400, 9150, 8070);
  cyl(8660, v.cy, 870, 1150, 12, 'chrome', 10);
  B(8612, 7420, 8622, 8050, 1150, 2050, 'mirror');
  wc(FX.bathWC.x, FX.bathWC.y, FX.bathWC.facing);
  // tub
  const [tx1, ty1, tx2, ty2] = FX.bathTub.rect;
  B(tx1, ty1, tx2, ty2, 0, 100, 'ceramic');
  B(tx1, ty1, tx1 + 80, ty2, 100, 550, 'ceramic'); B(tx2 - 80, ty1, tx2, ty2, 100, 550, 'ceramic');
  B(tx1 + 80, ty1, tx2 - 80, ty1 + 80, 100, 550, 'ceramic'); B(tx1 + 80, ty2 - 80, tx2 - 80, ty2, 100, 550, 'ceramic');
  cyl((tx1 + tx2) / 2, ty1 + 100, 120, 122, 25, 'chrome', 12);
  B((tx1 + tx2) / 2 - 20, ty1 - 10, (tx1 + tx2) / 2 + 20, ty1 + 120, 700, 740, 'chrome');
  col(tx1, ty1, tx2, ty2, 0, 550);
  // shower: fixed glass screen + rose + mixer
  B(10300, 6295, 10312, 6860, 0, 2000, 'glass');
  B(10296, 6295, 10316, 6860, 1990, 2010, 'chrome');
  cyl(9460, 6420, 2080, 2090, 110, 'chrome');
  B(9440, 6303, 9480, 6420, 2080, 2100, 'chrome');
  cyl(9460, 6310, 1000, 1080, 40, 'chrome').rotation.x = Math.PI / 2;
  B(9400, 6700, 9520, 6820, 1, 3, 'steel');

  // ---------------- Ensuite ----------------
  const ve = vanity(1300, 8966, 2160, 9420);
  cyl(ve.cx, 9000, 870, 1150, 12, 'chrome', 10);
  B(1360, 8974, 2100, 8984, 1150, 2050, 'mirror');
  wc(FX.ensWC.x, FX.ensWC.y, FX.ensWC.facing);
  B(1180, 9466, 1192, 9967, 0, 2000, 'glass');
  cyl(300, 9460, 2080, 2090, 100, 'chrome');
  B(188, 9440, 300, 9480, 2080, 2100, 'chrome');
  B(600, 9400, 720, 9520, 1, 3, 'steel');
}

function robesWir() {
  // W.I.R – shelving along the east wall, hanging along the north wall
  B(3211, 8966, 3711, 10966, 0, 30, 'cabinet');
  for (const h of [350, 750, 1150, 1550, 1950, 2150]) B(3211, 8966, 3711, 10966, h, h + 22, 'cabinet');
  B(3205, 8966, 3225, 10966, 0, 2170, 'cabinet');
  B(2280, 8966, 3211, 9500, 1780, 1800, 'cabinet');
  B(2280, 9240, 3211, 9260, 1680, 1700, 'chrome');
  // some hanging garments
  for (let x = 2330; x < 3150; x += 70) B(x, 9080, x + 45, 9420, 700 + (x % 3) * 120, 1680, ['fabric', 'fabricDark', 'linen', 'throw'][x % 4]);
  col(3211, 8966, 3711, 10966, 0, 2200); col(2280, 8966, 3211, 9500, 600, 2200);
}

function bed(rect, head, size) {
  let [x1, y1, x2, y2] = rect;
  const dims = { queen: [1530, 2030], king: [1830, 2030], double: [1380, 1880] }[size];
  // centre the mattress of the right size inside the drawn rect
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  let w, l;
  if (head === 'N' || head === 'S') { w = dims[0]; l = dims[1]; x1 = cx - w / 2; x2 = cx + w / 2; y1 = head === 'N' ? y1 + 40 : y2 - 40 - l; y2 = y1 + l; }
  else { w = dims[0]; l = dims[1]; y1 = cy - w / 2; y2 = cy + w / 2; x1 = head === 'W' ? x1 + 40 : x2 - 40 - l; x2 = x1 + l; }
  B(x1, y1, x2, y2, 60, 300, 'fabricDark');
  B(x1 + 10, y1 + 10, x2 - 10, y2 - 10, 300, 540, 'linen');
  // headboard
  if (head === 'N') B(x1 - 40, y1 - 50, x2 + 40, y1, 0, 1150, 'fabric');
  if (head === 'W') B(x1 - 50, y1 - 40, x1, y2 + 40, 0, 1150, 'fabric');
  // throw across the foot + pillows
  if (head === 'N') {
    B(x1, y2 - 650, x2, y2 + 5, 540, 570, 'throw');
    B(x1 + 90, y1 + 60, cx - 30, y1 + 460, 540, 660, 'linen'); B(cx + 30, y1 + 60, x2 - 90, y1 + 460, 540, 660, 'linen');
  } else {
    B(x2 - 650, y1, x2 + 5, y2, 540, 570, 'throw');
    B(x1 + 60, y1 + 90, x1 + 460, cy - 30, 540, 660, 'linen'); B(x1 + 60, cy + 30, x1 + 460, y2 - 90, 540, 660, 'linen');
  }
  col(x1, y1, x2, y2, 0, 570);
}

function bedside(x, y) {
  B(x - 230, y - 200, x + 230, y + 200, 0, 520, 'woodVeneer');
  cyl(x, y, 520, 560, 70, 'ceramic', 16);
  cyl(x, y, 560, 820, 10, 'black', 8);
  cyl(x, y, 780, 960, 130, 'linen', 20, 100);
  col(x - 230, y - 200, x + 230, y + 200, 0, 520);
}

function chair(x, y, face, key = 'fabric') {
  const d = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[face];
  B(x - 220, y - 220, x + 220, y + 220, 430, 480, key);
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B(x + sx * 190 - 12, y + sy * 190 - 12, x + sx * 190 + 12, y + sy * 190 + 12, 0, 430, 'black');
  const bx = x - d[0] * 205, by = y - d[1] * 205;
  if (d[0] === 0) B(x - 220, by - 20, x + 220, by + 20, 480, 880, key); else B(bx - 20, y - 220, bx + 20, y + 220, 480, 880, key);
  col(x - 230, y - 230, x + 230, y + 230, 0, 880);
}

function furniture() {
  for (const f of FURNITURE) {
    const r = f.rect;
    switch (f.type) {
      case 'sofa': {
        const [x1, y1, x2, y2] = r;
        B(x1, y1, x2, y2, 60, 420, 'fabric');
        B(x1, y1, x2, y1 + 230, 420, 820, 'fabric');
        B(x1, y1, x1 + 200, y2, 420, 620, 'fabric'); B(x2 - 200, y1, x2, y2, 420, 620, 'fabric');
        for (let i = 0; i < 3; i++) { const w = (x2 - x1 - 400) / 3; B(x1 + 200 + i * w + 8, y1 + 230, x1 + 200 + (i + 1) * w - 8, y2 - 20, 420, 500, 'fabric'); }
        B(x1 + 260, y1 + 210, x1 + 700, y1 + 330, 500, 800, 'throw');
        col(x1, y1, x2, y2, 0, 820);
        break;
      }
      case 'coffeeTable': {
        const [x1, y1, x2, y2] = r;
        B(x1, y1, x2, y2, 340, 380, 'wood');
        B(x1 + 40, y1 + 40, x2 - 40, y2 - 40, 0, 340, 'cabinetDark');
        col(x1, y1, x2, y2, 0, 380);
        break;
      }
      case 'rug': B(900, 3300, 3700, 5300, 5, 12, 'rug'); break;
      case 'tvUnit': {
        const [x1, y1, x2, y2] = r;
        B(x1, y1, x2, y2 - 10, 120, 460, 'woodVeneer');
        B(x1 + 80, y1 + 40, x2 - 80, y2 - 10, 0, 120, 'black');
        const cx = (x1 + x2) / 2;
        B(cx - 740, 5730, cx + 740, 5770, 1100, 1950, 'black');
        B(cx - 725, 5728, cx + 725, 5731, 1112, 1938, 'screen');
        col(x1, y1, x2, y2, 0, 460);
        break;
      }
      case 'dining': {
        const [x1, y1, x2, y2] = r;
        B(x1, y1, x2, y2, 720, 760, 'wood');
        for (const [lx, ly] of [[x1 + 80, y1 + 80], [x2 - 80, y1 + 80], [x2 - 80, y2 - 80], [x1 + 80, y2 - 80]]) B(lx - 30, ly - 30, lx + 30, ly + 30, 0, 720, 'black');
        col(x1, y1, x2, y2, 0, 760);
        const xs = [x1 + 300, (x1 + x2) / 2, x2 - 300];
        for (const x of xs) { chair(x, y1 - 150, 'S'); chair(x, y2 + 150, 'N'); }
        break;
      }
      case 'bed': bed(r, f.head, f.size); break;
      case 'bedside': bedside(f.x, f.y); break;
      case 'outdoorSetting': {
        const [x1, y1, x2, y2] = r;
        const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
        B(cx - 800, cy - 400, cx + 800, cy + 400, 700, 740, 'wood');
        for (const [lx, ly] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B(cx + lx * 720 - 25, cy + ly * 320 - 25, cx + lx * 720 + 25, cy + ly * 320 + 25, -50, 700, 'black');
        col(cx - 800, cy - 400, cx + 800, cy + 400, -50, 740);
        for (const x of [cx - 450, cx + 450]) { chair(x, cy - 600, 'S', 'fabricDark'); chair(x, cy + 600, 'N', 'fabricDark'); }
        break;
      }
      default: break;
    }
  }
}

function services() {
  for (const s of SERVICES) {
    switch (s.type) {
      case 'hws': // external gas instantaneous HWS on the back wall
        B(s.x - 180, 1990 - 190, s.x + 180, 1990, 1300, 1900, 'ac');
        B(s.x - 40, 1990 - 120, s.x + 40, 1990, 1100, 1300, 'steel');
        break;
      case 'ac':
        B(7650, 1100, 8380, 1450, -150, -100, 'paving');
        B(7680, 1140, 8350, 1420, -100, 560, 'ac');
        {
          const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.01, 28), M('black'));
          fan.rotation.x = Math.PI / 2; fan.position.set(k(7900), k(240), k(1095)); grp.add(fan);
        }
        colliders.push({ x1: 7650, y1: 1100, x2: 8380, y2: 1450, h0: -150, h1: 560 });
        break;
      case 'meter':
        B(-11 - 160, 12874, -11, 13343, 1100, 1900, 'ac');
        B(-11 - 165, 12900, -11 - 160, 13317, 1500, 1880, 'steel');
        B(-11 - 120, 13000, -11, 13250, 500, 800, 'ac');
        break;
      case 'tap': {
        const out = s.x < 0 ? -1 : 0;
        cyl(s.x + (out ? -40 : 0), s.y + (out ? 0 : -40), 450, 470, 20, 'chrome', 8);
        break;
      }
      case 'tank': {
        cyl(s.x, s.y, -170, -140, s.r + 80, 'paving');
        const t = cyl(s.x, s.y, -140, -140 + s.h, s.r, 'tank', 36);
        for (let h = 150; h < s.h; h += 150) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(k(s.r) + 0.003, 0.012, 6, 36), M('tank'));
          ring.rotation.x = Math.PI / 2; ring.position.set(k(s.x), k(-140 + h), k(s.y)); grp.add(ring);
        }
        cyl(s.x, s.y, s.h - 140, s.h - 60, s.r, 'tank', 36, s.r - 120);
        colliders.push({ x1: s.x - s.r, y1: s.y - s.r, x2: s.x + s.r, y2: s.y + s.r, h0: -200, h1: s.h });
        void t;
        break;
      }
      case 'bins':
        for (const [dx, lid] of [[0, 'binLid'], [650, 'binLid'], [1300, 'binBody']]) {
          const x = s.x + dx * 0.79, y = s.y + dx * 0.61;
          B(x - 290, y - 360, x + 290, y + 360, -150, 900, 'binBody');
          B(x - 300, y - 380, x + 300, y + 380, 900, 960, lid);
          colliders.push({ x1: x - 300, y1: y - 380, x2: x + 300, y2: y + 380, h0: -150, h1: 960 });
        }
        break;
      default: break;
    }
  }
  // 75 dia uPVC downpipes (Monument) from gutter to ground
  for (const [x, y] of DOWNPIPES) {
    cyl(x, y, -150, H.eaveLevel - 120, 38, 'dp', 12);
    colliders.push({ x1: x - 40, y1: y - 40, x2: x + 40, y2: y + 40, h0: -200, h1: 2700 });
  }
}

export function buildInterior() {
  bt = new Batch('interior');
  grp = new THREE.Group();
  grp.name = 'interior-meshes';
  kitchen();
  pantryLaundry();
  wetAreas();
  robesWir();
  furniture();
  services();
  const g = new THREE.Group();
  g.name = 'interior';
  g.add(bt.build(), grp);
  return g;
}
