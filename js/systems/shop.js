// Toko kustomisasi: harga, beli dengan tabungan Chaos, dan pakai item.
// kind: 'cat' | 'accessory'. Semua fungsi mengubah `save` lalu menyimpannya.
import { CUSTOMIZATION } from '../config.js';
import { writeSave } from '../core/save.js';

const LIST = { cat: CUSTOMIZATION.CATS, accessory: CUSTOMIZATION.ACCESSORIES };
const OWNED = { cat: 'cats', accessory: 'accessories' };

export function shopItem(kind, id) {
  return (LIST[kind] || []).find((i) => i.id === id) || null;
}

export function isOwned(save, kind, id) {
  if (kind === 'accessory' && id === null) return true; // "tanpa aksesoris"
  return save.owned[OWNED[kind]].includes(id);
}

export function isEquipped(save, kind, id) {
  return kind === 'cat' ? save.selected.cat === id : save.selected.accessory === id;
}

export function canBuy(save, kind, id) {
  const item = shopItem(kind, id);
  return !!item && !isOwned(save, kind, id) && save.chaosBank >= item.price;
}

// Beli lalu langsung dipakai. true jika berhasil.
export function buyItem(save, kind, id) {
  if (!canBuy(save, kind, id)) return false;
  save.chaosBank -= shopItem(kind, id).price;
  save.owned[OWNED[kind]].push(id);
  equipItem(save, kind, id);
  return true;
}

export function equipItem(save, kind, id) {
  if (!isOwned(save, kind, id)) return false;
  if (kind === 'cat') save.selected.cat = id;
  else save.selected.accessory = id;
  writeSave(save);
  return true;
}

export function selectedLook(save) {
  return { cat: save.selected.cat, accessory: save.selected.accessory };
}
