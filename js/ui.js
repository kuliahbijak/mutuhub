/* =====================================================================
 * ui.js — Komponen: master data, form builder, tabel (cari/filter/urut/
 * paginasi/ekspor Excel & PDF), grafik SVG (batang, donut, garis, cincin)
 * dengan tooltip, unggah berkas (potongan), QR SVG, impor Excel.
 * ===================================================================== */
(function (w) {
  'use strict';
  const { $, $$, esc, Fmt, API, UI, Sesi } = w.MH;

  /* ---------- Master data (dari app.boot) ---------- */
  const Master = {
    d: { unit: [], prodi: [], periode: [], pengguna: [], instrumen: [], kriteria: [], standar: [] }, setelan: {},
    isi(m, s) { if (m) this.d = m; if (s) this.setelan = s; },
    unit(k) { const u = this.d.unit.find(x => x.Kode_Unit === k); return u ? u.Nama_Unit : (k || '—'); },
    prodi(k) { const p = this.d.prodi.find(x => x.Kode_Prodi === k); return p ? p.Nama_Prodi : (k || '—'); },
    orang(idAtauEmail) { const s = String(idAtauEmail || '').toLowerCase(); const u = this.d.pengguna.find(x => x.ID_User === idAtauEmail || String(x.Email).toLowerCase() === s); return u ? u.Nama : (idAtauEmail || '—'); },
    kriteria(id) { const k = this.d.kriteria.find(x => x.ID_Kriteria === id); return k ? k.Kode + ' ' + k.Nama : (id === '*' ? 'Lintas kriteria' : id || '—'); },
    kodeKriteria(id) { const k = this.d.kriteria.find(x => x.ID_Kriteria === id); return k ? k.Kode : (id === '*' ? 'Umum' : id || '—'); },
    standar(id) { const s = this.d.standar.find(x => x.ID_Standar === id || x.Kode === id); return s ? s.Kode + ' ' + s.Nama : (id || '—'); },
    opsiUnit(semua) { return this.d.unit.filter(u => semua || u.Status_Aktif === 'Aktif').map(u => [u.Kode_Unit, u.Nama_Unit]); },
    opsiProdi() { return this.d.prodi.filter(p => p.Status_Aktif === 'Aktif').map(p => [p.Kode_Prodi, p.Nama_Prodi]); },
    opsiTA() { return [...new Set(this.d.periode.map(p => p.Tahun_Akademik))].sort().reverse(); },
    opsiPengguna(roles, nilai) { return this.d.pengguna.filter(u => !roles || roles.indexOf(u.Role) >= 0).map(u => [nilai === 'email' ? u.Email : u.ID_User, u.Nama + ' · ' + u.Role + (u.Kode_Unit ? ' · ' + u.Kode_Unit : '')]); },
    opsiStandar() { return this.d.standar.map(s => [s.ID_Standar, s.Kode + ' ' + s.Nama]); },
    opsiKriteria(idIns) { return this.d.kriteria.filter(k => !idIns || k.ID_Instrumen === idIns).sort((a, b) => (Number(a.Urutan) || 0) - (Number(b.Urutan) || 0)).map(k => [k.ID_Kriteria, k.Kode + ' ' + k.Nama]); },
    terkunci(ta) { return this.d.periode.some(p => p.Tahun_Akademik === ta && p.Terkunci === 'Ya'); }
  };

  /* ---------- Form builder ---------- */
  function opsiHtml(opsi, nilai, kosong) {
    let h = kosong === false ? '' : '<option value="">' + esc(kosong || '— pilih —') + '</option>';
    (typeof opsi === 'function' ? opsi() : opsi || []).forEach(o => { const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; h += '<option value="' + esc(v) + '"' + (String(v) === String(nilai) ? ' selected' : '') + '>' + esc(l) + '</option>'; });
    return h;
  }
  /** fields: [{k, l, t:'teks|angka|tanggal|area|pilih|multi|email|url|saklar|berkas|info', opsi, wajib, bantu, penuh, ro}] */
  function formHtml(fields, v) {
    v = v || {};
    return '<div class="form-grid">' + fields.map(f => {
      const id = 'f-' + f.k, val = v[f.k] === undefined || v[f.k] === null ? (f.bawaan === undefined ? '' : f.bawaan) : v[f.k];
      const lab = '<label for="' + id + '">' + esc(f.l) + (f.wajib ? ' <span class="wajib">*</span>' : '') + '</label>';
      const ro = f.ro ? ' readonly' : '';
      let inp;
      if (f.t === 'info') return '<div class="isian penuh"><div class="banner banner-biru"><span class="ms">info</span><div>' + f.l + '</div></div></div>';
      if (f.t === 'area') inp = '<textarea id="' + id + '" data-k="' + f.k + '"' + ro + ' rows="' + (f.baris || 4) + '">' + esc(val) + '</textarea>';
      else if (f.t === 'pilih') inp = '<select id="' + id + '" data-k="' + f.k + '"' + (f.ro ? ' disabled' : '') + '>' + opsiHtml(f.opsi, val, f.kosong) + '</select>';
      else if (f.t === 'multi') { const pilih = String(val).split(/[,;]\s*/).filter(Boolean); inp = '<select id="' + id + '" data-k="' + f.k + '" multiple size="' + (f.ukuran || 5) + '">' + (typeof f.opsi === 'function' ? f.opsi() : f.opsi).map(o => '<option value="' + esc(o[0]) + '"' + (pilih.indexOf(o[0]) >= 0 ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>'; }
      else if (f.t === 'saklar') inp = '<label class="cekbox"><span class="saklar"><input type="checkbox" id="' + id + '" data-k="' + f.k + '"' + (val === true || val === 'Ya' || val === 'YA' ? ' checked' : '') + '><span></span></span> ' + esc(f.teksSaklar || '') + '</label>';
      else if (f.t === 'berkas') inp = '<div class="zona-unggah" data-k="' + f.k + '" data-folder="' + esc(f.folder || 'Lain') + '" tabindex="0"><span class="ms">upload_file</span> <span class="lbl">' + (val ? 'Berkas terlampir ✓ — klik untuk ganti' : 'Klik atau seret berkas (PDF/gambar/Office, maks 25 MB)') + '</span><input type="file" hidden><input type="hidden" data-k="' + f.k + '" value="' + esc(val) + '"><div class="progres" hidden style="margin-top:8px"><i style="width:0"></i></div></div>';
      else inp = '<input id="' + id + '" data-k="' + f.k + '" type="' + ({ angka: 'number', tanggal: 'date', email: 'email', url: 'url', waktu: 'datetime-local' }[f.t] || 'text') + '" value="' + esc(f.t === 'tanggal' ? String(val).slice(0, 10) : val) + '"' + ro + (f.t === 'angka' ? ' step="any"' : '') + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + '>';
      return '<div class="isian ' + (f.penuh || f.t === 'area' || f.t === 'berkas' ? 'penuh' : '') + '">' + lab + inp + (f.bantu ? '<small>' + f.bantu + '</small>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function bacaForm(el, fields) {
    const o = {}, kurang = [];
    fields.forEach(f => {
      if (f.t === 'info') return;
      const inp = el.querySelector('[data-k="' + f.k + '"]' + (f.t === 'berkas' ? '[type=hidden]' : ''));
      if (!inp) return;
      let v;
      if (f.t === 'saklar') v = inp.checked ? (f.nilaiYa || 'Ya') : (f.nilaiTidak || 'Tidak');
      else if (f.t === 'multi') v = Array.from(inp.selectedOptions).map(x => x.value).join(', ');
      else if (f.t === 'angka') v = inp.value === '' ? '' : Number(inp.value);
      else v = inp.value.trim();
      if (f.wajib && (v === '' || v === null)) kurang.push(f.l);
      o[f.k] = v;
    });
    if (kurang.length) { UI.toast('Lengkapi: ' + kurang.join(', '), 'galat'); return null; }
    return o;
  }
  /** Modal form standar → simpan via data.simpan (atau aksi khusus). */
  function formModal(o) {
    const isi = document.createElement('div'); isi.innerHTML = (o.atas || '') + formHtml(o.fields, o.nilai) + (o.bawah || '');
    pasangUnggah(isi);
    return UI.modal({ judul: o.judul, sub: o.sub, lebar: o.lebar, isi, tombol: [{ teks: 'Batal', kelas: 'btn-hantu', tutup: true }, { teks: o.teksSimpan || 'Simpan', ikon: 'save', aksi: async () => { const v = bacaForm(isi, o.fields); if (!v) return false; const r = await o.simpan(v); return !!(r && r.success); } }] });
  }

  /* ---------- Unggah berkas (tunggal atau per potongan 4 MB) ---------- */
  const keB64 = buf => { let s = '', b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
  async function unggah(file, folder, kemajuan) {
    if (file.size > 25 * 1048576) return { success: false, message: 'Ukuran berkas maksimal 25 MB.' };
    const buf = await file.arrayBuffer(), POT = 4 * 1048576;
    if (buf.byteLength <= POT) { kemajuan && kemajuan(50); const r = await API.call('file.unggah', { nama: file.name, mime: file.type || 'application/octet-stream', data: keB64(buf), folder }); kemajuan && kemajuan(100); return r; }
    const n = Math.ceil(buf.byteLength / POT);
    const m = await API.call('file.mulai', { nama: file.name, mime: file.type, ukuran: buf.byteLength, potongan: n, folder }); if (!m.success) return m;
    for (let i = 0; i < n; i++) { const r = await API.call('file.potong', { uploadId: m.data.uploadId, i, data: keB64(buf.slice(i * POT, (i + 1) * POT)) }); if (!r.success) return r; kemajuan && kemajuan(Math.round((i + 1) / (n + 1) * 100)); }
    const s = await API.call('file.selesai', { uploadId: m.data.uploadId }); kemajuan && kemajuan(100); return s;
  }
  function pasangUnggah(root) {
    $$('.zona-unggah', root).forEach(z => {
      const file = $('input[type=file]', z), hid = $('input[type=hidden]', z), lbl = $('.lbl', z), bar = $('.progres', z);
      const proses = async f => { if (!f) return; bar.hidden = false; lbl.textContent = 'Mengunggah ' + f.name + '…'; const r = await unggah(f, z.dataset.folder, p => { $('i', bar).style.width = p + '%'; }); if (r.success) { hid.value = r.data.id; lbl.textContent = '✓ ' + r.data.nama; } else { lbl.textContent = 'Gagal: ' + r.message; UI.toast(r.message, 'galat'); } };
      z.onclick = e => { if (e.target !== file) file.click(); };
      z.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
      file.onchange = () => proses(file.files[0]);
      z.ondragover = e => { e.preventDefault(); z.classList.add('seret'); }; z.ondragleave = () => z.classList.remove('seret');
      z.ondrop = e => { e.preventDefault(); z.classList.remove('seret'); proses(e.dataTransfer.files[0]); };
    });
  }
  /** Buka berkas lewat API (berkas privat; server cek hak akses). */
  async function bukaBerkas(id, btn) {
    if (!id) return;
    if (/^https?:\/\//.test(id)) { window.open(id, '_blank', 'noopener'); return; }
    if (/^#/.test(id)) { location.hash = id; return; }
    const win = window.open('', '_blank'); if (win) win.document.write('<p style="font-family:sans-serif">Membuka berkas…</p>');
    const r = await UI.aksi(btn, 'file.ambil', { id: String(id).split(/[,;]\s*/)[0] }, { diam: true });
    if (!r.success) { if (win) win.close(); return; }
    if (r.data.google) { if (win) win.location = r.data.url; else window.open(r.data.url, '_blank'); return; }
    const bytes = Uint8Array.from(atob(r.data.data), c => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: r.data.mime }));
    if (win) win.location = url; else window.open(url, '_blank');
  }

  /* ---------- Ekspor Excel (SheetJS, dimuat saat dibutuhkan) & PDF (cetak) ---------- */
  let _xlsx = null;
  function muatXlsx() {
    if (w.XLSX) return Promise.resolve(w.XLSX);
    if (_xlsx) return _xlsx;
    _xlsx = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'; s.onload = () => res(w.XLSX); s.onerror = () => { _xlsx = null; rej(new Error('Pustaka Excel gagal dimuat. Periksa koneksi.')); }; document.head.appendChild(s); });
    return _xlsx;
  }
  async function eksporExcel(nama, kolom, baris, meta) {
    try {
      const X = await muatXlsx();
      const data = (meta ? [[meta.judul || nama], ['Diekspor ' + new Date().toLocaleString('id-ID') + ' oleh ' + ((Sesi.me && Sesi.me.nama) || '-')]].concat(meta.baris || []).concat([[]]) : []).concat([kolom], baris.map(r => r.map(v => typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v)));
      const ws = X.utils.aoa_to_sheet(data), wb = X.utils.book_new();
      ws['!cols'] = kolom.map((k, i) => ({ wch: Math.min(50, Math.max(10, ...baris.slice(0, 50).map(r => String(r[i] == null ? '' : r[i]).length), String(k).length) + 2) }));
      X.utils.book_append_sheet(wb, ws, 'Data');
      X.writeFile(wb, nama.replace(/[\\/:*?"<>|]/g, '-') + '.xlsx');
      API.call('laporan.catat', { jenis: nama, format: 'XLSX', filter: meta && meta.filter || {} });
    } catch (e) { UI.toast(e.message, 'galat'); }
  }
  function eksporPdf(judul, kolom, baris, metaTeks) {
    const win = window.open('', '_blank'); if (!win) { UI.toast('Izinkan jendela pop-up untuk mencetak PDF.', 'galat'); return; }
    const s = Master.setelan || {};
    win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(judul) + '</title><style>body{font-family:Inter,Arial,sans-serif;font-size:11px;color:#1F2430;margin:24px}h1{font-size:16px;margin:0}h2{font-size:12px;font-weight:500;color:#555;margin:2px 0 12px}table{width:100%;border-collapse:collapse}th{background:#DCE3FA;text-align:left}th,td{border:1px solid #c9cfdc;padding:5px 6px;vertical-align:top}.meta{color:#666;font-size:10px;margin:8px 0}@page{size:A4 landscape;margin:12mm}</style></head><body><h1>' + esc(judul) + '</h1><h2>' + esc((s.NAMA_KAMPUS || '') + ' · ' + (s.NAMA_LEMBAGA || '')) + '</h2><div class="meta">' + esc(metaTeks || ('Dicetak ' + new Date().toLocaleString('id-ID') + ' oleh ' + ((Sesi.me && Sesi.me.nama) || '-'))) + ' · ' + baris.length + ' baris</div><table><thead><tr>' + kolom.map(k => '<th>' + esc(k) + '</th>').join('') + '</tr></thead><tbody>' + baris.map(r => '<tr>' + r.map(v => '<td>' + esc(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table><script>setTimeout(function(){print()},300)<\/script></body></html>');
    win.document.close();
    API.call('laporan.catat', { jenis: judul, format: 'PDF', filter: {} });
  }
  async function imporExcel(file) {
    const X = await muatXlsx(), wb = X.read(await file.arrayBuffer());
    return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
  }

  /* ---------- Tabel ---------- */
  /** o = {kolom:[{k,l,f(row),num,ekspor(row)}], rows, cari:true, filter:[{k,l,opsi}], per:15, klik(row), nama, kartuHp, aksiAtas:html} */
  function tabel(el, o) {
    const st = { q: '', f: {}, hal: 1, urut: o.urut || null, naik: o.naik !== false };
    const per = o.per || 15;
    const data = () => {
      let r = (o.rows || []).slice();
      if (st.q) { const q = st.q.toLowerCase(); r = r.filter(x => o.kolom.some(k => String(k.cari ? k.cari(x) : x[k.k] == null ? '' : x[k.k]).toLowerCase().indexOf(q) >= 0)); }
      Object.keys(st.f).forEach(k => { if (st.f[k]) r = r.filter(x => String(x[k]) === st.f[k]); });
      if (st.urut) { const kol = o.kolom.find(k => k.k === st.urut) || {}; r.sort((a, b) => { const va = kol.nilai ? kol.nilai(a) : a[st.urut], vb = kol.nilai ? kol.nilai(b) : b[st.urut]; const na = Number(va), nb = Number(vb); const c = !isNaN(na) && !isNaN(nb) && va !== '' && vb !== '' ? na - nb : String(va || '').localeCompare(String(vb || ''), 'id'); return st.naik ? c : -c; }); }
      return r;
    };
    const gambar = () => {
      const rows = data(), maks = Math.max(1, Math.ceil(rows.length / per)); if (st.hal > maks) st.hal = maks;
      const tampil = rows.slice((st.hal - 1) * per, st.hal * per);
      $('.tbl-wrap', el).innerHTML = rows.length ? '<table class="tbl"><thead><tr>' + o.kolom.map(k => '<th data-k="' + esc(k.k) + '" class="' + (st.urut === k.k ? 'urut ' + (st.naik ? 'naik' : '') : '') + (k.num ? ' num' : '') + '">' + esc(k.l) + '</th>').join('') + '</tr></thead><tbody>' +
        tampil.map((r, i) => '<tr data-i="' + ((st.hal - 1) * per + i) + '"' + (o.klik ? ' class="klik" tabindex="0"' : '') + '>' + o.kolom.map(k => '<td data-l="' + esc(k.l) + '" class="' + (k.num ? 'num' : '') + '">' + (k.f ? k.f(r) : esc(r[k.k])) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' : UI.kosong(o.kosong || 'Tidak ada data yang cocok.');
      const pg = $('.paginasi', el);
      pg.innerHTML = '<span>' + (rows.length ? ((st.hal - 1) * per + 1) + '–' + Math.min(st.hal * per, rows.length) + ' dari ' + rows.length : '0 data') + '</span><div class="tombol">' + (maks > 1 ? '<button data-p="' + (st.hal - 1) + '" ' + (st.hal === 1 ? 'disabled' : '') + '>‹</button>' + Array.from({ length: maks }, (_, i) => i + 1).filter(n => n === 1 || n === maks || Math.abs(n - st.hal) <= 1).map((n, i, a) => (i && n - a[i - 1] > 1 ? '<span>…</span>' : '') + '<button data-p="' + n + '" class="' + (n === st.hal ? 'aktif' : '') + '">' + n + '</button>').join('') + '<button data-p="' + (st.hal + 1) + '" ' + (st.hal === maks ? 'disabled' : '') + '>›</button>' : '') + '</div>';
      el._baris = rows;
    };
    const bagian = (o.filter || []).map(f => '<select data-f="' + esc(f.k) + '" aria-label="' + esc(f.l) + '">' + opsiHtml(f.opsi, '', 'Semua ' + f.l.toLowerCase()) + '</select>').join('');
    el.innerHTML = '<div class="tabel-alat">' + (o.cari === false ? '' : '<div class="cari-tabel"><span class="ms">search</span><input type="search" placeholder="Cari…" aria-label="Cari di tabel"></div>') + bagian + '<span class="spacer"></span>' + (o.aksiAtas || '') + (o.ekspor === false ? '' : '<button class="btn btn-hantu btn-kecil" data-x="xlsx"><span class="ms">table_view</span>Unduh Excel</button><button class="btn btn-hantu btn-kecil" data-x="pdf"><span class="ms">picture_as_pdf</span>Unduh PDF</button>') + '</div><div class="tbl-wrap ' + (o.kartuHp !== false ? 'kartu-hp' : '') + '"></div><div class="paginasi"></div>';
    const q = $('.cari-tabel input', el); if (q) q.oninput = () => { st.q = q.value; st.hal = 1; gambar(); };
    $$('[data-f]', el).forEach(s => s.onchange = () => { st.f[s.dataset.f] = s.value; st.hal = 1; gambar(); });
    el.addEventListener('click', e => {
      const th = e.target.closest('th[data-k]'); if (th) { st.naik = st.urut === th.dataset.k ? !st.naik : true; st.urut = th.dataset.k; gambar(); return; }
      const pb = e.target.closest('[data-p]'); if (pb && !pb.disabled) { st.hal = Number(pb.dataset.p); gambar(); return; }
      const x = e.target.closest('[data-x]'); if (x) { const rows = el._baris, kol = o.kolom.filter(k => k.ekspor !== false); const baris = rows.map(r => kol.map(k => k.ekspor ? k.ekspor(r) : (k.teks ? k.teks(r) : r[k.k]))); const nama = o.nama || 'MutuHub'; if (x.dataset.x === 'xlsx') eksporExcel(nama, kol.map(k => k.l), baris, { filter: st }); else eksporPdf(nama, kol.map(k => k.l), baris); return; }
      if (e.target.closest('button,a,input,select,label')) return;
      const tr = e.target.closest('tr[data-i]'); if (tr && o.klik) o.klik(el._baris[Number(tr.dataset.i)]);
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-i]'); if (tr && o.klik) o.klik(el._baris[Number(tr.dataset.i)]); } });
    gambar();
    return { segarkan(rows) { o.rows = rows; gambar(); }, baris: () => el._baris };
  }

  /* ---------- Grafik SVG ---------- */
  const PALET = ['#4B65D6', '#22C7D6', '#E8930C', '#8E5BD0', '#0E9F9A'];
  const WARNA_STATUS = { hijau: '#16A34A', amber: '#F5A623', merah: '#DC2626', abu: '#B5BBC8', biru: '#4B65D6', teal: '#0E9F9A', cyan: '#22C7D6' };
  function tooltip(wadah) { let t = $('.tt', wadah); if (!t) { t = document.createElement('div'); t.className = 'tt'; t.hidden = true; wadah.appendChild(t); } return t; }
  function pasangTt(wadah) {
    const tt = tooltip(wadah);
    wadah.addEventListener('pointermove', e => { const m = e.target.closest('[data-tt]'); if (!m) { tt.hidden = true; return; } const r = wadah.getBoundingClientRect(); tt.innerHTML = m.getAttribute('data-tt'); tt.hidden = false; tt.style.left = Math.min(r.width - 60, Math.max(60, e.clientX - r.left)) + 'px'; tt.style.top = (e.clientY - r.top - 8) + 'px'; });
    wadah.addEventListener('pointerleave', () => { tt.hidden = true; });
  }
  const skalaBulat = m => { if (m <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(m))); const n = m / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
  /** Batang kolom berkelompok. o = {label:[], seri:[{nama, data:[], warna}], tinggi, satuan, maks, labelNilai, warnaPer(i,v)} */
  function batang(el, o) {
    const W = 640, H = o.tinggi || 220, kiri = 34, bawah = 26, atas = 18, n = o.label.length, s = o.seri.length;
    if (!n) { el.innerHTML = UI.kosong('Belum ada data untuk grafik.', 'bar_chart'); return; }
    const maks = o.maks || skalaBulat(Math.max(1, ...o.seri.flatMap(x => x.data.map(v => Number(v) || 0))));
    const lebarGrup = (W - kiri) / n, bw = Math.min(24, (lebarGrup * 0.7) / s), y = v => atas + (H - atas - bawah) * (1 - Math.min(1, (Number(v) || 0) / maks));
    let g = '';
    [0, .5, 1].forEach(f => { const yy = atas + (H - atas - bawah) * (1 - f); g += '<line x1="' + kiri + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" stroke="#EEF2F9"/><text x="' + (kiri - 6) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="10" fill="#7A8194">' + Fmt.angka(maks * f, 0) + '</text>'; });
    o.label.forEach((l, i) => {
      const x0 = kiri + i * lebarGrup + (lebarGrup - bw * s - 2 * (s - 1)) / 2;
      o.seri.forEach((sr, j) => {
        const v = sr.data[i], x = x0 + j * (bw + 2), yy = y(v), h = Math.max(0, H - bawah - yy), warna = o.warnaPer ? o.warnaPer(i, v, j) || sr.warna : sr.warna || PALET[j];
        const r = Math.min(4, bw / 2, h);
        const d = h > 0 ? 'M' + x + ',' + (H - bawah) + 'V' + (yy + r) + 'Q' + x + ',' + yy + ' ' + (x + r) + ',' + yy + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + yy + ' ' + (x + bw) + ',' + (yy + r) + 'V' + (H - bawah) + 'Z' : '';
        g += '<rect x="' + (x - 3) + '" y="' + atas + '" width="' + (bw + 6) + '" height="' + (H - atas - bawah) + '" fill="transparent" data-tt="<b>' + esc(l) + '</b>' + esc(sr.nama || '') + ': ' + Fmt.angka(v) + esc(o.satuan || '') + '"/>';
        if (d) g += '<path d="' + d + '" fill="' + warna + '" pointer-events="none"/>';
        if (o.labelNilai !== false && (s === 1 || j === s - 1)) g += '<text x="' + (x + bw / 2) + '" y="' + (yy - 5) + '" text-anchor="middle" font-size="10.5" font-weight="600" fill="#1F2430" pointer-events="none">' + (v === null || v === undefined || v === '' ? '' : Fmt.angka(v, 1) + (o.satuan === '%' ? '%' : '')) + '</text>';
      });
      g += '<text x="' + (kiri + i * lebarGrup + lebarGrup / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10.5" fill="#7A8194">' + esc(String(l).length > 14 ? String(l).slice(0, 13) + '…' : l) + '</text>';
    });
    el.innerHTML = '<div class="grafik"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.judul || 'Grafik batang') + '">' + g + '</svg></div>' + (s > 1 ? '<div class="legenda">' + o.seri.map((x, j) => '<span><i style="background:' + (x.warna || PALET[j]) + '"></i>' + esc(x.nama) + '</span>').join('') + '</div>' : '');
    pasangTt($('.grafik', el));
  }
  /** Donut. o = {item:[{l, v, w}], tengah, sub, ukuran} */
  function donut(el, o) {
    const tot = o.item.reduce((a, x) => a + (Number(x.v) || 0), 0), R = 60, r = 42, C = 75;
    let sudut = -Math.PI / 2, g = '';
    if (!tot) g = '<circle cx="' + C + '" cy="' + C + '" r="' + ((R + r) / 2) + '" fill="none" stroke="#EEF2F9" stroke-width="' + (R - r) + '"/>';
    o.item.forEach((x, i) => {
      const v = Number(x.v) || 0; if (!v) return;
      const a = v / tot * Math.PI * 2, celah = o.item.filter(y => y.v).length > 1 ? 0.025 : 0, a1 = sudut + celah, a2 = sudut + a - celah, besar = a2 - a1 > Math.PI ? 1 : 0;
      const p = (rad, ang) => (C + rad * Math.cos(ang)).toFixed(2) + ',' + (C + rad * Math.sin(ang)).toFixed(2);
      g += a >= Math.PI * 2 - 0.001 ? '<circle cx="' + C + '" cy="' + C + '" r="' + ((R + r) / 2) + '" fill="none" stroke="' + (x.w || PALET[i % 5]) + '" stroke-width="' + (R - r) + '" data-tt="<b>' + esc(x.l) + '</b>' + v + ' (100%)"/>' :
        '<path d="M' + p(R, a1) + 'A' + R + ',' + R + ' 0 ' + besar + ' 1 ' + p(R, a2) + 'L' + p(r, a2) + 'A' + r + ',' + r + ' 0 ' + besar + ' 0 ' + p(r, a1) + 'Z" fill="' + (x.w || PALET[i % 5]) + '" data-tt="<b>' + esc(x.l) + '</b>' + v + ' (' + Math.round(v / tot * 100) + '%)"/>';
      sudut += a;
    });
    el.innerHTML = '<div class="donut-wrap"><div class="grafik cincin" style="width:150px"><svg viewBox="0 0 150 150" role="img" aria-label="' + esc(o.judul || 'Donut') + '">' + g + '</svg><div class="tengah"><b>' + esc(o.tengah === undefined ? tot : o.tengah) + '</b><small>' + esc(o.sub || 'Total') + '</small></div></div><div class="donut-leg">' +
      o.item.map((x, i) => '<div><i style="background:' + (x.w || PALET[i % 5]) + '"></i><span>' + esc(x.l) + '</span><b>' + (tot ? Math.round((Number(x.v) || 0) / tot * 100) : 0) + '%</b><span class="chip c-abu">' + Fmt.angka(x.v, 0) + '</span></div>').join('') + '</div></div>';
    pasangTt($('.grafik', el));
  }
  /** Garis (satu seri) dengan area tipis + titik akhir berlabel. o = {label:[], data:[], warna, tinggi, satuan, gelap, ambang} */
  function garis(el, o) {
    const W = 600, H = o.tinggi || 160, kiri = o.gelap ? 6 : 30, kanan = 36, atas = 16, bawah = 22, n = o.data.length;
    if (!n) { el.innerHTML = '<div class="kosong" style="padding:16px;color:inherit;opacity:.7">Belum ada riwayat.</div>'; return; }
    const v = o.data.map(Number), mx = o.maks || Math.max(100, ...v), mn = o.min === undefined ? 0 : o.min;
    const X = i => kiri + (n === 1 ? (W - kiri - kanan) / 2 : i * (W - kiri - kanan) / (n - 1)), Y = x => atas + (H - atas - bawah) * (1 - (x - mn) / (mx - mn || 1));
    const warna = o.warna || '#22C7D6', teksW = o.gelap ? 'rgba(255,255,255,.75)' : '#7A8194';
    let d = '', poin = '';
    v.forEach((x, i) => { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(x).toFixed(1); poin += '<circle cx="' + X(i) + '" cy="' + Y(x) + '" r="12" fill="transparent" data-tt="<b>' + esc(o.label[i]) + '</b>' + Fmt.angka(x, 1) + esc(o.satuan || '') + '"/>'; });
    const area = d + 'L' + X(n - 1) + ',' + (H - bawah) + 'L' + X(0) + ',' + (H - bawah) + 'Z';
    const amb = o.ambang ? '<line x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + Y(o.ambang) + '" y2="' + Y(o.ambang) + '" stroke="' + (o.gelap ? 'rgba(255,255,255,.35)' : '#C5CBD8') + '"/><text x="' + (W - kanan + 4) + '" y="' + (Y(o.ambang) + 4) + '" font-size="10" fill="' + teksW + '">' + o.ambang + '</text>' : '';
    const grid = o.gelap ? '' : [0, .5, 1].map(f => { const yy = atas + (H - atas - bawah) * (1 - f); return '<line x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + yy + '" y2="' + yy + '" stroke="#EEF2F9"/><text x="' + (kiri - 5) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="10" fill="#7A8194">' + Fmt.angka(mn + (mx - mn) * f, 0) + '</text>'; }).join('');
    const lbl = o.label.map((l, i) => (n <= 8 || i === 0 || i === n - 1 || i % Math.ceil(n / 6) === 0) ? '<text x="' + X(i) + '" y="' + (H - 5) + '" text-anchor="middle" font-size="10" fill="' + teksW + '">' + esc(l) + '</text>' : '').join('');
    el.innerHTML = '<div class="grafik"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.judul || 'Grafik garis') + '"><defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' + grid + amb +
      '<path d="' + area + '" fill="' + warna + '" opacity=".12"/><path d="' + d + '" fill="none" stroke="' + warna + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#glow)"/>' +
      '<circle cx="' + X(n - 1) + '" cy="' + Y(v[n - 1]) + '" r="5" fill="' + warna + '" stroke="' + (o.gelap ? '#2B4DB8' : '#fff') + '" stroke-width="2"/><text x="' + Math.min(W - 4, X(n - 1) + 8) + '" y="' + (Y(v[n - 1]) - 8) + '" font-size="11" font-weight="700" text-anchor="end" fill="' + (o.gelap ? '#fff' : '#1F2430') + '">' + Fmt.angka(v[n - 1], 1) + esc(o.satuan || '') + '</text>' + lbl + poin + '</svg></div>';
    pasangTt($('.grafik', el));
  }
  /** Cincin skor (HTML string). */
  function cincin(nilai, o) {
    o = o || {};
    const uk = o.ukuran || 96, t = o.tebal || 9, r = (uk - t) / 2, k = 2 * Math.PI * r, v = nilai === null || nilai === undefined ? 0 : Math.max(0, Math.min(100, Number(nilai)));
    const warna = o.warna || (v >= 85 ? '#16A34A' : v >= 70 ? '#22C7D6' : v >= 50 ? '#F5A623' : '#DC2626');
    return '<div class="cincin" style="width:' + uk + 'px;height:' + uk + 'px"><svg viewBox="0 0 ' + uk + ' ' + uk + '" width="' + uk + '" height="' + uk + '" role="img" aria-label="Skor ' + v + '%"><circle cx="' + uk / 2 + '" cy="' + uk / 2 + '" r="' + r + '" fill="none" stroke="' + (o.gelap ? 'rgba(255,255,255,.15)' : '#EEF2F9') + '" stroke-width="' + t + '"/><circle cx="' + uk / 2 + '" cy="' + uk / 2 + '" r="' + r + '" fill="none" stroke="' + warna + '" stroke-width="' + t + '" stroke-linecap="round" stroke-dasharray="' + (k * v / 100) + ' ' + k + '" transform="rotate(-90 ' + uk / 2 + ' ' + uk / 2 + ')"' + (o.gelap ? ' style="filter:drop-shadow(0 0 6px rgba(34,199,214,.6))"' : '') + '/></svg><div class="tengah"><b style="' + (o.besar ? 'font-size:' + o.besar + 'px' : '') + '">' + (nilai === null || nilai === undefined ? '—' : Fmt.angka(nilai, 1) + '%') + '</b>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</div></div>';
  }
  function progres(nilai, kelas) { const v = Math.max(0, Math.min(100, Number(nilai) || 0)); return '<div class="progres ' + (kelas || '') + '" role="progressbar" aria-valuenow="' + v + '"><i style="width:' + v + '%"></i></div>'; }

  /* ---------- Kalender mini ---------- */
  function kalender(tgl, tandai) {
    const d = tgl ? new Date(tgl + 'T00:00:00') : new Date(), th = d.getFullYear(), bl = d.getMonth();
    const awal = new Date(th, bl, 1), mulai = (awal.getDay() + 6) % 7, jml = new Date(th, bl + 1, 0).getDate(), kini = Fmt.hariIni();
    let h = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'].map(x => '<div class="h">' + x + '</div>').join('');
    for (let i = 0; i < mulai; i++) h += '<div class="d luar"></div>';
    for (let i = 1; i <= jml; i++) { const s = th + '-' + String(bl + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0'); h += '<div class="d ' + (s === kini ? 'kini' : '') + (tandai && tandai[s] ? ' ada' : '') + '" title="' + esc(tandai && tandai[s] ? tandai[s] : '') + '">' + i + '</div>'; }
    return '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b>' + ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][bl] + ' ' + th + '</b></div><div class="kalender">' + h + '</div>';
  }

  /* ---------- QR SVG (encoder yang sama dengan backend) ---------- */
  function qrSvg(teks, ukuran) {
    const m = w.qrMatriks_(teks), n = m.length, t = 4, s = n + t * 2;
    let p = '';
    m.forEach((row, y) => row.forEach((v, x) => { if (v) p += 'M' + (x + t) + ',' + (y + t) + 'h1v1h-1z'; }));
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" width="' + (ukuran || 160) + '" height="' + (ukuran || 160) + '" shape-rendering="crispEdges" role="img" aria-label="Kode QR"><rect width="100%" height="100%" fill="#fff"/><path d="' + p + '" fill="#1F2430"/></svg>';
  }

  w.MH.Master = Master;
  w.MH.F = { formHtml, bacaForm, formModal, opsiHtml, pasangUnggah, unggah, bukaBerkas, eksporExcel, eksporPdf, imporExcel, muatXlsx };
  w.MH.G = { batang, donut, garis, cincin, progres, kalender, PALET, WARNA_STATUS };
  w.MH.tabel = tabel; w.MH.qrSvg = qrSvg;
})(window);
