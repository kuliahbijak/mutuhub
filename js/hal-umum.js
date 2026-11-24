/* =====================================================================
 * hal-umum.js — Dashboard per peran (PRD 7.4), Profil & notifikasi,
 * Portal Responden (survei bertoken & pengaduan, tanpa login),
 * Verifikasi dokumen publik, dan prefetch menu saat menganggur.
 * ===================================================================== */
(function (w) {
  'use strict';
  const { $, $$, esc, Fmt, API, Store, Sesi, UI, muat, chip, chipSumber, Master, State, G, F, tabel, qrSvg } = w.MH;
  const Hal = w.MH.Hal;

  const kpi = (o) => `<div class="kartu kpi ${o.h ? 'klik' : ''}" ${o.h ? 'data-h="' + o.h + '" tabindex="0"' : ''}><div class="atas"><span class="ikon ${o.w || ''}"><span class="ms">${o.i}</span></span>${o.chip || ''}</div><div class="judul">${esc(o.j)}</div><div class="nilai">${o.v}</div><div class="ket">${o.k || ''}</div></div>`;
  const klikKpi = el => $$('[data-h]', el).forEach(k => { k.onclick = () => location.hash = k.dataset.h; k.onkeydown = e => { if (e.key === 'Enter') location.hash = k.dataset.h; }; });
  const warnaPkpa = { 'Terbuka': '#DC2626', 'Rencana Diajukan': '#F5A623', 'Rencana Disetujui': '#22C7D6', 'Dilaksanakan': '#4B65D6', 'Ditolak': '#8E5BD0', 'Ditutup': '#16A34A' };
  const warnaTemuan = { 'Sesuai': '#0E9F9A', 'Observasi': '#4B65D6', 'KTS Minor': '#F5A623', 'KTS Mayor': '#DC2626', 'Pencapaian Unggul': '#22C7D6' };
  const warnaCapaian = { 'Tercapai': '#16A34A', 'Mendekati': '#F5A623', 'Belum': '#DC2626', 'Belum Diisi': '#B5BBC8' };
  const itemDonut = (o, warna) => Object.keys(o || {}).map(k => ({ l: k, v: o[k], w: warna[k] || '#B5BBC8' }));

  function kartuAgenda(agenda) {
    const tanda = {}; (agenda || []).forEach(a => { tanda[a.tanggal] = (tanda[a.tanggal] ? tanda[a.tanggal] + '; ' : '') + a.judul; });
    const depan = (agenda || []).filter(a => a.tanggal >= Fmt.hariIni()).slice(0, 5);
    return `<div class="kartu"><div class="kartu-h"><h3><span class="ms" style="color:var(--biru)">calendar_month</span> Agenda Mutu</h3></div>${G.kalender(Fmt.hariIni(), tanda)}<div class="agenda" style="margin-top:12px">${depan.length ? depan.map(a => { const m = a.tanggal.split('-'); return `<a class="hari" href="${esc(a.tautan)}" style="color:inherit;text-decoration:none"><div class="tgl">${['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'][+m[1] - 1]}<b>${+m[2]}</b></div><div style="min-width:0"><b style="font-size:13px">${esc(a.judul)}</b><div class="catatan">${chip(a.jenis, 'c-biru')} ${esc(a.ket || '')}</div></div></a>`; }).join('') : UI.kosong('Tidak ada agenda dekat.', 'event_available')}</div></div>`;
  }
  function kartuIntegrasi(seg, boleh) {
    const l = seg && seg.lppm || {};
    return `<div class="kartu"><div class="kartu-h"><div><h3><span class="ms" style="color:var(--teal)">hub</span> SIM-LPPM Integrasi</h3><p>Jembatan data riset & PkM (kontrak v1.0)</p></div><span class="chip ${l.warna === 'hijau' ? 'c-hijau' : l.warna === 'kuning' ? 'c-amber' : l.warna === 'merah' ? 'c-merah' : 'c-abu'}">${l.dikonfigurasi ? (l.warna === 'hijau' ? 'Segar' : l.warna === 'kuning' ? '> ' + (seg.ambang && seg.ambang.kuning) + ' jam' : 'Basi') : 'Belum terhubung'}</span></div>
      <div class="daftar"><div class="item lunak"><span class="ms">schedule</span><div class="isi"><b>Terakhir tarik</b><small>${esc(l.waktu ? Fmt.waktu(l.waktu) + ' WIB' : 'Belum pernah')}</small></div></div>
      <div class="item lunak"><span class="ms">inbox</span><div class="isi"><b>Inbox Catatan Data</b><small>${seg ? seg.inboxMenunggu : 0} menunggu proses LPPM</small></div></div>${l.galat ? '<div class="banner banner-kuning" style="font-size:12px"><span class="ms">warning</span><div>' + esc(l.galat) + '</div></div>' : ''}</div>
      ${boleh ? '<div class="aksi" style="margin-top:12px"><button class="btn btn-utama" data-tarik><span class="ms">sync</span>Tarik Sekarang</button><a class="btn btn-hantu" href="#/integrasi">Pusat Integrasi</a></div>' : ''}</div>`;
  }
  function kartuLppm(lppm, judul) {
    const rows = (lppm && lppm.perProdi) || [];
    const maks = Math.max(1, ...rows.map(r => r.penelitian + r.pkm));
    return `<div class="kartu"><div class="kartu-h"><div><h3>${esc(judul || 'Data Riset & PkM')}</h3><p>Agregat dari SIM-LPPM (baca-saja)</p></div></div>${chipSumber(lppm && lppm.waktuTarik)}<div style="display:grid;gap:12px;margin-top:12px">${rows.length ? rows.map(r => `<div><div style="display:flex;justify-content:space-between;font-size:12.5px"><b>${esc(Master.prodi(r.prodi))}</b><span class="catatan">${r.penelitian} penelitian · ${r.pkm} PkM · ${r.publikasi} publikasi</span></div>${G.progres((r.penelitian + r.pkm) / maks * 100, 'teal')}</div>`).join('') : UI.kosong('Belum ada data tarikan SIM-LPPM.', 'cloud_off')}</div></div>`;
  }
  function antrean(list) {
    return `<div class="kartu"><div class="kartu-h"><h3>Antrean Tindakan Cepat ${list.length ? '<span class="chip c-merah">' + list.length + ' item</span>' : ''}</h3></div><div class="daftar">${list.length ? list.map(a => `<div class="item"><span class="ikon-bulat">${esc(a.jenis.slice(0, 2).toUpperCase())}</span><div class="isi"><b>${esc(a.judul)}</b><small>${esc(a.ket)}</small></div>${a.tenggat ? '<span class="chip ' + (Fmt.sisaHari(a.tenggat) < 0 ? 'c-merah' : 'c-amber') + '">' + esc(Fmt.tgl(a.tenggat)) + '</span>' : ''}<a class="btn btn-utama btn-kecil" href="${esc(a.tautan)}">${esc(a.aksi)}</a></div>`).join('') : UI.kosong('Semua beres — tidak ada tindakan menunggu.', 'task_alt')}</div></div>`;
  }

  Hal.daftar('/dashboard', {
    judul: 'Dashboard Mutu', menu: 'dashboard',
    async render(el) {
      el.innerHTML = '<div class="grid g2">' + UI.kerangka(2, 220) + '</div><div class="grid g4" style="margin-top:16px">' + UI.kerangka(4, 130) + '</div>';
      await muat('dash:' + State.ta, 'dash.get', { ta: State.ta }, (d, dariCache, gagal) => {
        if (!d) { el.innerHTML = UI.galat(gagal); return; }
        ({ SA: dashLpm, ADM: dashLpm, AUD: dashAud, GKM: dashGkm, PJU: dashPju, PIM: dashPim })[Sesi.me.role](el, d);
        klikKpi(el);
        const tb = $('[data-tarik]', el); if (tb) tb.onclick = () => UI.aksi(tb, 'integrasi.tarik', {}, { lalu: () => w.MH.Router.jalan() });
        if (d.kpi) w.MH.setJumlah({ pkpa: d.kpi.pkpaTerbuka || 0, kritis: d.kpi.kritis || 0 });
      }, { maxAge: 20000 });
    }
  });

  function dashLpm(el, d) {
    const k = d.kpi, nama = Sesi.me.nama.split(',')[0], sa = d.sapaan || {};
    el.innerHTML = `<div class="grid g2">
      <div class="kartu sapa"><span class="chip c-biru">${esc(Master.setelan.NAMA_KAMPUS || '')} • Portal Penjaminan Mutu</span><h2>Halo, ${esc(nama)}!</h2><p>Ringkasan mutu kampus dan kesiapan akreditasi tahun akademik ${esc(d.ta)}.</p><div class="aksi">${sa.pkpaJatuhTempo ? '<a class="chip c-merah" href="#/pkpa">' + sa.pkpaJatuhTempo + ' PKPA jatuh tempo ≤ 7 hari</a>' : ''}${sa.evdiriBelum ? '<a class="chip c-amber" href="#/evdiri">' + sa.evdiriBelum + ' evaluasi diri belum disetujui</a>' : ''}${sa.amiTerdekat ? '<a class="chip c-teal" href="' + esc(sa.amiTerdekat.tautan) + '">' + esc(sa.amiTerdekat.judul) + ' · ' + Fmt.tgl(sa.amiTerdekat.tanggal) + '</a>' : ''}</div></div>
      <div class="kartu hero"><div class="kartu-h"><div><div class="label-atas">Kesiapan akreditasi institusi</div><div class="angka">${k.skorKesiapan === null ? '—' : Fmt.angka(k.skorKesiapan, 1) + '%'}</div></div><span class="pil-kaca"><span class="ms">warning</span>${k.kritis} temuan kritis</span></div><div id="g-tren"></div><div class="aksi" style="margin-top:6px"><a class="btn btn-kaca btn-kecil" href="#/kesiapan">Lihat pemeriksaan kesiapan <span class="ms">arrow_forward</span></a></div></div></div>
      <div class="grid g4" style="margin-top:16px">${kpi({ i: 'assignment_late', w: 'amber', j: 'PKPA Terbuka', v: k.pkpaTerbuka, k: k.pkpaTerlambat + ' melewati tenggat', chip: k.pkpaBaru ? '<span class="chip c-amber">+' + k.pkpaBaru + ' baru</span>' : '', h: '#/pkpa' })}
        ${kpi({ i: 'pending_actions', w: 'merah', j: 'Evaluasi Diri Belum Disetujui', v: k.evdiriBelum === null ? '—' : k.evdiriBelum + ' <small>/ ' + k.prodiTotal + ' prodi</small>', k: 'Siklus aktif ' + d.ta, h: '#/evdiri' })}
        ${kpi({ i: 'verified', w: 'teal', j: 'Skor Kesiapan Akreditasi', v: k.skorKesiapan === null ? '—' : Fmt.angka(k.skorKesiapan, 1) + '%', k: 'Rata-rata semua prodi × kriteria', h: '#/kesiapan' })}
        ${kpi({ i: 'timer_off', w: 'merah', j: 'Pengaduan Melewati SLA', v: k.pengaduanSla + ' <small>tiket</small>', k: 'Dieskalasi ke Pimpinan', chip: k.pengaduanSla ? '<span class="chip c-merah">Eskalasi</span>' : '', h: '#/pengaduan' })}</div>
      <div class="grid g-8-4" style="margin-top:16px"><div class="grid">
        <div class="kartu"><div class="kartu-h"><div><h3>Status PKPA</h3><p>Permintaan Tindakan Koreksi & Pencegahan</p></div><a class="btn btn-hantu btn-kecil" href="#/pkpa">Semua PKPA</a></div><div id="g-pkpa"></div></div>
        <div class="kartu"><div class="kartu-h"><div><h3>Kesiapan per Kriteria</h3><p>Skor pemeriksaan terakhir (rata-rata prodi). Merah = di bawah 70%.</p></div></div><div id="g-krit"></div></div>
        ${antrean(d.antrean || [])}</div>
      <div class="grid">${kartuIntegrasi(d.integrasi, true)}${kartuLppm(d.lppm)}${kartuAgenda(d.agenda)}</div></div>`;
    G.garis($('#g-tren', el), { label: (d.trenSkor || []).map(x => Fmt.tgl(x.tanggal).slice(0, 6)), data: (d.trenSkor || []).map(x => x.skor), gelap: true, ambang: 70, tinggi: 120 });
    G.donut($('#g-pkpa', el), { item: itemDonut(d.pkpaStatus, warnaPkpa), sub: 'Total PKPA' });
    const kr = d.kesiapanKriteria || [];
    G.batang($('#g-krit', el), { label: kr.map(x => x.kode), seri: [{ nama: 'Skor', data: kr.map(x => x.skor), warna: '#4B65D6' }], maks: 100, satuan: '%', warnaPer: (i, v) => v < 70 ? '#DC2626' : null });
  }
  function dashAud(el, d) {
    const k = d.kpi, s = d.sertifikat || {};
    el.innerHTML = `<div class="kartu hero"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><div><span class="pil-kaca">Auditor Mutu Internal ${s.status === 'Ya' ? 'Bersertifikat · berlaku s.d. ' + esc(Fmt.tgl(s.berlaku)) : ''}</span>${s.nidn ? ' <span class="pil-kaca">NIDN: ' + esc(s.nidn) + '</span>' : ''}<h2 style="margin:10px 0 4px;font-size:26px">Halo, ${esc(Sesi.me.nama)}</h2><small>Anda memiliki ${k.penugasanAktif} penugasan aktif dan ${k.pkpaMenunggu} PKPA menunggu verifikasi.</small></div>${(d.penugasan || []).find(p => p.status !== 'Selesai') ? '<a class="btn btn-putih" href="#/ami/isi/' + esc(d.penugasan.find(p => p.status !== 'Selesai').id) + '"><span class="ms">fact_check</span>Mulai Audit Lapangan</a>' : ''}</div></div>
      <div class="grid g4" style="margin-top:16px">${kpi({ i: 'assignment', j: 'Penugasan Audit Aktif', v: k.penugasanAktif + ' <small>unit</small>', h: '#/ami' })}${kpi({ i: 'checklist', w: 'teal', j: 'Butir Instrumen Terisi', v: k.butirTerisi + ' <small>/ ' + k.butirTotal + '</small>', k: G.progres(k.butirTotal ? k.butirTerisi / k.butirTotal * 100 : 0) })}${kpi({ i: 'pending_actions', w: 'merah', j: 'PKPA Menunggu Verifikasi', v: k.pkpaMenunggu + ' <small>butir</small>', h: '#/pkpa' })}${kpi({ i: 'trending_up', w: 'hijau', j: 'Penyelesaian Temuan', v: Fmt.persen(k.penyelesaian) })}</div>
      <div class="grid g-8-4" style="margin-top:16px"><div class="grid">
        <div class="kartu"><div class="kartu-h"><h3>Penugasan Audit</h3></div><div id="t-pen"></div></div>
        <div class="kartu"><div class="kartu-h"><div><h3>PKPA Menunggu Verifikasi Auditor</h3><p>Tinjau rencana dan bukti efektivitas perbaikan</p></div></div><div class="daftar">${(d.pkpaTunggu || []).length ? d.pkpaTunggu.map(p => `<div class="item lunak" style="align-items:flex-start"><div class="isi"><b class="mono" style="color:var(--biru)">${esc(p.ID_PKPA)} ${chip(p.Status)}</b><small>${esc(p.unit)} · ${esc(p.Kategori)}</small><div style="font-size:13px;margin-top:6px;white-space:normal">${esc(String(p.Uraian_Temuan).slice(0, 200))}</div>${p.Akar_Masalah ? '<div class="catatan" style="margin-top:4px;white-space:normal"><b>Akar masalah:</b> ' + esc(p.Akar_Masalah) + '</div>' : ''}</div><a class="btn btn-utama btn-kecil" href="#/pkpa/${esc(p.ID_PKPA)}">${p.Status === 'Dilaksanakan' ? 'Verifikasi' : 'Tinjau rencana'}</a></div>`).join('') : UI.kosong('Tidak ada PKPA menunggu.', 'task_alt')}</div></div>
        <div class="kartu"><div class="kartu-h"><h3>Sebaran Temuan Audit Saya</h3></div><div id="g-tem"></div></div></div>
      <div class="grid">${kartuAgenda(d.agenda)}</div></div>`;
    tabel($('#t-pen', el), { rows: d.penugasan || [], cari: false, ekspor: false, per: 8, klik: r => location.hash = '#/ami/isi/' + r.id, kolom: [{ k: 'unit', l: 'Unit', f: r => '<b>' + esc(r.unit) + '</b>' }, { k: 'peran', l: 'Peran', f: r => chip(r.peran, 'c-biru') }, { k: 'mode', l: 'Mode', f: r => chip(r.mode, 'c-teal') }, { k: 'tanggal', l: 'Tanggal', f: r => Fmt.tgl(r.tanggal) }, { k: 'terisi', l: 'Progres', f: r => '<span class="catatan">' + r.terisi + '/' + r.total + '</span>' + G.progres(r.total ? r.terisi / r.total * 100 : 0) }, { k: 'status', l: 'Status', f: r => chip(r.status) }] });
    G.donut($('#g-tem', el), { item: itemDonut(d.sebaranTemuan, warnaTemuan), sub: 'Temuan' });
  }
  function dashGkm(el, d) {
    const ev = d.evdiri, cs = d.capaianStatus || {}, tot = Object.values(cs).reduce((a, b) => a + b, 0);
    el.innerHTML = `<div class="grid g2"><div class="kartu sapa"><span class="chip c-biru">GKM · ${esc(d.prodi ? d.prodi.Nama_Prodi : '')}</span><h2>Halo, ${esc(Sesi.me.nama.split(',')[0])}!</h2><p>Pantau evaluasi diri, capaian indikator, dan kesiapan akreditasi prodi Anda.</p><div class="aksi">${ev ? '<a class="btn btn-utama" href="#/evdiri/' + esc(ev.id) + '/' + esc(Sesi.me.prodi) + '"><span class="ms">edit_note</span>Isi Evaluasi Diri</a>' : ''}<a class="btn btn-hantu" href="#/kesiapan">Bukti yang kurang</a></div></div>
      <div class="kartu hero"><div class="label-atas">Kesiapan akreditasi prodi</div><div style="display:flex;gap:16px;align-items:center;margin-top:8px">${G.cincin(d.skorKesiapan, { ukuran: 120, gelap: true, sub: 'Kesiapan', warna: '#22C7D6' })}<div><b style="font-size:16px">${(d.proyek || [])[0] ? esc(d.proyek[0].Nama) : 'Belum ada proyek akreditasi aktif'}</b><br><small>${(d.proyek || [])[0] ? 'Target: ' + esc(d.proyek[0].Status_Target) + ' · kirim ' + esc(Fmt.tgl(d.proyek[0].Tgl_Target_Kirim)) : ''}</small><div style="margin-top:10px">${(d.proyek || [])[0] ? '<a class="btn btn-kaca btn-kecil" href="#/akreditasi/' + esc(d.proyek[0].ID) + '">Papan kelengkapan</a>' : ''}</div></div></div></div></div>
      <div class="grid g4" style="margin-top:16px">${kpi({ i: 'assignment', w: ev && ev.status === 'Disetujui' ? 'hijau' : 'amber', j: 'Status Evaluasi Diri', v: ev ? chip(ev.status) : '—', k: ev ? 'Tenggat ' + Fmt.tgl(ev.tutup) : 'Belum ada siklus', h: ev ? '#/evdiri/' + ev.id + '/' + Sesi.me.prodi : '' })}${kpi({ i: 'track_changes', w: 'hijau', j: 'Indikator Tercapai', v: (cs['Tercapai'] || 0) + ' <small>/ ' + tot + '</small>', h: '#/target' })}${kpi({ i: 'verified', w: 'teal', j: 'Skor Kesiapan Prodi', v: Fmt.persen(d.skorKesiapan), h: '#/kesiapan' })}${kpi({ i: 'folder_off', w: 'merah', j: 'Kriteria Kurang Bukti', v: (d.buktiKurang || []).length, h: '#/kesiapan' })}</div>
      <div class="grid g-8-4" style="margin-top:16px"><div class="grid">
        <div class="kartu"><div class="kartu-h"><div><h3>Capaian Indikator vs Target</h3><p>Prodi ${esc(Sesi.me.prodi)} · ${esc(d.ta)}</p></div><a class="btn btn-hantu btn-kecil" href="#/target">Input capaian</a></div><div class="grid g-4-8"><div id="g-cap"></div><div class="daftar">${(d.capaian || []).map(c => `<div class="item"><div class="isi"><b>${esc(c.indikator)}</b><small>Target ${Fmt.angka(c.target)} ${esc(c.satuan || '')} · capaian ${Fmt.angka(c.capaian)} ${c.sumber === 'Tarik-LPPM' ? '· <span style="color:var(--teal)">SIM-LPPM</span>' : ''}</small></div>${chip(c.status)}</div>`).join('') || UI.kosong('Target belum disiapkan Admin LPM.')}</div></div></div>
        <div class="kartu"><div class="kartu-h"><h3>Kesiapan Akreditasi per Kriteria</h3></div><div id="g-krit"></div></div>
        <div class="kartu"><div class="kartu-h"><h3>Bukti yang Masih Kurang</h3></div><div class="daftar">${(d.buktiKurang || []).map(b => '<div class="item"><span class="ms" style="color:var(--merah)">error</span><div class="isi"><b>' + esc(Master.kriteria(b.kriteria)) + '</b><small>' + esc(b.pesan) + '</small></div><a class="btn btn-hantu btn-kecil" href="#/kesiapan">Lengkapi</a></div>').join('') || UI.kosong('Semua kriteria sudah memiliki bukti.', 'task_alt')}</div></div></div>
      <div class="grid">${kartuLppm(d.lppm, 'Riset & PkM Prodi')}${kartuAgenda(d.agenda)}</div></div>`;
    G.donut($('#g-cap', el), { item: itemDonut(cs, warnaCapaian), sub: 'Indikator' });
    const kr = d.kesiapanKriteria || [];
    G.batang($('#g-krit', el), { label: kr.map(x => x.kode), seri: [{ nama: 'Skor', data: kr.map(x => x.skor) }], maks: 100, satuan: '%', warnaPer: (i, v) => v < 70 ? '#DC2626' : null });
  }
  function dashPju(el, d) {
    const k = d.kpi, u = d.unit;
    el.innerHTML = `<div class="kartu sapa"><span class="chip c-biru">PJ Unit · ${esc(u.nama)}</span><h2>Halo, ${esc(Sesi.me.nama.split(',')[0])}!</h2><p>Tindak lanjuti PKPA, pantau hasil audit, capaian indikator, dan pengaduan unit Anda.</p>${u.lppm ? '<div class="banner banner-biru"><span class="ms">hub</span><div><b>Anda PJ unit LPPM</b>Temuan AMI untuk LPPM juga tampil baca-saja di dashboard SIM-LPPM. Penanganan PKPA tetap di MutuHub.' + (u.urlLppm ? ' <a href="' + esc(u.urlLppm) + '" target="_blank" rel="noopener">Buka SIM-LPPM ↗</a>' : '') + '</div></div>' : ''}</div>
      <div class="grid g4" style="margin-top:16px">${kpi({ i: 'assignment_late', w: 'amber', j: 'PKPA Unit Terbuka', v: k.pkpaTerbuka, k: k.pkpaTerlambat + ' terlambat', h: '#/pkpa' })}${kpi({ i: 'track_changes', w: 'hijau', j: 'Indikator Tercapai', v: k.capaianTercapai + ' <small>/ ' + k.capaianTotal + '</small>', h: '#/target' })}${kpi({ i: 'report_problem', w: 'merah', j: 'Pengaduan Unit Aktif', v: k.pengaduan, h: '#/pengaduan' })}${kpi({ i: 'fact_check', j: 'Hasil Audit Unit', v: Object.values(d.hasilAudit || {}).reduce((a, b) => a + b, 0) + ' <small>butir</small>', h: '#/ami' })}</div>
      <div class="grid g-8-4" style="margin-top:16px"><div class="grid"><div class="kartu"><div class="kartu-h"><h3>PKPA Unit</h3></div><div class="daftar">${(d.pkpa || []).map(p => { const s = Fmt.sisaHari(p.Tenggat); return `<div class="item"><span class="ikon-bulat" style="background:${s < 0 ? 'rgba(220,38,38,.1)' : 'var(--biru-muda)'};color:${s < 0 ? 'var(--merah)' : 'var(--biru)'}"><span class="ms">rule</span></span><div class="isi"><b>${esc(p.ID_PKPA)} · ${esc(p.Kategori)}</b><small>${esc(String(p.Uraian_Temuan).slice(0, 120))}</small></div>${chip(p.Status)}<span class="chip ${s < 0 ? 'c-merah' : s <= 7 ? 'c-amber' : 'c-abu'}">${s < 0 ? 'Terlambat ' + (-s) + ' hr' : 'H-' + s}</span><a class="btn btn-utama btn-kecil" href="#/pkpa/${esc(p.ID_PKPA)}">Tindak</a></div>`; }).join('') || UI.kosong('Tidak ada PKPA terbuka.', 'task_alt')}</div></div>
        <div class="grid g2"><div class="kartu"><div class="kartu-h"><h3>Hasil Audit Unit</h3></div><div id="g-ha"></div></div><div class="kartu"><div class="kartu-h"><h3>Capaian Indikator Unit</h3></div><div id="g-cap"></div></div></div></div>
      <div class="grid"><div class="kartu"><div class="kartu-h"><h3>Pengaduan Unit</h3></div><div class="daftar">${(d.pengaduan || []).map(a => '<a class="item" href="#/pengaduan/' + esc(a.id) + '" style="color:inherit;text-decoration:none"><div class="isi"><b>' + esc(a.tiket) + '</b><small>' + esc(a.judul) + '</small></div>' + chip(a.status) + '</a>').join('') || UI.kosong('Tidak ada pengaduan aktif.')}</div></div>${kartuAgenda(d.agenda)}</div></div>`;
    G.donut($('#g-ha', el), { item: itemDonut(d.hasilAudit, warnaTemuan), sub: 'Butir' });
    G.donut($('#g-cap', el), { item: itemDonut(d.capaianStatus, warnaCapaian), sub: 'Indikator' });
  }
  function dashPim(el, d) {
    const k = d.kpi;
    el.innerHTML = `<div class="kartu hero"><div class="label-atas">Dashboard eksekutif · ${esc(d.ta)}</div><h2 style="margin:6px 0;font-size:26px">Assalamu'alaikum, ${esc(Sesi.me.nama.split(',')[0])}</h2><small>Seluruh angka bersifat agregat; data pribadi responden dan pelapor tidak ditampilkan.</small></div>
      <div class="grid g4" style="margin-top:16px">${kpi({ i: 'track_changes', w: 'hijau', j: 'Capaian Indikator Tercapai', v: Fmt.persen(k.capaian), k: 'Semua unit & prodi' })}${kpi({ i: 'rule', j: 'PKPA Ditutup Tepat Waktu', v: Fmt.persen(k.pkpaTepat) })}${kpi({ i: 'sentiment_satisfied', w: 'teal', j: 'Indeks Kepuasan', v: k.kepuasan === null ? '—' : Fmt.angka(k.kepuasan, 1) + ' <small>/ 100</small>', h: '#/survei' })}${kpi({ i: 'verified', w: 'amber', j: 'Kesiapan Akreditasi', v: Fmt.persen(k.kesiapan), h: '#/kesiapan' })}</div>
      <div class="grid g-8-4" style="margin-top:16px"><div class="grid"><div class="kartu"><div class="kartu-h"><div><h3>Perbandingan Antar-Prodi</h3><p>% indikator tercapai dan skor kesiapan akreditasi</p></div></div><div id="g-prodi"></div></div>
        <div class="kartu"><div class="kartu-h"><h3>Tren Capaian Indikator</h3></div><div id="g-tren"></div></div>
        <div class="kartu"><div class="kartu-h"><h3>Keputusan RTM Terbaru</h3><a class="btn btn-hantu btn-kecil" href="#/ppepp">Papan PPEPP</a></div><div class="daftar">${(d.rtm || []).map(r => '<div class="item"><span class="ms" style="color:var(--biru)">gavel</span><div class="isi"><b>' + esc(r.keputusan) + '</b><small>PIC ' + esc(r.pic) + ' · tenggat ' + Fmt.tgl(r.tenggat) + '</small></div></div>').join('') || UI.kosong('Belum ada keputusan RTM.')}</div></div></div>
      <div class="grid"><div class="kartu"><div class="kartu-h"><h3>Status Akreditasi Prodi</h3></div><div id="g-akr"></div><div class="daftar" style="margin-top:10px">${(d.akreditasiProdi || []).map(p => { const s = Fmt.sisaHari(p.berakhir); return '<div class="item"><div class="isi"><b>' + esc(p.nama) + '</b><small>' + esc(p.lembaga || '') + ' · berakhir ' + Fmt.tgl(p.berakhir) + '</small></div>' + (s !== null && s < 365 ? '<span class="chip c-amber">' + (s < 0 ? 'Lewat' : s + ' hari') + '</span>' : '') + chip(p.status) + '</div>'; }).join('')}</div></div>
        <div class="kartu"><div class="kartu-h"><h3>Temuan AMI (Final)</h3></div><div id="g-ami"></div></div>${kartuAgenda(d.agenda)}</div></div>`;
    G.batang($('#g-prodi', el), { label: (d.perProdi || []).map(p => p.kode), seri: [{ nama: 'Indikator tercapai (%)', data: d.perProdi.map(p => p.capaian), warna: '#4B65D6' }, { nama: 'Skor kesiapan (%)', data: d.perProdi.map(p => p.kesiapan), warna: '#22C7D6' }], maks: 100, satuan: '%' });
    G.garis($('#g-tren', el), { label: (d.tren || []).map(x => x.ta), data: (d.tren || []).map(x => x.persen), satuan: '%', warna: '#4B65D6' });
    G.donut($('#g-akr', el), { item: Object.keys(d.akreditasi || {}).map((k2, i) => ({ l: k2, v: d.akreditasi[k2], w: G.PALET[i % 5] })), sub: 'Prodi' });
    G.donut($('#g-ami', el), { item: itemDonut(d.temuanAmi, warnaTemuan), sub: 'Butir' });
  }

  /* ---------------- Profil ---------------- */
  Hal.daftar('/profil', {
    judul: 'Profil & Notifikasi', menu: 'dashboard',
    async render(el) {
      const me = Sesi.me;
      el.innerHTML = `<div class="kepala-hal"><div><h1>Profil & Notifikasi</h1><p>Atur nomor WhatsApp dan kanal pengingat Anda.</p></div></div>
        <div class="grid g2" style="margin-top:14px"><div class="kartu"><div style="display:flex;gap:14px;align-items:center"><div class="avatar" style="width:64px;height:64px;font-size:22px">${esc(Fmt.inisial(me.nama))}</div><div><b style="font-size:18px">${esc(me.nama)}</b><div class="catatan">${esc(me.email)}</div>${chip(w.MH.ROLE_LABEL[me.role], 'c-biru')} ${me.unit ? chip(Master.unit(me.unit), 'c-abu') : ''} ${me.prodi ? chip(Master.prodi(me.prodi), 'c-abu') : ''}</div></div>
          ${me.darurat ? '<div class="banner banner-kuning" style="margin-top:14px"><span class="ms">key</span><div><b>Anda masuk dengan akses darurat.</b>Segera daftarkan akun Google Super Admin di Pengaturan → Pengguna, isi Client ID, lalu ganti sandi darurat.</div></div>' : `<form id="f-prof" class="form" style="margin-top:14px">${F.formHtml([{ k: 'No_WA', l: 'Nomor WhatsApp', ph: '0812xxxxxxxx', bantu: 'Dipakai untuk pengingat PKPA, audit, RTM, dan lainnya.' }, { k: 'Kanal_Notifikasi', l: 'Kanal notifikasi', t: 'pilih', opsi: [['WA+Email', 'WhatsApp + Email'], ['WA', 'WhatsApp saja'], ['Email', 'Email saja'], ['Aplikasi', 'Hanya lonceng di aplikasi']], kosong: false }], { No_WA: me.wa, Kanal_Notifikasi: me.kanal || 'WA+Email' })}<div class="aksi"><button class="btn btn-utama"><span class="ms">save</span>Simpan</button></div></form>`}</div>
        <div class="kartu"><div class="kartu-h"><h3>Keamanan sesi</h3></div><p class="catatan">Sesi berlaku 12 jam. Bila perangkat hilang, akhiri semua sesi akun ini.</p><button class="btn btn-bahaya" id="b-semua"><span class="ms">devices</span>Keluar dari semua perangkat</button><div class="kartu-h" style="margin-top:20px"><h3>Aplikasi</h3></div><p class="catatan">MutuHub v${MH.VERSI}. Pasang di laptop/HP agar terbuka seperti aplikasi.</p><button class="btn btn-hantu" id="b-pasang"><span class="ms">install_mobile</span>Pasang Aplikasi</button> <button class="btn btn-hantu" onclick="MH.Perf.summary();MH.UI.toast('Ringkasan kinerja ditulis di konsol (F12).')"><span class="ms">speed</span>Kinerja</button></div></div>`;
      const f = $('#f-prof', el);
      if (f) f.onsubmit = async e => { e.preventDefault(); const v = F.bacaForm(f, [{ k: 'No_WA' }, { k: 'Kanal_Notifikasi' }]); const r = await UI.aksi($('button', f), 'profil.simpan', v); if (r.success) Sesi.simpan(Sesi.token, Object.assign({}, Sesi.me, { wa: v.No_WA, kanal: v.Kanal_Notifikasi })); };
      $('#b-semua', el).onclick = async () => { const k = await UI.konfirmasi('Keluar dari semua perangkat', 'Semua sesi akun ini (termasuk perangkat ini) akan diakhiri.', { bahaya: true, teksOk: 'Akhiri semua sesi' }); if (k.ok) { await API.call('auth.keluarSemua', {}); Sesi.keluar(); } };
      $('#b-pasang', el).onclick = () => w.Aplikasi.pasang();
    }
  });

  /* ---------------- Portal Responden: Survei ---------------- */
  function kepalaPortal(judul, sub) { return `<div class="portal-kepala"><div style="display:flex;gap:10px;align-items:center"><span class="ms isi" style="font-size:28px">verified</span><div><b style="font-size:13px;opacity:.85">MutuHub · ${esc(Master.setelan.NAMA_KAMPUS || 'Portal Responden')}</b><h2 style="margin:2px 0 0;font-size:22px">${esc(judul)}</h2></div></div>${sub ? '<p style="margin:10px 0 0;opacity:.85">' + esc(sub) + '</p>' : ''}</div>`; }
  Hal.daftar('/s/:t', {
    judul: 'Survei', async render(el, p) {
      el.innerHTML = '<div class="portal-kartu">' + kepalaPortal('Survei Kepuasan', 'Memuat survei…') + UI.kerangka(3, 90) + '</div>';
      const r = await API.call('portal.survei.ambil', { t: p.t });
      if (!r.success) { el.innerHTML = '<div class="portal-kartu">' + kepalaPortal('Survei') + '<div class="kartu">' + (r.code === 'USED' ? '<div class="banner banner-hijau"><span class="ms">task_alt</span><div><b>Terima kasih!</b>' + esc(r.message) + '</div></div>' : UI.galat(r)) + '</div></div>'; return; }
      const d = r.data;
      el.innerHTML = '<div class="portal-kartu">' + kepalaPortal(d.judul, d.deskripsi) + `<div class="banner banner-biru" style="margin-bottom:12px"><span class="ms">shield</span><div><b>Jawaban Anda anonim.</b>Tautan ini sekali pakai dan tidak menyimpan identitas Anda. Kelompok: ${esc(d.kelompok)}.</div></div><form id="f-srv" class="grid">` +
        d.pertanyaan.map((q, i) => `<div class="kartu"><b style="display:block;margin-bottom:10px">${i + 1}. ${esc(q.Teks)} ${q.Wajib === 'Ya' ? '<span style="color:var(--merah)">*</span>' : ''}</b>${q.Tipe === 'Skala' ? '<div class="skala">' + Array.from({ length: Number(String(q.Opsi || '1-5').split('-')[1]) || 5 }, (_, k) => '<label><input type="radio" name="' + esc(q.ID) + '" value="' + (k + 1) + '"><span>' + (k + 1) + '</span></label>').join('') + '</div><div class="catatan" style="display:flex;justify-content:space-between;margin-top:6px"><span>Sangat kurang</span><span>Sangat baik</span></div>' : q.Tipe === 'Pilihan' ? String(q.Opsi).split(/\s*[;|]\s*/).map(o => '<label class="cekbox" style="display:flex;margin:6px 0"><input type="radio" name="' + esc(q.ID) + '" value="' + esc(o) + '"> ' + esc(o) + '</label>').join('') : '<div class="isian"><textarea name="' + esc(q.ID) + '" maxlength="2000" placeholder="Tulis jawaban Anda"></textarea></div>'}</div>`).join('') + '<button class="btn btn-utama" style="min-height:52px"><span class="ms">send</span>Kirim Jawaban</button></form></div>';
      $('#f-srv').onsubmit = async e => {
        e.preventDefault(); const j = {};
        d.pertanyaan.forEach(q => { const x = q.Tipe === 'Teks' ? $('[name="' + q.ID + '"]').value.trim() : ($('[name="' + q.ID + '"]:checked') || {}).value; if (x) j[q.ID] = q.Tipe === 'Skala' ? Number(x) : x; });
        const kurang = d.pertanyaan.filter(q => q.Wajib === 'Ya' && !j[q.ID]); if (kurang.length) { UI.toast('Mohon jawab pertanyaan wajib (' + kurang.length + ' belum).', 'galat'); return; }
        const rr = await UI.aksi($('#f-srv button.btn-utama'), 'portal.survei.kirim', { t: p.t, jawaban: j }, { diam: true });
        if (rr.success) el.innerHTML = '<div class="portal-kartu">' + kepalaPortal(d.judul) + '<div class="kartu" style="text-align:center;padding:40px"><span class="ms isi" style="font-size:56px;color:var(--hijau)">task_alt</span><h2>Terima kasih!</h2><p class="catatan">' + esc(rr.message) + '</p></div></div>';
      };
    }
  });

  /* ---------------- Portal Responden: Pengaduan ---------------- */
  Hal.daftar('/aduan', {
    judul: 'Pengaduan Mutu', async render(el) {
      el.innerHTML = '<div class="portal-kartu">' + kepalaPortal('Pengaduan Mutu', 'Sampaikan keluhan atau masukan layanan kampus. Boleh anonim.') + UI.kerangka(2, 120) + '</div>';
      const r = await API.call('portal.captcha', {});
      if (!r.success) { el.innerHTML = '<div class="portal-kartu">' + kepalaPortal('Pengaduan Mutu') + UI.galat(r) + '</div>'; return; }
      let cap = r.data;
      el.innerHTML = '<div class="portal-kartu">' + kepalaPortal('Pengaduan Mutu', 'Sampaikan keluhan atau masukan layanan ' + (cap.institusi || 'kampus') + '. Boleh anonim.') + `<div class="kartu"><div class="tab-pil" style="margin-bottom:14px"><button class="aktif" data-t="kirim">Kirim pengaduan</button><button data-t="cek">Cek status tiket</button></div>
        <form id="f-adu" class="form">${F.formHtml([{ k: 'kategori', l: 'Kategori', t: 'pilih', opsi: cap.kategori, wajib: true }, { k: 'unit', l: 'Unit terkait (bila tahu)', t: 'pilih', opsi: cap.unit.map(u => [u.kode, u.nama]), kosong: '— tidak tahu —' }, { k: 'judul', l: 'Judul singkat', wajib: true, penuh: true }, { k: 'isi', l: 'Uraian pengaduan', t: 'area', wajib: true, bantu: 'Minimal 20 karakter. Jangan menulis data pribadi orang lain.' }])}
          <label class="cekbox"><input type="checkbox" id="anonim" checked> Kirim secara anonim</label>
          <div id="identitas" hidden class="form-grid"><div class="isian"><label>Nama (opsional)</label><input id="nama" maxlength="100"></div><div class="isian"><label>Email / WhatsApp untuk kabar penyelesaian</label><input id="kontak" maxlength="120"></div></div>
          <div class="isian"><label>Lampiran (opsional, gambar/PDF ≤ 2 MB)</label><input type="file" id="lamp" accept="image/png,image/jpeg,image/webp,application/pdf"></div>
          <div class="isian"><label>Verifikasi: <b id="soal">${esc(cap.soal)}</b></label><input id="jawab" inputmode="numeric" required style="max-width:160px"></div>
          <button class="btn btn-utama" style="min-height:50px"><span class="ms">send</span>Kirim Pengaduan</button></form>
        <form id="f-cek" class="form" hidden><div class="isian"><label>Kode tiket</label><input id="tiket" placeholder="ADU-XXXXXXXX" style="text-transform:uppercase" required></div><button class="btn btn-utama">Cek Status</button><div id="hasil-cek"></div></form></div>`;
      $$('[data-t]', el).forEach(b => b.onclick = () => { $$('[data-t]', el).forEach(x => x.classList.toggle('aktif', x === b)); $('#f-adu').hidden = b.dataset.t !== 'kirim'; $('#f-cek').hidden = b.dataset.t !== 'cek'; });
      $('#anonim').onchange = () => { $('#identitas').hidden = $('#anonim').checked; };
      $('#f-adu').onsubmit = async e => {
        e.preventDefault();
        const v = F.bacaForm($('#f-adu'), [{ k: 'kategori', l: 'Kategori', wajib: true }, { k: 'unit' }, { k: 'judul', l: 'Judul', wajib: true }, { k: 'isi', l: 'Uraian', wajib: true }]); if (!v) return;
        const data = Object.assign(v, { anonim: $('#anonim').checked, nama: $('#nama').value, kontak: $('#kontak').value, c: cap.c, jawab: $('#jawab').value });
        const f = $('#lamp').files[0];
        if (f) { if (f.size > 2 * 1048576) { UI.toast('Lampiran maksimal 2 MB.', 'galat'); return; } const b = new Uint8Array(await f.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); data.lampiran = { mime: f.type, data: btoa(s) }; }
        const rr = await UI.aksi($('#f-adu .btn-utama'), 'portal.aduan.kirim', data, { diam: true });
        if (rr.success) $('#f-adu').innerHTML = '<div class="banner banner-hijau"><span class="ms">task_alt</span><div><b>Pengaduan terkirim.</b>Simpan kode tiket Anda: <b class="mono" style="font-size:18px">' + esc(rr.data.tiket) + '</b><br>Gunakan tab <i>Cek status tiket</i> untuk memantau penanganan.</div></div>';
        else { const c2 = await API.call('portal.captcha', {}); if (c2.success) { cap = c2.data; $('#soal').textContent = cap.soal; $('#jawab').value = ''; } }
      };
      $('#f-cek').onsubmit = async e => {
        e.preventDefault(); const rr = await UI.aksi($('#f-cek .btn-utama'), 'portal.aduan.status', { tiket: $('#tiket').value }, { diam: true });
        $('#hasil-cek').innerHTML = rr.success ? `<div class="kartu pucat"><b>${esc(rr.data.judul)}</b> ${chip(rr.data.status)}<div class="catatan">${esc(rr.data.kategori)} · masuk ${Fmt.waktu(rr.data.masuk)}</div>${rr.data.ringkasan ? '<div class="banner banner-hijau" style="margin-top:10px"><span class="ms">task_alt</span><div><b>Penyelesaian</b>' + esc(rr.data.ringkasan) + '</div></div>' : ''}<div class="timeline" style="margin-top:12px">${rr.data.riwayat.map(x => '<div class="t"><span class="titik"></span><div><b>' + esc(x.aksi) + '</b><br><small>' + Fmt.waktu(x.waktu) + '</small></div></div>').join('')}</div></div>` : '';
      };
    }
  });

  /* ---------------- Verifikasi dokumen publik ---------------- */
  async function verifikasi(el, kode) {
    el.innerHTML = '<div class="portal-kartu">' + kepalaPortal('Verifikasi Dokumen', 'Pindai QR pada dokumen resmi MutuHub atau tempel kodenya.') + '<div class="kartu"><form id="f-v" class="form" style="grid-template-columns:1fr auto;display:grid;align-items:end"><div class="isian"><label>Kode verifikasi</label><input id="kv" value="' + esc(kode || '') + '" placeholder="KODE.TANDA-TANGAN"></div><button class="btn btn-utama">Periksa</button></form><div id="hv" style="margin-top:14px"></div></div></div>';
    const cek = async () => {
      const k = $('#kv').value.trim(); if (!k) return;
      $('#hv').innerHTML = UI.kerangka(1, 120);
      const r = await API.call('verif.cek', { k });
      if (!r.success) { $('#hv').innerHTML = '<div class="banner banner-merah"><span class="ms">gpp_bad</span><div><b>TIDAK VALID</b>' + esc(r.message) + '</div></div>'; return; }
      const d = r.data, sah = d.status === 'SAH';
      $('#hv').innerHTML = `<div class="banner ${sah ? 'banner-hijau' : 'banner-merah'}"><span class="ms isi" style="font-size:30px">${sah ? 'verified' : 'gpp_bad'}</span><div><b style="font-size:16px">${sah ? 'DOKUMEN SAH' : 'DOKUMEN DITARIK'}</b>Diterbitkan ${esc(d.lembaga)} ${esc(d.institusi)}</div></div>
        <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><tbody>${[['Jenis', d.jenis], ['Nomor', d.nomor || '—'], ['Judul', d.judul], ['Terbit', Fmt.waktu(d.terbit) + ' WIB'], ['Penanda tangan', d.oleh], ['SHA-256 PDF', d.hash ? '<span class="mono" style="word-break:break-all">' + esc(d.hash) + '</span>' : '—']].map(r2 => '<tr><td style="width:160px;color:var(--teks-2)">' + r2[0] + '</td><td>' + (r2[0] === 'SHA-256 PDF' ? r2[1] : esc(r2[1])) + '</td></tr>').join('')}</tbody></table></div>
        ${d.hash ? '<div class="isian" style="margin-top:12px"><label>Cocokkan berkas PDF yang Anda pegang</label><input type="file" id="pdf" accept="application/pdf"><small id="hpdf">Hash dihitung di perangkat Anda; berkas tidak diunggah.</small></div>' : ''}`;
      const pdf = $('#pdf'); if (pdf) pdf.onchange = async () => { const f = pdf.files[0]; if (!f || !crypto.subtle) return; const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await f.arrayBuffer()))).map(b => b.toString(16).padStart(2, '0')).join(''); $('#hpdf').innerHTML = h === d.hash ? '<b style="color:var(--hijau)">✓ Cocok — berkas identik dengan yang diterbitkan.</b>' : '<b style="color:var(--merah)">✗ Tidak cocok — berkas telah diubah atau bukan dokumen ini.</b>'; };
    };
    $('#f-v').onsubmit = e => { e.preventDefault(); cek(); };
    if (kode) cek();
  }
  Hal.daftar('/v/:k', { judul: 'Verifikasi Dokumen', render: (el, p) => verifikasi(el, p.k) });
  Hal.daftar('/v/', { judul: 'Verifikasi Dokumen', render: el => verifikasi(el, '') });
  Hal.daftar('/v', { judul: 'Verifikasi Dokumen', render: el => verifikasi(el, '') });

  /* ---------------- Prefetch saat menganggur ---------------- */
  w.MH.prefetch = function (role) {
    const ta = State.ta, list = [];
    if (['SA', 'ADM', 'AUD', 'PJU', 'GKM'].indexOf(role) >= 0) list.push(['pkpa', 'data.list', { e: 'PKPA' }]);
    list.push(['spmi', 'spmi.daftar', {}], ['ppepp:' + ta, 'ppepp.papan', { ta }], ['kesiapan:' + ta, 'kesiapan.data', { ta }]);
    list.forEach(x => { if (!Store.intip(x[0])) API.q(x[1], x[2]).then(r => { if (r.success) Store.taruh(x[0], r.data); }); });
  };
})(window);
