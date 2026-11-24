/* =====================================================================
 * hal-ami.js — LM3 Audit Mutu Internal (siklus, penugasan, instrumen,
 * formulir auditor, laporan), PKPA (daftar & alur), LM4 PPEPP (kanban)
 * dan Rapat Tinjauan Manajemen (RTM).
 * ===================================================================== */
(function (w) {
  'use strict';
  const { $, $$, esc, Fmt, API, Store, Sesi, UI, muat, chip, chipSumber, Master, State, G, F, tabel } = w.MH;
  const Hal = w.MH.Hal, kepala = w.MH.kepala;
  const LPM = ['SA', 'ADM'];
  const peran = () => Sesi.me.role, lpm = () => LPM.indexOf(peran()) >= 0;
  const STATUS_TEMUAN = ['Sesuai', 'Observasi', 'KTS Minor', 'KTS Mayor', 'Pencapaian Unggul'];
  const warnaTemuan = { 'Sesuai': '#0E9F9A', 'Observasi': '#4B65D6', 'KTS Minor': '#F5A623', 'KTS Mayor': '#DC2626', 'Pencapaian Unggul': '#22C7D6' };
  const chipTemuan = s => chip(s, { 'Sesuai': 'c-teal', 'Observasi': 'c-biru', 'KTS Minor': 'c-amber', 'KTS Mayor': 'c-merah', 'Pencapaian Unggul': 'c-hijau' }[s] || 'c-abu');
  const sisa = t => { const s = Fmt.sisaHari(t); return s === null ? '' : chip(s < 0 ? 'Terlambat ' + (-s) + ' hr' : s === 0 ? 'Hari ini' : 'H-' + s, s < 0 ? 'c-merah' : s <= 7 ? 'c-amber' : 'c-abu'); };

  /* ================= AMI ================= */
  Hal.daftar('/ami', {
    judul: 'Audit Mutu Internal', menu: 'ami', roles: ['SA', 'ADM', 'AUD', 'PJU', 'PIM'],
    async render(el) {
      el.innerHTML = kepala('Audit Mutu Internal', 'Siklus AMI, penugasan auditor (dengan cek independensi), instrumen audit, dan laporan temuan.', lpm() ? '<button class="btn btn-hantu" id="b-siklus"><span class="ms">add</span>Siklus baru</button><button class="btn btn-utama" id="b-tugas"><span class="ms">assignment_ind</span>Tugaskan auditor</button>' : '') + '<div class="kartu" style="margin-top:14px" id="pil-siklus">' + UI.kerangka(1, 40) + '</div><div id="isi-ami" style="margin-top:14px"></div>';
      const fSiklus = [{ k: 'Tahun_Akademik', l: 'Tahun akademik', t: 'pilih', opsi: () => Master.opsiTA(), kosong: false, wajib: true }, { k: 'Nama', l: 'Nama siklus', wajib: true, ph: 'AMI Siklus Ganjil 2026/2027' }, { k: 'Tgl_Mulai', l: 'Mulai', t: 'tanggal', wajib: true }, { k: 'Tgl_Selesai', l: 'Selesai', t: 'tanggal', wajib: true }, { k: 'Status', l: 'Status', t: 'pilih', opsi: ['Perencanaan', 'Berjalan', 'Selesai'], kosong: false }, { k: 'Standar_Diaudit', l: 'Standar yang diaudit', t: 'multi', opsi: () => Master.opsiStandar(), ukuran: 6 }];
      const simpanSiklus = r => F.formModal({ judul: r ? 'Ubah siklus' : 'Siklus AMI baru', fields: fSiklus, nilai: r || { Tahun_Akademik: State.ta, Status: 'Perencanaan' }, simpan: async v => { const res = await API.call('data.simpan', { e: 'AMI_Siklus', row: Object.assign(r ? { ID_Siklus: r.ID_Siklus } : {}, v) }); if (res.success) { sessionStorage.setItem('mh:siklus', res.data.ID_Siklus); w.MH.Router.jalan(); } else UI.toast(res.message, 'galat'); return res; } });
      const bS = $('#b-siklus', el); if (bS) bS.onclick = () => simpanSiklus(null);
      let siklus = [], pilih = sessionStorage.getItem('mh:siklus');
      const tugaskan = () => F.formModal({
        judul: 'Tugaskan auditor', sub: 'Auditor tidak boleh mengaudit unit tempatnya bertugas (cek independensi otomatis).', lebar: true,
        fields: [{ k: 'ID_Siklus', l: 'Siklus', t: 'pilih', opsi: siklus.map(s => [s.ID_Siklus, s.Nama]), wajib: true }, { k: 'Kode_Unit', l: 'Unit teraudit', t: 'pilih', opsi: () => Master.opsiUnit(), wajib: true }, { k: 'ID_Auditor_Ketua', l: 'Auditor ketua', t: 'pilih', opsi: () => Master.opsiPengguna(['AUD']), wajib: true }, { k: 'Auditor_Anggota', l: 'Auditor anggota', t: 'multi', opsi: () => Master.opsiPengguna(['AUD']), ukuran: 4 }, { k: 'Tgl_Audit', l: 'Tanggal audit', t: 'tanggal', wajib: true }, { k: 'Mode', l: 'Mode', t: 'pilih', opsi: ['Lapangan', 'Daring', 'Desk Evaluation'], wajib: true }, { k: 'Lokasi', l: 'Lokasi / tautan rapat', penuh: true }, { k: 'terbitkan', l: 'Surat tugas', t: 'saklar', teksSaklar: 'Terbitkan surat tugas ber-QR sekarang', bawaan: 'Ya' }],
        nilai: { ID_Siklus: pilih },
        simpan: async v => { const t = v.terbitkan === 'Ya'; delete v.terbitkan; const r = await API.call('ami.tugaskan', { row: v, terbitkan: t }); if (r.success) { UI.toast(r.message, 'sukses'); w.MH.Router.jalan(); } else UI.toast(r.message, 'galat'); return r; }
      });
      const bT = $('#b-tugas', el); if (bT) bT.onclick = () => siklus.length ? tugaskan() : UI.toast('Buat siklus AMI terlebih dahulu.', 'galat');
      await muat('ami-siklus:' + State.ta, 'data.list', { e: 'AMI_Siklus' }, rows => {
        if (!rows) return;
        siklus = rows.sort((a, b) => String(b.Tgl_Mulai).localeCompare(String(a.Tgl_Mulai)));
        if (!siklus.some(s => s.ID_Siklus === pilih)) pilih = (siklus.find(s => s.Tahun_Akademik === State.ta) || siklus[0] || {}).ID_Siklus;
        const s = siklus.find(x => x.ID_Siklus === pilih);
        $('#pil-siklus', el).innerHTML = siklus.length ? '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><div class="isian" style="min-width:260px;margin:0"><label>Siklus AMI</label><select id="sel-siklus">' + siklus.map(x => '<option value="' + esc(x.ID_Siklus) + '"' + (x.ID_Siklus === pilih ? ' selected' : '') + '>' + esc(x.Nama) + ' (' + esc(x.Tahun_Akademik) + ')</option>').join('') + '</select></div>' + (s ? '<div class="ringkas-angka"><div><small>Periode</small><b style="font-size:15px">' + Fmt.tgl(s.Tgl_Mulai) + ' – ' + Fmt.tgl(s.Tgl_Selesai) + '</b></div><div><small>Status</small><div>' + chip(s.Status) + '</div></div><div><small>Standar</small><b style="font-size:15px">' + String(s.Standar_Diaudit || '').split(/,\s*/).filter(Boolean).length + '</b></div></div>' + (lpm() ? '<button class="btn btn-hantu btn-kecil" id="ubah-siklus"><span class="ms">edit</span>Ubah</button>' : '') : '') + '</div>' : UI.kosong('Belum ada siklus AMI.' + (lpm() ? ' Klik "Siklus baru".' : ''), 'fact_check');
        const sel = $('#sel-siklus', el); if (sel) sel.onchange = () => { sessionStorage.setItem('mh:siklus', sel.value); w.MH.Router.jalan(); };
        const us = $('#ubah-siklus', el); if (us) us.onclick = () => simpanSiklus(s);
        if (s && !$('#isi-ami', el).dataset.siap) { $('#isi-ami', el).dataset.siap = 1; tabAmi($('#isi-ami', el), s, siklus); }
      }, { maxAge: 15000 });
    }
  });

  function tabAmi(el, s, siklus) {
    w.MH.tabs(el, [
      { k: 'penugasan', l: 'Penugasan', render: e => { e.className = 'kartu'; w.MH.crud(e, { e: 'AMI_Penugasan', q: { f: { ID_Siklus: s.ID_Siklus } }, tulis: false, hapus: peran() === 'SA', nama: 'Penugasan AMI', kosong: 'Belum ada penugasan pada siklus ini.', klik: r => { if (peran() !== 'PIM') location.hash = '#/ami/isi/' + r.ID; }, kolom: [{ k: 'Kode_Unit', l: 'Unit teraudit', f: r => '<b>' + esc(Master.unit(r.Kode_Unit)) + '</b>' }, { k: 'ID_Auditor_Ketua', l: 'Ketua', f: r => esc(Master.orang(r.ID_Auditor_Ketua)) }, { k: 'Auditor_Anggota', l: 'Anggota', f: r => esc(String(r.Auditor_Anggota || '').split(/,\s*/).filter(Boolean).map(x => Master.orang(x)).join(', ') || '—') }, { k: 'Tgl_Audit', l: 'Tanggal', f: r => Fmt.tgl(r.Tgl_Audit) }, { k: 'Mode', l: 'Mode', f: r => chip(r.Mode, 'c-teal') }, { k: 'Nomor_Surat_Tugas', l: 'Surat tugas', f: r => r.ID_File_Surat_Tugas ? '<button class="btn btn-hantu btn-kecil" data-buka="' + esc(r.ID_File_Surat_Tugas) + '"><span class="ms">picture_as_pdf</span>' + esc(r.Nomor_Surat_Tugas || 'Buka') + '</button>' : '—' }, { k: 'Status', l: 'Status', f: r => chip(r.Status) }], aksiBaris: r => peran() === 'PIM' ? '' : '<a class="btn btn-utama btn-kecil" href="#/ami/isi/' + esc(r.ID) + '">' + (peran() === 'AUD' && r.Status !== 'Selesai' ? 'Isi temuan' : 'Lihat') + '</a>' }); e.addEventListener('click', ev => { const b = ev.target.closest('[data-buka]'); if (b) F.bukaBerkas(b.dataset.buka, b); }); } },
      peran() === 'PIM' ? null : { k: 'instrumen', l: 'Instrumen', render: e => { e.className = 'kartu'; const c = w.MH.crud(e, { e: 'AMI_Instrumen', kunci: 'ID_Item', q: { f: { ID_Siklus: s.ID_Siklus } }, tulis: lpm(), hapus: lpm(), nama: 'Instrumen AMI', judul: 'Butir instrumen', lebar: true, bawaanBaru: { ID_Siklus: s.ID_Siklus }, olah: rr => rr.sort((a, b) => (Number(a.Urutan) || 0) - (Number(b.Urutan) || 0)), aksiAtas: lpm() ? '<button class="btn btn-hantu btn-kecil" data-oto><span class="ms">auto_awesome</span>Buat dari standar</button><button class="btn btn-hantu btn-kecil" data-salin><span class="ms">content_copy</span>Salin dari siklus lain</button>' : '', kolom: [{ k: 'Urutan', l: '#', num: true }, { k: 'ID_Standar', l: 'Standar', f: r => esc(Master.standar(r.ID_Standar)) }, { k: 'Butir_Audit', l: 'Butir audit', f: r => '<b>' + esc(r.Butir_Audit) + '</b>' }, { k: 'Metode_Verifikasi', l: 'Metode' }, { k: 'Bukti_Dibutuhkan', l: 'Bukti' }], fields: [{ k: 'ID_Standar', l: 'Standar', t: 'pilih', opsi: () => Master.opsiStandar(), wajib: true }, { k: 'Urutan', l: 'Urutan', t: 'angka' }, { k: 'Butir_Audit', l: 'Butir audit', t: 'area', wajib: true }, { k: 'Metode_Verifikasi', l: 'Metode verifikasi', penuh: true }, { k: 'Bukti_Dibutuhkan', l: 'Bukti yang dibutuhkan', penuh: true }], sebelumSimpan: v => Object.assign({ ID_Siklus: s.ID_Siklus }, v) });
        e.addEventListener('click', async ev => {
          const o = ev.target.closest('[data-oto]'), sl = ev.target.closest('[data-salin]');
          if (o) await UI.aksi(o, 'ami.instrumenOtomatis', { idSiklus: s.ID_Siklus }, { lalu: () => c.segarkan() });
          if (sl) F.formModal({ judul: 'Salin instrumen', fields: [{ k: 'dari', l: 'Dari siklus', t: 'pilih', opsi: siklus.filter(x => x.ID_Siklus !== s.ID_Siklus).map(x => [x.ID_Siklus, x.Nama]), wajib: true }], simpan: async v => { const r = await API.call('ami.instrumenSalin', { dari: v.dari, ke: s.ID_Siklus }); if (r.success) { UI.toast(r.message, 'sukses'); c.segarkan(); } else UI.toast(r.message, 'galat'); return r; } });
        }); } },
      { k: 'laporan', l: 'Laporan', render: e => lapAmi(e, s) }
    ].filter(Boolean), 'ami');
  }

  async function lapAmi(el, s) {
    el.innerHTML = UI.kerangka(2, 200);
    const r = await API.q('ami.laporan', { idSiklus: s.ID_Siklus });
    if (!r.success) { el.innerHTML = UI.galat(r); return; }
    const d = r.data;
    el.innerHTML = '<div class="grid g-4-8"><div class="kartu"><div class="kartu-h"><h3>Sebaran temuan</h3></div><div id="g-t"></div></div><div class="kartu"><div class="kartu-h"><div><h3>Temuan per unit</h3><p>Jumlah butir per status temuan (final)</p></div></div><div id="t-u"></div></div></div><div class="kartu" style="margin-top:16px"><div class="kartu-h"><h3>PKPA dari siklus ini</h3></div><div id="t-p"></div></div>';
    G.donut($('#g-t', el), { item: STATUS_TEMUAN.map(k => ({ l: k, v: d.total[k] || 0, w: warnaTemuan[k] })), sub: 'Butir' });
    tabel($('#t-u', el), { rows: d.perUnit, nama: 'Rekap temuan ' + s.Nama, per: 10, kolom: [{ k: 'unit', l: 'Unit', f: x => '<b>' + esc(x.unit) + '</b>' }].concat(STATUS_TEMUAN.map(k => ({ k, l: k, num: true, f: x => x[k] ? '<b>' + x[k] + '</b>' : '<span class="catatan">0</span>' }))).concat([{ k: 'status', l: 'Status', f: x => chip(x.status) }, { k: '_pdf', l: '', ekspor: false, f: x => ['SA', 'ADM', 'AUD', 'PJU'].indexOf(peran()) >= 0 ? '<button class="btn btn-hantu btn-kecil" data-pdf="' + esc(x.kode) + '"><span class="ms">picture_as_pdf</span>Laporan PDF</button>' : '' }]) });
    tabel($('#t-p', el), { rows: d.pkpa, nama: 'PKPA ' + s.Nama, per: 10, klik: x => location.hash = '#/pkpa/' + x.ID_PKPA, kolom: [{ k: 'ID_PKPA', l: 'ID', f: x => '<b class="mono">' + esc(x.ID_PKPA) + '</b>' }, { k: 'Kode_Unit', l: 'Unit', f: x => esc(Master.unit(x.Kode_Unit)) }, { k: 'Kategori', l: 'Kategori', f: x => chipTemuan(x.Kategori) }, { k: 'Uraian_Temuan', l: 'Temuan', f: x => esc(String(x.Uraian_Temuan).slice(0, 110)) }, { k: 'Tenggat', l: 'Tenggat', f: x => Fmt.tgl(x.Tenggat) }, { k: 'Status', l: 'Status', f: x => chip(x.Status) }] });
    el.addEventListener('click', async ev => { const b = ev.target.closest('[data-pdf]'); if (!b) return; const res = await UI.aksi(b, 'ami.laporanPdf', { idSiklus: s.ID_Siklus, unit: b.dataset.pdf }, { diam: true }); if (res.success && res.data && (res.data.idFile || res.data.url)) F.bukaBerkas(res.data.idFile || res.data.url, b); });
  }

  /* ---------- Formulir auditor ---------- */
  Hal.daftar('/ami/isi/:id', {
    judul: 'Formulir Audit', menu: 'ami', roles: ['SA', 'ADM', 'AUD', 'PJU'],
    async render(el, p) {
      el.innerHTML = UI.kerangka(3, 160);
      const r = await API.call('ami.formulir', { id: p.id });
      if (!r.success) { el.innerHTML = UI.galat(r); return; }
      const d = r.data, kDraf = 'mh:draf:ami:' + p.id;
      let draf = {}; try { draf = JSON.parse(localStorage.getItem(kDraf) || '{}'); } catch (e) { }
      const nilai = it => Object.assign({}, d.hasil[it.ID_Item] || {}, d.bolehIsi ? draf[it.ID_Item] || {} : {});
      const terisi = () => d.items.filter(it => nilai(it).Status_Temuan).length;
      const butir = (it, i) => {
        const v = nilai(it), h = d.hasil[it.ID_Item] || {};
        return '<div class="butir" data-item="' + esc(it.ID_Item) + '"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><span class="chip c-biru">' + esc(it.Standar || Master.standar(it.ID_Standar)) + '</span><h4 style="margin:8px 0 2px">' + (i + 1) + '. ' + esc(it.Butir_Audit) + '</h4><div class="catatan">Metode: ' + esc(it.Metode_Verifikasi || '—') + ' · Bukti: ' + esc(it.Bukti_Dibutuhkan || '—') + '</div></div>' + (v.Status_Temuan && !d.bolehIsi ? chipTemuan(v.Status_Temuan) : '') + '</div>' +
          (d.bolehIsi ? '<div class="pilih-status" role="radiogroup">' + STATUS_TEMUAN.map(s => '<label><input type="radio" name="st-' + esc(it.ID_Item) + '" value="' + s + '"' + (v.Status_Temuan === s ? ' checked' : '') + '>' + s + '</label>').join('') + '</div><div class="form-grid"><div class="isian penuh"><label>Uraian temuan / deskripsi</label><textarea data-f="Uraian" rows="3" placeholder="Wajib untuk KTS: kondisi, kriteria, akibat, rekomendasi">' + esc(v.Uraian || '') + '</textarea></div><div class="isian"><label>Referensi bukti</label><input data-f="Ref_Bukti" value="' + esc(v.Ref_Bukti || '') + '"></div>' + F.formHtml([{ k: 'bukti-' + it.ID_Item, l: 'Lampiran bukti', t: 'berkas', folder: 'AMI' }], { ['bukti-' + it.ID_Item]: v.ID_File_Bukti || '' }).replace('isian penuh', 'isian') + '</div>'
            : (v.Uraian ? '<p style="margin:0;white-space:pre-wrap">' + esc(v.Uraian) + '</p>' : '<p class="catatan" style="margin:0">' + (v.Status_Temuan ? 'Tanpa uraian.' : 'Belum diisi.') + '</p>') + (v.Ref_Bukti ? '<div class="catatan">Bukti: ' + esc(v.Ref_Bukti) + '</div>' : '') + (v.ID_File_Bukti ? '<button class="btn btn-hantu btn-kecil" data-buka="' + esc(v.ID_File_Bukti) + '" style="justify-self:start"><span class="ms">attach_file</span>Lampiran</button>' : '') + (d.final && peran() === 'SA' && h.ID ? '<button class="btn btn-hantu btn-kecil" data-koreksi="' + esc(it.ID_Item) + '" style="justify-self:start"><span class="ms">edit_note</span>Koreksi (Super Admin)</button>' : '')) + '</div>';
      };
      el.innerHTML = `<div class="remah"><a href="#/ami">Audit Mutu Internal</a> / Formulir</div>
        <div class="kartu hero" style="margin-top:8px"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><div class="label-atas">${esc(d.siklus.Nama)}</div><h2 style="margin:6px 0;font-size:24px">${esc(d.unit)}</h2><small>${esc(Fmt.tgl(d.penugasan.Tgl_Audit, true))} · ${esc(d.penugasan.Mode)}${d.penugasan.Lokasi ? ' · ' + esc(d.penugasan.Lokasi) : ''} · Auditor: ${esc(d.auditor.join(', '))}</small></div><div style="text-align:right"><span class="pil-kaca">${d.final ? '<span class="ms">lock</span>Final terkunci' : esc(d.penugasan.Status)}</span><div style="margin-top:10px;font-size:13px"><b id="n-isi">${terisi()}</b> / ${d.items.length} butir terisi</div></div></div><div style="margin-top:10px">${G.progres(d.items.length ? terisi() / d.items.length * 100 : 0)}</div></div>
        ${d.bolehIsi ? '<div class="banner banner-biru" style="margin-top:14px"><span class="ms">info</span><div><b>Draf tersimpan otomatis di perangkat ini.</b>Klik <i>Simpan draf</i> untuk menyimpan ke server. <i>Kirim final</i> mengunci hasil dan membuat PKPA untuk setiap KTS.</div></div>' : ''}
        <div class="grid" style="margin-top:14px" id="daftar-butir">${d.items.length ? d.items.map(butir).join('') : UI.kosong('Instrumen siklus ini belum disusun Admin LPM.', 'checklist')}</div>
        ${d.bolehIsi && d.items.length ? '<div class="kartu" style="margin-top:14px;position:sticky;bottom:12px;z-index:5"><div class="baris-aksi" style="justify-content:flex-end"><button class="btn btn-hantu" id="b-draf"><span class="ms">save</span>Simpan draf</button><button class="btn btn-utama" id="b-final"><span class="ms">send</span>Kirim final</button></div></div>' : ''}
        ${(d.pkpa || []).length ? '<div class="kartu" style="margin-top:14px"><div class="kartu-h"><h3>PKPA dari audit ini</h3></div><div class="daftar">' + d.pkpa.map(k => '<a class="item" href="#/pkpa/' + esc(k.ID_PKPA) + '" style="color:inherit;text-decoration:none"><div class="isi"><b class="mono">' + esc(k.ID_PKPA) + '</b><small>' + esc(String(k.Uraian_Temuan).slice(0, 120)) + '</small></div>' + chipTemuan(k.Kategori) + chip(k.Status) + '</a>').join('') + '</div></div>' : ''}`;
      F.pasangUnggah(el);
      const kumpul = () => d.items.map(it => { const b = $('[data-item="' + it.ID_Item + '"]', el); const st = $('input[type=radio]:checked', b); return { ID_Item: it.ID_Item, Status_Temuan: st ? st.value : '', Uraian: $('[data-f=Uraian]', b).value, Ref_Bukti: $('[data-f=Ref_Bukti]', b).value, ID_File_Bukti: ($('input[type=hidden]', b) || {}).value || '' }; });
      if (d.bolehIsi) {
        $('#daftar-butir', el).addEventListener('input', () => { const o = {}; kumpul().forEach(x => o[x.ID_Item] = x); try { localStorage.setItem(kDraf, JSON.stringify(o)); } catch (e) { } $('#n-isi', el).textContent = kumpul().filter(x => x.Status_Temuan).length; });
        $('#daftar-butir', el).addEventListener('change', () => $('#daftar-butir', el).dispatchEvent(new Event('input')));
        const simpan = async btn => { const res = await UI.aksi(btn, 'ami.simpanHasil', { id: p.id, items: kumpul() }); if (res.success) localStorage.removeItem(kDraf); return res; };
        $('#b-draf', el).onclick = e => simpan(e.currentTarget);
        $('#b-final', el).onclick = async e => {
          const btn = e.currentTarget, x = kumpul(), kosong = x.filter(i => !i.Status_Temuan).length, ktsTanpa = x.filter(i => /^KTS/.test(i.Status_Temuan) && i.Uraian.trim().length < 10).length;
          if (kosong) return UI.toast(kosong + ' butir belum diberi status temuan.', 'galat');
          if (ktsTanpa) return UI.toast(ktsTanpa + ' temuan KTS belum memiliki uraian yang memadai.', 'galat');
          const k = await UI.konfirmasi('Kirim hasil final', 'Hasil dikunci (koreksi hanya oleh Super Admin dengan alasan). PKPA dibuat otomatis untuk ' + x.filter(i => /^KTS/.test(i.Status_Temuan)).length + ' temuan KTS dan PJ unit diberi tahu.', { teksOk: 'Kirim final' });
          if (!k.ok) return;
          const s1 = await simpan(btn); if (!s1.success) return;
          await UI.aksi(btn, 'ami.final', { id: p.id }, { lalu: () => w.MH.Router.jalan() });
        };
      }
      el.addEventListener('click', async e => {
        const b = e.target.closest('[data-buka]'); if (b) return F.bukaBerkas(b.dataset.buka, b);
        const kr = e.target.closest('[data-koreksi]'); if (!kr) return;
        const h = d.hasil[kr.dataset.koreksi];
        F.formModal({ judul: 'Koreksi hasil final', sub: 'Perubahan dicatat di audit log beserta alasan.', fields: [{ k: 'Status_Temuan', l: 'Status temuan', t: 'pilih', opsi: STATUS_TEMUAN, kosong: false }, { k: 'Uraian', l: 'Uraian', t: 'area' }, { k: 'alasan', l: 'Alasan koreksi (min. 10 karakter)', t: 'area', wajib: true, baris: 2 }], nilai: h, simpan: async v => { const r2 = await API.call('ami.koreksi', { id: h.ID, alasan: v.alasan, Status_Temuan: v.Status_Temuan, Uraian: v.Uraian }); if (r2.success) { UI.toast(r2.message, 'sukses'); w.MH.Router.jalan(); } else UI.toast(r2.message, 'galat'); return r2; } });
      });
    }
  });

  /* ================= PKPA ================= */
  const LABEL_AKSI = { 'pkpa.rencana': 'Rencana tindakan diajukan', 'pkpa.tinjauRencana': 'Rencana ditinjau auditor', 'pkpa.laksana': 'Bukti pelaksanaan dikirim', 'pkpa.verifikasi': 'Verifikasi efektivitas', 'ami.final': 'Hasil audit dikirim final', 'ami.koreksi': 'Koreksi hasil audit', 'TAMBAH': 'Dibuat', 'UBAH': 'Diperbarui' };
  const ALUR_PKPA = ['Terbuka', 'Rencana Diajukan', 'Rencana Disetujui', 'Dilaksanakan', 'Ditutup'];
  Hal.daftar('/pkpa', {
    judul: 'PKPA', menu: 'pkpa', roles: ['SA', 'ADM', 'AUD', 'PJU', 'GKM', 'PIM'],
    async render(el) {
      el.innerHTML = kepala('PKPA', 'Permintaan Tindakan Koreksi & Pencegahan dari temuan AMI: rencana → persetujuan auditor → pelaksanaan → verifikasi efektivitas.') + '<div class="grid g4" style="margin-top:14px" id="k-pkpa">' + UI.kerangka(4, 90) + '</div><div class="kartu" style="margin-top:16px" id="t-pkpa"></div>';
      if (peran() === 'PIM') { $('#k-pkpa', el).innerHTML = ''; $('#t-pkpa', el).innerHTML = '<div class="banner banner-biru"><span class="ms">insights</span><div><b>Ringkasan untuk Pimpinan</b>Status PKPA agregat tersedia di Dashboard dan Laporan & Ekspor → Status PKPA.</div></div><a class="btn btn-utama" style="margin-top:12px" href="#/laporan">Buka laporan</a>'; return; }
      w.MH.crud($('#t-pkpa', el), {
        e: 'PKPA', kunci: 'ID_PKPA', cache: 'pkpa', nama: 'PKPA', kosong: 'Tidak ada PKPA.', klik: r => location.hash = '#/pkpa/' + r.ID_PKPA, hapus: peran() === 'SA',
        olah: rr => rr.sort((a, b) => (a.Status === 'Ditutup') - (b.Status === 'Ditutup') || String(a.Tenggat).localeCompare(String(b.Tenggat))),
        setelahMuat: rr => {
          const n = s => rr.filter(r => s.indexOf(r.Status) >= 0).length, telat = rr.filter(r => r.Status !== 'Ditutup' && Fmt.sisaHari(r.Tenggat) < 0).length;
          $('#k-pkpa', el).innerHTML = [['Terbuka', n(['Terbuka', 'Ditolak']), 'assignment_late', 'amber'], ['Menunggu tinjauan', n(['Rencana Diajukan']), 'rate_review', ''], ['Dalam pelaksanaan', n(['Rencana Disetujui', 'Dilaksanakan']), 'engineering', 'teal'], ['Melewati tenggat', telat, 'timer_off', 'merah']].map(x => '<div class="kartu kpi"><div class="atas"><span class="ikon ' + x[3] + '"><span class="ms">' + x[2] + '</span></span></div><div class="judul">' + x[0] + '</div><div class="nilai">' + x[1] + '</div></div>').join('');
          w.MH.setJumlah({ pkpa: n(['Terbuka', 'Ditolak', 'Rencana Diajukan', 'Rencana Disetujui', 'Dilaksanakan']) });
        },
        filter: [{ k: 'Status', l: 'Status', opsi: ['Terbuka', 'Rencana Diajukan', 'Rencana Disetujui', 'Dilaksanakan', 'Ditolak', 'Ditutup'] }, { k: 'Kategori', l: 'Kategori', opsi: ['KTS Minor', 'KTS Mayor', 'Observasi'] }, { k: 'Kode_Unit', l: 'Unit', opsi: () => Master.opsiUnit() }],
        kolom: [{ k: 'ID_PKPA', l: 'ID', f: r => '<b class="mono" style="color:var(--biru)">' + esc(r.ID_PKPA) + '</b>' }, { k: 'Kode_Unit', l: 'Unit', f: r => esc(Master.unit(r.Kode_Unit)) }, { k: 'Kategori', l: 'Kategori', f: r => chipTemuan(r.Kategori) }, { k: 'Uraian_Temuan', l: 'Temuan', f: r => esc(String(r.Uraian_Temuan).slice(0, 100)) }, { k: 'PIC', l: 'PIC', f: r => esc(Master.orang(r.PIC)) }, { k: 'Tenggat', l: 'Tenggat', f: r => Fmt.tgl(r.Tenggat) + ' ' + (r.Status !== 'Ditutup' ? sisa(r.Tenggat) : '') }, { k: 'Status', l: 'Status', f: r => chip(r.Status) + (r.Eskalasi === 'Ya' ? ' ' + chip('Eskalasi', 'c-merah') : '') }]
      });
    }
  });

  Hal.daftar('/pkpa/:id', {
    judul: 'Detail PKPA', menu: 'pkpa', roles: ['SA', 'ADM', 'AUD', 'PJU', 'GKM'],
    async render(el, p) {
      el.innerHTML = UI.kerangka(3, 140);
      const r = await API.call('pkpa.detail', { id: p.id });
      if (!r.success) { el.innerHTML = UI.galat(r); return; }
      const d = r.data, k = d.pkpa, idx = ALUR_PKPA.indexOf(k.Status === 'Ditolak' ? 'Terbuka' : k.Status);
      const blok = (judul, isi) => isi ? '<div><div class="catatan" style="font-weight:600">' + judul + '</div><div style="white-space:pre-wrap">' + esc(isi) + '</div></div>' : '';
      let aksi = '';
      if (d.bolehPj && ['Terbuka', 'Ditolak'].indexOf(k.Status) >= 0) aksi = '<div class="kartu"><div class="kartu-h"><div><h3>Ajukan rencana tindakan</h3><p>Analisis akar masalah, koreksi, dan pencegahan. Auditor akan meninjau.</p></div></div><form id="f-ren" class="form">' + F.formHtml([{ k: 'Akar_Masalah', l: 'Akar masalah', t: 'area', wajib: true }, { k: 'Rencana_Koreksi', l: 'Rencana koreksi', t: 'area', wajib: true }, { k: 'Rencana_Pencegahan', l: 'Rencana pencegahan', t: 'area', wajib: true }, { k: 'PIC', l: 'PIC pelaksana (email)', t: 'pilih', opsi: () => Master.opsiPengguna(null, 'email') }, { k: 'Tenggat', l: 'Tenggat', t: 'tanggal', wajib: true }], k) + '<div class="aksi"><button class="btn btn-utama"><span class="ms">send</span>Ajukan rencana</button></div></form></div>';
      else if (d.bolehAuditor && k.Status === 'Rencana Diajukan') aksi = '<div class="kartu"><div class="kartu-h"><h3>Tinjau rencana</h3></div><div class="isian"><label>Catatan auditor</label><textarea id="cat" rows="3"></textarea></div><div class="baris-aksi" style="margin-top:10px"><button class="btn btn-utama" data-tinjau="1"><span class="ms">check</span>Setujui rencana</button><button class="btn btn-bahaya" data-tinjau="0"><span class="ms">close</span>Tolak & minta revisi</button></div></div>';
      else if (d.bolehPj && ['Rencana Disetujui', 'Dilaksanakan'].indexOf(k.Status) >= 0) aksi = '<div class="kartu"><div class="kartu-h"><div><h3>' + (k.Status === 'Dilaksanakan' ? 'Tambah bukti pelaksanaan' : 'Laporkan pelaksanaan') + '</h3><p>Unggah bukti tindakan koreksi yang sudah dilakukan.</p></div></div><form id="f-lak" class="form">' + F.formHtml([{ k: 'ID_File_Bukti', l: 'Bukti pelaksanaan', t: 'berkas', folder: 'AMI/PKPA', wajib: true }, { k: 'catatan', l: 'Catatan', t: 'area', baris: 2 }]) + '<div class="aksi"><button class="btn btn-utama"><span class="ms">upload</span>Kirim bukti</button></div></form></div>';
      if (d.bolehAuditor && k.Status === 'Dilaksanakan') aksi += '<div class="kartu" style="margin-top:14px"><div class="kartu-h"><h3>Verifikasi efektivitas</h3></div><div class="isian"><label>Catatan verifikasi (wajib)</label><textarea id="cat-v" rows="3"></textarea></div><div class="baris-aksi" style="margin-top:10px"><button class="btn btn-utama" data-ver="1"><span class="ms">task_alt</span>Efektif — tutup PKPA</button><button class="btn btn-hantu" data-ver="0"><span class="ms">undo</span>Belum efektif</button></div></div>';
      el.innerHTML = `<div class="remah"><a href="#/pkpa">PKPA</a> / ${esc(k.ID_PKPA)}</div>
        <div class="kepala-hal" style="margin-top:6px"><div><h1 class="mono">${esc(k.ID_PKPA)}</h1><p>${esc(d.unit)} · ${chipTemuan(k.Kategori)} ${chip(k.Status)} ${k.Eskalasi === 'Ya' ? chip('Dieskalasi', 'c-merah') : ''}</p></div><div class="ringkas-angka"><div><small>Tenggat</small><b style="font-size:16px">${Fmt.tgl(k.Tenggat)}</b>${k.Status !== 'Ditutup' ? sisa(k.Tenggat) : ''}</div><div><small>PIC</small><b style="font-size:14px">${esc(Master.orang(k.PIC))}</b></div></div></div>
        <div class="alur" style="margin-top:12px">${ALUR_PKPA.map((s, i) => '<span class="' + (i < idx ? 'lewat' : i === idx ? 'kini' : '') + '">' + s + '</span>').join('')}${k.Status === 'Ditolak' ? '<span class="kini" style="background:var(--merah)">Rencana ditolak</span>' : ''}</div>
        <div class="grid g-8-4"><div class="grid"><div class="kartu"><div class="kartu-h"><h3>Temuan audit</h3>${k.Kode_Standar ? chip(k.Kode_Standar, 'c-biru') : ''}</div><div class="grid" style="gap:12px">${blok('Uraian temuan', k.Uraian_Temuan)}${blok('Akar masalah', k.Akar_Masalah)}${blok('Rencana koreksi', k.Rencana_Koreksi)}${blok('Rencana pencegahan', k.Rencana_Pencegahan)}${blok('Catatan auditor', k.Catatan_Auditor)}${blok('Hasil verifikasi', k.Hasil_Verifikasi)}${k.ID_File_Bukti ? '<div class="baris-aksi">' + String(k.ID_File_Bukti).split(/,\s*/).filter(Boolean).map((f, i) => '<button class="btn btn-hantu btn-kecil" data-buka="' + esc(f) + '"><span class="ms">attach_file</span>Bukti ' + (i + 1) + '</button>').join('') + '</div>' : ''}</div></div>${aksi}</div>
        <div class="grid"><div class="kartu"><div class="kartu-h"><h3>Konteks audit</h3></div><div class="daftar"><div class="item lunak"><span class="ms">event</span><div class="isi"><b>${esc(Fmt.tgl(d.penugasan.Tgl_Audit, true))}</b><small>${esc(d.penugasan.Mode || '')} · ${esc(d.penugasan.Lokasi || '')}</small></div></div><div class="item lunak"><span class="ms">person_search</span><div class="isi"><b>Auditor</b><small>${esc(d.auditor.join(', '))}</small></div></div>${d.hasil && d.hasil.Ref_Bukti ? '<div class="item lunak"><span class="ms">attach_file</span><div class="isi"><b>Referensi bukti audit</b><small>' + esc(d.hasil.Ref_Bukti) + '</small></div></div>' : ''}</div>${['SA', 'ADM', 'AUD'].indexOf(peran()) >= 0 ? '<a class="btn btn-hantu btn-kecil" style="margin-top:10px" href="#/ami/isi/' + esc(k.ID_Penugasan) + '">Buka formulir audit</a>' : ''}</div>
          <div class="kartu"><div class="kartu-h"><h3>Riwayat</h3></div>${d.riwayat.length ? '<div class="timeline">' + d.riwayat.slice().reverse().map(x => '<div class="t"><span class="titik"></span><div><b>' + esc(LABEL_AKSI[x.aksi] || x.aksi) + '</b><br><small>' + esc(Fmt.waktu(x.waktu)) + ' · ' + esc(Master.orang(x.oleh)) + '</small></div></div>').join('') + '</div>' : UI.kosong('Belum ada riwayat.', 'history')}</div></div></div>`;
      F.pasangUnggah(el);
      const ulang = () => w.MH.Router.jalan();
      const fr = $('#f-ren', el); if (fr) fr.onsubmit = async e => { e.preventDefault(); const v = F.bacaForm(fr, [{ k: 'Akar_Masalah', l: 'Akar masalah', wajib: true }, { k: 'Rencana_Koreksi', l: 'Rencana koreksi', wajib: true }, { k: 'Rencana_Pencegahan', l: 'Rencana pencegahan', wajib: true }, { k: 'PIC' }, { k: 'Tenggat', l: 'Tenggat', wajib: true }]); if (v) await UI.aksi($('button', fr), 'pkpa.rencana', Object.assign({ id: k.ID_PKPA }, v), { lalu: ulang }); };
      const fl = $('#f-lak', el); if (fl) fl.onsubmit = async e => { e.preventDefault(); const v = F.bacaForm(fl, [{ k: 'ID_File_Bukti', l: 'Bukti', t: 'berkas', wajib: true }, { k: 'catatan' }]); if (v) await UI.aksi($('button.btn-utama', fl), 'pkpa.laksana', { id: k.ID_PKPA, ID_File_Bukti: v.ID_File_Bukti, catatan: v.catatan }, { lalu: ulang }); };
      el.addEventListener('click', async e => {
        const b = e.target.closest('[data-buka]'); if (b) return F.bukaBerkas(b.dataset.buka, b);
        const t = e.target.closest('[data-tinjau]'); if (t) return UI.aksi(t, 'pkpa.tinjauRencana', { id: k.ID_PKPA, setuju: t.dataset.tinjau === '1', catatan: $('#cat', el).value }, { lalu: ulang });
        const v = e.target.closest('[data-ver]'); if (v) return UI.aksi(v, 'pkpa.verifikasi', { id: k.ID_PKPA, efektif: v.dataset.ver === '1', catatan: $('#cat-v', el).value }, { lalu: ulang });
      });
    }
  });

  /* ================= PPEPP (kanban) & RTM ================= */
  const warnaSumber = { AMI: 'c-merah', Akreditasi: 'c-biru', Survei: 'c-teal', Pengaduan: 'c-amber', Benchmarking: 'c-ungu', RTM: 'c-biru', 'Evaluasi Diri': 'c-teal', Manual: 'c-abu' };
  Hal.daftar('/ppepp', {
    judul: 'PPEPP & RTM', menu: 'ppepp',
    async render(el) {
      el.innerHTML = kepala('PPEPP & Rapat Tinjauan Manajemen', 'Siklus Penetapan–Pelaksanaan–Evaluasi–Pengendalian–Peningkatan. Item dari AMI, akreditasi, survei, pengaduan, dan benchmarking masuk otomatis.') + '<div id="tab" style="margin-top:14px"></div>';
      w.MH.tabs($('#tab', el), [{ k: 'papan', l: 'Papan PPEPP', render: papan }, { k: 'rtm', l: 'Rapat Tinjauan Manajemen', render: daftarRtm }], 'ppepp');
    }
  });
  async function papan(el) {
    el.innerHTML = '<div class="baris-aksi" style="margin-bottom:12px"><div class="cari-tabel" style="min-width:220px"><span class="ms">search</span><input id="q-pp" type="search" placeholder="Cari item…"></div><select id="f-src" aria-label="Sumber"><option value="">Semua sumber</option>' + Object.keys(warnaSumber).map(s => '<option>' + s + '</option>').join('') + '</select><label class="cekbox"><input type="checkbox" id="f-tutup"> Tampilkan selesai/batal</label><span class="spacer" style="flex:1"></span>' + (['SA', 'ADM', 'GKM', 'PJU'].indexOf(peran()) >= 0 ? '<button class="btn btn-utama btn-kecil" id="b-pp"><span class="ms">add</span>Item baru</button>' : '') + '</div><div id="kb">' + UI.kerangka(1, 300) + '</div>';
    let data = null;
    const gambar = () => {
      if (!data) return;
      const q = $('#q-pp', el).value.toLowerCase(), src = $('#f-src', el).value, tutup = $('#f-tutup', el).checked;
      const items = data.items.filter(i => (tutup || ['Selesai', 'Batal'].indexOf(i.Status) < 0) && (!src || i.Sumber === src) && (!q || (i.Uraian + ' ' + i.PIC + ' ' + i.Kode_Unit).toLowerCase().indexOf(q) >= 0));
      $('#kb', el).innerHTML = '<div class="kanban">' + data.tahap.map(t => { const isi = items.filter(i => i.Tahap_PPEPP === t); const rj = (data.rujukanLppm || []).filter(x => x.Tahap_PPEPP === t || x.Tahap === t); return '<div class="kolom-kanban" data-tahap="' + t + '"><h4>' + t + '<span class="chip c-abu">' + isi.length + '</span></h4>' + isi.map(i => '<div class="kartu-kanban" draggable="true" data-id="' + esc(i.ID) + '">' + chip(i.Sumber, warnaSumber[i.Sumber] || 'c-abu') + ' ' + (i.Status !== 'Terbuka' ? chip(i.Status) : '') + '<b>' + esc(String(i.Uraian).slice(0, 120)) + '</b><div class="catatan">' + esc(Master.unit(i.Kode_Unit)) + ' · ' + esc(Master.orang(i.PIC)) + '</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">' + (i.Tenggat ? sisa(i.Tenggat) : '<span></span>') + '<button class="ikon-btn kecil" data-menu="' + esc(i.ID) + '" aria-label="Aksi item"><span class="ms">more_horiz</span></button></div></div>').join('') + rj.map(x => '<div class="kartu-kanban rujukan">' + chipSumber() + '<b>' + esc(x.Uraian || x.Judul || '') + '</b><div class="catatan">' + esc(x.Kode_Prodi || '') + ' ' + esc(x.Status || '') + '</div></div>').join('') + (!isi.length && !rj.length ? '<div class="catatan" style="padding:8px">Kosong</div>' : '') + '</div>'; }).join('') + '</div>' + ((data.rujukanLppm || []).length ? '<div class="catatan" style="margin-top:8px">Kartu bergaris hijau adalah rujukan baca-saja dari SIM-LPPM.</div>' : '');
    };
    const pindah = async (id, patch) => { const r = await API.call('ppepp.pindah', Object.assign({ id }, patch)); if (r.success) { const it = data.items.find(i => i.ID === id); Object.assign(it, patch.tahap ? { Tahap_PPEPP: patch.tahap } : {}, patch.status ? { Status: patch.status } : {}); gambar(); UI.toast('Item diperbarui.', 'sukses'); } else UI.toast(r.message, 'galat'); };
    $('#q-pp', el).oninput = gambar; $('#f-src', el).onchange = gambar; $('#f-tutup', el).onchange = gambar;
    let seret = null;
    el.addEventListener('dragstart', e => { const k = e.target.closest('.kartu-kanban[data-id]'); if (k) { seret = k.dataset.id; e.dataTransfer.effectAllowed = 'move'; } });
    el.addEventListener('dragover', e => { const c = e.target.closest('.kolom-kanban'); if (c && seret) { e.preventDefault(); $$('.kolom-kanban', el).forEach(x => x.classList.toggle('seret', x === c)); } });
    el.addEventListener('drop', e => { const c = e.target.closest('.kolom-kanban'); $$('.kolom-kanban', el).forEach(x => x.classList.remove('seret')); if (c && seret) { e.preventDefault(); const it = data.items.find(i => i.ID === seret); if (it && it.Tahap_PPEPP !== c.dataset.tahap) pindah(seret, { tahap: c.dataset.tahap }); } seret = null; });
    el.addEventListener('click', e => {
      const m = e.target.closest('[data-menu]'); if (!m) return;
      const it = data.items.find(i => i.ID === m.dataset.menu);
      const isi = document.createElement('div');
      isi.innerHTML = '<p style="margin-top:0;white-space:pre-wrap">' + esc(it.Uraian) + '</p><div class="catatan">Sumber ' + esc(it.Sumber) + (it.ID_Sumber ? ' · ' + esc(it.ID_Sumber) : '') + ' · Standar ' + esc(it.Standar_Terkait || '—') + ' · TA ' + esc(it.Tahun_Akademik) + '</div>' + F.formHtml([{ k: 'tahap', l: 'Tahap', t: 'pilih', opsi: data.tahap, kosong: false }, { k: 'status', l: 'Status', t: 'pilih', opsi: ['Terbuka', 'Berjalan', 'Selesai', 'Batal'], kosong: false }, { k: 'ID_File_Bukti', l: 'Tambah bukti', t: 'berkas', folder: 'PPEPP' }], { tahap: it.Tahap_PPEPP, status: it.Status }) + (it.ID_File_Bukti ? '<div class="baris-aksi">' + String(it.ID_File_Bukti).split(/,\s*/).filter(Boolean).map((f, i) => '<button class="btn btn-hantu btn-kecil" data-buka="' + esc(f) + '">Bukti ' + (i + 1) + '</button>').join('') + '</div>' : '') + (it.Sumber === 'AMI' && it.ID_Sumber ? '<a class="btn btn-hantu btn-kecil" style="margin-top:8px" href="#/pkpa/' + esc(it.ID_Sumber) + '">Buka PKPA</a>' : '');
      F.pasangUnggah(isi);
      isi.addEventListener('click', ev => { const b = ev.target.closest('[data-buka]'); if (b) F.bukaBerkas(b.dataset.buka, b); });
      UI.modal({ judul: 'Item PPEPP ' + it.ID, isi, tombol: [{ teks: 'Tutup', kelas: 'btn-hantu', tutup: true }, { teks: 'Simpan', ikon: 'save', aksi: async () => { const v = F.bacaForm(isi, [{ k: 'tahap' }, { k: 'status' }, { k: 'ID_File_Bukti', t: 'berkas' }]); const patch = {}; if (v.tahap !== it.Tahap_PPEPP) patch.tahap = v.tahap; if (v.status !== it.Status) patch.status = v.status; if (v.ID_File_Bukti) patch.ID_File_Bukti = v.ID_File_Bukti; if (!Object.keys(patch).length) return; await pindah(it.ID, patch); } }] });
    });
    const bp = $('#b-pp', el);
    if (bp) bp.onclick = () => F.formModal({ judul: 'Item PPEPP baru', fields: [{ k: 'Uraian', l: 'Uraian', t: 'area', wajib: true }, { k: 'Tahap_PPEPP', l: 'Tahap', t: 'pilih', opsi: data ? data.tahap : [], kosong: false }, { k: 'Kode_Unit', l: 'Unit', t: 'pilih', opsi: () => Master.opsiUnit(), ro: !lpm() }, { k: 'Standar_Terkait', l: 'Standar', t: 'pilih', opsi: () => Master.d.standar.map(s => [s.Kode, s.Kode + ' ' + s.Nama]) }, { k: 'PIC', l: 'PIC (email)', t: 'pilih', opsi: () => Master.opsiPengguna(null, 'email') }, { k: 'Tenggat', l: 'Tenggat', t: 'tanggal' }], nilai: { Tahap_PPEPP: 'Pelaksanaan', Kode_Unit: Sesi.me.prodi || Sesi.me.unit }, simpan: async v => { const r = await API.call('ppepp.buat', Object.assign({ Sumber: 'Manual', Tahun_Akademik: State.ta }, v)); if (r.success) { UI.toast(r.message, 'sukses'); data.items.push(r.data); gambar(); } else UI.toast(r.message, 'galat'); return r; } });
    await muat('ppepp:' + State.ta, 'ppepp.papan', { ta: State.ta }, d => { if (!d) { $('#kb', el).innerHTML = UI.galat({ message: 'Gagal memuat papan.' }); return; } data = JSON.parse(JSON.stringify(d)); gambar(); });
  }

  function daftarRtm(el) {
    el.className = 'kartu';
    w.MH.crud(el, {
      e: 'RTM', tulis: lpm(), hapus: peran() === 'SA', nama: 'RTM', judul: 'Rapat Tinjauan Manajemen', teksTambah: 'Jadwalkan RTM', klik: r => location.hash = '#/rtm/' + r.ID, bawaanBaru: { Tahun_Akademik: State.ta },
      olah: rr => rr.sort((a, b) => String(b.Tgl).localeCompare(String(a.Tgl))),
      kolom: [{ k: 'Tgl', l: 'Tanggal', f: r => '<b>' + Fmt.tgl(r.Tgl, true) + '</b>' }, { k: 'Judul', l: 'Judul' }, { k: 'Tahun_Akademik', l: 'TA' }, { k: 'Nomor_BA', l: 'Berita acara', f: r => r.Nomor_BA ? chip(r.Nomor_BA, 'c-teal') : '—' }, { k: 'Status', l: 'Status', f: r => chip(r.Status) }],
      aksiBaris: r => '<a class="btn btn-hantu btn-kecil" href="#/rtm/' + esc(r.ID) + '">Buka</a>',
      fields: [{ k: 'Judul', l: 'Judul rapat', wajib: true, penuh: true }, { k: 'Tgl', l: 'Tanggal', t: 'tanggal', wajib: true }, { k: 'Tahun_Akademik', l: 'Tahun akademik', t: 'pilih', opsi: () => Master.opsiTA(), kosong: false }, { k: 'Peserta', l: 'Peserta (email, pisahkan koma)', t: 'area', baris: 2 }, { k: 'Agenda', l: 'Agenda', t: 'area' }]
    });
  }

  Hal.daftar('/rtm/:id', {
    judul: 'RTM', menu: 'ppepp',
    async render(el, p) {
      el.innerHTML = UI.kerangka(3, 140);
      const r = await API.call('rtm.detail', { id: p.id });
      if (!r.success) { el.innerHTML = UI.galat(r); return; }
      const d = r.data, m = d.rtm, ulang = () => w.MH.Router.jalan();
      el.innerHTML = `<div class="remah"><a href="#/ppepp">PPEPP & RTM</a> / ${esc(m.Judul)}</div>
        <div class="kepala-hal" style="margin-top:6px"><div><h1>${esc(m.Judul)}</h1><p>${esc(Fmt.tgl(m.Tgl, true))} · TA ${esc(m.Tahun_Akademik)} · ${chip(m.Status)} ${m.Nomor_BA ? chip('BA ' + m.Nomor_BA, 'c-teal') : ''}</p></div><div class="baris-aksi">${lpm() ? '<button class="btn btn-hantu" id="b-undang"><span class="ms">mail</span>Kirim undangan</button>' + (!m.Nomor_BA ? '<button class="btn btn-utama" id="b-ba"><span class="ms">verified</span>Terbitkan berita acara</button>' : '') : ''}${m.ID_File_BA ? '<button class="btn btn-teal" data-buka="' + esc(m.ID_File_BA) + '"><span class="ms">picture_as_pdf</span>Berita acara</button>' : ''}</div></div>
        <div class="grid g-8-4" style="margin-top:14px"><div class="grid"><div class="kartu"><div class="kartu-h"><div><h3>Bahan tinjauan otomatis</h3><p>Ringkasan mutu TA ${esc(m.Tahun_Akademik)} untuk dibahas.</p></div></div><div class="daftar">${d.bahan.map(b => '<div class="item lunak"><div class="isi"><b>' + esc(b[0]) + '</b><small style="white-space:normal">' + esc(b[1]) + '</small></div></div>').join('')}</div></div>
          <div class="kartu"><div class="kartu-h"><h3>Notulen</h3></div>${lpm() && !m.Nomor_BA ? '<div class="isian"><textarea id="notulen" rows="8" placeholder="Ringkasan pembahasan, peserta hadir, dan kesimpulan.">' + esc(m.Notulen) + '</textarea></div><div class="aksi" style="margin-top:8px"><button class="btn btn-hantu" id="b-not"><span class="ms">save</span>Simpan notulen</button></div>' : '<div style="white-space:pre-wrap">' + (esc(m.Notulen) || '<span class="catatan">Belum ada notulen.</span>') + '</div>'}</div>
          <div class="kartu"><div class="kartu-h"><div><h3>Keputusan & tindak lanjut</h3><p>Setiap keputusan menjadi item PPEPP tahap Peningkatan.</p></div>${lpm() ? '<button class="btn btn-utama btn-kecil" id="b-kep"><span class="ms">add</span>Keputusan</button>' : ''}</div><div id="t-kep"></div></div></div>
          <div class="grid"><div class="kartu"><div class="kartu-h"><h3>Agenda</h3></div><div style="white-space:pre-wrap">${esc(m.Agenda) || '<span class="catatan">—</span>'}</div></div><div class="kartu"><div class="kartu-h"><h3>Peserta</h3></div><div class="daftar">${String(m.Peserta || '').split(/[,;\n]\s*/).filter(Boolean).map(e => '<div class="item lunak"><span class="ms">person</span><div class="isi"><b>' + esc(Master.orang(e)) + '</b><small>' + esc(e) + '</small></div></div>').join('') || UI.kosong('Belum ada peserta.')}</div></div></div></div>`;
      tabel($('#t-kep', el), { rows: d.keputusan, nama: 'Keputusan RTM', cari: false, kolom: [{ k: 'Keputusan', l: 'Keputusan', f: x => '<b>' + esc(x.Keputusan) + '</b>' }, { k: 'PIC', l: 'PIC', f: x => esc(Master.orang(x.PIC)) }, { k: 'Kode_Unit', l: 'Unit', f: x => esc(Master.unit(x.Kode_Unit)) }, { k: 'Tenggat', l: 'Tenggat', f: x => Fmt.tgl(x.Tenggat) }, { k: 'ID_PPEPP_Item', l: 'PPEPP', f: x => x.ID_PPEPP_Item ? '<a href="#/ppepp">' + esc(x.ID_PPEPP_Item) + '</a>' : '' }], kosong: 'Belum ada keputusan.' });
      const bn = $('#b-not', el); if (bn) bn.onclick = () => UI.aksi(bn, 'data.simpan', { e: 'RTM', row: { ID: m.ID, Notulen: $('#notulen', el).value } });
      const bk = $('#b-kep', el); if (bk) bk.onclick = () => F.formModal({ judul: 'Keputusan RTM', fields: [{ k: 'Keputusan', l: 'Keputusan', t: 'area', wajib: true }, { k: 'PIC', l: 'PIC (email)', t: 'pilih', opsi: () => Master.opsiPengguna(null, 'email'), wajib: true }, { k: 'Kode_Unit', l: 'Unit', t: 'pilih', opsi: () => Master.opsiUnit() }, { k: 'Tenggat', l: 'Tenggat', t: 'tanggal', wajib: true }], simpan: async v => { const x = await API.call('rtm.keputusan', Object.assign({ idRtm: m.ID }, v)); if (x.success) { UI.toast(x.message || 'Keputusan dicatat.', 'sukses'); ulang(); } else UI.toast(x.message, 'galat'); return x; } });
      const bu = $('#b-undang', el); if (bu) bu.onclick = () => UI.aksi(bu, 'rtm.undang', { id: m.ID });
      const bb = $('#b-ba', el); if (bb) bb.onclick = async () => { const k = await UI.konfirmasi('Terbitkan berita acara', 'Berita acara bernomor dengan QR verifikasi akan dibuat dari notulen dan keputusan. Notulen tidak dapat diubah setelahnya.', { teksOk: 'Terbitkan' }); if (k.ok) UI.aksi(bb, 'rtm.terbitBa', { id: m.ID }, { lalu: ulang }); };
      el.addEventListener('click', e => { const b = e.target.closest('[data-buka]'); if (b) F.bukaBerkas(b.dataset.buka, b); });
    }
  });
})(window);
