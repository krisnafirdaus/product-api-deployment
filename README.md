# Product API Deployment

Project contoh untuk materi Day 52 — Deployment Backend (CI/CD dan Hosting).
Stack: **Node.js 24, Express, MariaDB 10.11, Docker Compose, dan GitHub Actions**.
MariaDB menggunakan protokol MySQL dan cocok dengan CPU VPS kelas.

## Endpoint

| Endpoint | Hasil |
| --- | --- |
| `GET /health` | HTTP 200, `{ "status": "ok" }` |
| `GET /api/info` | HTTP 200, informasi aplikasi untuk latihan CI/CD; tidak membutuhkan database |
| `GET /api/products` | HTTP 200, daftar produk dari database |

Ini API JSON; membuka `/` menghasilkan HTTP 404. Database baru diisi tiga produk
oleh `db/001_init.sql`. Script inisialisasi hanya berjalan ketika volume database
masih kosong. Project ini untuk latihan; deployment production memerlukan HTTPS,
pengaturan akses sesuai kebutuhan aplikasi, backup, dan pemantauan.

## 1. Siapkan repository sendiri

Setiap student **fork repository ini ke akun GitHub masing-masing**, lalu clone
fork tersebut di laptop. Untuk latihan kelas, gunakan repository public agar VPS
bisa menarik kode melalui HTTPS tanpa credential GitHub tambahan.

```bash
git clone https://github.com/<USERNAME-GITHUB>/product-api-deployment.git
cd product-api-deployment
nvm install
nvm use
npm ci
npm test
npm run lint
```

`.nvmrc`, Dockerfile, dan CI memakai Node.js 24. Jika tidak memakai nvm, pasang
Node.js 24 dengan installer yang sesuai sistem operasi. Di fork, buka tab
**Actions** dan aktifkan workflow bila GitHub meminta. Repository secrets tidak
ikut tersalin saat fork.

## 2. Coba di laptop

Siapkan Docker dengan Compose plugin, lalu:

```bash
cp .env.example .env
```

Edit `.env`: ganti kedua contoh password database dengan password berbeda.
`PORT=3000` adalah port di container, sedangkan `HOST_PORT=8001` adalah port laptop.
`DB_HOST=mysql` harus tetap memakai nama service Compose.

```bash
docker compose up --build -d
curl --fail http://localhost:8001/health
curl --fail http://localhost:8001/api/products
docker compose ps
```

Opsional, coba API tanpa database:

```bash
docker build -t product-api:1.0 .
docker run --rm -p 3000:3000 --env PORT=3000 --env DISABLE_DB=true product-api:1.0
```

Pada mode tersebut `/health` tetap HTTP 200, tetapi `/api/products` HTTP 503.

## 3. Akses VPS kelas dari ZIP pribadi

Mentor membagikan satu ZIP khusus untuk setiap student. Ekstrak ZIP untuk membaca
username, host, port API, panduan login, private key CI, dan `known_hosts` yang
sudah diverifikasi mentor. Jangan membagikan ZIP atau private key ke student lain,
menaruhnya di folder project, atau mengunggahnya ke repository.

| Akun | Port API |
| --- | --- |
| Demo mentor | `8001` |
| `student01` sampai `student15` | `8002` sampai `8016`, berurutan |

Port SSH adalah **22**. Port API berbeda untuk setiap student. Gunakan data di ZIP
pribadi sebagai acuan. Akun dan konfigurasi database sudah disiapkan di VPS;
student masih perlu clone fork dan mengisi GitHub secrets sendiri.

VPS kelas memiliki 2 vCPU / 4 GB RAM. Jalankan praktik **satu student aktif pada
satu waktu** sesuai giliran mentor. Akun terpisah tidak berarti server cukup untuk
15 proses build dan database bersamaan.

Contoh berikut untuk `student01`; ganti username dan host sesuai ZIP:

```bash
ssh student01@<VPS_HOST>
passwd
systemctl --user start docker
docker context show
cd ~/product-api-deployment
git clone https://github.com/<USERNAME-GITHUB>/product-api-deployment.git .
cp ~/classroom/.env .env
cp ~/classroom/docker-compose.override.yml docker-compose.override.yml
chmod 600 .env
docker compose up --build -d
docker compose ps
```

`passwd` mengganti password login awal; autentikasi dengan key CI tetap bisa
berjalan. Clone ke folder tersebut hanya dilakukan sekali, saat masih kosong.
Untuk student, `docker context show` harus menghasilkan `rootless`. Gunakan Docker
tanpa `sudo`. Jangan menyalin `.env.example` ke VPS student karena setiap akun
sudah memiliki password, nama database, dan port sendiri.

File override membatasi resource API/database sesuai alokasi kelas. `.env` dan
file override lokal diabaikan oleh Git. Setelah berhasil, dari laptop cek port
milik sendiri (contoh `student01`):

```bash
curl --fail http://<VPS_HOST>:8002/health
curl --fail http://<VPS_HOST>:8002/api/products
```

Selesai praktik, hentikan stack dan daemon Docker student agar resource bisa
dipakai peserta berikutnya. Perintah ini mempertahankan volume database:

```bash
cd ~/product-api-deployment
docker compose stop
systemctl --user stop docker
```

