# Product API Deployment

Product API untuk latihan deployment backend: Express, MySQL-compatible MariaDB, Docker Compose,
dan GitHub Actions.

## Endpoint

- `GET /health` returns `{ "status": "ok" }`.
- `GET /api/products` returns products loaded from MySQL.

## Local setup

```bash
cp .env.example .env
npm ci
npm test
docker compose up --build -d
curl http://localhost:8001/health
curl http://localhost:8001/api/products
```

`DB_HOST=mysql` harus memakai nama service Compose, bukan `localhost`.
Jangan commit `.env` atau mengirim nilainya ke chat.

Untuk menguji server tanpa database, jalankan image dengan `DISABLE_DB=true`:

```bash
docker build -t product-api:1.0 .
docker run --rm -p 3000:3000 --env PORT=3000 --env DISABLE_DB=true product-api:1.0
```

Lalu buka `http://localhost:3000/health`. Endpoint `/api/products` mengembalikan
HTTP 503 selama database dinonaktifkan.

## VPS setup

```bash
git clone <repository-url> ~/product-api-deployment
cd ~/product-api-deployment
cp .env.example .env
nano .env
docker compose up --build -d
docker compose ps
docker compose logs --tail=50 api
```

Untuk GitHub Actions, isi repository secrets berikut:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_FINGERPRINT`
- `VPS_PATH` (contoh: `/home/fwd12/product-api-deployment`)

Job deploy hanya berjalan setelah test dan lint berhasil.
