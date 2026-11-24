/* =====================================================================
 * hal-mutu.js — Helper CRUD & tab bersama, LM1 Dokumen SPMI,
 * LM2 Standar/Indikator/Target-Capaian, LM10 Benchmarking.
 * ===================================================================== */
(function (w) {
  'use strict';
  const { $, $$, esc, Fmt, API, Store, Sesi, UI, muat, chip, chipSumber, Master, State, G, F, tabel } = w.MH;
  const Hal = w.MH.Hal;
  const LPM = ['SA', 'ADM'];
  const peran = () => Sesi.me.role;
  const lpm = () => LPM.indexOf(peran()) >= 0;

  /* ---------- Tab lokal (ingat tab terakhir per halaman) ---------- */
  w.MH.tabs = function (el, daftar, kunci) {
    const k = 'mh:tab:' + kunci;
    let aktif = sessionStorage.getItem(k);
    if (!daftar.some(t => t.k === aktif)) aktif = daftar[0].k;
    el.innerHTML = '<div class="tab-pil" role="tablist">' + daftar.map(t => '<button role="tab" data-tab="' + t.k + '">' + esc(t.l) + (t.n ? ' <span class="chip c-merah" style="padding:0 7px">' + t.n + '</span>' : '') + '</button>').join('') + '</div><div class="tab-isi"></div>';
    const isi = $('.tab-isi', el);
    const buka = kk => { aktif = kk; sessionStorage.setItem(k, kk); $$('[data-tab]', el).forEach(b => b.classList.toggle('aktif', b.dataset.tab === kk)); isi.innerHTML = ''; const wadah = document.createElement('div'); isi.appendChild(wadah); const t = daftar.find(x => x.k === kk); Promise.resolve(t.render(wadah)).catch(e => { console.error(e); wadah.innerHTML = UI.galat({ message: e.message }); }); };
    $('.tab-pil', el).onclick = e => { const b = e.target.closest('[data-tab]'); if (b) buka(b.dataset.tab); };
    buka(aktif);
    return { buka };
  };

  /* ---------- CRUD generik di atas data.list / data.simpan / data.hapus ---------- */
  w.MH.crud = function (el, o) {
    const kunci = o.kunci || 'ID', ck = o.cache || ('crud:' + o.e + ':' + JSON.stringify(o.q || {}));
    let tb = null, rows = [];
    const bolehUbah = r => o.tulis && (!o.bolehUbah || o.bolehUbah(r));
    const kolom = o.kolom.concat(o.tulis || o.hapus || o.aksiBaris ? [{ k: '_aksi', l: '', ekspor: false, f: r => '<div class="aksi-baris">' + (o.aksiBaris ? o.aksiBaris(r) : '') + (bolehUbah(r) ? '<button class="ikon-btn kecil" data-ubah="' + esc(r[kunci]) + '" title="Ubah" aria-label="Ubah"><span class="ms">edit</span></button>' : '') + (o.hapus && (!o.bolehHapus || o.bolehHapus(r)) ? '<button class="ikon-btn kecil" data-hapus="' + esc(r[kunci]) + '" title="Hapus" aria-label="Hapus"><span class="ms" style="color:var(--merah)">delete</span></button>' : '') + '</div>' }] : []);
    const bentuk = rr => o.olah ? o.olah(rr) : rr;
    const render = (data, dariCache, gagal) => {
      if (!data) { el.innerHTML = UI.galat(gagal); return; }
      rows = bentuk(data);
      if (o.setelahMuat) o.setelahMuat(rows);
      if (!tb) tb = tabel(el, { kolom, rows, filter: o.filter, per: o.per || 15, nama: o.nama || o.e, klik: o.klik || (r => bolehUbah(r) ? form(r) : (o.lihat ? o.lihat(r) : null)), aksiAtas: (o.tulis && o.tambah !== false ? '<button class="btn btn-utama btn-kecil" data-tambah><span class="ms">add</span>' + esc(o.teksTambah || 'Tambah') + '</button>' : '') + (o.aksiAtas || ''), kosong: o.kosong, ekspor: o.ekspor });
      else tb.segarkan(rows);
    };
    const segarkan = segar => muat(ck, 'data.list', Object.assign({ e: o.e }, o.q || {}), render, { segar: segar !== false, maxAge: 15000 });
    const form = r => F.formModal({
      judul: (r ? 'Ubah ' : 'Tambah ') + (o.judul || o.e.replace(/_/g, ' ')), lebar: o.lebar,
      fields: typeof o.fields === 'function' ? o.fields(r) : o.fields, nilai: r || Object.assign({}, o.bawaanBaru || {}),
      simpan: async v => {
        const row = Object.assign({}, r ? { [kunci]: r[kunci] } : {}, o.sebelumSimpan ? o.sebelumSimpan(v, r) : v);
        const res = await API.call('data.simpan', { e: o.e, row });
        if (res.success) { UI.toast(res.message || 'Tersimpan.', 'sukses'); segarkan(); if (o.setelahSimpan) o.setelahSimpan(res.data, r); } else UI.toast(res.message, 'galat');
        return res;
      }
    });
    el.addEventListener('click', async e => {
      const u = e.target.closest('[data-ubah]'), h = e.target.closest('[data-hapus]'), t = e.target.closest('[data-tambah]');
      if (t) form(null);
      else if (u) form(rows.find(r => String(r[kunci]) === u.dataset.ubah));
      else if (h) { const k = await UI.konfirmasi('Hapus data', 'Data ini akan dihapus permanen dan tercatat di log audit.', { bahaya: true, teksOk: 'Hapus' }); if (k.ok) { const res = await UI.aksi(h, 'data.hapus', { e: o.e, id: h.dataset.hapus }); if (res.success) segarkan(); } }
    });
    el.innerHTML = UI.kerangka(1, 260);
    segarkan(false);
    return { segarkan, tambah: () => form(null), ubah: form, rows: () => rows };
  };

  const kepala = (judul, sub, aksi) => `<div class="kepala-hal"><div><h1>${esc(judul)}</h1>${sub ? '<p>' + sub + '</p>' : ''}</div><div class="baris-aksi">${aksi || ''}</div></div>`;
  w.MH.kepala = kepala;
  const statusDok = { Draf: 'c-abu', Berlaku: 'c-hijau', Ditarik: 'c-merah', Diarsipkan: 'c-abu', Tinjau: 'c-amber' };

  /* ================= LM1 Dokumen SPMI ================= */
  const JENIS_DOK = ['Kebijakan', 'Manual', 'Standar', 'Formulir', 'SOP', 'Pedoman', 'Peraturan', 'Lainnya'];
  Hal.daftar('/spmi', {
    judul: 'Dokumen SPMI', menu: 'spmi',
    async render(el) {
      el.innerHTML = kepala('Dokumen SPMI', 'Kebijakan, manual, standar, formulir, dan SOP SPMI dengan riwayat versi dan pengesahan. Dokumen berstatus <b>Berlaku</b> hanya berubah lewat versi baru.', lpm() ? '<button class="btn btn-utama" id="b-dok"><span class="ms">note_add</span>Tambah Dokumen</button>' : '') + '<div class="kartu" style="margin-top:14px" id="t-dok"></div><div class="kartu" style="margin-top:16px" id="t-lppm"></div>';
      const fields = [{ k: 'Jenis', l: 'Jenis dokumen', t: 'pilih', opsi: JENIS_DOK, wajib: true }, { k: 'Judul', l: 'Judul', wajib: true, penuh: true }, { k: 'Nomor', l: 'Nomor dokumen' }, { k: 'Bidang', l: 'Bidang', ph: 'Pendidikan, Penelitian, Tata Kelola…' }, { k: 'Unit_Pemilik', l: 'Unit pemilik', t: 'pilih', opsi: () => Master.opsiUnit() }, { k: 'Tgl_Berlaku', l: 'Tanggal berlaku', t: 'tanggal' }, { k: 'Tgl_Tinjau_Berikut', l: 'Tinjau berikutnya', t: 'tanggal' }, { k: 'ID_File', l: 'Berkas dokumen', t: 'berkas', folder: 'Dokumen_SPMI' }, { k: 'Tautan', l: 'Atau tautan dokumen', t: 'url', penuh: true }, { k: 'Catatan', l: 'Catatan', t: 'area', baris: 2 }];
      let dataLppm = [];
      const tampilLppm = (lppm, waktu) => { $('#t-lppm', el).innerHTML = '<div class="kartu-h"><div><h3>Dokumen mutu dibagikan SIM-LPPM</h3><p>Baca-saja. Perubahan dilakukan di SIM-LPPM.</p></div>' + chipSumber(waktu) + '</div>' + (lppm.length ? '<div class="daftar">' + lppm.map(d => '<div class="item"><span class="ms" style="color:var(--teal)">description</span><div class="isi"><b>' + esc(d.Judul) + '</b><small>' + esc([d.Jenis, d.Nomor, d.Versi ? 'v' + d.Versi : ''].filter(Boolean).join(' · ')) + '</small></div>' + chip(d.Status, 'c-teal') + (d.Tautan ? '<a class="btn btn-hantu btn-kecil" target="_blank" rel="noopener" href="' + esc(d.Tautan) + '">Buka</a>' : '') + '</div>').join('') + '</div>' : UI.kosong('Belum ada dokumen yang dibagikan SIM-LPPM.', 'cloud_off')); };
      const c = w.MH.crud($('#t-dok', el), {
        e: 'Dokumen_SPMI', cache: 'spmi-tabel', tulis: lpm(), hapus: peran() === 'SA', tambah: false, nama: 'Dokumen SPMI', judul: 'Dokumen SPMI', lebar: true,
        bolehUbah: r => peran() === 'SA' || r.Status !== 'Berlaku',
        filter: [{ k: 'Jenis', l: 'Jenis', opsi: JENIS_DOK }, { k: 'Status', l: 'Status', opsi: ['Draf', 'Berlaku', 'Ditarik', 'Diarsipkan'] }],
        kolom: [{ k: 'Judul', l: 'Dokumen', f: r => '<b>' + esc(r.Judul) + '</b><div class="catatan">' + esc([r.Jenis, r.Nomor].filter(Boolean).join(' · ')) + '</div>' }, { k: 'Versi', l: 'Versi', f: r => 'v' + esc(r.Versi) }, { k: 'Status', l: 'Status', f: r => chip(r.Status, statusDok[r.Status]) + (r.Kode_Verifikasi ? ' <span class="ms" title="Lembar pengesahan ber-QR" style="font-size:16px;color:var(--teal)">qr_code_2</span>' : '') }, { k: 'Tgl_Berlaku', l: 'Berlaku', f: r => Fmt.tgl(r.Tgl_Berlaku) }, { k: 'Tgl_Tinjau_Berikut', l: 'Tinjau berikut', f: r => { const s = Fmt.sisaHari(r.Tgl_Tinjau_Berikut); return Fmt.tgl(r.Tgl_Tinjau_Berikut) + (r.Status === 'Berlaku' && s !== null && s <= 30 ? ' ' + chip(s < 0 ? 'Lewat' : 'H-' + s, s < 0 ? 'c-merah' : 'c-amber') : ''); } }, { k: 'Unit_Pemilik', l: 'Unit', f: r => esc(Master.unit(r.Unit_Pemilik)) }],
        aksiBaris: r => (r.ID_File || r.Tautan ? '<button class="btn btn-hantu btn-kecil" data-buka="' + esc(r.ID_File || r.Tautan) + '"><span class="ms">open_in_new</span>Buka</button>' : '') + (peran() === 'SA' && r.Status === 'Draf' ? '<button class="btn btn-teal btn-kecil" data-sahkan="' + esc(r.ID) + '"><span class="ms">verified</span>Sahkan</button>' : '') + (lpm() && r.Status === 'Berlaku' ? '<button class="btn btn-hantu btn-kecil" data-versi="' + esc(r.ID) + '"><span class="ms">difference</span>Versi baru</button>' : '') + (peran() === 'SA' && r.Status === 'Berlaku' ? '<button class="btn btn-hantu btn-kecil" data-tarik="' + esc(r.ID) + '"><span class="ms">block</span>Tarik</button>' : ''),
        fields
      });
      const b = $('#b-dok', el); if (b) b.onclick = () => c.tambah();
      $('#t-dok', el).addEventListener('click', async e => {
        const x = e.target.closest('[data-buka],[data-sahkan],[data-versi],[data-tarik]'); if (!x) return;
        if (x.dataset.buka) return F.bukaBerkas(x.dataset.buka, x);
        if (x.dataset.sahkan) { const k = await UI.konfirmasi('Sahkan dokumen', 'Dokumen menjadi Berlaku, versi Berlaku sebelumnya diarsipkan, dan lembar pengesahan ber-QR diterbitkan.', { teksOk: 'Sahkan' }); if (k.ok) await UI.aksi(x, 'spmi.sahkan', { id: x.dataset.sahkan }, { lalu: () => c.segarkan() }); }
        if (x.dataset.versi) await UI.aksi(x, 'spmi.versiBaru', { id: x.dataset.versi }, { lalu: r => { c.segarkan(); if (r.data) setTimeout(() => c.ubah(r.data), 300); } });
        if (x.dataset.tarik) { const k = await UI.konfirmasi('Tarik dokumen', 'Dokumen tidak lagi berlaku. Verifikasi QR akan menampilkan status DITARIK.', { alasan: true, bahaya: true, teksOk: 'Tarik dokumen' }); if (k.ok) await UI.aksi(x, 'spmi.tarik', { id: x.dataset.tarik, alasan: k.alasan }, { lalu: () => c.segarkan() }); }
      });
      muat('spmi', 'spmi.daftar', {}, d => { if (d) { dataLppm = d.lppm || []; tampilLppm(dataLppm, (State.boot && State.boot.integrasi && State.boot.integrasi.lppm.waktu) || ''); } });
    }
  });

  /* ================= LM2 Standar, Indikator, Target & Capaian ================= */
  const warnaCap = { 'Tercapai': '#16A34A', 'Mendekati': '#F5A623', 'Belum': '#DC2626', 'Belum Diisi': '#B5BBC8', 'Tanpa Target': '#8E5BD0' };
  Hal.daftar('/target', {
    judul: 'Standar & Target', menu: 'target',
    async render(el) {
      el.innerHTML = kepala('Standar & Target Mutu', 'Standar mutu, indikator kinerja (IKU/IKT), target per tahun akademik, dan capaian. Capaian bersumber SIM-LPPM, survei, atau AMI dihitung otomatis.', lpm() ? '<button class="btn btn-hantu" id="b-siap"><span class="ms">playlist_add</span>Siapkan target ' + esc(State.ta) + '</button><button class="btn btn-utama" id="b-hitung"><span class="ms">calculate</span>Hitung capaian otomatis</button>' : '') + '<div id="tab" style="margin-top:14px"></div>';
      const bs = $('#b-siap', el); if (bs) bs.onclick = () => UI.aksi(bs, 'mutu.siapkanTarget', { ta: State.ta }, { lalu: () => w.MH.Router.jalan() });
      const bh = $('#b-hitung', el); if (bh) bh.onclick = () => UI.aksi(bh, 'mutu.hitung', { ta: State.ta }, { lalu: () => w.MH.Router.jalan() });
      w.MH.tabs($('#tab', el), [
        { k: 'capaian', l: 'Capaian ' + State.ta, render: tabCapaian },
        { k: 'standar', l: 'Standar Mutu', render: e => w.MH.crud(e, { e: 'Standar_Mutu', kunci: 'ID_Standar', tulis: lpm(), hapus: peran() === 'SA', nama: 'Standar Mutu', judul: 'Standar Mutu', filter: [{ k: 'Bidang', l: 'Bidang', opsi: [...new Set(Master.d.standar.map(s => s.Bidang))] }], kolom: [{ k: 'Kode', l: 'Kode', f: r => '<b class="mono">' + esc(r.Kode) + '</b>' }, { k: 'Nama', l: 'Nama standar' }, { k: 'Bidang', l: 'Bidang' }, { k: 'Sumber_Acuan', l: 'Acuan', f: r => '<span class="catatan">' + esc(String(r.Sumber_Acuan || '').slice(0, 80)) + '</span>' }, { k: 'Status', l: 'Status', f: r => chip(r.Status) }], fields: [{ k: 'Kode', l: 'Kode', wajib: true }, { k: 'Nama', l: 'Nama standar', wajib: true, penuh: true }, { k: 'Bidang', l: 'Bidang', wajib: true, ph: 'Pendidikan / Penelitian / PkM / Tata Kelola' }, { k: 'Status', l: 'Status', t: 'pilih', opsi: ['Aktif', 'Nonaktif'], kosong: false }, { k: 'Sumber_Acuan', l: 'Sumber acuan', t: 'area', baris: 2 }] }) },
        { k: 'indikator', l: 'Indikator (IKU/IKT)', render: e => w.MH.crud(e, { e: 'Indikator_Mutu', kunci: 'ID_Indikator', tulis: lpm(), hapus: peran() === 'SA', nama: 'Indikator Mutu', judul: 'Indikator', lebar: true, filter: [{ k: 'Sumber_Capaian', l: 'Sumber', opsi: ['Input', 'Tarik-LPPM', 'Survei', 'AMI', 'Impor'] }, { k: 'Lingkup', l: 'Lingkup', opsi: ['Prodi', 'Unit', 'Institusi'] }], kolom: [{ k: 'Kode', l: 'Kode', f: r => '<b class="mono">' + esc(r.Kode) + '</b>' }, { k: 'Nama', l: 'Indikator' }, { k: 'ID_Standar', l: 'Standar', f: r => esc(Master.standar(r.ID_Standar)) }, { k: 'Target_Default', l: 'Target', num: true, f: r => Fmt.angka(r.Target_Default) + ' ' + esc(r.Satuan) }, { k: 'Arah', l: 'Arah', f: r => '<span class="ms" title="' + esc(r.Arah) + '" style="font-size:18px;color:var(--biru)">' + (r.Arah === 'Turun' ? 'trending_down' : 'trending_up') + '</span>' }, { k: 'Sumber_Capaian', l: 'Sumber', f: r => chip(r.Sumber_Capaian, r.Sumber_Capaian === 'Tarik-LPPM' ? 'c-teal' : 'c-biru') }, { k: 'Lingkup', l: 'Lingkup' }], fields: [{ k: 'Kode', l: 'Kode', wajib: true }, { k: 'ID_Standar', l: 'Standar', t: 'pilih', opsi: () => Master.opsiStandar(), wajib: true }, { k: 'Nama', l: 'Nama indikator', wajib: true, penuh: true }, { k: 'Satuan', l: 'Satuan', wajib: true, ph: '%, judul, IPK' }, { k: 'Arah', l: 'Arah baik', t: 'pilih', opsi: [['Naik', 'Makin tinggi makin baik'], ['Turun', 'Makin rendah makin baik']], kosong: false }, { k: 'Target_Default', l: 'Target bawaan', t: 'angka' }, { k: 'Sumber_Capaian', l: 'Sumber capaian', t: 'pilih', opsi: [['Input', 'Input manual GKM/PJ'], ['Tarik-LPPM', 'SIM-LPPM (peta kriteria)'], ['Survei', 'Indeks survei'], ['AMI', '% PKPA tertutup'], ['Impor', 'Impor Excel']], wajib: true }, { k: 'Ref_Sumber', l: 'Referensi sumber', bantu: 'ID peta kriteria (Tarik-LPPM) atau ID survei (Survei).' }, { k: 'Lingkup', l: 'Lingkup', t: 'pilih', opsi: ['Prodi', 'Unit', 'Institusi'], kosong: false }, { k: 'Status', l: 'Status', t: 'pilih', opsi: ['Aktif', 'Nonaktif'], kosong: false }] }) },
        { k: 'matriks', l: 'Matriks Standar–Kriteria', render: e => w.MH.crud(e, { e: 'Matriks_Standar_Kriteria', tulis: lpm(), hapus: lpm(), nama: 'Matriks Standar-Kriteria', judul: 'Pemetaan', kolom: [{ k: 'ID_Standar', l: 'Standar', f: r => esc(Master.standar(r.ID_Standar)) }, { k: 'ID_Kriteria', l: 'Kriteria akreditasi', f: r => esc(Master.kriteria(r.ID_Kriteria)) }, { k: 'Keterangan', l: 'Keterangan' }], fields: [{ k: 'ID_Standar', l: 'Standar', t: 'pilih', opsi: () => Master.opsiStandar(), wajib: true }, { k: 'ID_Kriteria', l: 'Kriteria', t: 'pilih', opsi: () => Master.opsiKriteria(), wajib: true }, { k: 'Keterangan', l: 'Keterangan', t: 'area', baris: 2 }] }) }
      ], 'target');
    }
  });

  async function tabCapaian(el) {
    el.innerHTML = '<div class="grid g-4-8"><div class="kartu"><div class="kartu-h"><h3>Status capaian</h3></div><div id="g-st"></div></div><div class="kartu"><div class="kartu-h"><div><h3>Ketercapaian per standar</h3><p>% indikator tercapai</p></div></div><div id="g-std"></div></div></div><div class="kartu" style="margin-top:16px" id="t-cap"></div>';
    muat('mutu:' + State.ta, 'mutu.ringkas', { ta: State.ta }, d => {
      if (!d) return;
      G.donut($('#g-st', el), { item: Object.keys(d.status).filter(k => d.status[k]).map(k => ({ l: k, v: d.status[k], w: warnaCap[k] })), sub: 'Indikator' });
      G.batang($('#g-std', el), { label: d.perStandar.map(s => s.standar), seri: [{ nama: '% tercapai', data: d.perStandar.map(s => s.total ? Math.round(s.tercapai / s.total * 100) : 0) }], maks: 100, satuan: '%', tinggi: 200 });
    });
    const ind = {}; let dataInd = [];
    const r0 = await API.q('data.list', { e: 'Indikator_Mutu' }); if (r0.success) { dataInd = r0.data; dataInd.forEach(i => ind[i.ID_Indikator] = i); }
    const bolehIsi = r => { const i = ind[r.ID_Indikator] || {}; if (r.Terkunci === 'Ya' || Master.terkunci(r.Tahun_Akademik)) return false; if (lpm()) return true; if (['Input', 'Impor'].indexOf(i.Sumber_Capaian) < 0) return false; return (peran() === 'GKM' && r.Kode_Prodi === Sesi.me.prodi) || (peran() === 'PJU' && r.Kode_Unit === Sesi.me.unit); };
    w.MH.crud($('#t-cap', el), {
      e: 'Target_Capaian', q: { ta: State.ta }, tulis: lpm(), hapus: lpm(), nama: 'Target & Capaian ' + State.ta, judul: 'Target', teksTambah: 'Tambah target',
      bawaanBaru: { Tahun_Akademik: State.ta },
      filter: [{ k: 'Status_Capaian', l: 'Status', opsi: ['Tercapai', 'Mendekati', 'Belum', 'Belum Diisi', 'Tanpa Target'] }, { k: 'Kode_Prodi', l: 'Prodi', opsi: () => Master.opsiProdi() }],
      kolom: [{ k: 'ID_Indikator', l: 'Indikator', cari: r => (ind[r.ID_Indikator] || {}).Nama, teks: r => (ind[r.ID_Indikator] || {}).Nama, f: r => { const i = ind[r.ID_Indikator] || {}; return '<b>' + esc(i.Kode || '') + '</b> ' + esc(i.Nama || r.ID_Indikator) + '<div class="catatan">' + esc(Master.standar(i.ID_Standar)) + '</div>'; } },
        { k: 'Kode_Prodi', l: 'Prodi/Unit', f: r => esc(r.Kode_Prodi ? Master.prodi(r.Kode_Prodi) : Master.unit(r.Kode_Unit)), teks: r => r.Kode_Prodi || r.Kode_Unit },
        { k: 'Target', l: 'Target', num: true, f: r => Fmt.angka(r.Target) + ' <small class="catatan">' + esc((ind[r.ID_Indikator] || {}).Satuan || '') + '</small>' },
        { k: 'Capaian', l: 'Capaian', num: true, f: r => '<b>' + Fmt.angka(r.Capaian) + '</b>' + (r.Sumber_Data === 'Tarik-LPPM' ? ' <span class="chip chip-sumber" title="Dari SIM-LPPM"><i></i>LPPM</span>' : '') },
        { k: 'Status_Capaian', l: 'Status', f: r => chip(r.Status_Capaian) + (r.Terkunci === 'Ya' ? ' <span class="ms kunci-ikon" title="Terkunci" style="font-size:15px">lock</span>' : '') },
        { k: 'Waktu_Hitung', l: 'Diperbarui', f: r => '<span class="catatan">' + esc(Fmt.relatif(r.Waktu_Hitung)) + '</span>' }],
      aksiBaris: r => bolehIsi(r) ? '<button class="btn btn-hantu btn-kecil" data-isi="' + esc(r.ID) + '"><span class="ms">edit_note</span>Isi capaian</button>' : '',
      fields: [{ k: 'ID_Indikator', l: 'Indikator', t: 'pilih', opsi: () => dataInd.map(i => [i.ID_Indikator, i.Kode + ' ' + i.Nama]), wajib: true, penuh: true }, { k: 'Kode_Prodi', l: 'Prodi', t: 'pilih', opsi: () => Master.opsiProdi() }, { k: 'Kode_Unit', l: 'atau Unit', t: 'pilih', opsi: () => Master.opsiUnit() }, { k: 'Tahun_Akademik', l: 'Tahun akademik', t: 'pilih', opsi: () => Master.opsiTA(), kosong: false }, { k: 'Target', l: 'Target', t: 'angka' }, { k: 'Catatan', l: 'Catatan', t: 'area', baris: 2 }]
    });
    $('#t-cap', el).addEventListener('click', e => {
      const b = e.target.closest('[data-isi]'); if (!b) return;
      const tb = $('#t-cap', el)._baris || []; const r = tb.find(x => x.ID === b.dataset.isi); const i = ind[r.ID_Indikator] || {};
      F.formModal({ judul: 'Isi capaian', sub: (i.Kode || '') + ' ' + (i.Nama || '') + ' · target ' + Fmt.angka(r.Target) + ' ' + (i.Satuan || ''), fields: [{ k: 'capaian', l: 'Capaian (' + (i.Satuan || 'angka') + ')', t: 'angka', wajib: true }, { k: 'catatan', l: 'Catatan / sumber data', t: 'area', baris: 2 }], nilai: { capaian: r.Capaian, catatan: r.Catatan }, simpan: async v => { const res = await API.call('mutu.inputCapaian', { id: r.ID, capaian: v.capaian, catatan: v.catatan }); if (res.success) { UI.toast(res.message || 'Capaian tersimpan.', 'sukses'); w.MH.Router.jalan(); } else UI.toast(res.message, 'galat'); return res; } });
    });
  }

  /* ================= LM10 Benchmarking ================= */
  Hal.daftar('/benchmarking', {
    judul: 'Benchmarking', menu: 'benchmarking',
    async render(el) {
      el.innerHTML = kepala('Benchmarking', 'Bandingkan capaian indikator dengan institusi pembanding. Selisih yang tertinggal bisa langsung dijadikan rencana peningkatan (PPEPP).') + '<div class="kartu" style="margin-top:14px" id="t-b"></div>';
      const gap = r => { const a = Number(r.Nilai_Kita), b = Number(r.Nilai_Pembanding); if (isNaN(a) || isNaN(b) || r.Nilai_Kita === '' || r.Nilai_Pembanding === '') return null; return r.Arah === 'Turun' ? b - a : a - b; };
      const c = w.MH.crud($('#t-b', el), {
        e: 'Benchmarking', tulis: lpm(), hapus: lpm(), nama: 'Benchmarking', judul: 'Benchmarking',
        kolom: [{ k: 'Indikator', l: 'Indikator', f: r => '<b>' + esc(r.Indikator) + '</b><div class="catatan">' + esc(r.Standar_Terkait || '') + '</div>' }, { k: 'Pembanding', l: 'Pembanding' }, { k: 'Nilai_Kita', l: 'Kita', num: true, f: r => '<b>' + Fmt.angka(r.Nilai_Kita) + '</b> ' + esc(r.Satuan || '') }, { k: 'Nilai_Pembanding', l: 'Pembanding', num: true, f: r => Fmt.angka(r.Nilai_Pembanding) + ' ' + esc(r.Satuan || '') }, { k: 'gap', l: 'Posisi', nilai: gap, teks: r => gap(r), f: r => { const g = gap(r); return g === null ? '—' : g >= 0 ? chip('Unggul +' + Fmt.angka(Math.abs(g), 1), 'c-hijau') : chip('Tertinggal ' + Fmt.angka(Math.abs(g), 1), 'c-merah'); } }, { k: 'Tahun', l: 'Tahun' }, { k: 'ID_PPEPP_Item', l: 'PPEPP', f: r => r.ID_PPEPP_Item ? '<a href="#/ppepp">' + esc(r.ID_PPEPP_Item) + '</a>' : '' }],
        aksiBaris: r => lpm() && !r.ID_PPEPP_Item && gap(r) !== null && gap(r) < 0 ? '<button class="btn btn-teal btn-kecil" data-ppepp="' + esc(r.ID) + '"><span class="ms">trending_up</span>Rencana peningkatan</button>' : '',
        fields: [{ k: 'Indikator', l: 'Indikator', wajib: true, penuh: true }, { k: 'Standar_Terkait', l: 'Standar terkait', t: 'pilih', opsi: () => Master.d.standar.map(s => [s.Kode, s.Kode + ' ' + s.Nama]) }, { k: 'Pembanding', l: 'Institusi pembanding', wajib: true }, { k: 'Nilai_Kita', l: 'Nilai kita', t: 'angka' }, { k: 'Nilai_Pembanding', l: 'Nilai pembanding', t: 'angka' }, { k: 'Satuan', l: 'Satuan' }, { k: 'Arah', l: 'Arah baik', t: 'pilih', opsi: ['Naik', 'Turun'], kosong: false }, { k: 'Tahun', l: 'Tahun', wajib: true, t: 'angka' }, { k: 'Sumber', l: 'Sumber data', penuh: true }]
      });
      $('#t-b', el).addEventListener('click', e => {
        const b = e.target.closest('[data-ppepp]'); if (!b) return;
        F.formModal({ judul: 'Rencana peningkatan', sub: 'Item PPEPP tahap Peningkatan akan dibuat dan PIC diberi tahu.', fields: [{ k: 'PIC', l: 'PIC (email)', t: 'pilih', opsi: () => Master.opsiPengguna(null, 'email'), wajib: true }], simpan: async v => { const r = await API.call('bench.ppepp', { id: b.dataset.ppepp, PIC: v.PIC }); if (r.success) { UI.toast(r.message, 'sukses'); c.segarkan(); } else UI.toast(r.message, 'galat'); return r; } });
      });
    }
  });
})(window);