Workflow menyalakan kembali daemon rootless ketika student mendapat giliran
untuk deploy. Setelah restart VPS, daemon student perlu dinyalakan kembali.

## 4. Isi enam GitHub Actions secrets

Di **repository fork milik sendiri**, buka **Settings → Secrets and variables →
Actions → New repository secret**:

| Secret | Isi |
| --- | --- |
| `VPS_HOST` | IP/hostname VPS dari ZIP, tanpa `http://` |
| `VPS_USER` | Username sendiri, misalnya `student01` |
| `VPS_PATH` | `/home/student01/product-api-deployment`, sesuaikan username |
| `VPS_PORT` | Port **API** sendiri, misalnya `8002`; bukan port SSH `22` |
| `VPS_SSH_KEY` | Seluruh isi file `vps_ci_key` dari ZIP, termasuk baris pembuka/penutup |
| `VPS_KNOWN_HOSTS` | Seluruh isi `known_hosts` dari ZIP yang sudah diverifikasi mentor |

`VPS_PORT` harus sama dengan `HOST_PORT` di `.env` VPS. Workflow memakai
`VPS_KNOWN_HOSTS`; secret lama `VPS_FINGERPRINT` tidak digunakan. Jangan membuat
`known_hosts` dari hasil scan yang belum diverifikasi atau menonaktifkan pemeriksaan
host SSH. Jangan commit `.env`, password, maupun private key.

Gunakan workflow terbaru yang sudah ada di `.github/workflows/deploy.yml` pada
repository ini. Tidak perlu menyalin workflow lama dari paket akses.

Ada dua koneksi yang berbeda:

- **GitHub Actions → VPS:** memakai `VPS_SSH_KEY` dari ZIP student.
- **VPS → GitHub:** public fork memakai HTTPS. Private repository membutuhkan deploy
  key GitHub tersendiri yang hanya memiliki akses baca repository tersebut.

Untuk repository private, mentor perlu menyiapkan key terpisah dan host GitHub
yang sudah diverifikasi pada VPS. Atur key pada clone tersebut, misalnya:

```bash
git config core.sshCommand 'ssh -i ~/.ssh/github_repo_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes'
```

Sesuaikan remote Git dengan SSH URL fork. Jangan memakai private key akses VPS
sebagai deploy key GitHub. Workflow tidak mengunci nama key GitHub milik mentor.

## 5. Jalankan CI/CD

Ubah kode di laptop, jalankan test/lint, commit, lalu push ke `main` fork sendiri:

```bash
npm test
npm run lint
git add <FILE-YANG-DIUBAH>
git commit -m "Update Product API"
git push origin main
```

Workflow juga bisa dijalankan lewat **Actions → Test and deploy API → Run
workflow**, pilih branch `main`. Pull request menjalankan test/lint tanpa deploy.
Deploy pada `main` hanya berjalan setelah keduanya lulus.

Untuk melihat hasil perubahan setelah workflow selesai, buka di Postman:

```http
GET http://<VPS_HOST>:<PORT_API>/api/info
```

Gunakan port akun sendiri (mentor `8001`, student sesuai penugasan). Responsnya:

```json
{
  "name": "Product API",
  "message": "Endpoint baru untuk latihan CI/CD"
}
```

Endpoint ini tidak memeriksa status pipeline atau database; respons tersebut
menjadi penanda bahwa kode endpoint baru sudah ter-deploy. Fork student perlu
menerima perubahan ini dan menjalankan workflow pada repository sendiri.

Workflow mengambil commit yang telah diuji, menyalakan Docker rootless untuk
student, menjalankan Compose, lalu memastikan `/health` **dan** `/api/products`
berhasil. Demo mentor tetap bisa memakai Docker default. Jika `main` sudah maju,
run lama dilewati agar tidak men-deploy commit usang. Perubahan tracked yang belum
di-commit pada VPS akan menghentikan deploy dan tetap disimpan.

Deployment diserialkan per repository dan per folder VPS. Fork student yang
berbeda tetap dapat berjalan bersamaan, sehingga giliran praktik kelas harus
diatur mentor. Jangan menjalankan workflow di luar giliran.

## Troubleshooting dan rollback

- **Cannot connect to Docker daemon:** pada akun student, jalankan
  `systemctl --user start docker` dan pastikan context `rootless`.
- **SSH gagal:** cek keenam secrets dan kecocokan akun, key, serta host dari ZIP.
- **Port tidak cocok:** samakan `VPS_PORT` dengan `HOST_PORT` yang diberikan mentor.
- **Database gagal:** cek `docker compose ps` dan `docker compose logs --tail=50 mysql`.
  Mengubah password `.env` tidak mengganti password database pada volume lama.
- **API gagal:** cek `docker compose logs --tail=50 api` pada VPS. Jangan membagikan
  log yang memuat credential.
- **Git gagal:** pastikan folder VPS berada di branch `main`, remote menunjuk fork
  sendiri, tidak ada perubahan tracked lokal, dan akses baca GitHub tersedia.

Untuk rollback kode, buat revert di laptop lalu push agar CI menguji perubahan:

```bash
git revert <COMMIT-YANG-DIBATALKAN>
git push origin main
```

Rollback kode tidak memulihkan perubahan data/schema. `docker compose down`
mempertahankan volume; menambahkan `-v` menghapus database dan bukan langkah
troubleshooting rutin.
