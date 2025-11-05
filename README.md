# Web Shop (FastAPI + MySQL)

E-commerce project with a Python/FastAPI backend, MySQL database, a simple static frontend, and a content-based recommendation pipeline.

## Features
- Authentication with JWT (access token) and role-based routes
- Product management: CRUD, images (Cloudinary), promotions
- Search with Vietnamese text normalization, brand/type extraction, price filters
- Reviews and ratings (parent/child replies, average rating breakdown)
- Cart and Orders (basic flow)
- User activity tracking (click/addToCart/order) for recommendations
- Recommendation (content-based, cosine similarity) with precomputed matrix
- Public/admin banners (static files served by FastAPI)
- OpenAPI docs at /docs and /redoc

## Project structure
```
web_shop/
├─ Back_end/
│  ├─ app/
│  │  ├─ main.py                # FastAPI app entry
│  │  ├─ core/                  # config, security, db session
│  │  ├─ routers/               # API routes (auth, product, orders, review, banners, ...)
│  │  ├─ models/                # SQLAlchemy models (products, reviews, user_activity, ...)
│  │  ├─ schemas/               # Pydantic schemas
│  │  ├─ services/              # business logic (search, recommendation helper, ...)
│  │  └─ static/                # static folders: banners/, support_files/
│  └─ requirements.txt
├─ Front_end/                   # static HTML/CSS/JS pages
├─ crawl_data/                  # notebooks & csvs for scraping/reco prep
└─ README.md
```

## Prerequisites
- Python 3.11+ (tested with 3.11/3.12/3.13)
- MySQL 8.x running locally (port 3306)
- Cloudinary account (for image uploads)

## Quick start (Backend)
```bash
# 1) Create & activate venv
cd Back_end
python -m venv .venv
source .venv/bin/activate  # on Windows: .venv\\Scripts\\activate

# 2) Install deps
pip install -r requirements.txt

# 3) Prepare database
# - Ensure a database named `web_shop` exists in your local MySQL.
# - Update DB credentials in app/core/config.py (db_url) to match your local setup.
#   (Example: mysql+pymysql://<user>:<pass>@localhost:3306/web_shop)

# 4) Configure Cloudinary (optional but recommended for image upload)
# - Set environment variable CLOUDINARY_URL or update app/core/config.py.
#   The format is: cloudinary://<api_key>:<api_secret>@<cloud_name>

# 5) Run API server (FastAPI)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Now open:
- API Docs (Swagger): http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

CORS is enabled for all origins by default in `main.py` for local development.

## Environment/config notes
- Database DSN is currently defined in `app/core/config.py` as `db_url`. Change it to your local credentials.
- Cloudinary config reads `CLOUDINARY_URL` env if provided; otherwise the file config is used. Replace any hard-coded secret values with your own.

## Search tips
The search service normalizes Vietnamese (e.g., "điện thoại" → "dien thoai") and supports:
- Category keywords: "dien thoai", "laptop", "may tinh bang" (also "ipad", "tablet" → mapped to tablet), "tai nghe", "cap sac", "du phong" ("pin/sac du phong")
- Brand detection (Samsung, Apple, Xiaomi, Oppo, Vivo, ...)
- Price parsing: "duoi/ toi da/ max", "tren/ tu/ min", exact with "k", "tr/ trieu"
- RAM/Storage filters by regex (e.g., "8GB RAM", "256GB")

If a full name is given (e.g., "Tai nghe Sony WH-CH720"), the system attempts a full-text LIKE search after extracting brand/type.

## Reviews & Ratings
- POST `/reviews/` to add a review (requires JWT)
- GET `/reviews?product_id=...` to list reviews for a product
- GET `/reviews/rating?product_id=...` returns average and star breakdown
- Admin reply: POST `/reviews/response?id_parent=...`

Validation recommendation: ensure `product_id > 0` and exists; the DB enforces FK integrity.

## Recommendation pipeline
There are two ways to build/update the recommendation artifacts:

1) Notebook-based (data exploration friendly)
- Open `crawl_data/recomendation.ipynb`
- It loads `product_search` and computes a cosine similarity matrix
- Saves artifacts under `Back_end/app/models/recommendation/` (e.g., `similarity_matrix_v2.pkl`)

2) Script-based (headless)
- `Back_end/app/services/recommendation_train.py` (if present)
- It reads from DB, prepares features, trains, and saves:
  - `similarity_matrix_v2.pkl`
  - `scaler_v2.pkl`

Optional automation: use a scheduler (cron) or a task queue to rerun training periodically.

## Frontend (static)
The `Front_end/` directory contains static HTML/CSS/JS pages. For local preview you can:
```bash
# Option 1: open Front_end/index.html directly in browser
# Option 2: serve a simple local server (development only)
cd Front_end
python -m http.server 5500
```
Then browse http://127.0.0.1:5500

Note: The FastAPI app separately serves only `Back_end/app/static/` for banners and internal assets at `/static`.

## Common API groups
- Auth: `/auth/*` (login, register, token handling)
- Products: `/products`, `/products/{id}`
- Reviews: `/reviews/*`, ratings summary `/reviews/rating`
- Orders: `/orders/*`
- Banners: `/admin/banners`, `/banners`
- User activity: `/user-activity/*`

See live docs at `/docs` for all parameters and schemas.

## Seeding & sample data
- Source product data comes from `crawl_data/*.csv` and scraping notebooks.
- Import flows are notebook-driven; adapt as needed for automated seeding.

## Troubleshooting
- "Cannot connect to MySQL": verify `db_url` in `app/core/config.py` and MySQL service
- "Foreign key constraint fails (reviews)": ensure `product_id` is valid (>0 and exists)
- CORS issues: CORS is already open; check your browser console for exact origin/headers
- Cloudinary upload fails: ensure `CLOUDINARY_URL` is valid

## License
Internal/Personal project (no explicit license). Add one if you intend to publish.
