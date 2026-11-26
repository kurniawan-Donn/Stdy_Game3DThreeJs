// Panel Kustomisasi di lobi: tab Kucing / Aksesoris, kartu item dengan
// harga, preview langsung di kucing lobi, tombol Pakai / Beli.
import { CUSTOMIZATION } from '../config.js';
import { shopItem, isOwned, isEquipped, canBuy, buyItem, equipItem, selectedLook } from '../systems/shop.js';

const NOTES = {
  black: 'Lebih sulit terlihat di area gelap.',
  chonky: 'Badan bulat, jalan bergoyang, loaf lebih bulat. Kemampuan sama.',
  bell: 'Chaos ×1,2, tapi langkah kucing berbunyi.'
};

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

// hooks: { getSave(), preview(look), onChange() } — onChange dipanggil
// setelah beli/pakai (simpan & terapkan ke kucing pemain)
export function createCustomizeMenu(hooks) {
  const gridEl = document.getElementById('item-grid');
  const nameEl = document.getElementById('item-name');
  const noteEl = document.getElementById('item-note');
  const actionBtn = document.getElementById('item-action');
  const bankEl = document.getElementById('custom-bank');
  const tabs = document.querySelectorAll('#customize-panel .tab');
  const state = { tab: 'cat', focus: null };

  function items() {
    if (state.tab === 'cat') return CUSTOMIZATION.CATS;
    return [{ id: null, name: 'Tanpa aksesoris', price: 0, color: 0x475569 }, ...CUSTOMIZATION.ACCESSORIES];
  }

  function previewLook() {
    const look = selectedLook(hooks.getSave());
    if (state.tab === 'cat') look.cat = state.focus;
    else look.accessory = state.focus;
    return look;
  }

  function render() {
    const save = hooks.getSave();
    bankEl.textContent = String(save.chaosBank);
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === state.tab));
    gridEl.textContent = '';
    for (const it of items()) {
      const owned = isOwned(save, state.tab, it.id);
      const equipped = isEquipped(save, state.tab, it.id);
      const b = document.createElement('button');
      b.className = 'item-card' + (it.id === state.focus ? ' focus' : '') + (owned ? '' : ' locked');
      b.dataset.id = it.id === null ? '' : it.id;
      const sw = document.createElement('span');
      sw.className = 'swatch' + (it.pattern ? ' ' + it.pattern : '');
      sw.style.background = hex(state.tab === 'cat' ? it.fur : it.color);
      if (it.patternColor !== undefined) sw.style.setProperty('--pat', hex(it.patternColor));
      if (it.patternColor2 !== undefined) sw.style.setProperty('--pat2', hex(it.patternColor2));
      const name = document.createElement('span');
      name.className = 'item-label';
      name.textContent = it.name;
      const price = document.createElement('span');
      price.className = 'item-price';
      price.textContent = equipped ? 'Dipakai' : owned ? 'Dimiliki' : `${it.price} Chaos`;
      b.append(sw, name, price);
      gridEl.appendChild(b);
    }
    // Detail & tombol aksi untuk item yang dipilih
    const it = state.focus === null && state.tab === 'accessory' ? items()[0] : shopItem(state.tab, state.focus);
    nameEl.textContent = it ? it.name : '';
    noteEl.textContent = (it && NOTES[it.id]) || '';
    const owned = isOwned(save, state.tab, state.focus);
    const equipped = isEquipped(save, state.tab, state.focus);
    if (equipped) {
      actionBtn.textContent = 'Sedang dipakai';
      actionBtn.disabled = true;
    } else if (owned) {
      actionBtn.textContent = 'Pakai';
      actionBtn.disabled = false;
    } else {
      const ok = canBuy(save, state.tab, state.focus);
      actionBtn.textContent = ok ? `Beli · ${it.price} Chaos` : `Tabungan kurang (${it.price})`;
      actionBtn.disabled = !ok;
    }
    hooks.preview(previewLook());
  }

  gridEl.addEventListener('click', (e) => {
    const card = e.target.closest('.item-card');
    if (!card) return;
    state.focus = card.dataset.id === '' ? null : card.dataset.id;
    render();
  });
  tabs.forEach((t) =>
    t.addEventListener('click', () => {
      state.tab = t.dataset.tab;
      const sel = selectedLook(hooks.getSave());
      state.focus = state.tab === 'cat' ? sel.cat : sel.accessory;
      render();
    })
  );
  actionBtn.addEventListener('click', () => {
    const save = hooks.getSave();
    const done = isOwned(save, state.tab, state.focus) ? equipItem(save, state.tab, state.focus) : buyItem(save, state.tab, state.focus);
    if (done) hooks.onChange();
    render();
  });

  return {
    open() {
      const sel = selectedLook(hooks.getSave());
      state.tab = 'cat';
      state.focus = sel.cat;
      render();
    },
    // Keluar panel: preview kembali ke tampilan yang dipakai
    close() {
      hooks.preview(selectedLook(hooks.getSave()));
    }
  };
}
