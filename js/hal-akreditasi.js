/* =====================================================================
 * hal-akreditasi.js — LM5 Evaluasi Diri Prodi, LM6 Pusat Akreditasi
 * (proyek, katalog instrumen, papan kriteria, syarat, LED), LM7 Bukti
 * Dukung & Pemeriksaan Kesiapan (temuan L01–L11, peta skor, kunci
 * Periode Mutu dengan snapshot SIM-LPPM).
 * ===================================================================== */
(function (w) {
  'use strict';
  const { $, $$, esc, Fmt, API, Store, Sesi, UI, muat, chip, chipSumber, Master, State, G, F, tabel } = w.MH;
  const Hal = w.MH.Hal, kepala = w.MH.kepala;
  const LPM = ['SA', 'ADM'];
  const peran = () => Sesi.me.role, lpm = () => LPM.indexOf(peran()) >= 0;
  const kelasSkor = v => v === null || v === undefined || v === '' ? 'n' : v >= 80 ? 'h' : v >= 60 ? 'k' : 'm';
  const chipSev = s => chip(s, { Kritis: 'c-merah', Peringatan: 'c-amber', Info: 'c-biru' }[s] || 'c-abu');

  /* ================= LM5 Evaluasi Diri ================= */
  Hal.daftar('/evdiri', { judul: 'Evaluasi Diri Prodi', menu: 'evdiri', render: el => halEvdiri(el) });
  Hal.daftar('/evdiri/:id', {
    judul: 'Evaluasi Diri Prodi', menu: 'evdiri',
    render(el, p) { if (peran() === 'GKM') { location.replace('#/evdiri/' + p.id + '/' + Sesi.me.prodi); return; } sessionStorage.setItem('mh:eds', p.id); return halEvdiri(el); }
  });

  async function halEvdiri(el) {
    el.innerHTML = kepala('Evaluasi Diri Program Studi', 'Laporan evaluasi diri tahunan prodi: GKM mengisi, auditor/LPM meninjau. Butir yang disetujui menjadi bukti dukung internal akreditasi.', lpm() ? '<button class="btn btn-utama" id="b-eds"><span class="ms">add</span>Siklus baru</button>' : '') + '<div class="kartu" style="margin-top:14px" id="pil">' + UI.kerangka(1, 40) + '</div><div class="grid g-8-4" style="margin-top:14px"><div class="kartu" id="rekap">' + UI.kerangka(1, 200) + '</div><div class="kartu"><div class="kartu-h"><div><h3>Kinerja prodi</h3><p>Rata-rata % indikator tercapai per tahun</p></div></div><div id="g-kin"></div></div></div>';
    const fS = [{ k: 'Nama', l: 'Nama siklus', wajib: true, penuh: true }, { k: 'Tahun_Akademik', l: 'Tahun akademik', t: 'pilih', opsi: () => Master.opsiTA(), kosong: false }, { k: 'Tgl_Buka', l: 'Dibuka', t: 'tanggal', wajib: true }, { k: 'Tgl_Tutup', l: 'Ditutup', t: 'tanggal', wajib: true }];
    const simpanS = r => F.formModal({ judul: r ? 'Ubah siklus' : 'Siklus evaluasi diri baru', sub: 'Setelah disimpan, klik "Buka siklus" agar GKM dapat mengisi (butir bawaan dibuat otomatis).', fields: fS, nilai: r || { Tahun_Akademik: State.ta }, simpan: async v => { const x = await API.call('data.simpan', { e: 'Evaluasi_Diri_Siklus', row: Object.assign(r ? { ID_Siklus: r.ID_Siklus } : {}, v) }); if (x.success) { sessionStorage.setItem('mh:eds', x.data.ID_Siklus); w.MH.Router.jalan(); } else UI.toast(x.message, 'galat'); return x; } });
    const b = $('#b-eds', el); if (b) b.onclick = () => simpanS(null);
    muat('evdiri-kinerja', 'evdiri.kinerja', {}, d => { if (!d) return; G.batang($('#g-kin', el), { label: d.tahun, seri: d.seri.slice(0, 5).map(s => ({ nama: s.kode, data: s.nilai })), maks: 100, satuan: '%', tinggi: 200 }); });
    let pilih = sessionStorage.getItem('mh:eds');
    await muat('eds', 'data.list', { e: 'Evaluasi_Diri_Siklus' }, async rows => {
      if (!rows) return;
      rows.sort((a, b) => String(b.Tgl_Buka).localeCompare(String(a.Tgl_Buka)));
      if (!rows.some(s => s.ID_Siklus === pilih)) pilih = (rows.find(s => s.Tahun_Akademik === State.ta) || rows[0] || {}).ID_Siklus;
      const s = rows.find(x => x.ID_Siklus === pilih);
      $('#pil', el).innerHTML = rows.length ? '<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap"><div class="isian" style="min-width:260px;margin:0"><label>Siklus</label><select id="sel-eds">' + rows.map(x => '<option value="' + esc(x.ID_Siklus) + '"' + (x.ID_Siklus === pilih ? ' selected' : '') + '>' + esc(x.Nama) + '</option>').join('') + '</select></div><div class="ringkas-angka"><div><small>Periode isi</small><b style="font-size:15px">' + Fmt.tgl(s.Tgl_Buka) + ' – ' + Fmt.tgl(s.Tgl_Tutup) + '</b></div><div><small>Status</small><div>' + chip(s.Status) + '</div></div></div><span style="flex:1"></span>' + (peran() === 'GKM' ? '<a class="btn btn-utama" href="#/evdiri/' + esc(s.ID_Siklus) + '/' + esc(Sesi.me.prodi) + '"><span class="ms">edit_note</span>Isi evaluasi diri prodi saya</a>' : '') + (lpm() ? (s.Status !== 'Dibuka' ? '<button class="btn btn-teal" data-a="buka"><span class="ms">lock_open</span>Buka siklus</button>' : '<button class="btn btn-hantu" data-a="tutup"><span class="ms">lock</span>Tutup pengisian</button>') + '<button class="btn btn-hantu" data-a="butir"><span class="ms">list</span>Butir</button><button class="btn btn-hantu" data-a="ubah"><span class="ms">edit</span>Ubah</button>' : '') + '</div>' : UI.kosong('Belum ada siklus evaluasi diri.', 'assignment');
      const sel = $('#sel-eds', el); if (sel) sel.onchange = () => { sessionStorage.setItem('mh:eds', sel.value); w.MH.Router.jalan(); };
      $('#pil', el).onclick = async e => {
        const a = e.target.closest('[data-a]'); if (!a) return;
        if (a.dataset.a === 'buka') UI.aksi(a, 'evdiri.buka', { id: s.ID_Siklus }, { lalu: () => w.MH.Router.jalan() });
        if (a.dataset.a === 'tutup') { const k = await UI.konfirmasi('Tutup pengisian', 'GKM tidak dapat lagi mengubah isian pada siklus ini.', { teksOk: 'Tutup' }); if (k.ok) UI.aksi(a, 'evdiri.tutup', { id: s.ID_Siklus }, { lalu: () => w.MH.Router.jalan() }); }
        if (a.dataset.a === 'ubah') simpanS(s);
        if (a.dataset.a === 'butir') { const isi = document.createElement('div'); UI.modal({ judul: 'Butir evaluasi diri', sub: s.Nama, lebar: true, isi }); w.MH.crud(isi, { e: 'Evaluasi_Diri_Butir', kunci: 'ID_Butir', q: { f: { ID_Siklus: s.ID_Siklus } }, tulis: true, hapus: true, judul: 'Butir', olah: rr => rr.sort((x, y) => Number(x.Urutan) - Number(y.Urutan)), sebelumSimpan: v => Object.assign({ ID_Siklus: s.ID_Siklus }, v), kolom: [{ k: 'Kode', l: 'Kode' }, { k: 'Judul', l: 'Judul', f: r => '<b>' + esc(r.Judul) + '</b>' }, { k: 'Tipe_Isian', l: 'Tipe', f: r => chip(r.Tipe_Isian, 'c-biru') }, { k: 'Urutan', l: '#', num: true }], fields: [{ k: 'Kode', l: 'Kode', wajib: true }, { k: 'Urutan', l: 'Urutan', t: 'angka' }, { k: 'Judul', l: 'Judul butir', wajib: true, penuh: true }, { k: 'Tipe_Isian', l: 'Tipe isian', t: 'pilih', opsi: ['Teks Panjang', 'Indikator', 'SWOT', 'Angka', 'Tautan'], wajib: true }, { k: 'Petunjuk', l: 'Petunjuk', t: 'area', baris: 2 }] }); }
      };
      if (!s) { $('#rekap', el).innerHTML = UI.kosong('Pilih atau buat siklus.'); return; }
      if (['SA', 'ADM', 'AUD', 'GKM', 'PIM'].indexOf(peran()) < 0) { $('#rekap', el).innerHTML = '<div class="banner banner-biru"><span class="ms">info</span><div>Rekap evaluasi diri tersedia untuk LPM, auditor, GKM, dan pimpinan.</div></div>'; return; }
      const r = await API.q('evdiri.rekap', { id: s.ID_Siklus });
      if (!r.success) { $('#rekap', el).innerHTML = UI.galat(r); return; }
      $('#rekap', el).innerHTML = '<div class="kartu-h"><div><h3>Status per program studi</h3><p>' + esc(s.Nama) + '</p></div></div><div id="t-rk"></div>';
      tabel($('#t-rk', el), { rows: r.data.prodi, cari: false, nama: 'Rekap evaluasi diri', klik: x => location.hash = '#/evdiri/' + s.ID_Siklus + '/' + x.kode, kolom: [{ k: 'nama', l: 'Program studi', f: x => '<b>' + esc(x.nama) + '</b>' }, { k: 'status', l: 'Status', f: x => chip(x.status) }, { k: 'terisi', l: 'Kelengkapan', f: x => '<span class="catatan">' + x.terisi + '/' + x.butir + ' butir</span>' + G.progres(x.butir ? x.terisi / x.butir * 100 : 0, x.status === 'Disetujui' ? 'teal' : '') }, { k: '_b', l: '', ekspor: false, f: x => '<a class="btn btn-hantu btn-kecil" href="#/evdiri/' + esc(s.ID_Siklus) + '/' + esc(x.kode) + '">' + (x.status === 'Diajukan' && ['SA', 'ADM', 'AUD'].indexOf(peran()) >= 0 ? 'Tinjau' : 'Buka') + '</a>' }] });
    }, { maxAge: 15000 });
  }

  Hal.daftar('/evdiri/:id/:prodi', {
    judul: 'Formulir Evaluasi Diri', menu: 'evdiri',
    async render(el, p) {
      el.innerHTML = UI.kerangka(3, 160);
      const r = await API.call('evdiri.form', { id: p.id, prodi: p.prodi });
      if (!r.success) { el.innerHTML = UI.galat(r); return; }
      const d = r.data, kDraf = 'mh:draf:eds:' + p.id + ':' + p.prodi;
      let draf = {}; try { draf = JSON.parse(localStorage.getItem(kDraf) || '{}'); } catch (e) { }
      const capHtml = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Indikator</th><th class="num">Target</th><th class="num">Capaian</th><th>Status</th></tr></thead><tbody>' + d.capaian.map(c => '<tr><td>' + esc(c.indikator) + (c.sumber === 'Tarik-LPPM' ? ' <span class="chip chip-sumber"><i></i>LPPM</span>' : '') + '</td><td class="num">' + Fmt.angka(c.target) + ' ' + esc(c.satuan || '') + '</td><td class="num"><b>' + Fmt.angka(c.capaian) + '</b></td><td>' + chip(c.status) + '</td></tr>').join('') + '</tbody></table></div>';
      el.innerHTML = `<div class="remah"><a href="#/evdiri">Evaluasi Diri</a> / ${esc(d.prodi.Nama_Prodi)}</div>
        <div class="kepala-hal" style="margin-top:6px"><div><h1>${esc(d.prodi.Nama_Prodi)}</h1><p>${esc(d.siklus.Nama)} · tenggat ${Fmt.tgl(d.siklus.Tgl_Tutup, true)} · ${chip(d.status)}</p></div></div>
        ${d.status === 'Perlu Revisi' ? '<div class="banner banner-kuning" style="margin-top:12px"><span class="ms">edit_note</span><div><b>Perlu revisi</b>Perbaiki butir yang diberi catatan peninjau lalu ajukan kembali.</div></div>' : ''}
        <div class="grid" style="margin-top:14px" id="butir">${d.butir.map(b => { const isi = d.isian[b.ID_Butir] || {}, v = d.bolehIsi && draf[b.ID_Butir] !== undefined ? draf[b.ID_Butir] : (isi.Isian || ''); return '<div class="butir" data-b="' + esc(b.ID_Butir) + '"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><span class="chip c-biru">' + esc(b.Kode) + '</span> <b style="font-size:15px">' + esc(b.Judul) + '</b><div class="catatan">' + esc(b.Petunjuk || '') + '</div></div>' + (isi.Status ? chip(isi.Status) : '') + '</div>' + (b.Tipe_Isian === 'Indikator' ? capHtml : '') + (b.Tipe_Isian === 'SWOT' && d.bolehIsi ? '<small class="catatan">Format: S: …, W: …, O: …, T: … (satu baris per butir)</small>' : '') + (d.bolehIsi ? '<textarea rows="' + (b.Tipe_Isian === 'Indikator' ? 3 : 6) + '" data-isi placeholder="' + (b.Tipe_Isian === 'Indikator' ? 'Analisis singkat capaian indikator' : 'Tulis uraian') + '">' + esc(v) + '</textarea>' : '<div style="white-space:pre-wrap">' + (esc(isi.Isian) || '<span class="catatan">Belum diisi.</span>') + '</div>') + (isi.Catatan_Tinjau ? '<div class="banner banner-kuning" style="font-size:13px"><span class="ms">rate_review</span><div><b>Catatan peninjau</b>' + esc(isi.Catatan_Tinjau) + '</div></div>' : '') + (d.bolehTinjau ? '<div class="isian"><label>Catatan tinjauan (isi bila perlu revisi)</label><textarea rows="2" data-cat></textarea></div>' : '') + '</div>'; }).join('')}</div>
        ${d.bolehIsi ? '<div class="kartu" style="margin-top:14px;position:sticky;bottom:12px;z-index:5"><div class="baris-aksi" style="justify-content:flex-end"><span class="catatan" style="margin-right:auto">Draf tersimpan otomatis di perangkat ini.</span><button class="btn btn-hantu" id="b-sv"><span class="ms">save</span>Simpan draf</button><button class="btn btn-utama" id="b-aj"><span class="ms">send</span>Ajukan ke LPM</button></div></div>' : ''}
        ${d.bolehTinjau ? '<div class="kartu" style="margin-top:14px;position:sticky;bottom:12px;z-index:5"><div class="baris-aksi" style="justify-content:flex-end"><button class="btn btn-hantu" data-kep="Perlu Revisi"><span class="ms">undo</span>Perlu revisi</button><button class="btn btn-utama" data-kep="Disetujui"><span class="ms">task_alt</span>Setujui</button></div></div>' : ''}`;
      const kumpul = () => $$('[data-b]', el).filter(x => $('[data-isi]', x)).map(x => ({ ID_Butir: x.dataset.b, Isian: $('[data-isi]', x).value }));
      if (d.bolehIsi) {
        $('#butir', el).addEventListener('input', () => { const o = {}; kumpul().forEach(x => o[x.ID_Butir] = x.Isian); try { localStorage.setItem(kDraf, JSON.stringify(o)); } catch (e) { } });
        const simpan = async btn => { const res = await UI.aksi(btn, 'evdiri.simpan', { id: p.id, items: kumpul() }); if (res.success) localStorage.removeItem(kDraf); return res; };
        $('#b-sv', el).onclick = e => simpan(e.currentTarget);
        $('#b-aj', el).onclick = async e => { const btn = e.currentTarget; const k = await UI.konfirmasi('Ajukan evaluasi diri', 'Isian dikirim ke LPM untuk ditinjau dan tidak dapat diubah sampai ada keputusan.', { teksOk: 'Ajukan' }); if (!k.ok) return; const s1 = await simpan(btn); if (s1.success) UI.aksi(btn, 'evdiri.ajukan', { id: p.id }, { lalu: () => w.MH.Router.jalan() }); };
      }
      el.addEventListener('click', async e => {
        const b = e.target.closest('[data-kep]'); if (!b) return;
        const catatan = {}; $$('[data-b]', el).forEach(x => { const t = $('[data-cat]', x); if (t && t.value.trim()) catatan[x.dataset.b] = t.value.trim(); });
        if (b.dataset.kep === 'Perlu Revisi' && !Object.keys(catatan).length) return UI.toast('Isi catatan pada butir yang perlu diperbaiki.', 'galat');
        UI.aksi(b, 'evdiri.tinjau', { id: p.id, prodi: p.prodi, keputusan: b.dataset.kep, catatan }, { lalu: () => w.MH.Router.jalan() });
      });
    }
  });

  /* ================= LM6 Pusat Akreditasi ================= */
  Hal.daftar('/akreditasi', {
    judul: 'Pusat Akreditasi', menu: 'akreditasi',
    async render(el) {
      el.innerHTML = kepala('Pusat Akreditasi', 'Proyek akreditasi prodi & institusi, katalog instrumen (IAPS/IAPT/LAM), syarat status target, dan penyusunan LED/LKPS.', lpm() ? '<button class="btn btn-utama" id="b-pr"><span class="ms">add</span>Proyek baru</button>' : '') + '<div id="tab" style="margin-top:14px"></div>';
      const fP = [{ k: 'ID_Instrumen', l: 'Instrumen', t: 'pilih', opsi: () => Master.d.instrumen.map(i => [i.ID_Instrumen, i.Nama_Instrumen + ' ' + i.Versi + ' (' + i.Status + ')']), wajib: true }, { k: 'Kode_Prodi', l: 'Program studi', t: 'pilih', opsi: () => Master.opsiProdi(), kosong: '— institusi (APT) —' }, { k: 'Kode_Unit', l: 'Unit (untuk institusi)', t: 'pilih', opsi: () => Master.opsiUnit() }, { k: 'Jenis_Pengajuan', l: 'Jenis pengajuan', t: 'pilih', opsi: ['Reakreditasi', 'Akreditasi Baru', 'Peningkatan Peringkat'], wajib: true }, { k: 'Status_Target', l: 'Status target', t: 'pilih', opsi: ['Unggul', 'Baik Sekali', 'Baik', 'Terakreditasi'], wajib: true }, { k: 'Tgl_Target_Kirim', l: 'Target pengiriman', t: 'tanggal' }, { k: 'Tahun_Akademik', l: 'Tahun akademik (TS)', t: 'pilih', opsi: () => Master.opsiTA(), kosong: false }, { k: 'Nama', l: 'Nama proyek (opsional)', penuh: true }];
      const b = $('#b-pr', el); if (b) b.onclick = () => F.formModal({ judul: 'Proyek akreditasi baru', fields: fP, nilai: { Tahun_Akademik: State.ta }, simpan: async v => { const x = await API.call('data.simpan', { e: 'Proyek_Akreditasi', row: v }); if (x.success) location.hash = '#/akreditasi/' + x.data.ID; else UI.toast(x.message, 'galat'); return x; } });
      w.MH.tabs($('#tab', el), [
        { k: 'proyek', l: 'Proyek', render: async e => {
          e.innerHTML = UI.kerangka(1, 180);
          await muat('proyek', 'data.list', { e: 'Proyek_Akreditasi' }, rows => {
            if (!rows) return;
            const pr = rows.filter(x => peran() !== 'GKM' || x.Kode_Prodi === Sesi.me.prodi);
            e.innerHTML = pr.length ? '<div class="grid g3">' + pr.map(x => { const s = Fmt.sisaHari(x.Tgl_Target_Kirim); return '<a class="kartu kartu-proyek" href="#/akreditasi/' + esc(x.ID) + '" style="color:inherit;text-decoration:none"><div style="display:flex;justify-content:space-between;gap:8px">' + chip(x.Status) + (s !== null ? chip(s < 0 ? 'Lewat ' + (-s) + ' hr' : s + ' hari lagi', s < 30 ? 'c-merah' : s < 90 ? 'c-amber' : 'c-abu') : '') + '</div><h3 style="margin:10px 0 4px;font-size:16px">' + esc(x.Nama) + '</h3><div class="catatan">' + esc(x.Jenis_Pengajuan) + ' · target <b>' + esc(x.Status_Target) + '</b> · TS ' + esc(x.Tahun_Akademik) + '</div><div class="catatan" style="margin-top:6px"><span class="ms" style="font-size:15px;vertical-align:-3px">event</span> Kirim ' + Fmt.tgl(x.Tgl_Target_Kirim, true) + '</div></a>'; }).join('') + '</div>' : UI.kosong('Belum ada proyek akreditasi.', 'workspace_premium');
          }, { maxAge: 15000 });
        } },
        { k: 'prodi', l: 'Status akreditasi prodi', render: e => { e.className = 'kartu'; tabel(e, { rows: Master.d.prodi, nama: 'Status akreditasi prodi', kolom: [{ k: 'Nama_Prodi', l: 'Program studi', f: x => '<b>' + esc(x.Nama_Prodi) + '</b> <span class="catatan">' + esc(x.Jenjang) + '</span>' }, { k: 'Lembaga_Akreditasi', l: 'Lembaga' }, { k: 'Status_Akreditasi', l: 'Peringkat', f: x => chip(x.Status_Akreditasi || '—', 'c-biru') }, { k: 'Tgl_Berakhir_Akreditasi', l: 'Berlaku s.d.', f: x => { const s = Fmt.sisaHari(x.Tgl_Berakhir_Akreditasi); return Fmt.tgl(x.Tgl_Berakhir_Akreditasi) + (s !== null && s < 365 ? ' ' + chip(s < 0 ? 'Kedaluwarsa' : s + ' hari', s < 180 ? 'c-merah' : 'c-amber') : ''); } }] }); } },
        lpm() ? { k: 'instrumen', l: 'Katalog instrumen', render: katalog } : null
      ].filter(Boolean), 'akreditasi');
    }
  });

  function katalog(el) {
    el.innerHTML = '<div class="banner banner-kuning"><span class="ms">info</span><div><b>Instrumen bawaan adalah contoh.</b>Sesuaikan kode, nama kriteria, dan syarat dengan dokumen resmi BAN-PT/LAM yang berlaku sebelum dipakai.</div></div><div class="kartu" style="margin-top:12px" id="t-ins"></div><div class="kartu" style="margin-top:14px"><div class="kartu-h"><h3>Kriteria & syarat</h3><select id="sel-ins" style="max-width:320px">' + Master.d.instrumen.map(i => '<option value="' + esc(i.ID_Instrumen) + '">' + esc(i.Nama_Instrumen + ' ' + i.Versi) + '</option>').join('') + '</select></div><div id="t-kr"></div><div id="t-sy" style="margin-top:16px"></div></div>';
    w.MH.crud($('#t-ins', el), { e: 'Instrumen_Akreditasi', kunci: 'ID_Instrumen', tulis: true, hapus: peran() === 'SA', judul: 'Instrumen', nama: 'Instrumen akreditasi', kolom: [{ k: 'Nama_Instrumen', l: 'Instrumen', f: r => '<b>' + esc(r.Nama_Instrumen) + '</b> v' + esc(r.Versi) }, { k: 'Lembaga', l: 'Lembaga' }, { k: 'Jenis', l: 'Jenis' }, { k: 'Berlaku_Mulai', l: 'Berlaku', f: r => Fmt.tgl(r.Berlaku_Mulai) }, { k: 'Status', l: 'Status', f: r => chip(r.Status) }], fields: [{ k: 'Lembaga', l: 'Lembaga', wajib: true, ph: 'BAN-PT / LAMEMBA / …' }, { k: 'Nama_Instrumen', l: 'Nama instrumen', wajib: true }, { k: 'Versi', l: 'Versi' }, { k: 'Jenis', l: 'Jenis', t: 'pilih', opsi: ['Prodi', 'PT'], wajib: true }, { k: 'Berlaku_Mulai', l: 'Berlaku mulai', t: 'tanggal' }, { k: 'Status', l: 'Status', t: 'pilih', opsi: ['Draf', 'Aktif', 'Arsip'], kosong: false }, { k: 'Dasar_Regulasi', l: 'Dasar regulasi', penuh: true }, { k: 'Catatan', l: 'Catatan', t: 'area', baris: 2 }] });
    const isiKr = () => {
      const id = $('#sel-ins', el).value; if (!id) return;
      $('#t-kr', el).innerHTML = ''; $('#t-sy', el).innerHTML = '';
      w.MH.crud($('#t-kr', el), { e: 'Kriteria_Akreditasi', kunci: 'ID_Kriteria', q: { f: { ID_Instrumen: id } }, tulis: true, hapus: true, judul: 'Kriteria', nama: 'Kriteria', teksTambah: 'Tambah kriteria', olah: rr => rr.sort((a, b) => Number(a.Urutan) - Number(b.Urutan)), sebelumSimpan: v => Object.assign({ ID_Instrumen: id }, v), kolom: [{ k: 'Kode', l: 'Kode', f: r => '<b class="mono">' + esc(r.Kode) + '</b>' }, { k: 'Nama', l: 'Kriteria' }, { k: 'Kategori_Sumber', l: 'Sumber data', f: r => chip(r.Kategori_Sumber, ['Riset', 'PkM'].indexOf(r.Kategori_Sumber) >= 0 ? 'c-teal' : 'c-abu') }, { k: 'Jenis_Bukti_Diminta', l: 'Bukti diminta', f: r => '<span class="catatan">' + esc(String(r.Jenis_Bukti_Diminta || '').slice(0, 80)) + '</span>' }], fields: [{ k: 'Kode', l: 'Kode', wajib: true }, { k: 'Urutan', l: 'Urutan', t: 'angka' }, { k: 'Nama', l: 'Nama kriteria', wajib: true, penuh: true }, { k: 'Kategori_Sumber', l: 'Kategori sumber', t: 'pilih', opsi: ['Riset', 'PkM', 'Pendidikan', 'SDM', 'Keuangan', 'Tata Kelola', 'Lainnya'], kosong: false }, { k: 'Jenis_Bukti_Diminta', l: 'Bukti yang diminta', t: 'area', baris: 2 }] });
      w.MH.crud($('#t-sy', el), { e: 'Syarat_Instrumen', q: { f: { ID_Instrumen: id } }, tulis: true, hapus: true, judul: 'Syarat', nama: 'Syarat instrumen', teksTambah: 'Tambah syarat', sebelumSimpan: v => Object.assign({ ID_Instrumen: id }, v), kolom: [{ k: 'Status_Target', l: 'Status target', f: r => chip(r.Status_Target, 'c-biru') }, { k: 'Uraian_Syarat', l: 'Syarat' }, { k: 'Jenis_Pemeriksaan', l: 'Pemeriksaan', f: r => chip(r.Jenis_Pemeriksaan, r.Jenis_Pemeriksaan === 'Manual' ? 'c-abu' : 'c-teal') }], fields: [{ k: 'Status_Target', l: 'Status target', t: 'pilih', opsi: ['Unggul', 'Baik Sekali', 'Baik', 'Terakreditasi'], wajib: true }, { k: 'Uraian_Syarat', l: 'Uraian syarat', t: 'area', wajib: true }, { k: 'Jenis_Pemeriksaan', l: 'Jenis pemeriksaan', t: 'pilih', opsi: ['Manual', 'Indikator', 'Peta', 'Skor', 'Survei'], wajib: true }, { k: 'Parameter_JSON', l: 'Parameter (JSON)', t: 'area', baris: 2, bantu: 'Contoh {"idIndikator":"IND-…","min":80} — sesuai jenis pemeriksaan.' }] });
    };
    $('#sel-ins', el).onchange = isiKr; isiKr();
  }

  Hal.daftar('/akreditasi/:id', {
    judul: 'Proyek Akreditasi', menu: 'akreditasi',
    async render(el, p) {
      el.innerHTML = UI.kerangka(3, 160);
      const r = await API.call('akr.proyek', { id: p.id });
      if (!r.success) { el.innerHTML = UI.galat(r); return; }
      const d = r.data, pr = d.proyek, s = Fmt.sisaHari(pr.Tgl_Target_Kirim), ulang = () => w.MH.Router.jalan();
      el.innerHTML = `<div class="remah"><a href="#/akreditasi">Pusat Akreditasi</a> / ${esc(pr.Nama)}</div>
        <div class="kartu hero" style="margin-top:8px"><div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">${G.cincin(d.skorRata, { ukuran: 120, gelap: true, sub: 'Kesiapan', warna: '#22C7D6' })}<div style="flex:1;min-width:220px"><div class="label-atas">${esc(d.instrumen.Nama_Instrumen || '')} ${esc(d.instrumen.Versi || '')}</div><h2 style="margin:6px 0;font-size:22px">${esc(pr.Nama)}</h2><small>${esc(pr.Jenis_Pengajuan)} · target <b>${esc(pr.Status_Target)}</b> · TS ${esc(pr.Tahun_Akademik)} · kirim ${Fmt.tgl(pr.Tgl_Target_Kirim, true)}${s !== null ? ' (' + (s < 0 ? 'lewat ' + (-s) + ' hari' : s + ' hari lagi') + ')' : ''}</small><div style="margin-top:10px;max-width:360px"><small>LED: ${d.ledProgres.selesai}/${d.ledProgres.total} bagian final</small>${G.progres(d.ledProgres.total ? d.ledProgres.selesai / d.ledProgres.total * 100 : 0, 'teal')}</div></div>
          ${lpm() ? '<div class="baris-aksi"><button class="btn btn-kaca" id="b-led"><span class="ms">description</span>' + (d.kriteria.some(k => k.led) ? 'Lengkapi' : 'Siapkan') + ' dokumen LED</button><button class="btn btn-kaca" id="b-sync"><span class="ms">sync</span>Sinkron bukti SIM-LPPM</button><button class="btn btn-putih" id="b-eks"><span class="ms">download</span>Ekspor draf</button></div>' : ''}</div></div>
        ${d.lppm.terkunci ? '<div class="banner banner-biru" style="margin-top:12px"><span class="ms">lock</span><div><b>Data SIM-LPPM untuk TS ini sudah dikunci</b>Nilai riset/PkM memakai snapshot saat penguncian.</div></div>' : ''}
        <div id="tab" style="margin-top:14px"></div>`;
      const bl = $('#b-led', el); if (bl) bl.onclick = () => UI.aksi(bl, 'led.siapkan', { id: pr.ID }, { lalu: ulang });
      const bs = $('#b-sync', el); if (bs) bs.onclick = () => UI.aksi(bs, 'akr.sinkronLppm', { id: pr.ID }, { lalu: ulang });
      const be = $('#b-eks', el); if (be) be.onclick = () => UI.modal({ judul: 'Ekspor draf LED/LKPS', isi: '<p>Pemeriksaan kesiapan dijalankan ulang, lalu seluruh bagian LED, indeks bukti, dan metadata digabung.</p>', tombol: [{ teks: 'Batal', kelas: 'btn-hantu', tutup: true }, { teks: 'DOCX', kelas: 'btn-hantu', ikon: 'article', aksi: async (l, b) => { const x = await UI.aksi(b, 'led.ekspor', { id: pr.ID, format: 'docx' }); if (x.success && x.data) F.bukaBerkas(x.data.idFile || x.data.url, b); } }, { teks: 'PDF', ikon: 'picture_as_pdf', aksi: async (l, b) => { const x = await UI.aksi(b, 'led.ekspor', { id: pr.ID, format: 'pdf' }); if (x.success && x.data) F.bukaBerkas(x.data.idFile || x.data.url, b); } }] });
      w.MH.tabs($('#tab', el), [
        { k: 'kriteria', l: 'Papan kriteria', n: d.kriteria.reduce((a, k) => a + k.kritis, 0) || '', render: e => {
          e.innerHTML = '<div class="grid g3">' + d.kriteria.map(k => '<div class="kartu"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b class="mono" style="color:var(--biru)">' + esc(k.Kode) + '</b><h4 style="margin:2px 0 6px">' + esc(k.Nama) + '</h4></div>' + (k.skor === null ? chip('Belum dinilai') : '<b style="font-size:20px">' + Fmt.angka(k.skor, 0) + '%</b>') + '</div>' + G.progres(k.skor || 0, k.skor !== null && k.skor < 60 ? '' : 'teal') + '<div class="baris-aksi" style="margin-top:10px">' + chip(k.status, k.status === 'Lengkap' ? 'c-hijau' : 'c-amber') + chip(k.jumlahBukti + ' bukti', 'c-abu') + (k.buktiLppm ? '<span class="chip chip-sumber"><i></i>' + k.buktiLppm + ' LPPM</span>' : '') + (k.kritis ? chip(k.kritis + ' kritis', 'c-merah') : '') + '</div>' + (k.lppm ? '<div style="margin-top:8px">' + k.lppm.nilai.map(n => '<div class="catatan">' + esc(n.nama) + ': <b>' + Fmt.angka(n.nilai) + '</b></div>').join('') + '</div>' : '') + '<div class="baris-aksi" style="margin-top:10px;border-top:1px solid var(--garis-2);padding-top:10px">' + (k.led ? chip('LED: ' + k.led.Status, k.led.Status === 'Final' || k.led.Status === 'Disetujui' ? 'c-hijau' : 'c-biru') + '<button class="btn btn-hantu btn-kecil" data-doc="' + esc(k.led.ID_Dokumen_Docs) + '"><span class="ms">edit_document</span>Tulis</button>' + (['SA', 'ADM', 'GKM', 'PJU'].indexOf(peran()) >= 0 ? '<button class="ikon-btn kecil" data-led="' + esc(k.ID_Kriteria) + '" title="Status LED"><span class="ms">tune</span></button>' : '') : '<span class="catatan">LED belum disiapkan</span>') + '<button class="btn btn-hantu btn-kecil" data-bukti="' + esc(k.ID_Kriteria) + '"><span class="ms">folder_open</span>Bukti</button></div></div>').join('') + '</div>';
          e.onclick = ev => {
            const dc = ev.target.closest('[data-doc]'); if (dc) return window.open('https://docs.google.com/document/d/' + dc.dataset.doc + '/edit', '_blank', 'noopener');
            const lb = ev.target.closest('[data-led]'); if (lb) { const k = d.kriteria.find(x => x.ID_Kriteria === lb.dataset.led); return F.formModal({ judul: 'Status bagian LED ' + k.Kode, fields: [{ k: 'Status', l: 'Status', t: 'pilih', opsi: ['Belum Mulai', 'Draf', 'Ditinjau', 'Final', 'Disetujui'], kosong: false }, { k: 'PIC', l: 'PIC (email)', t: 'pilih', opsi: () => Master.opsiPengguna(null, 'email') }, { k: 'Tenggat', l: 'Tenggat', t: 'tanggal' }], nilai: k.led, simpan: async v => { const x = await API.call('led.update', Object.assign({ id: k.led.ID }, v)); if (x.success) { UI.toast('Status LED diperbarui.', 'sukses'); ulang(); } else UI.toast(x.message, 'galat'); return x; } }); }
            const bk = ev.target.closest('[data-bukti]'); if (bk) bukaBukti(bk.dataset.bukti, pr);
          };
        } },
        { k: 'syarat', l: 'Syarat ' + pr.Status_Target, n: d.syarat.filter(x => x.status !== 'Memenuhi').length || '', render: e => {
          e.className = 'kartu';
          tabel(e, { rows: d.syarat, nama: 'Syarat ' + pr.Nama, cari: false, kolom: [{ k: 'uraian', l: 'Syarat', f: x => '<b>' + esc(x.uraian) + '</b><div class="catatan">' + esc(x.statusTarget) + ' · ' + esc(x.jenis) + '</div>' }, { k: 'nilai', l: 'Nilai', f: x => esc(x.nilai === '' ? '—' : x.nilai) + (x.sumber ? '<div class="catatan">' + esc(x.sumber) + '</div>' : '') }, { k: 'status', l: 'Status', f: x => chip(x.status, x.status === 'Memenuhi' ? 'c-hijau' : x.status === 'Belum' ? 'c-merah' : 'c-amber') }, { k: '_a', l: '', ekspor: false, f: x => x.jenis === 'Manual' && ['SA', 'ADM', 'GKM'].indexOf(peran()) >= 0 ? '<button class="btn btn-hantu btn-kecil" data-sy="' + esc(x.id) + '">Perbarui</button>' : (x.bukti ? '<a class="btn btn-hantu btn-kecil" href="' + esc(x.bukti) + '" target="_blank" rel="noopener">Bukti</a>' : '') }] });
          e.addEventListener('click', ev => { const b = ev.target.closest('[data-sy]'); if (!b) return; const x = d.syarat.find(y => y.id === b.dataset.sy); F.formModal({ judul: 'Syarat manual', sub: x.uraian, fields: [{ k: 'status', l: 'Status', t: 'pilih', opsi: ['Memenuhi', 'Belum', 'Tidak Berlaku'], kosong: false }, { k: 'bukti', l: 'Tautan bukti (wajib bila Memenuhi)', t: 'url', penuh: true }], nilai: { status: x.status === 'Memenuhi' ? 'Memenuhi' : 'Belum', bukti: x.bukti }, simpan: async v => { const y = await API.call('akr.syaratManual', { idProyek: pr.ID, idSyarat: x.id, status: v.status, bukti: v.bukti }); if (y.success) { UI.toast('Syarat diperbarui.', 'sukses'); ulang(); } else UI.toast(y.message, 'galat'); return y; } }); });
        } },
        { k: 'umum', l: 'Bukti lintas kriteria', render: e => { e.className = 'kartu'; tabel(e, { rows: d.buktiUmum, nama: 'Bukti lintas kriteria', kosong: 'Belum ada bukti lintas kriteria (mis. evaluasi diri yang disetujui).', kolom: [{ k: 'Judul_Bukti', l: 'Bukti', f: x => '<b>' + esc(x.Judul_Bukti) + '</b>' }, { k: 'Asal', l: 'Asal', f: x => chip(x.Asal) }, { k: 'Tahun_Akademik', l: 'TA' }, { k: '_b', l: '', ekspor: false, f: x => x.ID_File || x.Tautan ? '<button class="btn btn-hantu btn-kecil" data-buka="' + esc(x.ID_File || x.Tautan) + '">Buka</button>' : '' }] }); e.addEventListener('click', ev => { const b = ev.target.closest('[data-buka]'); if (b) F.bukaBerkas(b.dataset.buka, b); }); } }
      ], 'proyek');
    }
  });

  function bukaBukti(idKriteria, pr) {
    const isi = document.createElement('div');
    UI.modal({ judul: 'Bukti dukung — ' + Master.kriteria(idKriteria), sub: (pr.Kode_Prodi ? Master.prodi(pr.Kode_Prodi) + ' · ' : '') + 'TS ' + pr.Tahun_Akademik, lebar: true, isi });
    tabelBukti(isi, { ta: pr.Tahun_Akademik, f: Object.assign({ ID_Kriteria: idKriteria }, pr.Kode_Prodi ? { Kode_Prodi: pr.Kode_Prodi } : {}) }, { ID_Kriteria: idKriteria, Kode_Prodi: pr.Kode_Prodi, ID_Proyek: pr.ID, Tahun_Akademik: pr.Tahun_Akademik });
  }

  function tabelBukti(el, q, bawaan) {
    const boleh = ['SA', 'ADM', 'GKM', 'PJU'].indexOf(peran()) >= 0;
    const c = w.MH.crud(el, {
      e: 'Bukti_Dukung', q, tulis: boleh, hapus: boleh, judul: 'Bukti dukung', nama: 'Bukti dukung', teksTambah: 'Unggah bukti', lebar: true, bawaanBaru: Object.assign({ Status_Kelengkapan: 'Lengkap', Tahun_Akademik: State.ta, Kode_Prodi: Sesi.me.prodi || '' }, bawaan || {}),
      bolehUbah: r => r.Asal !== 'Tarik-LPPM' && r.Terkunci !== 'Ya' && (peran() !== 'PJU' || r.created_by === Sesi.me.email),
      bolehHapus: r => r.Asal !== 'Tarik-LPPM' && r.Terkunci !== 'Ya',
      filter: [{ k: 'Asal', l: 'Asal', opsi: ['Unggah', 'Internal', 'Tarik-LPPM'] }, { k: 'Status_Kelengkapan', l: 'Kelengkapan', opsi: ['Lengkap', 'Perlu Dilengkapi'] }],
      kolom: [{ k: 'Judul_Bukti', l: 'Bukti', f: r => '<b>' + esc(r.Judul_Bukti) + '</b><div class="catatan">' + esc(Master.kriteria(r.ID_Kriteria)) + '</div>' }, { k: 'Kode_Prodi', l: 'Prodi', f: r => esc(r.Kode_Prodi || '—') }, { k: 'Asal', l: 'Asal', f: r => r.Asal === 'Tarik-LPPM' ? chipSumber(r.Waktu_Tarik) : chip(r.Asal, 'c-biru') }, { k: 'Status_Kelengkapan', l: 'Kelengkapan', f: r => chip(r.Status_Kelengkapan, r.Status_Kelengkapan === 'Lengkap' ? 'c-hijau' : 'c-amber') + (r.Terkunci === 'Ya' ? ' <span class="ms kunci-ikon" title="Terkunci" style="font-size:15px">lock</span>' : '') }, { k: 'Tahun_Akademik', l: 'TA' }],
      aksiBaris: r => (r.ID_File || r.Tautan ? '<button class="btn btn-hantu btn-kecil" data-buka="' + esc(r.ID_File || r.Tautan) + '"><span class="ms">open_in_new</span>Buka</button>' : '') + (r.Asal === 'Tarik-LPPM' && lpm() ? '<button class="btn btn-hantu btn-kecil" data-catatan="' + esc(r.ID) + '" title="Kirim Catatan Data ke SIM-LPPM"><span class="ms">feedback</span>Catatan</button>' : ''),
      fields: [{ k: 'Judul_Bukti', l: 'Judul bukti', wajib: true, penuh: true }, { k: 'ID_Kriteria', l: 'Kriteria', t: 'pilih', opsi: () => Master.opsiKriteria(), wajib: true }, { k: 'Kode_Prodi', l: 'Prodi', t: 'pilih', opsi: () => Master.opsiProdi(), ro: peran() === 'GKM' }, { k: 'Tahun_Akademik', l: 'Tahun akademik', t: 'pilih', opsi: () => Master.opsiTA(), kosong: false }, { k: 'Jenis', l: 'Jenis', t: 'pilih', opsi: ['Dokumen', 'SK', 'Laporan', 'Foto', 'Data', 'Tautan', 'Lainnya'] }, { k: 'Status_Kelengkapan', l: 'Kelengkapan', t: 'pilih', opsi: ['Lengkap', 'Perlu Dilengkapi'], kosong: false }, { k: 'ID_File', l: 'Berkas', t: 'berkas', folder: 'Akreditasi/Bukti' }, { k: 'Tautan', l: 'Atau tautan', t: 'url', penuh: true }, { k: 'Catatan', l: 'Catatan', t: 'area', baris: 2 }],
      sebelumSimpan: v => Object.assign({}, bawaan && bawaan.ID_Proyek ? { ID_Proyek: bawaan.ID_Proyek } : {}, v)
    });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-buka]'); if (b) return F.bukaBerkas(b.dataset.buka, b);
      const cn = e.target.closest('[data-catatan]'); if (cn) { const r = c.rows().find(x => x.ID === cn.dataset.catatan) || {}; F.formModal({ judul: 'Catatan Data ke SIM-LPPM', sub: 'Koreksi data riset/PkM dilakukan oleh LPPM. Catatan masuk ke Inbox SIM-LPPM.', fields: [{ k: 'isi', l: 'Isi catatan', t: 'area', wajib: true }, { k: 'prioritas', l: 'Prioritas', t: 'pilih', opsi: ['Normal', 'Tinggi'], kosong: false }], simpan: async v => { const x = await API.call('inbox.kirim', { Tabel_Terkait: 'BR_Bukti_Dukung_Ringkas', ID_Rekaman: r.Ref_Sumber || r.ID, Kriteria_Terkait: r.ID_Kriteria, Isi_Catatan: v.isi, Prioritas: v.prioritas }); if (x.success) UI.toast(x.message, 'sukses'); else UI.toast(x.message, 'galat'); return x; } }); }
    });
    return c;
  }

  /* ================= LM7 Bukti Dukung & Kesiapan ================= */
  Hal.daftar('/kesiapan', {
    judul: 'Bukti Dukung & Kesiapan', menu: 'kesiapan',
    async render(el) {
      el.innerHTML = UI.kerangka(1, 160) + '<div style="height:14px"></div>' + UI.kerangka(1, 300);
      await muat('kesiapan:' + State.ta, 'kesiapan.data', { ta: State.ta }, (d, dariCache, gagal) => {
        if (!d) { el.innerHTML = UI.galat(gagal); return; }
        const akhir = d.riwayat.length ? d.riwayat[d.riwayat.length - 1].skor : null, terbuka = d.temuan.filter(t => ['Baru', 'Ditugaskan'].indexOf(t.Status) >= 0);
        const kritis = terbuka.filter(t => t.Severity === 'Kritis').length, terkunci = d.periode.some(p => p.Terkunci === 'Ya');
        w.MH.setJumlah({ kritis });
        el.innerHTML = kepala('Bukti Dukung & Kesiapan Akreditasi', 'Pemeriksaan otomatis 11 aturan (L01–L11) atas kelengkapan bukti, capaian, PKPA, kesegaran data SIM-LPPM, dan konsistensi. Temuan bisa ditugaskan, dijadikan PPEPP, atau dikirim sebagai Catatan Data ke LPPM.') +
          `<div class="grid g-8-4" style="margin-top:14px"><div class="kartu hero"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><div class="label-atas">Skor kesiapan ${esc(d.ta)}</div><div class="angka">${akhir === null ? '—' : Fmt.angka(akhir, 1) + '%'}</div><small>Pemeriksaan terakhir ${esc(d.terakhir ? Fmt.waktu(d.terakhir) + ' WIB' : 'belum pernah')}</small></div><div style="text-align:right"><span class="pil-kaca"><span class="ms">warning</span>${kritis} kritis · ${terbuka.length - kritis} lainnya</span>${terkunci ? '<div style="margin-top:8px"><span class="pil-kaca"><span class="ms">lock</span>Periode terkunci</span></div>' : ''}</div></div><div id="g-rw" style="margin-top:6px"></div>${lpm() ? '<div class="aksi" style="margin-top:6px"><button class="btn btn-putih btn-kecil" id="b-jalan"><span class="ms">play_arrow</span>Jalankan pemeriksaan</button></div>' : ''}</div>
          <div class="kartu"><div class="kartu-h"><h3>Sebaran temuan terbuka</h3></div><div id="g-sev"></div></div></div><div id="tab" style="margin-top:16px"></div>`;
        G.garis($('#g-rw', el), { label: d.riwayat.map(x => String(x.waktu).slice(5, 10)), data: d.riwayat.map(x => x.skor), gelap: true, ambang: 70, satuan: '%', tinggi: 110 });
        G.donut($('#g-sev', el), { item: [{ l: 'Kritis', v: kritis, w: '#DC2626' }, { l: 'Peringatan', v: terbuka.filter(t => t.Severity === 'Peringatan').length, w: '#F5A623' }, { l: 'Info', v: terbuka.filter(t => t.Severity === 'Info').length, w: '#4B65D6' }], sub: 'Terbuka' });
        const bj = $('#b-jalan', el); if (bj) bj.onclick = () => UI.aksi(bj, 'kesiapan.jalankan', { ta: State.ta }, { lalu: () => w.MH.Router.jalan() });
        w.MH.tabs($('#tab', el), [
          { k: 'temuan', l: 'Temuan', n: kritis || '', render: e => tabTemuan(e, d) },
          { k: 'peta', l: 'Peta skor', render: e => petaSkor(e, d) },
          { k: 'bukti', l: 'Bukti dukung', render: e => { e.className = 'kartu'; tabelBukti(e, Object.assign({ ta: State.ta }, peran() === 'GKM' ? { f: { Kode_Prodi: Sesi.me.prodi } } : {})); } },
          lpm() || peran() === 'PIM' ? { k: 'kunci', l: 'Kunci periode', render: e => kokpitKunci(e, d) } : null
        ].filter(Boolean), 'kesiapan');
      }, { maxAge: 20000 });
    }
  });

  function tabTemuan(el, d) {
    el.className = 'kartu';
    const rows = d.temuan.slice().sort((a, b) => (['Baru', 'Ditugaskan'].indexOf(a.Status) < 0) - (['Baru', 'Ditugaskan'].indexOf(b.Status) < 0) || ['Kritis', 'Peringatan', 'Info'].indexOf(a.Severity) - ['Kritis', 'Peringatan', 'Info'].indexOf(b.Severity));
    const aturan = {}; d.aturan.forEach(a => aturan[a.Kode] = a);
    tabel(el, {
      rows, nama: 'Temuan kesiapan ' + d.ta, per: 20,
      filter: [{ k: 'Severity', l: 'Tingkat', opsi: ['Kritis', 'Peringatan', 'Info'] }, { k: 'Status', l: 'Status', opsi: ['Baru', 'Ditugaskan', 'Selesai', 'Diabaikan'] }, { k: 'Kode_Prodi', l: 'Prodi', opsi: () => Master.opsiProdi() }, { k: 'Kode_Aturan', l: 'Aturan', opsi: d.aturan.map(a => [a.Kode, a.Kode + ' ' + a.Nama]) }],
      kolom: [{ k: 'Severity', l: 'Tingkat', f: r => chipSev(r.Severity) }, { k: 'Pesan', l: 'Temuan', f: r => '<b>' + esc(r.Pesan) + '</b><div class="catatan">' + esc(r.Kode_Aturan) + ' ' + esc((aturan[r.Kode_Aturan] || {}).Nama || '') + (r.ID_Kriteria ? ' · ' + esc(Master.kodeKriteria(r.ID_Kriteria)) : '') + '</div>' + ((aturan[r.Kode_Aturan] || {}).Pesan_Perbaikan ? '<div class="catatan" style="color:var(--teal)">↳ ' + esc(aturan[r.Kode_Aturan].Pesan_Perbaikan) + '</div>' : '') }, { k: 'Kode_Prodi', l: 'Prodi/Unit', f: r => esc(r.Kode_Prodi || r.Kode_Unit || 'Institusi') }, { k: 'Status', l: 'Status', f: r => chip(r.Status) + (r.PIC ? '<div class="catatan">' + esc(Master.orang(r.PIC)) + '</div>' : '') + (r.ID_PPEPP_Item ? '<div class="catatan">PPEPP ' + esc(r.ID_PPEPP_Item) + '</div>' : '') + (r.ID_Catatan_Data ? '<div class="catatan">Catatan Data terkirim</div>' : '') }, { k: '_a', l: '', ekspor: false, f: r => aksiTemuan(r) }]
    });
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-tk]'); if (!b) return;
      const id = b.dataset.id, a = b.dataset.tk, ulang = () => w.MH.Router.jalan();
      if (a === 'tugaskan') return F.formModal({ judul: 'Tugaskan temuan', fields: [{ k: 'pic', l: 'PIC (email)', t: 'pilih', opsi: () => Master.opsiPengguna(null, 'email'), wajib: true }], simpan: async v => { const x = await API.call('kesiapan.tindak', { id, aksi: 'tugaskan', pic: v.pic }); x.success ? (UI.toast(x.message, 'sukses'), ulang()) : UI.toast(x.message, 'galat'); return x; } });
      if (a === 'abaikan') { const k = await UI.konfirmasi('Abaikan temuan', 'Temuan tidak dihitung lagi. Alasan dicatat dan bisa diaudit.', { alasan: true, teksOk: 'Abaikan' }); if (k.ok) UI.aksi(b, 'kesiapan.tindak', { id, aksi: 'abaikan', alasan: k.alasan }, { lalu: ulang }); return; }
      if (a === 'catatanData') return F.formModal({ judul: 'Catatan Data ke SIM-LPPM', fields: [{ k: 'isi', l: 'Isi catatan untuk LPPM', t: 'area', wajib: true }], simpan: async v => { const x = await API.call('kesiapan.tindak', { id, aksi: 'catatanData', isi: v.isi }); x.success ? (UI.toast(x.message, 'sukses'), ulang()) : UI.toast(x.message, 'galat'); return x; } });
      UI.aksi(b, 'kesiapan.tindak', { id, aksi: a }, { lalu: ulang });
    });
  }
  function aksiTemuan(r) {
    const buka = ['Baru', 'Ditugaskan'].indexOf(r.Status) >= 0, mine = r.PIC && String(r.PIC).toLowerCase() === Sesi.me.email, s = [];
    const btn = (a, t, i) => '<button class="btn btn-hantu btn-kecil" data-tk="' + a + '" data-id="' + esc(r.ID) + '" title="' + t + '"><span class="ms">' + i + '</span>' + t + '</button>';
    if (lpm() && buka) { s.push(btn('tugaskan', 'Tugaskan', 'person_add')); if (!r.ID_PPEPP_Item) s.push(btn('ppepp', 'PPEPP', 'sync_alt')); if (/LPPM|L0[89]|L1[01]/.test(r.Kode_Aturan + ' ' + r.Tabel_Rekaman) && !r.ID_Catatan_Data) s.push(btn('catatanData', 'Catatan LPPM', 'feedback')); s.push(btn('abaikan', 'Abaikan', 'visibility_off')); }
    if (buka && (lpm() || mine || ['GKM', 'PJU'].indexOf(peran()) >= 0)) s.push(btn('selesai', 'Selesai', 'task_alt'));
    if (lpm() && !buka) s.push(btn('buka', 'Buka lagi', 'undo'));
    return '<div class="aksi-baris">' + s.join('') + '</div>';
  }
  function petaSkor(el, d) {
    el.className = 'kartu';
    const krit = [...new Set(d.skor.map(s => s.ID_Kriteria))].sort((a, b) => Master.kodeKriteria(a).localeCompare(Master.kodeKriteria(b), 'id', { numeric: true }));
    const prodi = [...new Set(d.skor.map(s => s.Kode_Prodi))];
    if (!krit.length) { el.innerHTML = UI.kosong('Belum ada skor. Jalankan pemeriksaan kesiapan.', 'grid_view'); return; }
    const sel = (p, k) => d.skor.find(s => s.Kode_Prodi === p && s.ID_Kriteria === k);
    el.innerHTML = '<div class="kartu-h"><div><h3>Skor per prodi × kriteria</h3><p>Hijau ≥ 80%, kuning 60–79%, merah &lt; 60%. Arahkan kursor untuk jumlah temuan.</p></div></div><div class="tbl-wrap"><table class="tbl heat"><thead><tr><th>Prodi</th>' + krit.map(k => '<th title="' + esc(Master.kriteria(k)) + '" style="text-align:center">' + esc(Master.kodeKriteria(k)) + '</th>').join('') + '</tr></thead><tbody>' + prodi.map(p => '<tr><td><b>' + esc(Master.prodi(p)) + '</b></td>' + krit.map(k => { const s = sel(p, k); return '<td class="skor ' + kelasSkor(s && s.Skor_Persen) + '" title="' + (s ? s.Jumlah_Kritis + ' kritis, ' + s.Jumlah_Peringatan + ' peringatan' : '') + '">' + (s ? Fmt.angka(s.Skor_Persen, 0) : '—') + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div><div class="legenda" style="margin-top:10px"><span><i style="background:#DCFCE7"></i>≥ 80% siap</span><span><i style="background:#FEF3C7"></i>60–79% perlu perhatian</span><span><i style="background:#FEE2E2"></i>&lt; 60% kritis</span></div>';
  }
  function kokpitKunci(el, d) {
    const per = d.periode, sa = peran() === 'SA';
    el.innerHTML = '<div class="grid g-8-4"><div class="kartu"><div class="kartu-h"><div><h3>Prasyarat penguncian ' + esc(d.ta) + '</h3><p>Mode kunci: <b>' + esc(d.modeKunci) + '</b> — ' + (d.modeKunci === 'Blokir' ? 'penguncian ditolak bila prasyarat belum terpenuhi.' : 'penguncian tetap bisa dilakukan dengan penanda peringatan.') + '</p></div></div><div class="daftar">' + (d.prasyarat || []).map(x => '<div class="item"><span class="ms" style="color:' + (x.ok ? 'var(--hijau)' : 'var(--merah)') + '">' + (x.ok ? 'check_circle' : 'cancel') + '</span><div class="isi"><b>' + esc(x.label) + '</b><small>' + esc(x.nilai) + '</small></div></div>').join('') + '</div></div>' +
      '<div class="kartu"><div class="kartu-h"><h3>Periode Mutu</h3></div><div class="daftar">' + (per.length ? per.map(p => '<div class="item"><span class="ms" style="color:' + (p.Terkunci === 'Ya' ? 'var(--biru)' : 'var(--teks-2)') + '">' + (p.Terkunci === 'Ya' ? 'lock' : 'lock_open') + '</span><div class="isi"><b>' + esc(p.Tahun_Akademik) + ' ' + esc(p.Semester || '') + ' (' + esc(p.Label_TS) + ')</b><small>' + (p.Terkunci === 'Ya' ? 'Dikunci ' + esc(Fmt.waktu(p.Tgl_Kunci)) + ' oleh ' + esc(Master.orang(p.Dikunci_Oleh)) : 'Terbuka') + '</small></div>' + (sa ? (p.Terkunci === 'Ya' ? '<button class="btn btn-hantu btn-kecil" data-buka-k="' + esc(p.Semester || '') + '">Buka</button>' : '<button class="btn btn-utama btn-kecil" data-kunci="' + esc(p.Semester || '') + '">Kunci</button>') : '') + '</div>').join('') : UI.kosong('Periode ' + d.ta + ' belum ada di master.')) + '</div>' + (peran() === 'ADM' ? '<button class="btn btn-utama" style="margin-top:12px" id="b-usul"><span class="ms">outgoing_mail</span>Usulkan penguncian ke Super Admin</button>' : '') + '<div class="banner banner-biru" style="margin-top:12px;font-size:12.5px"><span class="ms">photo_camera</span><div><b>Saat dikunci</b>Target capaian & bukti dibekukan, data SIM-LPPM untuk TS ini disimpan sebagai snapshot, dan laporan/LED memakai snapshot tersebut.</div></div></div></div>';
    const ulang = () => w.MH.Router.jalan();
    el.addEventListener('click', async e => {
      const k = e.target.closest('[data-kunci]'), b = e.target.closest('[data-buka-k]');
      if (k) {
        const ok = await UI.konfirmasi('Kunci Periode Mutu ' + d.ta, 'Data periode ini tidak dapat diubah sampai Super Admin membuka kunci.', { teksOk: 'Kunci periode' }); if (!ok.ok) return;
        const r = await API.call('kesiapan.kunci', { ta: d.ta, semester: k.dataset.kunci });
        if (r.success) { UI.toast(r.message, 'sukses'); ulang(); return; }
        if (r.code === 'WARN') { const lanjut = await UI.konfirmasi('Prasyarat belum lengkap', r.message, { teksOk: 'Tetap kunci', bahaya: true }); if (lanjut.ok) UI.aksi(k, 'kesiapan.kunci', { ta: d.ta, semester: k.dataset.kunci, lanjut: true }, { lalu: ulang }); return; }
        UI.toast(r.message, 'galat');
      }
      if (b) { const ok = await UI.konfirmasi('Buka kunci periode', 'Alasan dicatat di log audit dan Pimpinan diberi tahu.', { alasan: true, bahaya: true, teksOk: 'Buka kunci' }); if (ok.ok) UI.aksi(b, 'kesiapan.bukaKunci', { ta: d.ta, semester: b.dataset.bukaK, alasan: ok.alasan }, { lalu: ulang }); }
      if (e.target.closest('#b-usul')) F.formModal({ judul: 'Usulkan penguncian', fields: [{ k: 'catatan', l: 'Catatan untuk Super Admin', t: 'area' }], simpan: async v => { const x = await API.call('kesiapan.usulKunci', { ta: d.ta, catatan: v.catatan }); x.success ? UI.toast(x.message, 'sukses') : UI.toast(x.message, 'galat'); return x; } });
    });
  }
})(window);
