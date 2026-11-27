# KSHE Citation Monitoring

Dashboard pemantauan publikasi dan sitasi dosen Departemen Konservasi Sumberdaya Hutan dan Ekowisata (KSHE), IPB University, per dosen dan per divisi.

Data diambil dari Scopus setiap bulan, lalu disimpan sebagai *snapshot* di database Neon (PostgreSQL) sehingga tren dapat dilihat dari waktu ke waktu.

## Isi repo

| Path | Fungsi |
|---|---|
| `data/dosen_kshe.csv` | Daftar dosen, divisi, dan ID (Scopus, SINTA, Google Scholar, ORCID). **Edit file ini** jika ada dosen baru, pindah divisi, pensiun, atau ID yang salah. |
| `db/schema.sql` | Skema database dan *view* untuk dashboard. |
| `scripts/sync-scopus.ts` | Mengambil metrik penulis (dokumen, sitasi, h-index) dan daftar publikasi dari Scopus, serta CiteScore jurnal. |
| `scripts/import-scimago.ts` | (Opsional) Mengimpor kuartil SJR dari file ekspor SCImago. |
| `.github/workflows/sync-scopus.yml` | Menjalankan sinkronisasi otomatis setiap tanggal 1, pukul 08.00 WIB. |

## Penyiapan (sekali saja)

1. **Neon**: buat project di [neon.tech](https://neon.tech), salin *connection string* (dengan `sslmode=require`).
2. **GitHub Secrets** (Settings → Secrets and variables → Actions → New repository secret):
   - `DATABASE_URL`: connection string Neon
   - `SCOPUS_API_KEY`: API key dari [dev.elsevier.com](https://dev.elsevier.com)
   - `SCOPUS_INSTTOKEN` (opsional): *institutional token* dari Elsevier. Diperlukan bila API Scopus menolak permintaan dari luar jaringan IPB (GitHub Actions berjalan di luar jaringan IPB).
3. Jalankan workflow pertama kali: tab **Actions** → *Sync Scopus data* → **Run workflow**. Untuk uji coba, isi satu Scopus Author ID di kolom *only*.

## Menjalankan secara lokal

```bash
cp .env.example .env    # isi DATABASE_URL dan SCOPUS_API_KEY
npm install
npx tsx --env-file=.env scripts/migrate.ts
npx tsx --env-file=.env scripts/seed-lecturers.ts
npx tsx --env-file=.env scripts/sync-scopus.ts --only 6506961084
```

## Cara penghitungan

- **Publikasi divisi**: satu artikel yang ditulis bersama oleh beberapa dosen dalam divisi yang sama dihitung satu kali.
- **Kuartil**: kuartil SJR (SCImago) pada tahun terbit bila sudah diimpor; jika tidak ada, diturunkan dari persentil CiteScore Scopus (≥75 = Q1).
- **Top Tier**: sementara didefinisikan sebagai persentil CiteScore ≥ 90 (10% teratas). Perlu disesuaikan dengan definisi DKSRA.
- **Tren sitasi**: dihitung dari selisih *snapshot* antar periode (`author_snapshots`, `publication_snapshots`).
- Dosen yang sudah pensiun tetap tercatat (kolom `aktif = tidak`) agar publikasi masa aktifnya tetap terhitung.

## Catatan lisensi data

Data metrik berasal dari Scopus (Elsevier). Penampilan data Scopus secara publik tunduk pada ketentuan lisensi API Elsevier; pastikan penggunaan sesuai dengan perjanjian langganan IPB.
