# Deployment & Access Guide

## Local Development

### Quick Start
```bash
./start-all.sh
```

This script will:
1. Start PostgreSQL and Redis containers
2. Start Django backend on `http://localhost:8000`
3. Start Vite frontend on `http://localhost:5173`

### Manual Start
```bash
# Terminal 1: Start databases
cd docker
docker-compose up -d db redis

# Terminal 2: Start backend
cd backend
source ../.venv/bin/activate
python manage.py runserver 0.0.0.0:8000

# Terminal 3: Start frontend
cd frontend
npm run dev -- --host --port 5173
```

### Access Points (Local)
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/v1
- **API Docs**: http://localhost:8000/api/docs

---

## GitHub Codespaces

### URLs

**IMPORTANT**: GitHub Codespaces automatically forwards ports. Do NOT add the port number to the end of the forwarded URL.

#### Correct Format
```
https://[codespace-name]-[port].app.github.dev/
```

#### Examples
- **Frontend (Port 5173)**: `https://urban-funicular-7g9rq5rvwv53xpg5-5173.app.github.dev/`
- **Backend (Port 8000)**: `https://urban-funicular-7g9rq5rvwv53xpg5-8000.app.github.dev/`

#### Incorrect Format ❌
```
https://urban-funicular-7g9rq5rvwv53xpg5-8000.app.github.dev:8000/
                                                          ↑ Remove this
```

### Accessing the Application in Codespaces

1. **Start the services**:
   ```bash
   ./start-all.sh
   ```

2. **Open Port Forwarding** (if not automatic):
   - In VS Code Command Palette: `Codespaces: Ports`
   - Make ports public if needed

3. **Access Frontend**:
   - Click on the Port 5173 forwarded URL in VS Code
   - Or manually navigate to the GitHub Codespaces URL

4. **Access Backend API**:
   - Append `/api/v1/` to the Port 8000 forwarded URL
   - Or access API documentation: `https://[codespace]-8000.app.github.dev/api/docs`

---

## Environment Configuration

### Backend (.env)
```dotenv
DEBUG=True
SECRET_KEY=django-insecure-development-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,10.0.2.106,172.18.0.1,.app.github.dev,.github.dev

DB_ENGINE=django.db.backends.postgresql
DB_NAME=turnitin_db
DB_USER=postgres
DB_PASSWORD=postgres_password
DB_HOST=localhost
DB_PORT=5432

TURNITIN_API_KEY=test-api-key
TURNITIN_API_SECRET=test-api-secret
TURNITIN_API_URL=https://api.turnitin.com

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Frontend (.env.local)
```dotenv
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=Turnitin SaaS
VITE_DEBUG=false
```

---

## Database & Services

### Start Services
```bash
cd docker
docker-compose up -d
```

### Check Status
```bash
docker ps --filter "name=turnitin"
docker-compose ps
```

### Database Access
```bash
# PostgreSQL
psql -h localhost -U postgres -d turnitin_db

# Redis
redis-cli -h localhost -p 6379
```

### Run Migrations
```bash
cd backend
python manage.py migrate
```

### Create Superuser
```bash
cd backend
python manage.py createsuperuser
```

---

## Testing

### Run Tests
```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm run test
```

### API Testing
```bash
# List submissions
curl http://localhost:8000/api/v1/submissions/

# Login
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email_or_username":"admin","password":"password"}'
```

---

## Troubleshooting

### Connection Refused
- **Check**: Are databases running?
  ```bash
  docker ps
  ```
- **Fix**: Start Docker containers
  ```bash
  cd docker && docker-compose up -d
  ```

### CORS Errors
- **Check**: Frontend URL is in `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
- **Fix**: Update `.env` to include your domain
- **Restart**: Backend server to reload environment

### Port Already in Use
```bash
# Find process using port
lsof -i :8000
lsof -i :5173

# Kill process
kill -9 <PID>
```

### Frontend Can't Reach API
- **Check**: `VITE_API_URL` in `.env.local`
- **Verify**: Backend is running on correct port
- **Refresh**: Browser (Ctrl+F5 or Cmd+Shift+R)

---

## Production Checklist

- [ ] Change `SECRET_KEY` to a secure random string
- [ ] Set `DEBUG=False`
- [ ] Update `ALLOWED_HOSTS` with production domain
- [ ] Configure real database (update `DB_*` variables)
- [ ] Set up Sentry for error tracking
- [ ] Enable HTTPS/SSL
- [ ] Configure real Turnitin API credentials
- [ ] Set up email configuration
- [ ] Run `python manage.py collectstatic`
- [ ] Run `python manage.py migrate`
- [ ] Create production superuser

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
│      Port 5173 / GitHub Codespaces      │
└──────────────────┬──────────────────────┘
                   │ HTTP/CORS
                   ▼
┌─────────────────────────────────────────┐
│       Backend (Django REST API)         │
│      Port 8000 / GitHub Codespaces      │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   ┌──────────┐          ┌──────────┐
   │PostgreSQL│          │  Redis   │
   │ Port5432 │          │ Port 6379│
   └──────────┘          └──────────┘
```
