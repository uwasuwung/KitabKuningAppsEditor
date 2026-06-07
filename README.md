# Kitab Scribe Pro — Aplikasi Penulisan Kitab Kuning

Aplikasi editor modern berbasis desktop/web yang dirancang khusus untuk mempermudah penulisan, pemberian makna sandaran (Makna Jenggot/Pegon Jawa/Sunda/Melayu), serta terjemahan komparasi naskah keagamaan Islam (Kitab Kuning) secara lintas platform (Windows/macOS/Linux).

## Fitur Utama

1. **Editor Arab RTL dengan Syakal & Simbol Tradisional Pesantren**:
   * Penulisan teks Arab otomatis mengalir dari Kanan ke Kiri (RTL) yang rapi tanpa terputus.
   * Sisipkan harakat (Fathah, Kasrah, Dammah, Sukun, Tasydid, dll.) secara instan menggunakan tombol toolbar atau pintasan keyboard cepat.
   * Sisipkan lambang-lambang Nahwu Shorof pesantren klasik untuk mendefinisikan kedudukan kata seperti: `م` (Mubtada'), `خ` (Khabar), `ف` (Fa'il), `مف` (Ma'ful bih), `ﷺ` (Shalawat), dll.

2. **Draf Makna Sublinear (Makna Jenggot)**:
   * Tambahkan, urutkan, dan modifikasi makna perkata mandiri secara sublinear tepat di bawah lafadz Arab dengan sudut presisi tradisional.
   * Pisahkan baris naskah menjadi butiran kata dengan satu kali klik.

3. **Bedah Kata & Terjemahan Cerdas Otomatis (Gemini AI)**:
   * **Bedah Kata Otomatis (AI)**: Memanggil modul Gemini AI untuk menganalisis kalimat secara sintaksis (Nahwu) dan membaginya ke dalam butiran-butiran kata ber-syakal lengkap beserta usulan makna dan penanda i'rab otomatis!
   * **Terjemahkan dengan AI**: Terjemahkan kalimat Arab ke bahasa Indonesia baku pesantren atau naskah aksara bahasa Pegon-Melayu secara cerdas.

4. **Kamus Istilah Populer (ignore diakritik)**:
   * Fitur pencarian kata dalam kamus referensi internal tanpa harus terhambat perbedaan harakat gundul/tebal (ignore diacritics).
   * Tambah kosakata kustom pesantren secara manual atau impor masal data dari file CSV.

5. **Manajemen Proyek Berkas `.kitab`**:
   * Organisasi struktur hierarki bertingkat (Bab -> Fasal -> Baris Kalimat).
   * Simpan proyek Anda secara lokal berupa draf, serta lakukan ekspor mandiri menjadi berkas terkompresi `*.kitab`.
   * Ekspor naskah akhir menjadi dokumen HTML mandiri yang siap cetak (PDF ramah kertas).

6. **Backup Otomatis (Autosave)**:
   * Aplikasi mencadangkan draf secara otomatis ke penyimpanan browser Anda setiap 5 menit sekali tanpa mengganggu aktivitas penulisan Anda.

---

## Pintasan Keyboard (Shortcut)

Setiap saat kursor berada di dalam input teks Arab atau editor kata, Anda dapat menggunakan kombinasi tombol berikut untuk mempercepat proses pengetikan:

* **`Ctrl + B`** : Menyisipkan Harakat Fathah ( َ )
* **`Ctrl + Shift + B`** : Menyisipkan Harakat Kasrah ( ِ )
* **`Ctrl + D`** : Menyisipkan Harakat Dammah ( ُ )
* **`Ctrl + Shift + D`** : Menyisipkan Harakat Sukun ( ْ )
* **`Ctrl + T`** : Menyisipkan Harakat Tasydid ( ّ )
* **`Ctrl + Alt + B`** : Menyisipkan Harakat Fathatain ( ً )
* **`Ctrl + Alt + Shift + B`** : Menyisipkan Harakat Kasratain ( ٍ )
* **`Ctrl + Alt + D`** : Menyisipkan Harakat Dammatain ( ٌ )
* **`Ctrl + Shift + S`** : Mengunduh berkas fisik cadangan proyek naskah (*.kitab) ke komputer.
* **`Ctrl + Shift + T`** : Menyalakan/mematikan tampilan sublinear makna jenggot pesantren secara kilat di halaman layar utama.

---

## Petunjuk Instalasi & Menjalankan Aplikasi

Aplikasi dibangun menggunakan teknologi **Vite + React + TypeScript + TailwindCSS** yang ringan dan dapat dibundel ke dalam kerangka **Electron** atau **Tauri** untuk didistribusikan lintas sistem operasi.

### Cara Menjalankan Versi Web (Development)

1. Pastikan Anda telah memasang **Node.js** (versi 18 ke atas) di komputer Anda.
2. Pasang semua pustaka dependensi naskah:
   ```bash
   npm install
   ```
3. Setel kunci kecerdasan buatan Gemini Anda di file `.env` (atau setel via panel Secrets di AI Studio):
   ```env
   GEMINI_API_KEY="ISI_API_KEY_ANDA_DISINI"
   ```
4. Jalankan server lokal aplikasi:
   ```bash
   npm run dev
   ```
5. Buka peramban browser Anda di alamat `http://localhost:3000` untuk mulai menulis!

### Cara Membangun Bundel Desktop (Electron.js)

Untuk mengubah proyek web ini menjadi aplikasi desktop asli (*.exe, *.dmg, *.deb) menggunakan Electron, ikuti instruksi berikut:

1. Pasang dependensi Electron di komputer Anda:
   ```bash
   npm install --save-dev electron electron-builder
   ```
2. Buat file `main.js` di direktori utama Anda berisi pengaturan window dasar Electron:
   ```javascript
   const { app, BrowserWindow } = require('electron');
   const path = require('path');

   function createWindow() {
     const win = new BrowserWindow({
       width: 1280,
       height: 800,
       webPreferences: {
         preload: path.join(__dirname, 'preload.js'),
         nodeIntegration: true,
         contextIsolation: false
       },
       backgroundColor: '#0d0d0d',
       title: 'Kitab Scribe Pro'
     });

     // Arahkan ke file build akhir kita
     win.loadFile(path.join(__dirname, 'dist/index.html'));
   }

   app.whenReady().then(() => {
     createWindow();
     app.on('activate', () => {
       if (BrowserWindow.getAllWindows().length === 0) createWindow();
     });
   });

   app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') app.quit();
   });
   ```
3. Lakukan build produksi pada file React:
   ```bash
   npm run build
   ```
4. Jalankan pembuat paket biner desktop:
   ```bash
   npx electron-builder
   ```

---

## Contoh File Proyek Sampel (*.kitab)

Kami telah menyertakan contoh draf siap muat bernama `/sample_al_ajurrumiyyah.kitab` yang berisikan Bab Al-Kalam. Anda dapat memuatnya melalui tombol **"Impor .kitab"** di pojok kanan atas aplikasi untuk melihat visualisasi naskah kitab kuning yang tersusun rapi.

## Lisensi

Proyek ini dilisensikan di bawah **MIT License**. Lihat sertifikat lisensi untuk informasi penyebaran modul lebih mendalam.
