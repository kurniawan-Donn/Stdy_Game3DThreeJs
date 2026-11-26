// Grid navigasi untuk pemilik rumah: dibangun dari collider perabot
// (diperbesar sebesar NAV.CLEARANCE), jalur dicari dengan A* 8 arah, lalu
// dihaluskan dengan string pulling agar tidak zig-zag.
import { NAV, ROOM_HALF_W, ROOM_HALF_D } from '../config.js';

export function createNavGrid(colliders) {
  const cs = NAV.CELL_SIZE;
  const cols = Math.round((ROOM_HALF_W * 2) / cs);
  const rows = Math.round((ROOM_HALF_D * 2) / cs);
  const blocked = new Uint8Array(cols * rows);
  const grid = { cols, rows, cs, blocked };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const { x, z } = cellCenter(grid, c, r);
      let b =
        x < -ROOM_HALF_W + NAV.CLEARANCE || x > ROOM_HALF_W - NAV.CLEARANCE ||
        z < -ROOM_HALF_D + NAV.CLEARANCE || z > ROOM_HALF_D - NAV.CLEARANCE;
      if (!b) {
        for (const box of colliders) {
          if (box.navBlocks === false) continue;
          if (
            x > box.minX - NAV.CLEARANCE && x < box.maxX + NAV.CLEARANCE &&
            z > box.minZ - NAV.CLEARANCE && z < box.maxZ + NAV.CLEARANCE
          ) {
            b = true;
            break;
          }
        }
      }
      blocked[r * cols + c] = b ? 1 : 0;
    }
  }
  return grid;
}

export function cellCenter(grid, c, r) {
  return { x: -ROOM_HALF_W + (c + 0.5) * grid.cs, z: -ROOM_HALF_D + (r + 0.5) * grid.cs };
}

export function worldToCell(grid, x, z) {
  const c = Math.min(grid.cols - 1, Math.max(0, Math.floor((x + ROOM_HALF_W) / grid.cs)));
  const r = Math.min(grid.rows - 1, Math.max(0, Math.floor((z + ROOM_HALF_D) / grid.cs)));
  return { c, r };
}

function isFree(grid, c, r) {
  return c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && !grid.blocked[r * grid.cols + c];
}

export function isWalkable(grid, x, z) {
  const { c, r } = worldToCell(grid, x, z);
  return isFree(grid, c, r);
}

// Sel bebas terdekat (pencarian melingkar). Dipakai untuk target di atas
// perabot atau di luar jangkauan.
export function nearestFreeCell(grid, x, z) {
  const start = worldToCell(grid, x, z);
  if (isFree(grid, start.c, start.r)) return start;
  const maxR = Math.max(grid.cols, grid.rows);
  let best = null;
  let bestD = Infinity;
  for (let rad = 1; rad < maxR; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        if (Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
        const c = start.c + dc;
        const r = start.r + dr;
        if (!isFree(grid, c, r)) continue;
        const p = cellCenter(grid, c, r);
        const d = (p.x - x) ** 2 + (p.z - z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = { c, r };
        }
      }
    }
    if (best) return best;
  }
  return start;
}

// Garis lurus antar dua titik dunia bebas hambatan di grid? (sampling per setengah sel)
export function hasClearLine(grid, ax, az, bx, bz) {
  const dist = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(1, Math.ceil(dist / (grid.cs * 0.5)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!isWalkable(grid, ax + (bx - ax) * t, az + (bz - az) * t)) return false;
  }
  return true;
}

// Heap biner kecil untuk open set A*
class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  push(node, f) {
    const a = this.items;
    a.push({ node, f });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top.node;
  }
}

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]
];

// Mencari jalur dari (sx, sz) ke (tx, tz). Mengembalikan array titik dunia
// [{x, z}, ...] yang sudah dihaluskan (tanpa titik awal), atau null.
export function findPath(grid, sx, sz, tx, tz) {
  const start = nearestFreeCell(grid, sx, sz);
  const goal = nearestFreeCell(grid, tx, tz);
  const cols = grid.cols;
  const startId = start.r * cols + start.c;
  const goalId = goal.r * cols + goal.c;

  const g = new Float32Array(cols * grid.rows).fill(Infinity);
  const came = new Int32Array(cols * grid.rows).fill(-1);
  const closed = new Uint8Array(cols * grid.rows);
  const h = (c, r) => {
    const dx = Math.abs(c - goal.c);
    const dz = Math.abs(r - goal.r);
    return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz); // octile
  };

  const open = new MinHeap();
  g[startId] = 0;
  open.push(startId, h(start.c, start.r));
  let iterations = 0;
  let found = startId === goalId;

  while (open.size && !found && iterations++ < NAV.MAX_ITERATIONS) {
    const id = open.pop();
    if (closed[id]) continue;
    closed[id] = 1;
    if (id === goalId) {
      found = true;
      break;
    }
    const c = id % cols;
    const r = (id / cols) | 0;
    for (const [dc, dr, cost] of DIRS) {
      const nc = c + dc;
      const nr = r + dr;
      if (!isFree(grid, nc, nr)) continue;
      // Jangan memotong sudut perabot secara diagonal
      if (dc && dr && (!isFree(grid, c + dc, r) || !isFree(grid, c, r + dr))) continue;
      const nid = nr * cols + nc;
      if (closed[nid]) continue;
      const ng = g[id] + cost;
      if (ng < g[nid]) {
        g[nid] = ng;
        came[nid] = id;
        open.push(nid, ng + h(nc, nr));
      }
    }
  }
  if (!found) return null;

  // Rekonstruksi jalur sel → titik dunia
  const cells = [];
  for (let id = goalId; id !== -1; id = came[id]) {
    cells.push(cellCenter(grid, id % cols, (id / cols) | 0));
    if (id === startId) break;
  }
  cells.reverse();
  // Titik akhir: target asli jika bisa dilalui, selain itu pusat sel terdekat
  if (isWalkable(grid, tx, tz)) cells[cells.length - 1] = { x: tx, z: tz };

  return smoothPath(grid, { x: sx, z: sz }, cells);
}

// String pulling: lewati titik antara selama garis lurus masih bebas.
function smoothPath(grid, from, cells) {
  const out = [];
  let anchor = from;
  let i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !hasClearLine(grid, anchor.x, anchor.z, cells[j].x, cells[j].z)) j--;
    out.push(cells[j]);
    anchor = cells[j];
    i = j + 1;
  }
  return out;
}
