# WebGIS Prioritas Banjir Jabodetabek

WebGIS statis untuk tugas Sistem Informasi Geografi (SIG) yang memvisualisasikan prioritas banjir per kota/kabupaten di Jabodetabek.

## Demo Online

`https://rapidtest25.github.io/Tugas-SIG/`

## Ringkasan

Project ini menampilkan:

- peta choropleth prioritas banjir Jabodetabek
- detail wilayah berbasis data resmi BNPB
- layer fasilitas pendukung BPBD dan rumah sakit
- filter kelas prioritas dan daftar wilayah

Arsitektur aplikasi ini sederhana:

`Sumber data resmi -> olah jadi file statis -> ditampilkan di WebGIS`

Karena tugas ini tidak memakai database, seluruh data dibaca dari file statis JavaScript.

## Fitur

- Peta prioritas banjir berbasis kejadian resmi BNPB 2024
- Filter kelas prioritas rendah, menengah, tinggi
- Detail wilayah di panel kanan
- Ringkasan statistik wilayah aktif
- Daftar prioritas wilayah
- Layer BPBD dan rumah sakit
- Tampilan siap presentasi tanpa backend

## Struktur File

- `index.html`: struktur halaman
- `style.css`: styling dashboard
- `app.js`: logika peta dan interaksi
- `data/jabodetabek-data.js`: polygon wilayah + atribut banjir dari hasil olah data BNPB
- `data/support-facilities.js`: titik BPBD dan rumah sakit berbasis OSM/Nominatim

## Sumber Data

### 1. Data kejadian banjir dan total bencana
Sumber utama: `BNPB Satu Data Bencana`

- Dataset package:
  `https://data.bnpb.go.id/dataset/data-bencana-indonesia`
- Resource kejadian bencana menurut kabupaten 2024:
  `https://data.bnpb.go.id/dataset/f61d78e5-04c6-4ce8-9acf-e425dadc1f4d/resource/a4daec53-1119-43ef-b05e-00ec3a4c42a4/download/jumlah-kejadian-bencana-menurut-kabupaten-2024.xlsx`
- Resource kejadian bencana menurut kabupaten 2010-2024:
  `https://data.bnpb.go.id/dataset/f61d78e5-04c6-4ce8-9acf-e425dadc1f4d/resource/21044ffd-c397-4b3c-acbd-5adaa03d79e3/download/jumlah-kejadian-bencana-menurut-kabupaten-tahun-2010-2024.xlsx`

Data yang dipakai di aplikasi ini:

- jumlah kejadian banjir 2024 per wilayah
- total kejadian seluruh bencana 2022, 2023, 2024 per wilayah
- jenis bahaya dominan 2024 per wilayah

### 2. Batas wilayah administrasi
Sumber polygon: `geoBoundaries ADM2 Indonesia`

- GeoJSON ADM2:
  `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/IDN/ADM2/geoBoundaries-IDN-ADM2.geojson`

Polygon ini dipakai untuk menampilkan batas kota/kabupaten Jabodetabek.

### 3. Basemap
Sumber basemap:

- `OpenStreetMap`
- library peta: `Leaflet.js`

### 4. Fasilitas pendukung
Sumber titik referensi:

- `OpenStreetMap / Nominatim`

Fasilitas yang ditampilkan adalah:

- BPBD
- rumah sakit umum daerah / rumah sakit rujukan

Catatan: titik fasilitas dipakai sebagai referensi pendukung visual, bukan sebagai daftar resmi lengkap seluruh fasilitas kebencanaan dan kesehatan Jabodetabek.

## Metodologi

### Unit analisis
Unit analisis project ini adalah `kota/kabupaten` di wilayah Jabodetabek:

- Jakarta Pusat
- Jakarta Utara
- Jakarta Barat
- Jakarta Selatan
- Jakarta Timur
- Kabupaten Bogor
- Kota Bogor
- Kabupaten Bekasi
- Kota Bekasi
- Kota Depok
- Kabupaten Tangerang
- Kota Tangerang
- Kota Tangerang Selatan

### Variabel utama
Variabel utama yang dipakai untuk klasifikasi adalah:

- `jumlah kejadian banjir 2024`

Variabel pendukung untuk interpretasi:

- `total seluruh bencana 2024`
- `tren total bencana 2022-2024`
- `bahaya dominan 2024`
- `fasilitas pendukung yang ditampilkan`

### Aturan klasifikasi
Warna pada peta adalah `kelas prioritas turunan`, bukan indeks bahaya/risiko resmi BNPB.

Aturan kelas yang dipakai:

- `0-4` kejadian banjir: prioritas rendah
- `5-8` kejadian banjir: prioritas menengah
- `>8` kejadian banjir: prioritas tinggi

Tujuan klasifikasi ini adalah memudahkan visualisasi dan pembacaan SIG pada skala tugas, bukan menggantikan indeks risiko resmi.

## Pertanggungjawaban Data

Project ini **bisa dipertanggungjawabkan sebagai WebGIS tugas** dengan catatan berikut:

- angka kejadian banjir dan total bencana berasal dari sumber resmi BNPB
- batas wilayah berasal dari dataset administrasi publik
- basemap berasal dari OpenStreetMap
- klasifikasi warna adalah hasil olahan/metodologi project, bukan label resmi dari BNPB
- titik fasilitas pendukung adalah referensi spasial berbasis OSM/Nominatim dan perlu diverifikasi lagi bila dipakai untuk dokumen formal tingkat tinggi

Artinya, project ini aman untuk dipresentasikan jika kamu menjelaskan dengan jujur:

1. data utama banjir berasal dari BNPB
2. peta prioritas adalah hasil olahan kelompok
3. fasilitas pendukung adalah layer referensi, bukan daftar resmi final

## Keterbatasan

- belum memakai data kedalaman genangan resmi per wilayah
- belum memakai layer bahaya/risiko raster InaRISK langsung
- belum mencakup seluruh fasilitas kesehatan dan kebencanaan secara lengkap
- klasifikasi prioritas masih sederhana karena memakai satu indikator utama, yaitu jumlah kejadian banjir 2024

## Menjalankan Project

Karena ini website statis, jalankan server lokal sederhana:

```bash
python -m http.server 4173
```

Lalu buka:

`http://127.0.0.1:4173`

## Deploy

Project ini cocok dideploy ke:

- GitHub Pages
- Netlify
- Vercel

Karena tidak membutuhkan backend maupun database.

## Lisensi Data

Ikuti ketentuan lisensi dari masing-masing sumber data:

- BNPB Satu Data Bencana
- OpenStreetMap / ODbL
- geoBoundaries
