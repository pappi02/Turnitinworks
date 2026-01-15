# Quick Start Guide

## Backend Development

### Activate Virtual Environment
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Run Migrations
```bash
python manage.py migrate
```

### Create Superuser
```bash
python manage.py createsuperuser
```

### Start Development Server
```bash
python manage.py runserver
```
**Access:** http://localhost:8000

### API Documentation
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

### Install New Backend Packages
```bash
source venv/bin/activate
pip install package-name
pip freeze > requirements.txt  # Update requirements
```

---

## Frontend Development

### Start Development Server
```bash
cd frontend
npm run dev
```
**Access:** http://localhost:5173

### Build for Production
```bash
npm run build  # Creates /dist folder
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Install New Frontend Packages
```bash
cd frontend
npm install package-name
```

---

## Docker Development

### Start All Services
```bash
cd docker
docker-compose up --build
```

**Services:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Database: postgres://localhost:5432
- Redis: localhost:6379

### View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop Services
```bash
docker-compose down
```

---

## Environment Configuration

### Backend .env File
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
```

**Required Variables:**
- `SECRET_KEY` - Django secret key
- `DEBUG` - False for production
- `TURNITIN_API_KEY` - Your API key
- `TURNITIN_API_SECRET` - Your API secret
- `DB_PASSWORD` - PostgreSQL password

### Frontend Environment
Create `frontend/.env` if needed:
```bash
VITE_API_URL=http://localhost:8000
```

---

## Testing

### Backend Tests
```bash
cd backend
source venv/bin/activate
pytest
```

### Frontend Tests
```bash
cd frontend
npm run test
```

---

## Database

### Connect to PostgreSQL (Docker)
```bash
docker exec -it turnitin_db psql -U postgres -d turnitin_db
```

### Reset Database
```bash
cd backend
source venv/bin/activate
python manage.py flush  # Warning: Deletes all data
```

---

## Useful Commands

### Backend Django Commands
```bash
# Create new app
python manage.py startapp app_name

# Make migrations
python manage.py makemigrations

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Check for issues
python manage.py check

# Collect static files
python manage.py collectstatic --noinput
```

### Frontend NPM Commands
```bash
# Update all packages
npm update

# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# View what will be published
npm pack
```

---

## Troubleshooting

### Backend: ModuleNotFoundError
```bash
# Make sure venv is activated
source venv/bin/activate
# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend: Module not found
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Error
- Ensure PostgreSQL is running
- Check `DB_HOST`, `DB_USER`, `DB_PASSWORD` in `.env`
- For Docker: ensure `db` service is running

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
# Or use different port
python manage.py runserver 8001
```

---

## Project Structure Reference

```
/workspaces/Turnitinworks/
├── backend/
│   ├── venv/                 # Virtual environment
│   ├── apps/
│   │   ├── users/            # User management
│   │   ├── submissions/      # Document submissions
│   │   ├── turnitin/         # Turnitin integration
│   │   └── common/           # Shared utilities
│   ├── config/               # Django settings
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── node_modules/         # NPM packages
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── store/            # Redux state
│   │   ├── services/         # API clients
│   │   ├── hooks/            # Custom hooks
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Utilities
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
└── docs/
```

---

**Next Task:** Step 7 - Implement Turnitin User Provisioning
