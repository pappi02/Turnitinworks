# TextVerity - Quick Start Guide

## Quick Start (Recommended)

### Prerequisites
- Python 3.10+
- Node.js 16+

### Start Platform
```bash
# Windows
.\start-all.ps1

# Linux/Mac
./start-all.sh
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Admin: http://localhost:8000/admin

**Admin Login:**
- Username: `admin`
- Password: `Admin123456!`

---

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

### SQLite (Development - Default)
Database file: `backend/db.sqlite3`

### PostgreSQL (Production)
Configure in `.env`:
```env
USE_SQLITE=false
DB_ENGINE=django.db.backends.postgresql
DB_NAME=textverity_db
DB_USER=your_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

### Reset Database
```bash
cd backend
source venv/bin/activate  # Windows: .\venv\Scripts\activate
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
Turnitinworks/
├── backend/
│   ├── venv/                 # Python virtual environment
│   ├── db.sqlite3            # SQLite database (development)
│   ├── apps/
│   │   ├── users/            # User management
│   │   ├── submissions/      # Document submissions
│   │   ├── turnitin/         # Turnitin integration
│   │   └── common/           # Shared utilities
│   ├── config/               # Django settings
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── node_modules/         # NPM packages
│   ├── dist/                 # Production build
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── store/            # Redux state
│   │   ├── services/         # API clients
│   │   ├── hooks/            # Custom hooks
│   │   └── utils/            # Utilities
│   ├── vite.config.ts
│   └── package.json
│
├── docs/                     # Documentation
├── start-all.ps1             # Windows startup script
├── start-all.sh              # Linux/Mac startup script
├── README.md
└── .env                      # Configuration
```
