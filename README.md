# ◆ PointSet CRM

Investor Relations CRM for PointSet Technologies. Self-contained Node.js app with SQLite — no external database needed.

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Set your credentials
cp .env.example .env
# Edit .env — change CRM_USER and CRM_PASS

# 3. Run
npm start
# → http://localhost:3000
```

On first visit, the database auto-seeds with your 25 contacts and interaction history.

## Deploy to Railway (Recommended — 5 min)

1. Push this folder to a **private** GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo
4. Add environment variables in Railway dashboard:
   - `CRM_USER` = your username
   - `CRM_PASS` = a strong password
   - `PORT` = 3000
5. Railway gives you a private URL. Share it only with your team.

> **Important:** Railway's free tier includes 500 hours/month. The Hobby plan ($5/mo) gives you always-on with persistent storage.

## Deploy to Render

1. Push to a **private** GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo, set:
   - Build: `npm install`
   - Start: `node server.js`
   - Environment: add `CRM_USER`, `CRM_PASS`
4. Render gives you an HTTPS URL.

> **Note:** Render's free tier spins down after inactivity and the SQLite file resets. Use the Starter plan ($7/mo) for persistent disk.

## Deploy with Docker

```bash
docker build -t pointset-crm .
docker run -p 3000:3000 \
  -e CRM_USER=pointset \
  -e CRM_PASS=your-password \
  -v $(pwd)/db:/app/db \
  pointset-crm
```

## API Endpoints

All endpoints require basic auth.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List all contacts |
| POST | `/api/contacts` | Create contact |
| PUT | `/api/contacts/:id` | Update contact |
| DELETE | `/api/contacts/:id` | Delete contact + interactions |
| GET | `/api/interactions` | List all interactions |
| POST | `/api/interactions` | Create interaction |
| POST | `/api/seed` | Bulk seed (only if empty) |
| POST | `/api/reset` | Wipe all data |

## Security

- **Basic auth** protects all routes (UI + API)
- Set strong credentials via environment variables
- Use a **private** repo — the code contains your contact data as seed
- Railway/Render URLs are not indexed by search engines
- For extra security, add IP allowlisting via your hosting provider

## Architecture

```
pointset-crm/
├── server.js          # Express + SQLite + auth
├── public/
│   └── index.html     # Full React CRM (single file, no build step)
├── db/
│   └── crm.sqlite     # Created at runtime
├── Dockerfile
└── package.json
```

No build step. No webpack. No framework. Just `node server.js`.
