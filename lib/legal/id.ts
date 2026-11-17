import type { LegalTexts } from './types';

const id: LegalTexts = {
  privacy: {
    title: 'Kebijakan Privasi',
    updated: 'Terakhir diperbarui: 14 Oktober 2026',
    sections: [
      {
        h: '1. Versi singkat',
        p: 'Alat-alat OptimaPDF berjalan di browser Anda: file yang Anda kerjakan tidak dikirim ke server kami atau ke mana pun. Hanya yang diperlukan oleh dua fitur yang sampai ke server — teks untuk fitur AI dan alamat halaman untuk URL ke PDF. Kami mengumpulkan statistik kunjungan (Google Analytics) hanya dengan persetujuan Anda. Tidak ada akun pengguna.',
      },
      {
        h: '2. Pengendali data',
        p: 'Pengendali data pribadi adalah Leszek Hofman, Dąbrówka Nowa, Polandia. Kontak: kontakt@optimapdf.com. Tidak ada Petugas Pelindungan Data yang ditunjuk — kirimkan semua hal yang menyangkut data Anda ke alamat di atas.',
      },
      {
        h: '3. Data apa yang kami proses',
        sub: [
          {
            h: '3.1 File Anda',
            p: 'Semua alat file — termasuk penggabungan, pemisahan, kompresi, OCR, pengeditan, penandatanganan, penyensoran, perlindungan kata sandi, dan setiap konversi file (PDF ↔ Word, Excel, PowerPoint, OpenOffice, gambar, HTML, EPUB, TXT, SVG) — berjalan sepenuhnya di browser Anda (JavaScript dan WebAssembly). File tidak dikirim ke server kami. Dari server hanya diunduh file aplikasi, fon, dan data bahasa OCR.',
          },
          {
            h: '3.2 Fitur AI (Chat AI, Ringkasan AI, Terjemahan AI)',
            p: 'Saat Anda menggunakan fitur AI, teks yang diambil dari file Anda (dan, dalam chat, pertanyaan Anda) dikirim melalui server kami ke OpenRouter, Inc. (AS), yang meneruskannya ke penyedia model bahasa (saat ini OpenAI GPT-4o mini, yang dilayani oleh OpenAI atau Microsoft Azure). Alat tersebut memberi tahu Anda tentang hal ini sebelum apa pun dikirim.',
            items: [
              'Setiap permintaan mensyaratkan penyedia yang, menurut OpenRouter, tidak menyimpan data melebihi waktu permintaan dan tidak melatih model dengan data tersebut. Jika tidak ada penyedia seperti itu, permintaan gagal — permintaan tidak dikirim ke penyedia lain.',
              'Permintaan dikirim oleh server kami dengan kunci API bersama milik situs: OpenRouter tidak menerima alamat IP maupun detail browser Anda, dan Anda tidak memerlukan kunci sendiri.',
              'Kami tidak menyimpan teks yang dikirim maupun jawabannya.',
              'Batasnya adalah 15 permintaan per hari per alamat IP. Penghitungnya (alamat IP Anda dan jumlah permintaan) disimpan di basis data Upstash selama 24 jam sejak permintaan pertama, lalu dihapus secara otomatis.',
            ],
          },
          {
            h: '3.3 URL ke PDF',
            p: 'Alamat halaman yang Anda masukkan sampai ke server kami, yang mengunduh halaman tersebut dan membuat PDF darinya. Kami tidak menyimpan alamat, halaman, maupun PDF-nya. Batasnya adalah 30 konversi per 10 menit per alamat IP — penghitungnya disimpan di basis data Upstash selama 10 menit.',
          },
          {
            h: '3.4 Data teknis',
            p: 'Penyedia hosting kami (Vercel Inc.) memproses data teknis saat melayani permintaan — alamat IP, alamat halaman, waktu, dan jenis browser — untuk menjalankan dan melindungi situs. Server kami hanya mencatat permintaan API yang ditolak (misalnya karena batas terlampaui atau permintaan dari situs lain), dengan alamat IP yang dipersingkat menjadi tiga bagian pertamanya (mis. 203.0.113.0).',
          },
          {
            h: '3.5 Disimpan di browser Anda',
            p: 'Beberapa pengaturan disimpan di perangkat Anda. Pengaturan tersebut tidak dikirim kepada kami maupun kepada pihak ketiga:',
            items: [
              'localStorage: tema (terang/gelap), bahasa yang dipilih, pilihan Anda tentang analitik, pengaturan alat, dan daftar alat yang baru-baru ini digunakan.',
              'Cookie "x-detected-locale" (hingga 12 bulan) berisi bahasa yang dipilih, agar situs terbuka dalam bahasa Anda. Cookie ini diperlukan agar versi bahasa berfungsi dan tidak memerlukan persetujuan.',
              'Cache aplikasi (service worker): file situs dan data bahasa OCR yang telah diunduh, agar alat bekerja lebih cepat dan tanpa koneksi.',
              'Setelah menghubungkan Google Drive: token akses di sessionStorage, yang dihapus saat Anda menutup tab atau saat token kedaluwarsa.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox, dan OneDrive',
            p: 'Jika Anda memilih untuk membuka file dari cloud atau menyimpan ke cloud, file berpindah langsung antara browser Anda dan penyedia yang Anda pilih (Google, Dropbox, Microsoft) — tidak melalui server kami. Anda masuk di jendela penyedia tersebut, dan ketentuan serta kebijakan privasinya berlaku untuk operasi itu. Google Drive memberi kami akses hanya ke file yang dibuka atau dibuat oleh OptimaPDF; Dropbox hanya untuk menyimpan file; OneDrive dan SharePoint ke semua file dan situs Anda, karena integrasi Microsoft ini tidak memiliki izin yang lebih sempit, tetapi hanya browser Anda yang menggunakannya dan token tidak pernah sampai ke server kami.',
          },
        ],
      },
      {
        h: '4. Dasar hukum',
        items: [
          'Pasal 6 ayat (1) huruf b GDPR — penyediaan layanan yang Anda minta: fitur AI dan URL ke PDF.',
          'Pasal 6 ayat (1) huruf f GDPR — kepentingan sah pengendali: menjalankan dan mengamankan situs, batas permintaan, pencegahan penyalahgunaan, log teknis.',
          'Pasal 6 ayat (1) huruf a GDPR — persetujuan Anda: statistik kunjungan di Google Analytics. Anda dapat menariknya kapan saja (bagian 10).',
        ],
      },
      {
        h: '5. Penerima',
        p: 'Data diproses atas nama kami oleh, atau diterima oleh:',
        items: [
          'Vercel Inc. (AS) — hosting situs dan server aplikasi.',
          'Upstash, Inc. (AS) — basis data penghitung batas permintaan (alamat IP dan jumlah permintaan). Basis data berada di wilayah Washington, D.C. (AS, region iad1).',
          'OpenRouter, Inc. (AS) dan penyedia model yang menerima permintaan dari OpenRouter — hanya saat Anda menggunakan fitur AI.',
          'Google LLC (AS) — Google Analytics, hanya dengan persetujuan Anda.',
          'Otoritas publik — hanya jika diwajibkan oleh hukum.',
        ],
      },
      {
        h: '6. Transfer ke luar EEA',
        p: 'Server aplikasi berjalan di pusat data Vercel di AS, dan semua penerima di bagian 5 berkedudukan di AS. Oleh karena itu, data yang dijelaskan di bagian 3.2–3.4 dan data Google Analytics ditransfer ke AS. Vercel Inc. dan Google LLC tersertifikasi berdasarkan EU-US Data Privacy Framework (Keputusan Pelaksanaan Komisi (EU) 2023/1795); Vercel juga menggunakan Klausul Kontraktual Standar. Untuk Upstash dan OpenRouter, transfer dilakukan berdasarkan ketentuan pemrosesan data mereka. File Anda tidak ditransfer ke mana pun (bagian 3.1).',
      },
      {
        h: '7. Berapa lama kami menyimpan data',
        items: [
          'File Anda: file tidak pernah sampai kepada kami. Di browser, file hilang saat Anda menutup atau memuat ulang halaman.',
          'Teks yang dikirim ke AI dan alamat halaman untuk konversi: kami tidak menyimpannya.',
          'Penghitung batas AI (alamat IP): 24 jam sejak permintaan pertama. Penghitung URL ke PDF: 10 menit.',
          'Log server di penyedia hosting: 1 jam pada paket Vercel saat ini.',
          'Data Google Analytics: sesuai pengaturan retensi data di Google Analytics, paling lama 14 bulan.',
          'Pengaturan di browser Anda: sampai Anda menghapusnya; cookie bahasa hingga 12 bulan.',
        ],
      },
      {
        h: '8. Hak-hak Anda',
        p: 'Anda berhak atas akses (Pasal 15 GDPR), perbaikan (Pasal 16), penghapusan (Pasal 17), pembatasan pemrosesan (Pasal 18), portabilitas data (Pasal 20), keberatan (Pasal 21), serta menarik persetujuan kapan saja tanpa memengaruhi keabsahan pemrosesan sebelum penarikan. Anda juga dapat mengajukan pengaduan kepada otoritas pengawas — di Polandia, yaitu Presiden Kantor Perlindungan Data Pribadi (ul. Stawki 2, 00-193 Warszawa). Tidak ada akun, sehingga data teknis biasanya tidak dapat dikaitkan dengan orang tertentu (Pasal 11 GDPR) — kirimkan email kepada kami, dan kami akan melihat apa yang dapat kami lakukan.',
      },
      {
        h: '9. Keamanan',
        items: [
          'Koneksi HTTPS terenkripsi dengan HSTS.',
          'Content Security Policy dan header yang mencegah situs disematkan di situs lain serta memblokir akses ke kamera, mikrofon, dan lokasi.',
          'Pemeriksaan asal pada permintaan API (perlindungan CSRF), batas jumlah permintaan, dan batas ukuran permintaan (100 MB).',
          'URL ke PDF tidak mengambil alamat jaringan internal maupun layanan cloud milik server (perlindungan SSRF).',
          'Detailnya: halaman "Keamanan".',
        ],
      },
      {
        h: '10. Google Analytics dan persetujuan',
        p: 'Dengan persetujuan Anda, kami menggunakan Google Analytics 4 (Google LLC) untuk menghitung kunjungan dan melihat alat mana yang digunakan. Google kemudian menyimpan cookie berisi pengenal di browser Anda (_ga, _ga_*) dan menerima data tentang kunjungan: halaman yang dilihat, perkiraan lokasi, jenis perangkat dan browser, serta dari mana Anda datang.',
        items: [
          'Tanpa persetujuan, skrip Google Analytics sama sekali tidak dimuat — situs tidak menghubungi Google.',
          'Anda dapat mengubah atau menarik persetujuan kapan saja melalui tombol "Pengaturan cookie" di bagian bawah setiap halaman. Penarikan persetujuan langsung menonaktifkan Google Analytics dan menghapus cookie-nya.',
          'Kami tidak menggunakan Google Analytics untuk iklan atau pembuatan profil. File yang Anda kerjakan tidak pernah sampai ke Google.',
        ],
      },
      {
        h: '11. Perubahan',
        p: 'Kami dapat mengubah kebijakan ini jika cara kerja situs berubah; tanggal perubahan terakhir tercantum di bagian atas halaman. Pertanyaan: kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'Informasi GDPR',
    updated: 'Terakhir diperbarui: 14 Oktober 2026',
    sections: [
      {
        h: '1. Pengendali data',
        p: 'Pengendali data pribadi adalah Leszek Hofman, Dąbrówka Nowa, Polandia (optimapdf.com). Kontak untuk semua hal yang menyangkut data Anda: kontakt@optimapdf.com.',
      },
      {
        h: '2. Data apa yang kami proses dan mengapa',
        items: [
          'File Anda — kami tidak memprosesnya di server. Semua alat file berjalan di browser Anda, dan file tidak keluar dari perangkat Anda.',
          'Teks yang dikirim ke fitur AI — kami meneruskannya melalui server kami ke OpenRouter dan penyedia model untuk menjalankan permintaan Anda (ringkasan, terjemahan, jawaban). Kami tidak menyimpannya.',
          'Alamat halaman untuk URL ke PDF — server kami mengunduh halaman tersebut dan membuat PDF. Kami tidak menyimpannya.',
          'Alamat IP — untuk menghitung batas permintaan (AI: 24 jam, URL ke PDF: 10 menit) dan mencegah penyalahgunaan; dalam log server hanya untuk permintaan yang ditolak, dan dalam bentuk yang dipersingkat.',
          'Data kunjungan di Google Analytics — hanya dengan persetujuan Anda.',
          'Pengaturan (tema, bahasa, pilihan analitik) — hanya disimpan di browser Anda.',
        ],
      },
      {
        h: '3. Dasar hukum',
        items: [
          'Pasal 6 ayat (1) huruf b GDPR — penyediaan layanan yang Anda minta (fitur AI, URL ke PDF).',
          'Pasal 6 ayat (1) huruf f GDPR — kepentingan sah: keamanan dan batas permintaan.',
          'Pasal 6 ayat (1) huruf a GDPR — persetujuan untuk Google Analytics.',
        ],
      },
      {
        h: '4. Retensi',
        items: [
          'File, teks yang dikirim ke AI, dan alamat halaman untuk konversi: tidak disimpan.',
          'Penghitung batas permintaan beserta alamat IP: 24 jam (AI) dan 10 menit (URL ke PDF).',
          'Log server di penyedia hosting: 1 jam (paket Vercel saat ini).',
          'Google Analytics: paling lama 14 bulan.',
          'Pengaturan di browser Anda: sampai Anda menghapusnya; cookie bahasa hingga 12 bulan.',
        ],
      },
      {
        h: '5. Penerima',
        p: 'Kami tidak menjual data atau membagikannya untuk pemasaran. Data diproses atas nama kami oleh Vercel Inc. (hosting), Upstash, Inc. (penghitung batas permintaan), OpenRouter, Inc. dan penyedia model (khusus fitur AI), serta — dengan persetujuan Anda — Google LLC (Google Analytics). Semuanya berkedudukan di AS.',
      },
      {
        h: '6. Transfer ke negara ketiga',
        p: 'Server aplikasi berjalan di AS, sehingga data di bagian 2 (selain file dan pengaturan browser) ditransfer ke AS. Vercel dan Google tersertifikasi berdasarkan EU-US Data Privacy Framework (Keputusan Komisi (EU) 2023/1795); Upstash dan OpenRouter memproses data berdasarkan ketentuan pemrosesan data mereka.',
      },
      {
        h: '7. Hak-hak Anda',
        items: [
          'Akses (Pasal 15) dan perbaikan (Pasal 16).',
          'Penghapusan (Pasal 17) dan pembatasan pemrosesan (Pasal 18).',
          'Portabilitas data (Pasal 20) dan keberatan (Pasal 21).',
          'Menarik persetujuan kapan saja — untuk Google Analytics melalui tombol "Pengaturan cookie" di bagian bawah halaman.',
        ],
      },
      {
        h: '8. Cara menggunakan hak Anda',
        p: 'Kirim email ke kontakt@optimapdf.com. Kami membalas dalam 30 hari, tanpa biaya (kecuali permintaan tersebut jelas tidak berdasar atau berlebihan — Pasal 12 ayat (5) GDPR). Tidak ada akun, sehingga data teknis biasanya tidak dapat dikaitkan dengan orang tertentu (Pasal 11 GDPR).',
      },
      {
        h: '9. Pengaduan',
        p: 'Jika Anda yakin kami memproses data Anda dengan melanggar GDPR, Anda dapat mengajukan pengaduan kepada otoritas pengawas — di Polandia, yaitu Presiden Kantor Perlindungan Data Pribadi, ul. Stawki 2, 00-193 Warszawa.',
      },
      {
        h: '10. Cookie dan penyimpanan browser',
        p: 'Kami menggunakan satu cookie yang diperlukan (x-detected-locale — bahasa situs, hingga 12 bulan) dan localStorage untuk pengaturan. Cookie Google Analytics (_ga, _ga_*) hanya muncul setelah Anda memberikan persetujuan dan dihapus saat Anda menariknya. Kami tidak menggunakan cookie iklan.',
      },
      {
        h: '11. Perubahan',
        p: 'Kami memperbarui informasi ini jika cara kerja situs berubah; tanggal perubahan terakhir tercantum di bagian atas halaman.',
      },
    ],
  },

  security: {
    title: 'Keamanan',
    updated: 'Terakhir diperbarui: 14 Oktober 2026',
    intro: 'Pengamanan terpenting OptimaPDF adalah sesuatu yang tidak kami lakukan: kami tidak mengirim file Anda ke server. Di bawah ini dijelaskan cara kerjanya dan apa saja pengamanan lainnya — hanya yang benar-benar kami gunakan.',
    sections: [
      {
        h: '1. File tetap di perangkat Anda',
        p: 'Semua alat file, termasuk kompresi, OCR, dan konversi, berjalan di browser Anda (JavaScript dan WebAssembly). File tidak dikirim ke server, sehingga tidak ada seorang pun di pihak kami yang dapat mengaksesnya. Anda dapat memeriksanya sendiri: buka alat pengembang browser (F12), tab "Network" (Jaringan), lalu proses sebuah file — Anda tidak akan melihat file itu diunggah. Hanya teks untuk fitur AI dan alamat halaman untuk URL ke PDF yang sampai ke server.',
      },
      {
        h: '2. Koneksi terenkripsi',
        p: 'Situs ini hanya berfungsi melalui HTTPS. Header HSTS (yang terdaftar di daftar preload browser) membuat browser selalu terhubung secara aman, bahkan pada kunjungan pertama.',
      },
      {
        h: '3. Perlindungan di browser',
        items: [
          'Content Security Policy membatasi dari mana situs boleh memuat skrip dan ke mana situs boleh terhubung: domain kami dan layanan yang disebutkan di dalamnya (login Google, Dropbox, Microsoft, dan, setelah persetujuan, Google Analytics).',
          'Situs tidak dapat disematkan di situs lain (X-Frame-Options: DENY, frame-ancestors) — melindungi Anda dari clickjacking.',
          'Permissions-Policy memblokir akses ke kamera, mikrofon, lokasi, USB, dan pembayaran.',
          'X-Content-Type-Options dan Referrer-Policy membatasi penebakan jenis file dan penerusan alamat halaman.',
        ],
      },
      {
        h: '4. Perlindungan server',
        items: [
          'Permintaan API hanya diterima dari situs kami sendiri (pemeriksaan Origin dan Referer — perlindungan CSRF).',
          'Batas permintaan: 30 per menit per alamat IP untuk API, 15 per hari untuk fitur AI, 30 per 10 menit untuk URL ke PDF; batas ukuran permintaan 100 MB.',
          'URL ke PDF menolak alamat jaringan privat dan lokal serta alamat layanan cloud milik server, dan alamat yang diperiksa adalah alamat yang sama dengan yang dihubungi server (perlindungan terhadap SSRF dan DNS rebinding).',
          'Masukan API diperiksa di server (panjang teks, bahasa terjemahan yang diizinkan).',
        ],
      },
      {
        h: '5. Fitur AI',
        p: 'Kami hanya mengirim ke AI teks yang diambil dari file dan pertanyaan Anda — tanpa alamat IP atau detail browser Anda, melalui server kami dan kunci API-nya (Anda tidak memerlukan kunci sendiri). Setiap permintaan mensyaratkan penyedia yang, menurut OpenRouter, tidak menyimpan data melebihi waktu permintaan dan tidak melatih model dengan data tersebut; jika tidak ada yang tersedia, permintaan tidak dijalankan.',
      },
      {
        h: '6. Tanpa akun atau profil',
        p: 'Kami tidak mensyaratkan pendaftaran atau login, tidak menyimpan kata sandi, dan tidak membuat profil pengguna. Kata sandi untuk melindungi dan membuka kunci PDF serta sertifikat untuk menandatangani hanya digunakan di browser Anda.',
      },
      {
        h: '7. Dependensi',
        p: 'Kami selalu memperbarui pustaka dan memeriksanya terhadap kerentanan yang diketahui dengan npm audit serta sebuah tes yang melaporkan setiap peringatan baru bertingkat tinggi atau kritis pada dependensi yang digunakan situs.',
      },
      {
        h: '8. Melaporkan kerentanan',
        p: 'Jika Anda menemukan celah keamanan, kirim email ke kontakt@optimapdf.com. Kami berkomitmen untuk:',
        items: [
          'mengonfirmasi penerimaan dalam 24 jam,',
          'menganalisisnya dan merilis perbaikan dalam 14 hari (tergantung tingkat keparahannya),',
          'memberi tahu Anda apa yang telah kami lakukan,',
          'tidak mengambil tindakan hukum terhadap orang yang melaporkan kerentanan dengan itikad baik.',
        ],
      },
      {
        h: '9. Sertifikasi',
        p: 'OptimaPDF tidak memiliki sertifikasi ISO 27001 atau SOC 2 sendiri. Penyedia hosting kami, Vercel, tersertifikasi ISO 27001:2022 dan memiliki laporan SOC 2 Type 2. Karena file tidak pernah sampai ke server kami, tidak ada file "tersimpan" di pihak kami yang perlu dienkripsi.',
      },
      {
        h: '10. Tanda tangan digital dan eIDAS',
        p: 'Alat "Tanda Tangani PDF" membuat tanda tangan digital PAdES dengan sertifikat Anda sendiri (.p12/.pfx) — sepenuhnya di browser; baik file maupun sertifikat tidak dikirim ke mana pun. Ini adalah tanda tangan kriptografis sungguhan, tetapi tidak otomatis merupakan tanda tangan elektronik berkualifikasi (QES) menurut Regulasi eIDAS (EU 910/2014): status QES bergantung pada apakah sertifikat diterbitkan oleh penyedia layanan kepercayaan berkualifikasi dan kuncinya berada di perangkat berkualifikasi.',
      },
    ],
  },

  principles: {
    security: 'Kami menggunakan koneksi HTTPS terenkripsi, Content Security Policy, perlindungan terhadap penyalahgunaan API, dan batas jumlah permintaan. Yang terpenting, alat-alat file berjalan di browser Anda, sehingga file Anda sama sekali tidak pernah sampai ke server kami.',
    tracking: 'Saat ini situs tidak menampilkan iklan. Ke depannya, kami mungkin menampilkan iklan yang tidak mengganggu (mis. Google AdSense) untuk menutup biaya hosting dan pengembangan — jika itu terjadi, kami akan memperbarui informasi ini. Apa pun yang terjadi, semua alat PDF akan tetap gratis. Kami menggunakan Google Analytics hanya dengan persetujuan Anda, yang dapat Anda tarik kapan saja melalui tombol "Pengaturan cookie". Kami tidak menggunakan piksel pemasaran ulang maupun pembuatan profil perilaku.',
  },
};

export default id;
