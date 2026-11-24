/* =====================================================================
 * app.js — Shell aplikasi: login (Google + akses darurat), sidebar per
 * peran (PRD 7.3), topbar (cari, kesegaran integrasi, lonceng, profil),
 * pemilih tahun akademik/semester, router, PWA (tombol instal), bahasa.
 * ===================================================================== */
(function (w) {
  'use strict';
  const { $, $$, esc, Fmt, API, Store, Sesi, Router, UI, Master, hangatkan, Aktivitas } = w.MH;

  /* ---------- Bahasa (ID default, EN untuk kerangka antarmuka) ---------- */
  const EN = { 'Dashboard Mutu': 'Quality Dashboard', 'Dokumen SPMI': 'SPMI Documents', 'Standar & Target': 'Standards & Targets', 'Audit Mutu Internal': 'Internal Audit', 'PKPA': 'CAPA', 'PPEPP & RTM': 'PPEPP & Mgmt Review', 'Evaluasi Diri Prodi': 'Program Self-Evaluation', 'Pusat Akreditasi': 'Accreditation Hub', 'Bukti Dukung & Kesiapan': 'Evidence & Readiness', 'Survei': 'Surveys', 'Pengaduan': 'Complaints', 'Benchmarking': 'Benchmarking', 'Pusat Integrasi': 'Integration Hub', 'Laporan & Ekspor': 'Reports & Export', 'WhatsApp & Notifikasi': 'WhatsApp & Notifications', 'CRM Kontak': 'Contact CRM', 'Pengguna & Pengaturan': 'Users & Settings', 'Cari standar, dokumen, auditor, bukti…': 'Search standards, documents, auditors…', 'Keluar': 'Log out', 'Pasang Aplikasi': 'Install App', 'Utama': 'Main', 'Siklus Mutu': 'Quality Cycle', 'Akreditasi': 'Accreditation', 'Layanan': 'Services', 'Sistem': 'System', 'Ringkasan Eksekutif': 'Executive Summary', 'Status PPEPP': 'PPEPP Status', 'Capaian IKU & IKT': 'KPI Achievement', 'Temuan Audit': 'Audit Findings' };
  let bahasa = localStorage.getItem('mh:bahasa') || 'id';
  const t = s => bahasa === 'en' && EN[s] ? EN[s] : s;

  /* ---------- Menu per peran ---------- */
  const SEMUA = ['SA', 'ADM', 'AUD', 'GKM', 'PJU', 'PIM'];
  const MENU = [
    { g: 'Utama' },
    { k: 'dashboard', l: 'Dashboard Mutu', i: 'space_dashboard', r: SEMUA },
    { k: 'spmi', l: 'Dokumen SPMI', i: 'menu_book', r: SEMUA },
    { k: 'target', l: 'Standar & Target', i: 'track_changes', r: SEMUA },
    { g: 'Siklus Mutu' },
    { k: 'ami', l: 'Audit Mutu Internal', i: 'fact_check', r: ['SA', 'ADM', 'AUD', 'PJU', 'PIM'] },
    { k: 'pkpa', l: 'PKPA', i: 'rule', r: ['SA', 'ADM', 'AUD', 'PJU', 'GKM', 'PIM'], jml: 'pkpa' },
    { k: 'ppepp', l: 'PPEPP & RTM', i: 'sync_alt', r: SEMUA },
    { k: 'evdiri', l: 'Evaluasi Diri Prodi', i: 'assignment', r: SEMUA },
    { g: 'Akreditasi' },
    { k: 'akreditasi', l: 'Pusat Akreditasi', i: 'workspace_premium', r: SEMUA },
    { k: 'kesiapan', l: 'Bukti Dukung & Kesiapan', i: 'folder_special', r: SEMUA, jml: 'kritis' },
    { g: 'Layanan' },
    { k: 'survei', l: 'Survei', i: 'poll', r: SEMUA },
    { k: 'pengaduan', l: 'Pengaduan', i: 'report_problem', r: SEMUA },
    { k: 'benchmarking', l: 'Benchmarking', i: 'analytics', r: SEMUA },
    { g: 'Sistem' },
    { k: 'integrasi', l: 'Pusat Integrasi', i: 'hub', r: ['SA', 'ADM', 'PIM'] },
    { k: 'laporan', l: 'Laporan & Ekspor', i: 'download_for_offline', r: SEMUA },
    { k: 'notifikasi', l: 'WhatsApp & Notifikasi', i: 'chat', r: ['SA', 'ADM'] },
    { k: 'crm', l: 'CRM Kontak', i: 'contacts', r: ['SA', 'ADM'] },
    { k: 'pengaturan', l: 'Pengguna & Pengaturan', i: 'settings', r: ['SA', 'ADM'] }
  ];
  const NAVBAWAH = { SA: ['dashboard', 'pkpa', 'akreditasi', 'kesiapan'], ADM: ['dashboard', 'pkpa', 'akreditasi', 'kesiapan'], AUD: ['dashboard', 'ami', 'pkpa', 'evdiri'], GKM: ['dashboard', 'evdiri', 'akreditasi', 'target'], PJU: ['dashboard', 'pkpa', 'pengaduan', 'target'], PIM: ['dashboard', 'laporan', 'akreditasi', 'survei'] };
  const bolehMenu = k => { const m = MENU.find(x => x.k === k); return !m || !Sesi.me || m.r.indexOf(Sesi.me.role) >= 0; };

  /* ---------- Status global ---------- */
  const State = {
    ta: localStorage.getItem('mh:ta') || '', sem: localStorage.getItem('mh:sem') || '', boot: null, jml: {},
    setTA(ta) { this.ta = ta; localStorage.setItem('mh:ta', ta); },
    setSem(s) { this.sem = s; localStorage.setItem('mh:sem', s); }
  };
  w.MH.State = State;
  w.MH.ROLE_LABEL = { SA: 'Super Admin LPM', ADM: 'Admin LPM', AUD: 'Auditor Internal', GKM: 'GKM Prodi', PJU: 'PJ Unit', PIM: 'Pimpinan' };

  /* ---------- Halaman ---------- */
  const HAL = {};
  w.MH.Hal = { daftar(pola, def) { HAL[pola] = def; Router.daftar(pola, def); } };

  /* ---------- PWA ---------- */
  let promptPasang = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptPasang = e; $$('[data-pasang]').forEach(b => b.hidden = false); });
  addEventListener('appinstalled', () => { promptPasang = null; $$('[data-pasang]').forEach(b => b.hidden = true); UI.toast('MutuHub terpasang di perangkat Anda.', 'sukses'); });
  const terpasang = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  async function pasang() {
    if (promptPasang) { promptPasang.prompt(); const r = await promptPasang.userChoice; if (r.outcome === 'accepted') promptPasang = null; return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    UI.modal({ judul: 'Pasang MutuHub', isi: ios ? '<p>Di iPhone/iPad (Safari): ketuk tombol <b>Bagikan</b> <span class="ms">ios_share</span> lalu pilih <b>Tambahkan ke Layar Utama</b>.</p>' : '<p>Di Chrome/Edge: buka menu <b>⋮</b> lalu pilih <b>Instal aplikasi</b> / <b>Tambahkan ke layar utama</b>. Di laptop, ikon instal <span class="ms">install_desktop</span> juga muncul di bilah alamat.</p>' });
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { }));

  /* ---------- Login ---------- */
  function tampilkanLogin(mode) {
    hangatkan('pub');
    const r = $('#akar');
    const konfigOk = API.siap();
    r.innerHTML = `<div class="layar-penuh"><div class="kartu-login">
      <div class="login-kiri"><span class="pil-kaca" style="align-self:flex-start"><span class="ms">school</span>SIM-LPM ${esc((Master.setelan.NAMA_KAMPUS || 'STIS Al Wafa').toUpperCase())}</span>
        <h1>WELCOME</h1><h2>MUTUHUB KAMPUS</h2><div class="sub">Sistem Penjaminan Mutu Internal (SPMI)</div>
        <p>Portal terpadu penjaminan mutu, audit mutu internal (AMI), evaluasi diri program studi, dan kesiapan akreditasi institusi.</p>
        <div class="bola" style="width:300px;height:300px;left:120px;bottom:-60px"></div><div class="bola" style="width:180px;height:180px;left:-50px;bottom:10px;opacity:.8"></div><div class="bola" style="width:110px;height:110px;left:330px;bottom:150px;opacity:.35;filter:blur(2px)"></div>
        <div style="margin-top:auto;position:relative;z-index:1"><span class="pil-kaca"><span class="ms" style="color:#86efac">verified_user</span>Terakreditasi BAN-PT • Terintegrasi SIM-LPPM</span></div></div>
      <div class="login-kanan">
        <div><h3>Masuk</h3><p class="catatan" style="font-size:14px;margin:6px 0 0">Gunakan akun Google kampus Anda untuk melanjutkan.</p></div>
        ${konfigOk ? '' : '<div class="banner banner-merah"><span class="ms">error</span><div><b>Konfigurasi belum lengkap</b>Isi <code>GAS_URL</code> di <code>js/config.js</code> dengan URL /exec Apps Script, lalu kirim ulang ke GitHub.</div></div>'}
        <div id="tombol-google" style="min-height:46px;display:flex;justify-content:center"></div>
        <div class="atau">atau</div>
        <form id="f-darurat" class="form" ${mode === 'darurat' ? '' : 'hidden'} autocomplete="off">
          <div class="isian ikon"><label class="sr" for="u">Nama pengguna</label><span class="ms">person</span><input id="u" placeholder="Nama pengguna darurat" autocomplete="username" required></div>
          <div class="isian ikon"><label class="sr" for="p">Kata sandi</label><span class="ms">lock</span><input id="p" type="password" placeholder="Kata sandi" autocomplete="current-password" required><button type="button" class="btn btn-kecil" id="lihat" style="position:absolute;right:8px;bottom:9px;background:none;color:#5B6377">LIHAT</button></div>
          <button class="btn btn-gelap" style="min-height:52px;border-radius:16px">Masuk</button>
        </form>
        <button class="btn btn-hantu" id="b-darurat" ${mode === 'darurat' ? 'hidden' : ''} style="min-height:50px;border-radius:16px"><span class="ms">key</span>Masuk dengan akses darurat</button>
        <div class="banner banner-biru" style="font-size:12.5px"><span class="ms">groups</span><div><b>Mahasiswa, alumni, mitra?</b>Isi survei lewat tautan yang Anda terima, atau <a href="#/aduan">kirim pengaduan mutu</a> tanpa akun. Cek keaslian dokumen di <a href="#/v/">halaman verifikasi</a>.</div></div>
        <button class="btn btn-hantu btn-kecil" data-pasang ${promptPasang && !terpasang() ? '' : 'hidden'} style="align-self:center"><span class="ms">install_mobile</span>Pasang Aplikasi</button>
        <div class="catatan" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;border-top:1px solid var(--garis);padding-top:12px">© ${new Date().getFullYear()} ${esc(Master.setelan.NAMA_LEMBAGA || 'Lembaga Penjaminan Mutu')} • ${esc(Master.setelan.NAMA_KAMPUS || 'STIS Al Wafa Bogor')}<span>MutuHub v${MH.VERSI}</span></div>
      </div></div></div>`;
    $('[data-pasang]', r).onclick = pasang;
    $('#b-darurat').onclick = () => { $('#f-darurat').hidden = false; $('#b-darurat').hidden = true; $('#u').focus(); };
    $('#lihat').onclick = () => { const p = $('#p'); p.type = p.type === 'password' ? 'text' : 'password'; $('#lihat').textContent = p.type === 'password' ? 'LIHAT' : 'SEMBUNYI'; };
    $('#f-darurat').onsubmit = async e => {
      e.preventDefault(); const b = $('#f-darurat button.btn-gelap');
      const res = await UI.aksi(b, 'auth.darurat', { username: $('#u').value, password: $('#p').value }, { diam: true });
      if (res.success) { $('#p').value = ''; masuk(res.data); }
    };
    if (konfigOk) API.call('auth.config', {}).then(res => {
      if (!res.success) return;
      Master.setelan.NAMA_KAMPUS = res.data.namaKampus;
      const cid = res.data.googleClientId, wadah = $('#tombol-google'); if (!wadah) return;
      if (!cid) { wadah.innerHTML = '<div class="catatan" style="text-align:center">Login Google belum diaktifkan. Admin: masuk dengan akses darurat lalu isi Client ID di <b>Pengaturan → Keamanan</b>.</div>'; return; }
      const mulai = () => { try { w.google.accounts.id.initialize({ client_id: cid, callback: async c => { UI.toast('Memverifikasi akun Google…'); const rr = await API.call('auth.google', { credential: c.credential }); if (rr.success) masuk(rr.data); else UI.toast(rr.message, 'galat'); }, ux_mode: 'popup' }); w.google.accounts.id.renderButton(wadah, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: Math.min(360, wadah.clientWidth || 320), locale: 'id' }); } catch (e) { wadah.textContent = 'Tombol Google gagal dimuat.'; } };
      if (w.google && w.google.accounts) mulai(); else { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = mulai; document.head.appendChild(s); }
    });
  }
  function masuk(d) { Sesi.simpan(d.token, d.me); State.boot = null; location.hash = '#/dashboard'; mulaiApp(); }

  /* ---------- Shell ---------- */
  function shellHtml() {
    const me = Sesi.me, s = Master.setelan;
    const menu = MENU.filter(m => m.g || m.r.indexOf(me.role) >= 0).filter((m, i, a) => !(m.g && (!a[i + 1] || a[i + 1].g)));
    return `<div class="kanvas"><div class="app">
      <aside class="sidebar" id="sidebar" aria-label="Menu utama">
        <div class="merek"><div class="logo">${s.LOGO_URL ? '<img src="' + esc(s.LOGO_URL) + '" alt="">' : '<span class="ms isi">verified</span>'}</div><div class="nm"><b>MutuHub <span class="lencana-app">v${MH.VERSI.split('.').slice(0, 2).join('.')}</span></b><small>${esc(s.NAMA_KAMPUS || '')}</small></div></div>
        <nav class="menu">${menu.map(m => m.g ? '<div class="grup">' + esc(t(m.g)) + '</div>' : '<a href="#/' + m.k + '" data-m="' + m.k + '" title="' + esc(t(m.l)) + '"><span class="ms">' + m.i + '</span><span class="teks-menu">' + esc(t(m.l)) + '</span>' + (m.jml ? '<span class="jml" data-jml="' + m.jml + '" hidden></span>' : '') + '</a>').join('')}</nav>
        <div class="sidebar-bawah">
          <div class="kartu-pasang" ${terpasang() ? 'hidden' : ''}><b>${esc(t('Pasang Aplikasi'))}</b><span class="catatan">Buka MutuHub seperti aplikasi di laptop & HP.</span><button class="btn btn-utama btn-kecil" style="width:100%;margin-top:8px" data-pasang-sb><span class="ms">install_desktop</span>${esc(t('Pasang Aplikasi'))}</button></div>
          <div class="profil-mini"><div class="nm"><b>${esc(me.nama)}</b><small>${esc(w.MH.ROLE_LABEL[me.role] || me.role)}</small></div><button class="btn btn-bahaya btn-kecil" id="b-keluar" title="${esc(t('Keluar'))}"><span class="ms">logout</span><span class="nm">${esc(t('Keluar'))}</span></button></div>
        </div>
      </aside>
      <section class="utama">
        <header class="topbar">
          <button class="ikon-btn hanya-hp" id="b-menu" aria-label="Buka menu"><span class="ms">menu</span></button>
          <div class="cari"><span class="ms">search</span><input id="cari-global" type="search" placeholder="${esc(t('Cari standar, dokumen, auditor, bukti…'))}" aria-label="Pencarian global" autocomplete="off"><div class="hasil-cari" hidden></div></div>
          <button class="pil-segar segar-abu" id="pil-segar" title="Kesegaran data SIM-LPPM"><i></i><span class="teks">SIM-LPPM</span></button>
          <span class="spacer"></span>
          <div class="bahasa" role="group" aria-label="Bahasa"><button data-bhs="id" class="${bahasa === 'id' ? 'aktif' : ''}">ID</button><button data-bhs="en" class="${bahasa === 'en' ? 'aktif' : ''}">EN</button></div>
          <a class="ikon-btn" href="#/pengaduan" aria-label="Pengaduan"><span class="ms">mail</span></a>
          <div style="position:relative"><button class="ikon-btn" id="b-lonceng" aria-label="Notifikasi"><span class="ms">notifications</span><span class="badge" id="lonceng-n" hidden>0</span></button><div class="panel-notif" id="panel-notif" hidden></div></div>
          <a class="saya" href="#/profil"><div class="avatar">${me.foto ? '<img src="' + esc(me.foto) + '" alt="">' : esc(Fmt.inisial(me.nama))}</div><div class="nm"><b>${esc(me.nama)}</b><small>${esc(w.MH.ROLE_LABEL[me.role] || me.role)}</small></div></a>
        </header>
        <div class="baris-filter"><div class="tab-pil" id="tab-cepat"></div><span class="spacer"></span><div class="tab-pil" id="pil-ta"></div><div class="segmen" id="pil-sem"><button data-s="Ganjil">Ganjil</button><button data-s="Genap">Genap</button></div></div>
        <main id="konten" tabindex="-1"></main>
      </section></div></div>
      <nav class="navbawah" id="navbawah"></nav>`;
  }
  function pasangShell() {
    $('#akar').innerHTML = shellHtml();
    $('#b-keluar').onclick = async () => { const k = await UI.konfirmasi('Keluar', 'Keluar dari MutuHub di perangkat ini?', { teksOk: 'Keluar' }); if (k.ok) Sesi.keluar(); };
    $('#b-menu').onclick = () => $('#sidebar').classList.toggle('buka');
    $('#konten').addEventListener('click', () => $('#sidebar').classList.remove('buka'));
    $('[data-pasang-sb]').onclick = pasang;
    $$('[data-bhs]').forEach(b => b.onclick = () => { bahasa = b.dataset.bhs; localStorage.setItem('mh:bahasa', bahasa); pasangShell(); isiShell(); Router.jalan(); });
    $('#pil-segar').onclick = () => { if (bolehMenu('integrasi')) location.hash = '#/integrasi'; };
    $('#pil-sem').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; State.setSem(b.dataset.s); isiFilter(); };
    $('#b-lonceng').onclick = bukaLonceng;
    pasangCari();
    const nb = NAVBAWAH[Sesi.me.role] || NAVBAWAH.ADM;
    $('#navbawah').innerHTML = nb.map(k => { const m = MENU.find(x => x.k === k); return '<a href="#/' + k + '" data-m="' + k + '"><span class="ms">' + m.i + '</span>' + esc(t(m.l).split(' ')[0]) + '</a>'; }).join('') + '<a href="#" id="nb-lain"><span class="ms">menu</span>Lainnya</a>';
    $('#nb-lain').onclick = e => { e.preventDefault(); $('#sidebar').classList.add('buka'); };
  }
  function isiShell() {
    const b = State.boot; if (!b) return;
    const seg = b.integrasi && b.integrasi.lppm, pil = $('#pil-segar');
    if (pil && seg) {
      const warna = seg.warna || 'abu';
      pil.className = 'pil-segar segar-' + warna;
      $('.teks', pil).textContent = !seg.dikonfigurasi ? 'SIM-LPPM belum terhubung' : warna === 'hijau' ? 'SIM-LPPM Terhubung (' + String(seg.waktu).slice(11, 16) + ' WIB)' : 'SIM-LPPM ' + (seg.jam === null ? 'belum ditarik' : seg.jam + ' jam lalu');
      pil.title = seg.waktu ? 'Terakhir disinkron ' + seg.waktu + ' WIB' + (seg.galat ? ' · Galat: ' + seg.galat : '') : 'Belum pernah disinkron';
    }
    setLonceng(b.lonceng || 0);
    isiFilter();
  }
  function isiFilter() {
    const daftar = Master.opsiTA(); if (!State.ta || daftar.indexOf(State.ta) < 0) State.setTA(Master.setelan.TAHUN_AKTIF || daftar[0] || '');
    if (!State.sem) State.setSem(Master.setelan.SEMESTER_AKTIF || 'Ganjil');
    $('#pil-ta').innerHTML = daftar.slice(0, 3).reverse().map(x => '<button data-ta="' + esc(x) + '" class="' + (x === State.ta ? 'aktif' : '') + '">' + esc(x) + (Master.terkunci(x) ? ' <span class="ms kunci-ikon" style="font-size:14px;color:inherit">lock</span>' : '') + '</button>').join('');
    $('#pil-ta').onclick = e => { const b = e.target.closest('[data-ta]'); if (!b) return; State.setTA(b.dataset.ta); isiFilter(); Router.jalan(); };
    $$('#pil-sem button').forEach(b => b.classList.toggle('aktif', b.dataset.s === State.sem));
    const cepat = [['dashboard', 'Ringkasan Eksekutif'], ['ppepp', 'Status PPEPP'], ['target', 'Capaian IKU & IKT'], ['pkpa', 'Temuan Audit']].filter(x => bolehMenu(x[0]));
    const kini = (location.hash.match(/^#\/(\w+)/) || [])[1];
    $('#tab-cepat').innerHTML = cepat.map(x => '<a href="#/' + x[0] + '" class="' + (kini === x[0] ? 'aktif' : '') + '">' + esc(t(x[1])) + '</a>').join('');
  }
  function setLonceng(n) { const b = $('#lonceng-n'); if (!b) return; b.hidden = !n; b.textContent = n > 99 ? '99+' : n; }
  function setJumlah(o) { Object.keys(o || {}).forEach(k => { $$('[data-jml="' + k + '"]').forEach(s => { s.hidden = !o[k]; s.textContent = o[k]; }); }); }
  w.MH.setJumlah = setJumlah;
  async function bukaLonceng() {
    const p = $('#panel-notif'); if (!p.hidden) { p.hidden = true; return; }
    p.hidden = false; p.innerHTML = '<div style="padding:14px">' + UI.kerangka(3, 40) + '</div>';
    const r = await API.call('notif.app', {});
    if (!r.success) { p.innerHTML = UI.galat(r); return; }
    p.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--garis)"><b>Notifikasi</b><button class="btn btn-hantu btn-kecil" id="n-semua">Tandai semua dibaca</button></div><div class="daftar-n">' + (r.data.rows.length ? r.data.rows.map(n => '<a class="n ' + (n.Dibaca !== 'Ya' ? 'baru' : '') + '" href="' + esc(n.Tautan || '#/dashboard') + '" data-id="' + esc(n.ID) + '"><b>' + esc(n.Judul) + '</b><small>' + esc(String(n.Isi).slice(0, 140)) + '</small><small>' + Fmt.relatif(n.Waktu) + '</small></a>').join('') : UI.kosong('Belum ada notifikasi.', 'notifications_off')) + '</div>';
    $('#n-semua').onclick = async () => { setLonceng(0); $$('.n.baru', p).forEach(x => x.classList.remove('baru')); API.call('notif.baca', { semua: true }); };
    p.onclick = e => { const a = e.target.closest('.n'); if (a) { p.hidden = true; if (a.classList.contains('baru')) { API.call('notif.baca', { ids: [a.dataset.id] }); setLonceng(Math.max(0, (Number($('#lonceng-n').textContent) || 1) - 1)); } } };
  }
  document.addEventListener('click', e => { const p = $('#panel-notif'); if (p && !p.hidden && !e.target.closest('#panel-notif,#b-lonceng')) p.hidden = true; const h = $('.hasil-cari'); if (h && !h.hidden && !e.target.closest('.cari')) h.hidden = true; });

  /* ---------- Pencarian global (instan, dari cache lokal) ---------- */
  function pasangCari() {
    const inp = $('#cari-global'), out = $('.hasil-cari');
    let tmr;
    inp.oninput = () => { clearTimeout(tmr); tmr = setTimeout(() => {
      const q = inp.value.trim().toLowerCase(); if (q.length < 2) { out.hidden = true; return; }
      const hasil = [];
      MENU.filter(m => m.k && bolehMenu(m.k) && t(m.l).toLowerCase().indexOf(q) >= 0).forEach(m => hasil.push({ i: m.i, t: t(m.l), s: 'Menu', h: '#/' + m.k }));
      Master.d.standar.filter(s => (s.Kode + ' ' + s.Nama).toLowerCase().indexOf(q) >= 0).slice(0, 5).forEach(s => hasil.push({ i: 'verified', t: s.Kode + ' ' + s.Nama, s: 'Standar mutu', h: '#/target' }));
      Master.d.kriteria.filter(k => (k.Kode + ' ' + k.Nama).toLowerCase().indexOf(q) >= 0).slice(0, 5).forEach(k => hasil.push({ i: 'workspace_premium', t: k.Kode + ' ' + k.Nama, s: 'Kriteria akreditasi', h: '#/akreditasi' }));
      Master.d.pengguna.filter(u => u.Nama.toLowerCase().indexOf(q) >= 0).slice(0, 5).forEach(u => hasil.push({ i: u.Role === 'AUD' ? 'person_search' : 'person', t: u.Nama, s: (w.MH.ROLE_LABEL[u.Role] || u.Role) + (u.Kode_Unit ? ' · ' + Master.unit(u.Kode_Unit) : ''), h: bolehMenu('pengaturan') ? '#/pengaturan' : '#/dashboard' }));
      Master.d.prodi.filter(p => p.Nama_Prodi.toLowerCase().indexOf(q) >= 0).forEach(p => hasil.push({ i: 'school', t: p.Nama_Prodi, s: 'Program studi', h: '#/akreditasi' }));
      ['spmi', 'bukti'].forEach(k => { const c = Store.intip(k + ':' + State.ta) || Store.intip(k); const rows = c && (c.d.dokumen || c.d.rows || (Array.isArray(c.d) ? c.d : [])); (rows || []).filter(r => String(r.Judul || r.Judul_Bukti || '').toLowerCase().indexOf(q) >= 0).slice(0, 5).forEach(r => hasil.push({ i: k === 'spmi' ? 'description' : 'attach_file', t: r.Judul || r.Judul_Bukti, s: k === 'spmi' ? 'Dokumen SPMI' : 'Bukti dukung', h: k === 'spmi' ? '#/spmi' : '#/kesiapan' })); });
      out.innerHTML = hasil.length ? hasil.slice(0, 14).map(x => '<a href="' + x.h + '"><span class="ms">' + x.i + '</span><span><b style="display:block;font-size:13px">' + esc(x.t) + '</b><small class="catatan">' + esc(x.s) + '</small></span></a>').join('') : '<div class="catatan" style="padding:10px">Tidak ditemukan.</div>';
      out.hidden = false;
    }, 120); };
    out.onclick = () => { out.hidden = true; inp.value = ''; };
  }

  /* ---------- Router ---------- */
  Router.jalan = async function () {
    const h = location.hash || '#/dashboard';
    const publik = /^#\/(s|aduan|v)(\/|$)/.test(h);
    if (publik) { const m = Router.cocok(h); Router.versi++; if (m) { $('#akar').innerHTML = '<div class="portal" id="konten"></div>'; m.r.hal.render($('#konten'), m.prm); } return; }
    if (!Sesi.token) { tampilkanLogin(/darurat/.test(h) ? 'darurat' : ''); return; }
    if (/^#\/(login|darurat)/.test(h)) { location.hash = '#/dashboard'; return; }
    if (!$('#konten') || !$('#sidebar')) { mulaiApp(); return; }
    const m = Router.cocok(h);
    Router.versi++;
    const el = $('#konten');
    if (!m) { el.innerHTML = UI.kosong('Halaman tidak ditemukan.', 'travel_explore'); return; }
    const akar = m.path.split('/')[1];
    if (m.r.hal.roles && m.r.hal.roles.indexOf(Sesi.me.role) < 0) { el.innerHTML = '<div class="banner banner-kuning"><span class="ms">lock</span><div><b>Akses dibatasi</b>Menu ini tidak tersedia untuk peran ' + esc(w.MH.ROLE_LABEL[Sesi.me.role]) + '.</div></div>'; return; }
    $$('.menu a, .navbawah a').forEach(a => a.classList.toggle('aktif', a.dataset.m === (m.r.hal.menu || akar)));
    $('#sidebar').classList.remove('buka');
    isiFilter();
    document.title = (m.r.hal.judul || 'MutuHub') + ' · MutuHub';
    el.innerHTML = '';
    try { await m.r.hal.render(el, m.prm); } catch (e) { console.error(e); el.innerHTML = UI.galat({ message: e.message }); }
    if (!m.r.hal.tetapGulir) window.scrollTo(0, 0);
  };
  addEventListener('hashchange', () => Router.jalan());

  /* ---------- Boot ---------- */
  async function mulaiApp() {
    if (!Sesi.muat()) { Router.jalan(); return; }
    const cache = Store.intip('boot');
    if (cache) { State.boot = cache.d; Master.isi(cache.d.master, cache.d.setelan); }
    if (!State.boot) $('#akar').innerHTML = '<div class="layar-penuh"><div class="kartu" style="width:min(420px,90vw);text-align:center"><div class="kerangka" style="height:14px;margin-bottom:10px"></div>Memuat MutuHub…</div></div>';
    const segarkan = API.call('app.boot', { appUrl: location.origin + location.pathname }).then(r => {
      if (!r.success) { if (r.code !== 'AUTH' && !State.boot) $('#akar').innerHTML = '<div class="layar-penuh"><div class="kartu" style="width:min(520px,92vw)">' + UI.galat(r) + '<button class="btn btn-utama" style="margin-top:12px" onclick="location.reload()">Coba lagi</button> <button class="btn btn-hantu" style="margin-top:12px" onclick="MH.Sesi.keluar()">Keluar</button></div></div>'; return; }
      const awal = !State.boot;
      State.boot = r.data; Store.taruh('boot', r.data); Master.isi(r.data.master, r.data.setelan);
      Sesi.simpan(Sesi.token, Object.assign({}, Sesi.me, r.data.me));
      if (awal) { pasangShell(); isiShell(); Router.jalan(); } else isiShell();
    });
    if (State.boot) { pasangShell(); isiShell(); Router.jalan(); }
    await segarkan;
    // Prefetch menu utama saat menganggur
    (w.requestIdleCallback || (f => setTimeout(f, 1500)))(() => { if (w.MH.prefetch) w.MH.prefetch(Sesi.me.role); });
  }
  w.Aplikasi = { mulai: mulaiApp, tampilkanLogin, pasang };

  // Polling lonceng adaptif
  Aktivitas.init();
  setInterval(() => { if (Sesi.token && $('#lonceng-n') && Aktivitas.due('lonceng', 60000, 300000)) API.call('notif.app', {}).then(r => { if (r.success) setLonceng(r.data.belum); }); }, 15000);
  addEventListener('online', () => UI.toast('Koneksi kembali.', 'sukses'));
  addEventListener('offline', () => UI.toast('Anda sedang offline. Data dari cache tetap bisa dilihat.', 'galat'));
  addEventListener('DOMContentLoaded', () => { if (/^#\/(s|aduan|v)(\/|$)/.test(location.hash)) Router.jalan(); else mulaiApp(); });
})(window);
