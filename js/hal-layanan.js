/* =====================================================================
 * hal-layanan.js — LM8 Survei kepuasan (daftar, penyusun pertanyaan,
 * token sekali-pakai + QR, undangan WA/Email, hasil teragregasi) dan
 * LM9 Pengaduan (daftar, rekap SLA, pemilahan, penanganan, PPEPP).
 * ===================================================================== */
(function (w) {
  'use strict';
  const { $, $$, esc, Fmt, API, Sesi, UI, muat, chip, Master, State, G, F, tabel, qrSvg } = w.MH;
  const Hal = w.MH.Hal, kepala = w.MH.kepala;
  const LPM = ['SA', 'ADM'];
  const peran = () => Sesi.me.role, lpm = () => LPM.indexOf(peran()) >= 0;
  const KELOMPOK = ['Mahasiswa', 'Dosen', 'Tendik', 'Alumni', 'Pengguna Lulusan', 'Mitra'];
  const KATEGORI_ADUAN = ['Akademik', 'Layanan Administrasi', 'Sarana Prasarana', 'Keuangan', 'Kemahasiswaan', 'Lainnya'];
  const fSurvei = [{ k: 'Judul', l: 'Judul survei', wajib: true, penuh: true }, { k: 'Deskripsi', l: 'Pengantar untuk responden', t: 'area', baris: 2 }, { k: 'Sasaran', l: 'Sasaran', t: 'multi', opsi: KELOMPOK.map(x => [x, x]), wajib: true, ukuran: 6 }, { k: 'Periode', l: 'Periode', ph: 'Ganjil 2026/2027' }, { k: 'Tahun_Akademik', l: 'Tahun akademik', t: 'pilih', opsi: () => Master.opsiTA(), kosong: false }, { k: 'Tgl_Buka', l: 'Dibuka', t: 'tanggal', wajib: true }, { k: 'Tgl_Tutup', l: 'Ditutup', t: 'tanggal', wajib: true }, { k: 'Kode_Unit', l: 'Unit layanan yang dinilai', t: 'pilih', opsi: () => Master.opsiUnit() }, { k: 'Anonim', l: 'Anonim', t: 'saklar', teksSaklar: 'Responden anonim (disarankan)', bawaan: 'Ya' }];

  /* ================= Survei ================= */
  Hal.daftar('/survei', {
    judul: 'Survei', menu: 'survei',
    async render(el) {
      el.innerHTML = kepala('Survei Kepuasan', 'Survei mahasiswa, dosen, tendik, alumni, pengguna lulusan, dan mitra. Responden mengisi lewat tautan bertoken sekali pakai tanpa login — identitas tidak disimpan.', lpm() ? '<button class="btn btn-utama" id="b-sv"><span class="ms">add</span>Survei baru</button>' : '') + '<div id="d-sv" style="margin-top:14px">' + UI.kerangka(1, 180) + '</div>';
      const b = $('#b-sv', el); if (b) b.onclick = () => F.formModal({ judul: 'Survei baru', lebar: true, fields: fSurvei, nilai: { Tahun_Akademik: State.ta }, simpan: async v => { const x = await API.call('data.simpan', { e: 'Survei', row: v }); if (x.success) location.hash = '#/survei/' + x.data.ID; else UI.toast(x.message, 'galat'); return x; } });
      await muat('survei', 'data.list', { e: 'Survei' }, rows => {
        if (!rows) return;
        rows.sort((a, b) => String(b.Tgl_Buka).localeCompare(String(a.Tgl_Buka)));
        $('#d-sv', el).innerHTML = rows.length ? '<div class="grid g3">' + rows.map(s => '<a class="kartu kartu-proyek" href="#/survei/' + esc(s.ID) + '" style="color:inherit;text-decoration:none"><div style="display:flex;justify-content:space-between;gap:8px">' + chip(s.Status, s.Status === 'Dibuka' ? 'c-hijau' : s.Status === 'Ditutup' ? 'c-abu' : 'c-amber') + '<span class="catatan">' + esc(s.Tahun_Akademik) + '</span></div><h3 style="margin:10px 0 4px;font-size:16px">' + esc(s.Judul) + '</h3><div class="catatan">' + esc(String(s.Sasaran || '').split(/,\s*/).join(' · ')) + '</div><div class="catatan" style="margin-top:8px"><span class="ms" style="font-size:15px;vertical-align:-3px">event</span> ' + Fmt.tgl(s.Tgl_Buka) + ' – ' + Fmt.tgl(s.Tgl_Tutup) + '</div></a>').join('') + '</div>' : UI.kosong('Belum ada survei.', 'poll');
      }, { maxAge: 15000 });
    }
  });

  Hal.daftar('/survei/:id', {
    judul: 'Survei', menu: 'survei',
    async render(el, p) {
      el.innerHTML = UI.kerangka(3, 140);
      const r = await API.call('survei.hasil', { id: p.id });
      if (!r.success) { el.innerHTML = UI.galat(r); return; }
      const d = r.data, s = d.survei, ulang = () => w.MH.Router.jalan();
      const st = { Draf: ['Dibuka', 'Buka survei', 'play_arrow'], Dibuka: ['Ditutup', 'Tutup survei', 'stop'], Ditutup: ['Dibuka', 'Buka kembali', 'replay'] }[s.Status];
      el.innerHTML = `<div class="remah"><a href="#/survei">Survei</a> / ${esc(s.Judul)}</div>
        <div class="kepala-hal" style="margin-top:6px"><div><h1>${esc(s.Judul)}</h1><p>${chip(s.Status, s.Status === 'Dibuka' ? 'c-hijau' : 'c-abu')} ${esc(Fmt.tgl(s.Tgl_Buka))} – ${esc(Fmt.tgl(s.Tgl_Tutup))} · ${esc(String(s.Sasaran || ''))}${s.Anonim === 'Ya' ? ' · anonim' : ''}</p></div><div class="baris-aksi">${lpm() ? (st ? '<button class="btn btn-utama" data-st="' + st[0] + '"><span class="ms">' + st[2] + '</span>' + st[1] + '</button>' : '') + '<button class="btn btn-hantu" id="b-ubah"><span class="ms">edit</span>Ubah</button><button class="btn btn-hantu" id="b-salin"><span class="ms">content_copy</span>Salin</button>' : ''}</div></div>
        <div id="tab" style="margin-top:14px"></div>`;
      const bs = $('[data-st]', el); if (bs) bs.onclick = () => UI.aksi(bs, 'survei.status', { id: s.ID, status: bs.dataset.st }, { lalu: ulang });
      const bu = $('#b-ubah', el); if (bu) bu.onclick = () => F.formModal({ judul: 'Ubah survei', lebar: true, fields: fSurvei, nilai: s, simpan: async v => { const x = await API.call('data.simpan', { e: 'Survei', row: Object.assign({ ID: s.ID }, v) }); if (x.success) ulang(); else UI.toast(x.message, 'galat'); return x; } });
      const bc = $('#b-salin', el); if (bc) bc.onclick = () => UI.aksi(bc, 'survei.salin', { id: s.ID }, { lalu: x => location.hash = '#/survei/' + x.data.ID });
      w.MH.tabs($('#tab', el), [
        { k: 'hasil', l: 'Hasil', render: e => hasilSurvei(e, d) },
        lpm() ? { k: 'pertanyaan', l: 'Pertanyaan', render: e => { e.className = 'kartu'; w.MH.crud(e, { e: 'Survei_Pertanyaan', q: { f: { ID_Survei: s.ID } }, tulis: true, hapus: true, judul: 'Pertanyaan', teksTambah: 'Tambah pertanyaan', nama: 'Pertanyaan survei', olah: rr => rr.sort((a, b) => Number(a.Urutan) - Number(b.Urutan)), bawaanBaru: { Tipe: 'Skala', Opsi: '1-5', Wajib: 'Ya', Urutan: '' }, sebelumSimpan: v => Object.assign({ ID_Survei: s.ID }, v), kolom: [{ k: 'Urutan', l: '#', num: true }, { k: 'Teks', l: 'Pertanyaan', f: x => '<b>' + esc(x.Teks) + '</b>' }, { k: 'Tipe', l: 'Tipe', f: x => chip(x.Tipe, 'c-biru') }, { k: 'Opsi', l: 'Opsi' }, { k: 'Wajib', l: 'Wajib' }], fields: [{ k: 'Urutan', l: 'Urutan', t: 'angka' }, { k: 'Tipe', l: 'Tipe', t: 'pilih', opsi: [['Skala', 'Skala (1–5)'], ['Pilihan', 'Pilihan ganda'], ['Teks', 'Isian teks']], kosong: false }, { k: 'Teks', l: 'Teks pertanyaan', t: 'area', wajib: true }, { k: 'Opsi', l: 'Opsi', bantu: 'Skala: 1-5 (atau 1-4). Pilihan: pisahkan dengan titik koma, mis. Ya; Tidak; Ragu.' }, { k: 'Wajib', l: 'Wajib dijawab', t: 'pilih', opsi: ['Ya', 'Tidak'], kosong: false }] }); } } : null,
        lpm() ? { k: 'distribusi', l: 'Distribusi', render: e => distribusi(e, s) } : null
      ].filter(Boolean), 'survei');
    }
  });

  function hasilSurvei(el, d) {
    const s = d.survei;
    el.innerHTML = `<div class="grid g4">${[['Responden', d.responden, 'groups'], ['Indeks kepuasan', d.indeks === null ? '—' : Fmt.angka(d.indeks, 1) + ' <small>/100</small>', 'sentiment_satisfied'], ['Token dipakai', d.tokenDipakai + ' <small>/ ' + d.tokenDibuat + '</small>', 'key'], ['Tingkat respons', d.tingkatRespons === null ? '—' : Fmt.persen(d.tingkatRespons), 'percent']].map(x => '<div class="kartu kpi"><div class="atas"><span class="ikon teal"><span class="ms">' + x[2] + '</span></span></div><div class="judul">' + x[0] + '</div><div class="nilai">' + x[1] + '</div></div>').join('')}</div>
      ${d.disamarkan ? '<div class="banner banner-biru" style="margin-top:12px"><span class="ms">shield</span><div><b>Sebagian kelompok disamarkan</b>Kelompok dengan kurang dari ' + d.minKelompok + ' responden tidak ditampilkan terpisah untuk menjaga anonimitas.</div></div>' : ''}
      <div class="grid g-8-4" style="margin-top:16px"><div class="kartu"><div class="kartu-h"><div><h3>Rata-rata per pertanyaan</h3><p>Skala 1–5. Butir di bawah 3,5 disarankan ditindaklanjuti.</p></div></div><div id="t-q"></div></div>
        <div class="grid"><div class="kartu"><div class="kartu-h"><h3>Per kelompok</h3></div><div id="t-k"></div></div><div class="kartu"><div class="kartu-h"><h3>Tren indeks</h3></div><div id="g-tr"></div></div></div></div>`;
    const skala = d.pertanyaan.filter(q => q.tipe === 'Skala');
    tabel($('#t-q', el), { rows: d.pertanyaan, cari: false, nama: 'Hasil ' + s.Judul, kolom: [{ k: 'teks', l: 'Pertanyaan', f: q => '<b>' + esc(q.teks) + '</b><div class="catatan">' + esc(q.tipe) + ' · ' + q.n + ' jawaban</div>' }, { k: 'rata', l: 'Rata-rata', num: true, f: q => q.rata === null || q.rata === undefined ? '—' : '<b>' + Fmt.angka(q.rata, 2) + '</b><span class="catatan"> / ' + (q.maks || 5) + '</span>' + G.progres(q.rata / (q.maks || 5) * 100, q.rata < 3.5 ? '' : 'teal') }, { k: '_a', l: '', ekspor: false, f: q => lpm() && q.tipe === 'Skala' && q.rata !== null && q.rata < 3.5 ? '<button class="btn btn-teal btn-kecil" data-pp="' + esc(q.id) + '" data-rata="' + q.rata + '"><span class="ms">sync_alt</span>PPEPP</button>' : '' }] });
    tabel($('#t-k', el), { rows: d.perKelompok, cari: false, ekspor: false, kolom: [{ k: 'kelompok', l: 'Kelompok' }, { k: 'n', l: 'n', num: true }, { k: 'indeks', l: 'Indeks', num: true, f: x => Fmt.angka(x.indeks, 1) }], kosong: 'Belum ada kelompok yang memenuhi batas minimal.' });
    G.garis($('#g-tr', el), { label: (d.tren || []).map(x => x.periode), data: (d.tren || []).map(x => x.indeks), satuan: '', warna: '#0E9F9A', tinggi: 140 });
    el.addEventListener('click', e => { const b = e.target.closest('[data-pp]'); if (!b) return; F.formModal({ judul: 'Tindak lanjut butir survei', fields: [{ k: 'PIC', l: 'PIC (email)', t: 'pilih', opsi: () => Master.opsiPengguna(null, 'email'), wajib: true }], simpan: async v => { const x = await API.call('survei.ppepp', { id: s.ID, idPertanyaan: b.dataset.pp, rata: b.dataset.rata, PIC: v.PIC }); x.success ? UI.toast(x.message, 'sukses') : UI.toast(x.message, 'galat'); return x; } }); });
    if (!skala.length && !d.pertanyaan.length) $('#t-q', el).innerHTML = UI.kosong('Belum ada pertanyaan.', 'quiz');
  }

  function distribusi(el, s) {
    el.innerHTML = `<div class="grid g2"><div class="kartu"><div class="kartu-h"><div><h3>Token & QR sekali pakai</h3><p>Untuk dibagikan langsung (cetak/kelas/acara). Token hanya tampil sekali.</p></div></div><form id="f-tk" class="form">${F.formHtml([{ k: 'jumlah', l: 'Jumlah token', t: 'angka', wajib: true, bawaan: 30 }, { k: 'kelompok', l: 'Kelompok responden', t: 'pilih', opsi: KELOMPOK, wajib: true }, { k: 'prodi', l: 'Prodi (opsional)', t: 'pilih', opsi: () => Master.opsiProdi() }])}<div class="aksi"><button class="btn btn-utama"><span class="ms">qr_code_2</span>Buat token</button></div></form></div>
      <div class="kartu"><div class="kartu-h"><div><h3>Undang lewat WhatsApp / Email</h3><p>Tautan bertoken dibuat saat pesan dikirim dari antrean. Satu baris per penerima: <code>Nama|08xx|email</code>.</p></div></div><form id="f-ud" class="form">${F.formHtml([{ k: 'kelompok', l: 'Kelompok responden', t: 'pilih', opsi: KELOMPOK, wajib: true }, { k: 'prodi', l: 'Prodi (opsional)', t: 'pilih', opsi: () => Master.opsiProdi() }, { k: 'daftar', l: 'Penerima', t: 'area', baris: 6, wajib: true }])}<div class="aksi"><button class="btn btn-utama"><span class="ms">send</span>Masukkan antrean</button></div></form></div></div><div id="hasil-tk" style="margin-top:16px"></div>`;
    const ft = $('#f-tk', el), fu = $('#f-ud', el);
    ft.onsubmit = async e => {
      e.preventDefault(); const v = F.bacaForm(ft, [{ k: 'jumlah', l: 'Jumlah', t: 'angka', wajib: true }, { k: 'kelompok', l: 'Kelompok', wajib: true }, { k: 'prodi' }]); if (!v) return;
      const x = await UI.aksi($('button', ft), 'survei.token', { id: s.ID, jumlah: v.jumlah, kelompok: v.kelompok, prodi: v.prodi }); if (!x.success) return;
      const dasar = location.origin + location.pathname, tk = x.data.token.map(t => ({ token: t.token, url: /^https?:/.test(t.tautan) ? t.tautan : dasar + t.tautan }));
      $('#hasil-tk', el).innerHTML = '<div class="kartu"><div class="kartu-h"><div><h3>' + tk.length + ' token — ' + esc(v.kelompok) + (v.prodi ? ' · ' + esc(v.prodi) : '') + '</h3><p>Simpan atau cetak sekarang.</p></div><div class="baris-aksi"><button class="btn btn-hantu btn-kecil" id="b-xl"><span class="ms">table_view</span>Excel</button><button class="btn btn-hantu btn-kecil" id="b-pr"><span class="ms">print</span>Cetak kartu QR</button><button class="btn btn-hantu btn-kecil" id="b-cp"><span class="ms">content_copy</span>Salin tautan</button></div></div><div class="kotak-token">' + tk.map(t => '<div class="tk">' + qrSvg(t.url, 140) + '<div class="mono">' + esc(t.token) + '</div></div>').join('') + '</div></div>';
      $('#b-xl', el).onclick = () => F.eksporExcel('Token ' + s.Judul, ['Token', 'Tautan', 'Kelompok', 'Prodi'], tk.map(t => [t.token, t.url, v.kelompok, v.prodi || '']));
      $('#b-cp', el).onclick = () => navigator.clipboard.writeText(tk.map(t => t.url).join('\n')).then(() => UI.toast('Tautan disalin.', 'sukses'), () => UI.toast('Gagal menyalin.', 'galat'));
      $('#b-pr', el).onclick = () => { const win = window.open('', '_blank'); if (!win) return UI.toast('Izinkan pop-up untuk mencetak.', 'galat'); win.document.write('<title>Kartu survei</title><style>body{font-family:Inter,Arial,sans-serif;margin:16px}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.c{border:1px dashed #999;border-radius:12px;padding:12px;text-align:center;font-size:11px;break-inside:avoid}b{display:block;font-size:12px;margin:4px 0}</style><div class="g">' + tk.map(t => '<div class="c"><b>' + esc(s.Judul) + '</b>' + qrSvg(t.url, 150) + '<div>Pindai untuk mengisi (sekali pakai)</div><code>' + esc(t.token) + '</code></div>').join('') + '</div><script>setTimeout(()=>print(),300)<\/script>'); win.document.close(); };
    };
    fu.onsubmit = async e => {
      e.preventDefault(); const v = F.bacaForm(fu, [{ k: 'kelompok', l: 'Kelompok', wajib: true }, { k: 'prodi' }, { k: 'daftar', l: 'Penerima', wajib: true }]); if (!v) return;
      const penerima = v.daftar.split(/\n/).map(b => b.split('|').map(x => x.trim())).filter(b => b[0] || b[1] || b[2]).map(b => ({ nama: b[0], hp: b[1] || '', email: b[2] || '' }));
      await UI.aksi($('button', fu), 'survei.undang', { id: s.ID, kelompok: v.kelompok, prodi: v.prodi, penerima });
    };
  }

  /* ================= Pengaduan ================= */
  const warnaAduan = { Baru: 'c-merah', Ditugaskan: 'c-amber', Ditangani: 'c-biru', Selesai: 'c-hijau', Ditutup: 'c-abu' };
  Hal.daftar('/pengaduan', {
    judul: 'Pengaduan', menu: 'pengaduan',
    async render(el) {
      el.innerHTML = kepala('Pengaduan Mutu', 'Pengaduan dari portal publik (boleh anonim) dengan SLA per kategori, eskalasi otomatis, dan tindak lanjut ke PPEPP.', '<a class="btn btn-hantu" href="#/aduan" target="_blank" rel="noopener"><span class="ms">open_in_new</span>Portal pengaduan</a><button class="btn btn-hantu" id="b-salin-portal"><span class="ms">link</span>Salin tautan portal</button>') + '<div class="grid g-8-4" style="margin-top:14px"><div class="kartu" id="t-adu"></div><div class="grid" id="rekap"></div></div>';
      $('#b-salin-portal', el).onclick = () => navigator.clipboard.writeText(location.origin + location.pathname + '#/aduan').then(() => UI.toast('Tautan portal disalin.', 'sukses'));
      if (peran() === 'PIM') { $('#t-adu', el).innerHTML = '<div class="banner banner-biru"><span class="ms">insights</span><div><b>Ringkasan untuk Pimpinan</b>Isi pengaduan bersifat rahasia; rekap agregat ada di samping dan di Laporan & Ekspor.</div></div>'; }
      else w.MH.crud($('#t-adu', el), {
        e: 'Pengaduan', cache: 'aduan', nama: 'Pengaduan', hapus: peran() === 'SA', klik: r => location.hash = '#/pengaduan/' + r.ID, kosong: 'Belum ada pengaduan.',
        olah: rr => rr.sort((a, b) => String(b.Waktu_Masuk).localeCompare(String(a.Waktu_Masuk))),
        filter: [{ k: 'Status', l: 'Status', opsi: Object.keys(warnaAduan) }, { k: 'Kategori', l: 'Kategori', opsi: KATEGORI_ADUAN }],
        kolom: [{ k: 'Kode_Tiket', l: 'Tiket', f: r => '<b class="mono">' + esc(r.Kode_Tiket) + '</b><div class="catatan">' + esc(Fmt.relatif(r.Waktu_Masuk)) + '</div>' }, { k: 'Judul', l: 'Pengaduan', f: r => '<b>' + esc(r.Judul) + '</b><div class="catatan">' + esc(r.Kategori) + ' · ' + esc(Master.unit(r.Kode_Unit)) + '</div>' }, { k: 'Prioritas', l: 'Prioritas', f: r => r.Prioritas ? chip(r.Prioritas, r.Prioritas === 'Tinggi' ? 'c-merah' : 'c-abu') : '' }, { k: 'SLA_Jatuh_Tempo', l: 'SLA', f: r => { if (['Selesai', 'Ditutup'].indexOf(r.Status) >= 0) return '<span class="catatan">—</span>'; const j = (w.MH.keDate(r.SLA_Jatuh_Tempo) - Date.now()) / 36e5; return isNaN(j) ? '—' : chip(j < 0 ? 'Lewat ' + Math.round(-j) + ' jam' : Math.round(j) + ' jam lagi', j < 0 ? 'c-merah' : j < 24 ? 'c-amber' : 'c-abu'); } }, { k: 'Status', l: 'Status', f: r => chip(r.Status, warnaAduan[r.Status]) + (r.Eskalasi === 'Ya' ? ' ' + chip('Eskalasi', 'c-merah') : '') }]
      });
      if (['SA', 'ADM', 'GKM', 'PJU', 'PIM'].indexOf(peran()) >= 0) muat('aduan-rekap', 'aduan.rekap', {}, d => {
        if (!d) return;
        $('#rekap', el).innerHTML = '<div class="kartu"><div class="ringkas-angka"><div><small>Total</small><b>' + d.total + '</b></div><div><small>Selesai</small><b>' + d.selesai + '</b></div><div><small>Dalam SLA</small><b>' + Fmt.persen(d.dalamSla) + '</b></div><div><small>Rata-rata</small><b>' + (d.rataJam === null ? '—' : Fmt.angka(d.rataJam, 0) + ' jam') + '</b></div><div><small>Eskalasi</small><b style="color:var(--merah)">' + d.eskalasi + '</b></div></div></div><div class="kartu"><div class="kartu-h"><h3>Per kategori</h3></div><div id="g-kat"></div></div>';
        const k = Object.keys(d.perKategori);
        G.batang($('#g-kat', el), { label: k, seri: [{ nama: 'Pengaduan', data: k.map(x => d.perKategori[x]) }], tinggi: 200 });
      });
    }
  });

  Hal.daftar('/pengaduan/:id', {
    judul: 'Detail Pengaduan', menu: 'pengaduan', roles: ['SA', 'ADM', 'AUD', 'GKM', 'PJU'],
    async render(el, p) {
      el.innerHTML = UI.kerangka(2, 160);
      const r = await API.call('aduan.detail', { id: p.id });
      if (!r.success) { el.innerHTML = UI.galat(r); return; }
      const a = r.data.pengaduan, ulang = () => w.MH.Router.jalan(), pic = a.PIC && String(a.PIC).toLowerCase() === Sesi.me.email;
      const bolehProses = lpm() || pic || ['PJU', 'GKM'].indexOf(peran()) >= 0;
      const tombol = [];
      if (lpm() && ['Baru', 'Ditugaskan'].indexOf(a.Status) >= 0) tombol.push('<button class="btn btn-utama" id="b-pilah"><span class="ms">alt_route</span>Pilah & tugaskan</button>');
      if (bolehProses && ['Baru', 'Ditugaskan'].indexOf(a.Status) >= 0) tombol.push('<button class="btn btn-hantu" data-ak="tangani"><span class="ms">engineering</span>Tangani</button>');
      if (bolehProses && ['Ditugaskan', 'Ditangani'].indexOf(a.Status) >= 0) tombol.push('<button class="btn btn-teal" data-ak="selesai"><span class="ms">task_alt</span>Selesaikan</button>');
      if (lpm() && a.Status === 'Selesai') tombol.push('<button class="btn btn-hantu" data-ak="tutup"><span class="ms">lock</span>Tutup tiket</button>');
      if (bolehProses && ['Selesai', 'Ditutup', 'Ditangani'].indexOf(a.Status) >= 0) tombol.push('<button class="btn btn-hantu" data-ak="ppepp"><span class="ms">sync_alt</span>Jadikan PPEPP</button>');
      el.innerHTML = `<div class="remah"><a href="#/pengaduan">Pengaduan</a> / ${esc(a.Kode_Tiket)}</div>
        <div class="kepala-hal" style="margin-top:6px"><div><h1>${esc(a.Judul)}</h1><p><span class="mono">${esc(a.Kode_Tiket)}</span> · ${chip(a.Status, warnaAduan[a.Status])} ${a.Eskalasi === 'Ya' ? chip('Dieskalasi', 'c-merah') : ''} · ${esc(a.Kategori)} · masuk ${esc(Fmt.waktu(a.Waktu_Masuk))}</p></div><div class="baris-aksi">${tombol.join('')}</div></div>
        <div class="grid g-8-4" style="margin-top:14px"><div class="grid"><div class="kartu"><div class="kartu-h"><h3>Isi pengaduan</h3></div><div style="white-space:pre-wrap">${esc(a.Isi)}</div>${a.Lampiran ? '<button class="btn btn-hantu btn-kecil" style="margin-top:12px" data-buka="' + esc(a.Lampiran) + '"><span class="ms">attach_file</span>Lampiran</button>' : ''}</div>
          ${a.Ringkasan_Penyelesaian ? '<div class="kartu"><div class="kartu-h"><h3>Penyelesaian</h3></div><div style="white-space:pre-wrap">' + esc(a.Ringkasan_Penyelesaian) + '</div></div>' : ''}</div>
          <div class="grid"><div class="kartu"><div class="daftar"><div class="item lunak"><span class="ms">apartment</span><div class="isi"><b>${esc(r.data.unit || 'Belum dipilah')}</b><small>Unit terkait</small></div></div><div class="item lunak"><span class="ms">person</span><div class="isi"><b>${esc(a.PIC ? Master.orang(a.PIC) : '—')}</b><small>PIC</small></div></div><div class="item lunak"><span class="ms">timer</span><div class="isi"><b>${esc(Fmt.waktu(a.SLA_Jatuh_Tempo))}</b><small>Batas SLA</small></div></div><div class="item lunak"><span class="ms">badge</span><div class="isi"><b>${a.Anonim === 'Ya' ? 'Anonim' : esc(a.Nama_Pelapor || '—')}</b><small>${a.Kontak_Opsional ? esc(a.Kontak_Opsional) : 'Pelapor'}</small></div></div></div></div>
          <div class="kartu"><div class="kartu-h"><h3>Riwayat</h3></div>${r.data.log.length ? '<div class="timeline">' + r.data.log.slice().reverse().map(l => '<div class="t"><span class="titik"></span><div><b>' + esc(l.Aksi) + '</b><br><small>' + esc(Fmt.waktu(l.Waktu)) + ' · ' + esc(l.Oleh === 'portal' ? 'Portal' : Master.orang(l.Oleh)) + '</small>' + (l.Catatan ? '<div class="catatan">' + esc(l.Catatan) + '</div>' : '') + '</div></div>').join('') + '</div>' : UI.kosong('Belum ada riwayat.', 'history')}</div></div></div>`;
      const bp = $('#b-pilah', el); if (bp) bp.onclick = () => F.formModal({ judul: 'Pilah & tugaskan', fields: [{ k: 'Kategori', l: 'Kategori', t: 'pilih', opsi: KATEGORI_ADUAN, wajib: true }, { k: 'Prioritas', l: 'Prioritas', t: 'pilih', opsi: ['Normal', 'Tinggi', 'Rendah'], wajib: true }, { k: 'Kode_Unit', l: 'Unit penanggung jawab', t: 'pilih', opsi: () => Master.opsiUnit(), wajib: true }, { k: 'PIC', l: 'PIC (kosong = PJ unit)', t: 'pilih', opsi: () => Master.opsiPengguna(null, 'email') }, { k: 'catatan', l: 'Catatan', t: 'area', baris: 2 }], nilai: { Kategori: a.Kategori, Prioritas: a.Prioritas || 'Normal', Kode_Unit: a.Kode_Unit }, simpan: async v => { const x = await API.call('aduan.pilah', Object.assign({ id: a.ID }, v)); x.success ? (UI.toast(x.message, 'sukses'), ulang()) : UI.toast(x.message, 'galat'); return x; } });
      el.addEventListener('click', async e => {
        const b = e.target.closest('[data-buka]'); if (b) return F.bukaBerkas(b.dataset.buka, b);
        const t = e.target.closest('[data-ak]'); if (!t) return;
        const ak = t.dataset.ak;
        if (ak === 'selesai') return F.formModal({ judul: 'Selesaikan pengaduan', sub: 'Ringkasan ini dapat dilihat pelapor lewat cek status tiket.', fields: [{ k: 'ringkasan', l: 'Ringkasan penyelesaian (min. 10 karakter)', t: 'area', wajib: true }], simpan: async v => { const x = await API.call('aduan.proses', { id: a.ID, aksi: 'selesai', ringkasan: v.ringkasan }); x.success ? (UI.toast(x.message, 'sukses'), ulang()) : UI.toast(x.message, 'galat'); return x; } });
        UI.aksi(t, 'aduan.proses', { id: a.ID, aksi: ak }, { lalu: ulang });
      });
    }
  });
})(window);
