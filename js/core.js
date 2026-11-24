/* =====================================================================
 * core.js — Inti frontend MutuHub (vanilla JS, tanpa framework).
 * API REST ke GAS (POST text/plain, token di body), batch otomatis,
 * dedupe baca + epoch tulis, cache SWR di localStorage, sesi, router
 * hash, pengukur kinerja, pemanasan server, toast/modal/konfirmasi.
 * ===================================================================== */
(function (w) {
  'use strict';
  const VERSI = '1.0.0';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = v => String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const BULAN_P = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const keDate = s => { if (!s) return null; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/); if (!m) { const t = Date.parse(s); return isNaN(t) ? null : new Date(t); } return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0) - 7, +(m[5] || 0), +(m[6] || 0))); };
  const Fmt = {
    tgl(s, panjang) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + ' ' + (panjang ? BULAN_P : BULAN)[+m[2] - 1] + ' ' + m[1] : (s || '—'); },
    waktu(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); return m ? (+m[3]) + ' ' + BULAN[+m[2] - 1] + ' ' + m[1] + ', ' + m[4] + ':' + m[5] : Fmt.tgl(s); },
    relatif(s) { const d = keDate(s); if (!d) return '—'; const det = (Date.now() - d) / 1000; if (det < 60) return 'baru saja'; if (det < 3600) return Math.floor(det / 60) + ' mnt lalu'; if (det < 86400) return Math.floor(det / 3600) + ' jam lalu'; if (det < 7 * 86400) return Math.floor(det / 86400) + ' hari lalu'; return Fmt.tgl(s); },
    sisaHari(s) { const d = keDate(s); if (!d) return null; const hari = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); return Math.round((keDate(String(s).slice(0, 10)) - keDate(hari)) / 864e5); },
    angka(n, des) { if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '—'; return Number(n).toLocaleString('id-ID', { maximumFractionDigits: des === undefined ? 2 : des }); },
    rp(n) { return 'Rp' + Fmt.angka(n, 0); },
    persen(n) { return n === null || n === undefined || n === '' ? '—' : Fmt.angka(n, 1) + '%'; },
    hariIni() { return new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); },
    inisial(nama) { return String(nama || '?').replace(/^(dr|prof|ir|drs|h)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase(); }
  };
  const hashStr = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

  /* ---------- Pengukur kinerja (gas-scale-turbo 4.1) ---------- */
  const Perf = { log: [], catat(o) { this.log.push(o); if (this.log.length > 300) this.log.shift(); }, table() { console.table(this.log.slice(-40)); }, summary() { const g = {}; this.log.forEach(x => { g[x.aksi] = g[x.aksi] || { n: 0, total: 0, server: 0 }; g[x.aksi].n++; g[x.aksi].total += x.total; g[x.aksi].server += x.server || 0; }); console.table(Object.keys(g).map(k => ({ aksi: k, n: g[k].n, rata_total: Math.round(g[k].total / g[k].n), rata_server: Math.round(g[k].server / g[k].n) }))); } };

  /* ---------- Sesi ---------- */
  const Sesi = {
    token: null, me: null,
    muat() { try { const s = JSON.parse(localStorage.getItem('mh:sesi') || 'null'); if (s && s.token && s.me) { this.token = s.token; this.me = s.me; } } catch (e) { } return !!this.token; },
    simpan(token, me) { this.token = token; this.me = me; try { localStorage.setItem('mh:sesi', JSON.stringify({ token, me })); } catch (e) { } },
    keluar(kadaluarsa) {
      const email = this.me && this.me.email;
      this.token = null; this.me = null;
      try { localStorage.removeItem('mh:sesi'); Object.keys(localStorage).filter(k => k.indexOf('mh:c:') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) { }
      Store.mem = {};
      if (kadaluarsa) UI.toast('Sesi berakhir. Silakan masuk kembali.', 'galat');
      location.hash = '#/login';
      if (w.Aplikasi) w.Aplikasi.tampilkanLogin();
      return email;
    }
  };

  /* ---------- API ---------- */
  const BACA = new Set(['app.boot', 'batch', 'dash.get', 'data.list', 'file.ambil', 'notif.app', 'laporan.data', 'ekspor.riwayat', 'spmi.daftar', 'mutu.ringkas', 'ami.formulir', 'ami.laporan', 'pkpa.detail', 'ppepp.papan', 'rtm.detail', 'evdiri.rekap', 'evdiri.form', 'evdiri.kinerja', 'akr.proyek', 'kesiapan.data', 'survei.hasil', 'aduan.detail', 'aduan.rekap', 'integrasi.status', 'peta.pratinjau', 'peta.kolom', 'rahasia.status', 'notif.config', 'notif.antrean', 'wa.device', 'wa.audience', 'wa.blastList', 'crm.list', 'crm.stats', 'crm.detail', 'settings.list', 'sistem.status', 'tpl.list', 'audit.list', 'auth.config', 'verif.cek', 'portal.survei.ambil', 'portal.captcha', 'portal.aduan.status']);
  const RE_BACA = { test: a => BACA.has(a) };
  const _inflight = {}; let _epochTulis = 0;
  const API = {
    url() { return (w.APP_CONFIG && w.APP_CONFIG.GAS_URL) || ''; },
    siap() { const u = this.url(); return /^https:\/\/script\.google\.com\/(a\/macros\/[\w.-]+|macros)\/s\/[\w-]+\/exec$/.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u); },
    async jalan(action, data, opsi) {
      opsi = opsi || {};
      if (!this.siap()) return { success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec Apps Script.', code: 'CONFIG' };
      const t0 = performance.now();
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(() => ctrl && ctrl.abort(), opsi.timeout || 90000);
      let res;
      try {
        const r = await fetch(this.url(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: Sesi.token, data: data || {} }), signal: ctrl ? ctrl.signal : undefined, redirect: 'follow' });
        const teks = await r.text();
        try { res = JSON.parse(teks); } catch (e) { res = { success: false, message: 'Server membalas tidak valid. Pastikan deployment Apps Script diatur "Siapa saja" dan URL berakhiran /exec.', code: 'BADJSON' }; }
      } catch (e) {
        res = { success: false, message: navigator.onLine === false ? 'Tidak ada koneksi internet.' : (e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server.'), code: 'NET' };
      } finally { clearTimeout(timer); }
      Perf.catat({ aksi: action, total: Math.round(performance.now() - t0), server: res.ms, cache: !!(res.data && res.data.cached) });
      if (res.code === 'AUTH' && Sesi.token && !opsi.diam) Sesi.keluar(true);
      return res;
    },
    /** Panggil aksi; baca identik yang sedang berjalan menumpang (dedupe), tulis menaikkan epoch. */
    call(action, data, opsi) {
      if (!RE_BACA.test(action)) { _epochTulis++; return this.jalan(action, data, opsi).then(r => { if (r.success) Store.kotorSemua(); return r; }); }
      const k = _epochTulis + '|' + action + '|' + JSON.stringify(data || {});
      if (_inflight[k]) return _inflight[k];
      const p = this.jalan(action, data, opsi); _inflight[k] = p;
      p.then(() => delete _inflight[k], () => delete _inflight[k]);
      return p;
    },
    /** Antre baca: beberapa panggilan di tik yang sama digabung menjadi satu aksi 'batch'. */
    q(action, data) { return Batcher.add(action, data); }
  };
  const Batcher = {
    antre: null,
    add(action, data) {
      if (!RE_BACA.test(action) || !Sesi.token || action === 'batch') return API.call(action, data);
      return new Promise(res => { if (!this.antre) { this.antre = []; setTimeout(() => this.flush(), 0); } this.antre.push({ action, data: data || {}, res }); });
    },
    flush() {
      const q = this.antre; this.antre = null;
      const unik = {}; q.forEach(x => { const k = x.action + '|' + JSON.stringify(x.data); (unik[k] = unik[k] || { action: x.action, data: x.data, res: [] }).res.push(x.res); });
      const list = Object.values(unik);
      for (let i = 0; i < list.length; i += 10) {
        const potong = list.slice(i, i + 10);
        if (potong.length === 1) API.call(potong[0].action, potong[0].data).then(r => potong[0].res.forEach(f => f(r)));
        else API.call('batch', { calls: potong.map(x => ({ action: x.action, data: x.data })) }).then(r => {
          potong.forEach((x, j) => { const hasil = r.success ? r.data[j] : r; x.res.forEach(f => f(hasil)); });
        });
      }
    }
  };

  /* ---------- Cache SWR (localStorage) ---------- */
  const Store = {
    mem: {},
    kunci(k) { return 'mh:c:' + ((Sesi.me && Sesi.me.email) || 'publik') + ':' + k; },
    intip(k) {
      if (this.mem[k]) return this.mem[k];
      try { const v = JSON.parse(localStorage.getItem(this.kunci(k)) || 'null'); if (v) this.mem[k] = v; return v; } catch (e) { return null; }
    },
    taruh(k, d) {
      const v = { t: Date.now(), h: hashStr(JSON.stringify(d)), d };
      this.mem[k] = v;
      try { localStorage.setItem(this.kunci(k), JSON.stringify(v)); } catch (e) { this.pangkas(); }
      return v;
    },
    kotorSemua() { Object.keys(this.mem).forEach(k => { this.mem[k].t = 0; }); try { Object.keys(localStorage).filter(k => k.indexOf('mh:c:') === 0).forEach(k => { const v = JSON.parse(localStorage.getItem(k)); if (v) { v.t = 0; localStorage.setItem(k, JSON.stringify(v)); } }); } catch (e) { } },
    pangkas() { try { const ks = Object.keys(localStorage).filter(k => k.indexOf('mh:c:') === 0); ks.slice(0, Math.ceil(ks.length / 2)).forEach(k => localStorage.removeItem(k)); } catch (e) { } }
  };
  /**
   * Stale-while-revalidate: tampilkan cache seketika, ambil server bila basi.
   * render(data, dariCache) hanya dipanggil bila halaman masih sama & data berubah.
   */
  async function muat(kunci, action, data, render, opsi) {
    opsi = opsi || {};
    const versi = Router.versi, c = Store.intip(kunci);
    if (c) render(c.d, true);
    const basi = !c || opsi.segar || Date.now() - c.t > (opsi.maxAge || 30000);
    if (!basi) return c.d;
    const r = await API.q(action, data);
    if (versi !== Router.versi && !opsi.abaikanRute) return null;
    if (!r.success) { if (!c) render(null, false, r); else if (r.code !== 'NET') UI.toast(r.message, 'galat'); return null; }
    const h = hashStr(JSON.stringify(r.data));
    if (!c || c.h !== h) { Store.taruh(kunci, r.data); render(r.data, false); } else { c.t = Date.now(); Store.taruh(kunci, r.data); }
    return r.data;
  }

  /* ---------- Router hash ---------- */
  const Router = {
    rute: [], versi: 0,
    daftar(pola, hal) { const kunci = []; const re = new RegExp('^' + pola.replace(/:(\w+)/g, (m, k) => { kunci.push(k); return '([^/]+)'; }) + '$'); this.rute.push({ pola, re, kunci, hal }); },
    cocok(hash) {
      const p = (hash || '').replace(/^#/, '') || '/dashboard';
      for (const r of this.rute) { const m = p.match(r.re); if (m) { const prm = {}; r.kunci.forEach((k, i) => prm[k] = decodeURIComponent(m[i + 1])); return { r, prm, path: p }; } }
      return null;
    },
    ke(h) { if (location.hash === h) this.jalan(); else location.hash = h; }
  };

  /* ---------- Pemanasan server & aktivitas ---------- */
  function hangatkan(scope) {
    if (!API.siap()) return;
    const k = 'mh:warm:' + scope, t = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - t < 4 * 60000) return;
    sessionStorage.setItem(k, String(Date.now()));
    fetch(API.url() + '?w=' + scope, { mode: 'no-cors' }).catch(() => { });
  }
  const Aktivitas = {
    at: Date.now(), last: {},
    init() { ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(ev => addEventListener(ev, () => { this.at = Date.now(); }, { passive: true })); },
    idle() { return Date.now() - this.at > 120000; },
    due(key, aktifMs, idleMs) { if (document.visibilityState !== 'visible') return false; if (Date.now() - (this.last[key] || 0) < (this.idle() ? idleMs : aktifMs) - 500) return false; this.last[key] = Date.now(); return true; }
  };

  /* ---------- UI dasar ---------- */
  const UI = {
    toast(pesan, tipe, ms) {
      let w = $('.toast-wadah'); if (!w) { w = document.createElement('div'); w.className = 'toast-wadah'; w.setAttribute('role', 'status'); w.setAttribute('aria-live', 'polite'); document.body.appendChild(w); }
      const t = document.createElement('div'); t.className = 'toast ' + (tipe || '');
      t.innerHTML = '<span class="ms">' + (tipe === 'galat' ? 'error' : tipe === 'sukses' ? 'check_circle' : 'info') + '</span><span></span>';
      t.lastChild.textContent = pesan; w.appendChild(t);
      setTimeout(() => t.remove(), ms || (tipe === 'galat' ? 6000 : 3500));
    },
    modal(o) {
      const lap = document.createElement('div'); lap.className = 'lapisan';
      lap.innerHTML = '<div class="modal ' + (o.lebar ? 'lebar' : '') + '" role="dialog" aria-modal="true"><div class="modal-h"><div><h3></h3>' + (o.sub ? '<p class="catatan" style="margin:4px 0 0"></p>' : '') + '</div><button class="ikon-btn" data-tutup aria-label="Tutup"><span class="ms">close</span></button></div><div class="modal-b"></div><div class="modal-f"></div></div>';
      $('h3', lap).textContent = o.judul || ''; if (o.sub) $('.modal-h p', lap).textContent = o.sub;
      const b = $('.modal-b', lap); if (typeof o.isi === 'string') b.innerHTML = o.isi; else if (o.isi) b.appendChild(o.isi);
      const f = $('.modal-f', lap);
      (o.tombol || [{ teks: 'Tutup', kelas: 'btn-hantu', tutup: true }]).forEach(t => {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn ' + (t.kelas || 'btn-utama'); btn.innerHTML = (t.ikon ? '<span class="ms">' + t.ikon + '</span>' : '') + esc(t.teks);
        btn.onclick = async () => { if (t.tutup) return tutup(); if (t.aksi) { btn.classList.add('memuat-btn'); btn.disabled = true; try { const hasil = await t.aksi(lap, btn); if (hasil !== false) tutup(); } finally { btn.classList.remove('memuat-btn'); btn.disabled = false; } } };
        f.appendChild(btn);
      });
      if (!o.tombol || !o.tombol.length) f.hidden = !o.tombol;
      const tutup = () => { lap.remove(); document.removeEventListener('keydown', esck); if (o.saatTutup) o.saatTutup(); };
      const esck = e => { if (e.key === 'Escape') tutup(); };
      lap.addEventListener('click', e => { if (e.target === lap || e.target.closest('[data-tutup]')) tutup(); });
      document.addEventListener('keydown', esck);
      document.body.appendChild(lap);
      setTimeout(() => { const i = $('input:not([type=hidden]),select,textarea', b); if (i && !o.tanpaFokus) i.focus(); }, 30);
      lap.tutup = tutup;
      return lap;
    },
    /** Konfirmasi (opsional dengan alasan wajib). → Promise<{ok, alasan}> */
    konfirmasi(judul, pesan, o) {
      o = o || {};
      return new Promise(res => {
        const isi = '<p style="margin:0 0 10px">' + pesan + '</p>' + (o.alasan ? '<div class="isian"><label>' + esc(o.labelAlasan || 'Alasan') + ' <span class="wajib">*</span></label><textarea id="kf-alasan" placeholder="' + esc(o.contohAlasan || 'Tuliskan alasan (min. 10 karakter)') + '"></textarea><small>Tercatat di audit log.</small></div>' : '');
        let dijawab = false;
        UI.modal({ judul, isi, tanpaFokus: !o.alasan, saatTutup: () => { if (!dijawab) res({ ok: false }); }, tombol: [{ teks: 'Batal', kelas: 'btn-hantu', tutup: true }, { teks: o.teksOk || 'Ya, lanjutkan', kelas: o.bahaya ? 'btn-bahaya' : 'btn-utama', aksi: lap => { const a = o.alasan ? $('#kf-alasan', lap).value.trim() : ''; if (o.alasan && a.length < (o.minAlasan || 10)) { UI.toast('Alasan minimal ' + (o.minAlasan || 10) + ' karakter.', 'galat'); return false; } dijawab = true; res({ ok: true, alasan: a }); } }] });
      });
    },
    /** Jalankan aksi tulis dengan umpan balik tombol + toast. */
    async aksi(btn, action, data, o) {
      o = o || {};
      if (btn) { btn.classList.add('memuat-btn'); btn.disabled = true; }
      try {
        const r = await API.call(action, data);
        if (r.success) { if (r.message && !o.diam) UI.toast(r.message, 'sukses'); if (o.lalu) await o.lalu(r); }
        else UI.toast(r.message || 'Gagal.', 'galat');
        return r;
      } finally { if (btn) { btn.classList.remove('memuat-btn'); btn.disabled = false; } }
    },
    kerangka(n, tinggi) { return Array.from({ length: n || 3 }, () => '<div class="kerangka" style="height:' + (tinggi || 120) + 'px"></div>').join(''); },
    kosong(teks, ikon) { return '<div class="kosong"><span class="ms">' + (ikon || 'inbox') + '</span>' + esc(teks || 'Belum ada data.') + '</div>'; },
    galat(r) { return '<div class="banner banner-merah"><span class="ms">error</span><div><b>Gagal memuat data</b>' + esc((r && r.message) || '') + '</div></div>'; }
  };

  /* ---------- Status → warna lencana (PRD 7.7) ---------- */
  const HIJAU = /^(Disetujui|Ditutup|Lengkap|Tercapai|Berlaku|Selesai|Aktif|Memenuhi|Sesuai|Pencapaian Unggul|Terkirim|SAH|Siap|Sukses|Terdaftar|Ya|YA|Diverifikasi|Terakreditasi Unggul|Final)$/;
  const AMBER = /^(Menunggu|Diajukan|Perlu Dilengkapi|Mendekati|Rencana Diajukan|Rencana Disetujui|Dilaksanakan|Observasi|Peringatan|Ditugaskan|Ditangani|Antri|Diproses|Review|Revisi|Perlu Revisi|Terjadwal|Berjalan|Dibuka|Diterima|Data belum tersedia|Perencanaan)$/;
  const MERAH = /^(Ditolak|Terlambat|KTS Mayor|Kritis|Gagal|Belum|Ditarik|DITARIK|Tidak Terdaftar|Eskalasi|Dihentikan|Batal|KTS Minor)$/;
  const BIRU = /^(Info|Baru|Terbuka|Berjalan|Draf Revisi)$/;
  function chip(s, kelas) {
    s = s === undefined || s === null || s === '' ? '—' : String(s);
    const c = kelas || (s === 'Terbuka' || s === 'Baru' ? 'c-biru' : HIJAU.test(s) ? 'c-hijau' : MERAH.test(s) ? 'c-merah' : AMBER.test(s) ? 'c-amber' : BIRU.test(s) ? 'c-biru' : 'c-abu');
    return '<span class="chip ' + c + '">' + esc(s) + '</span>';
  }
  function chipSumber(waktu, belumFinal) { return '<span class="chip chip-sumber" title="Data baca-saja dari SIM-LPPM"><i></i>Sumber: SIM-LPPM' + (waktu ? ' · disinkron ' + esc(Fmt.waktu(waktu)) : '') + '</span>' + (belumFinal ? ' <span class="chip c-amber">Belum final</span>' : ''); }

  w.MH = { VERSI, $, $$, esc, Fmt, keDate, Perf, Sesi, API, Store, muat, Router, UI, chip, chipSumber, hangatkan, Aktivitas, hashStr };
  w.Perf = Perf;
})(window);
