# GitHub Codespaces Access Guide

## Quick Access URLs

### Frontend (React Application)
```
https://[YOUR-CODESPACE-NAME]-5173.app.github.dev
```

### Backend API
```
https://[YOUR-CODESPACE-NAME]-8000.app.github.dev/api/v1
```

### API Documentation
```
https://[YOUR-CODESPACE-NAME]-8000.app.github.dev/api/docs
```

---

## Important: URL Format

**DO NOT** include the port number at the end of GitHub Codespaces forwarded URLs.

### ✅ CORRECT
```
https://urban-funicular-7g9rq5rvwv53xpg5-8000.app.github.dev/api/v1/
```

### ❌ INCORRECT
```
https://urban-funicular-7g9rq5rvwv53xpg5-8000.app.github.dev:8000/api/v1/
                                           ↑ Remove :8000 - NOT needed for GitHub Codespaces
```

---

## Getting Your Codespace Name

1. Look at the VS Code window title bar
2. Or check the browser URL
3. Format: `https://[CODESPACE-NAME]-[PORT].app.github.dev/`

Example: If your codespace is `urban-funicular-7g9rq5rvwv53xpg5`, use:
- Frontend: `https://urban-funicular-7g9rq5rvwv53xpg5-5173.app.github.dev`
- Backend: `https://urban-funicular-7g9rq5rvwv53xpg5-8000.app.github.dev`

---

## Status

✅ **All Services Configured and Running**

| Service | Status | URL |
|---------|--------|-----|
| PostgreSQL | ✅ Running | Port 5432 (internal) |
| Redis | ✅ Running | Port 6379 (internal) |
| Django Backend | ✅ Running | Port 8000 |
| React Frontend | ✅ Running | Port 5173 |

---

## First Time Setup

If services are not running, start them:

```bash
./start-all.sh
```

This will automatically:
1. Start PostgreSQL database
2. Start Redis cache
3. Start Django backend
4. Start Vite frontend

All services will be ready in ~10-15 seconds.

---

## Testing the API

Once the backend is running:

```bash
curl https://[YOUR-CODESPACE-NAME]-8000.app.github.dev/api/v1/auth/login/
```

You should get a JSON response with field requirements.

---

## Backend Configuration

The backend is configured to accept requests from:
- `localhost:5173` (local development)
- `10.0.2.106:5173` (Docker network)
- `172.18.0.1:5173` (Docker network)
- `*.app.github.dev` (GitHub Codespaces)

No additional configuration needed!

---

## If Services Stop

If you need to restart:

```bash
# Restart all services
./start-all.sh

# Or manually:
# Kill all
pkill -f "manage.py runserver" || true
pkill -f "vite" || true

# Then restart
./start-all.sh
```

---

## Frontend Environment

The frontend is configured to connect to the backend at:
```
http://localhost:8000/api/v1
```

This is set in `/workspaces/Turnitinworks/frontend/.env.local` and works for both local and Codespaces environments due to GitHub's port forwarding.

---

## Next Steps

1. Open the frontend at your Codespaces URL
2. Register a new account or login
3. Try the dashboard, analytics, and report features
4. All API calls are automatically forwarded to the backend

Enjoy! 🚀
