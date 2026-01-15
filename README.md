# TextVerity

**Academic Integrity Platform**

> Integrity in Every Submission

TextVerity is an academic submission and integrity platform that enables institutions to manage assignments and generate similarity reports within a controlled learning environment.

## 🚀 Native Architecture (No Docker)

TextVerity runs **100% native** - no containers, no Docker, no complexity. Just Python, Node.js, and your choice of database.

**Why Native?**
- ⚡ Faster development and deployment
- 🎯 Simpler setup and maintenance  
- 💰 Lower resource usage and costs
- 🔧 Better IDE integration and debugging
- 🌐 More deployment options (PaaS, VPS, serverless)

## Features

- 📝 **Document Submission Management** - Upload and organize academic submissions
- 🔍 **Similarity Detection** - Generate comprehensive originality reports
- 👥 **User Management** - Role-based access control for students, instructors, and administrators
- 📊 **Analytics Dashboard** - Track submission patterns and integrity metrics
- 🔐 **Secure & Compliant** - Built with academic institution requirements in mind
- 🚀 **Modern Stack** - Django REST Framework + React + PostgreSQL

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 16+
- (Optional) PostgreSQL for production - SQLite used by default

### Development Setup

**Option 1: Quick Start (Recommended)**
```powershell
# Clone and navigate to project
cd Turnitinworks

# Run the startup script
.\start-all.ps1    # Windows
# OR
./start-all.sh     # Linux/Mac
```

**Option 2: Manual Setup**
```powershell
# 1. Setup backend
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows
# OR
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python manage.py migrate

# 2. Setup frontend
cd ../frontend
npm install

# 3. Start services
# Terminal 1: Backend
cd backend
.\venv\Scripts\activate
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm run dev
```

Access the platform:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin

### Admin Credentials
- **Username**: `admin`
- **Password**: `Admin123456!`

## Documentation

Complete documentation is available in the [`docs/`](docs/) folder:

- **[Quick Start Guide](docs/QUICK_START.md)** - Setup and first steps
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Production deployment options
- **[Architecture](docs/ARCHITECTURE.md)** - System design and components
- **[Native Architecture](docs/NATIVE_ARCHITECTURE.md)** - Why containerless design
- **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API reference
- **[Brand Guidelines](docs/BRAND_GUIDELINES.md)** - TextVerity branding

👉 **[View all documentation →](docs/README.md)**

## Technology Stack

- **Backend**: Django 4.2, Django REST Framework
- **Frontend**: React 18, TypeScript, Vite
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Cache**: Redis (optional)
- **Task Queue**: Celery (optional)

## Architecture

TextVerity uses a **native, containerless architecture**:
- ✅ Faster development iteration
- ✅ Simpler deployment options
- ✅ Lower resource usage
- ✅ Platform flexibility (Windows, Linux, macOS)
- ✅ Easy integration with managed services

**See [docs/NATIVE_ARCHITECTURE.md](docs/NATIVE_ARCHITECTURE.md) for details.**

### Production Deployment Options
1. **PaaS**: Railway, Render, Heroku, Fly.io
2. **Managed Services**: AWS, DigitalOcean, Azure, Google Cloud
3. **VPS**: Traditional server deployment with Nginx
4. **Serverless**: AWS Lambda, Google Cloud Run

**Full deployment guide: [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)**

## License

Academic use license - see LICENSE file for details.

---

© 2026 TextVerity • Built with integrity for institutions
