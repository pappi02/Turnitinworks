# Frontend Architecture & Component Map

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React App (App.tsx)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          NotificationCenter (Step 23)                    │   │
│  │  Global toast notifications at top-right                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           React Router (v6)                              │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  / (LandingPage)                                         │   │
│  │  /login (LoginPage)                                      │   │
│  │  /register (RegisterPage)                                │   │
│  │  /dashboard (Dashboard) ← Protected Route                │   │
│  │  /upload (UploadPage) ← Protected Route                  │   │
│  │  /report/:id (ReportPage) ← Protected Route              │   │
│  │  /analytics (AnalyticsPage) ← Protected Route [NEW]      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Redux Store Structure

```
Redux Store
├── Auth Reducer
│   ├── user: { id, email, name, role }
│   ├── access: JWT token
│   ├── refresh: JWT refresh token
│   ├── loading: boolean
│   └── error: string | null
│
└── Notifications Reducer [NEW]
    ├── items: Notification[]
    ├── all: Notification[]
    └── unreadCount: number
```

## Component Hierarchy

```
App.tsx
├── NotificationCenter (Step 23)
│   ├── Toast displays (success, error, warning, info)
│   └── Notification history panel
│
├── Router
│   ├── Public Routes
│   │   ├── LandingPage
│   │   ├── LoginPage
│   │   └── RegisterPage
│   │
│   └── Protected Routes (ProtectedRoute wrapper)
│       ├── Dashboard
│       │   ├── SearchFilters (Step 18) [TO INTEGRATE]
│       │   ├── BatchOperations (Step 19) [TO INTEGRATE]
│       │   ├── Submissions Table
│       │   └── Filters/Sorting UI
│       │
│       ├── UploadPage
│       │   └── File upload with drag-drop
│       │
│       ├── ReportPage
│       │   └── Report viewer
│       │
│       └── AnalyticsPage (Step 21) [NEW ROUTE]
│           ├── StatCard components
│           ├── Charts (similarity, trend, status, sources)
│           └── Date range selector
```

## Service Layer Architecture

```
Services/
├── api.ts
│   └── Axios instance with JWT interceptor
│
├── authService.ts
│   ├── login(email, password)
│   ├── register(email, password, name)
│   ├── refreshToken()
│   └── logout()
│
├── notificationService.ts (Step 23) [NEW]
│   ├── notificationService: { success, error, warning, info, etc }
│   ├── apiNotifications: { handleSuccess, handleError, etc }
│   ├── permissionNotifications: { denied, unauthorized, etc }
│   └── taskNotifications: { taskCompleted, reportReady, etc }
│
└── exportService.ts (Step 20) [NEW]
    ├── exportReportsPDF(reports[], fileName)
    ├── exportReportsCSV(reports[], fileName)
    ├── exportDetailedReportPDF(report, fileName)
    ├── exportReportsJSON(reports[], fileName)
    └── batchExportReports(reports[], format, onProgress)
```

## Utilities & Helpers

```
Utils/
├── rbac.ts (Step 22) [NEW]
│   ├── Types: UserRole, Permission, Role
│   ├── hasPermission(role, permission): boolean
│   ├── hasAnyPermission(role, permissions[]): boolean
│   ├── hasAllPermissions(role, permissions[]): boolean
│   ├── getRole(roleId): Role
│   ├── getRolePermissions(roleId): Permission[]
│   └── canPerformAction(role, resource, action): boolean
│
└── hooks/
    └── custom hooks (usePermission, useRole, etc)
```

## Data Flow

### Search & Filter Flow (Step 18)
```
SearchFilters Component
        ↓
User enters search/filters
        ↓
onSearch callback
        ↓
Dashboard state update
        ↓
API call with filters
        ↓
Display filtered results
```

### Batch Operations Flow (Step 19)
```
Dashboard (multiple selected)
        ↓
BatchOperations component shows
        ↓
User clicks Export/Delete/Share
        ↓
Operation history added
        ↓
Async simulation (20-400ms)
        ↓
Progress updated
        ↓
Completion status shown
```

### Export Flow (Step 20)
```
Component calls exportService
        ↓
Data formatting (PDF/CSV/JSON)
        ↓
jsPDF/XLSX generation
        ↓
Blob creation
        ↓
Browser download
        ↓
File saved locally
```

### Notification Flow (Step 23)
```
Any component/service
        ↓
notificationService.success()
        ↓
Redux action: addNotification
        ↓
Store updates notifications state
        ↓
NotificationCenter receives state
        ↓
Toast renders at top-right
        ↓
Auto-dismiss after 5 seconds
```

### RBAC Permission Check Flow (Step 22)
```
Component/Hook requests permission
        ↓
hasPermission() called with (role, permission)
        ↓
RBAC matrix lookup
        ↓
Boolean returned
        ↓
Component renders/disables based on result
```

## Component Dependencies

### SearchFilters Dependencies
```
SearchFilters (Step 18)
├── React (useState, useCallback)
├── Lucide React (Search, Filter, ChevronDown icons)
└── Tailwind CSS (styling)
```

### BatchOperations Dependencies
```
BatchOperations (Step 19)
├── React (useState, useEffect)
├── Lucide React (icons)
├── Tailwind CSS (styling)
└── No Redux (local state management)
```

### ExportService Dependencies
```
exportService (Step 20)
├── jsPDF (PDF generation)
├── XLSX (Excel/CSV)
└── Browser APIs (Blob, download)
```

### AnalyticsPage Dependencies
```
AnalyticsPage (Step 21)
├── React (hooks)
├── Lucide React (icons)
├── Tailwind CSS (styling)
└── No Redux (local component state)
```

### RBACGuard Dependencies
```
RBACGuard (Step 23)
├── React
├── Redux (useSelector)
├── rbac.ts (permission functions)
└── Lucide React (Lock icon)
```

### NotificationCenter Dependencies
```
NotificationCenter (Step 23)
├── React
├── Redux (useSelector, useDispatch)
├── notificationSlice.ts (reducer)
├── Lucide React (icons)
└── Tailwind CSS (styling)
```

## Type System

### Core Interfaces
```typescript
// User role
type UserRole = 'admin' | 'instructor' | 'student' | 'reviewer'

// Notification
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  title?: string
  duration?: number
  timestamp: Date
  read: boolean
}

// Report (for exports)
interface Report {
  id: string
  title: string
  student: string
  date: string
  similarity: number
  status: string
  sources: Source[]
  flaggedSections: FlaggedSection[]
}

// Analytics Data
interface AnalyticsData {
  totalSubmissions: number
  averageSimilarity: number
  successRate: number
  submissionsByStatus: object
  similarityDistribution: array
  submissionsTrend: array
  topSources: array
}
```

## State Management

### Redux Store
```
{
  auth: {
    user: { id, email, name, role },
    access: string,
    refresh: string,
    loading: boolean,
    error: string | null
  },
  notifications: {
    items: Notification[],
    all: Notification[],
    unreadCount: number
  }
}
```

### Component Local State
```
SearchFilters:
  - searchQuery: string
  - filters: FilterOptions
  - showAdvanced: boolean
  - activeFilterCount: number

BatchOperations:
  - operations: OperationHistory[]
  - showConfirm: boolean
  - showExportMenu: boolean
  - showHistory: boolean

Dashboard:
  - selectedIds: string[] [TO ADD]
  - submissions: Submission[]
  - searchQuery: string
  - filters: object
```

## API Integration Points

### Pending Integrations
```
Search/Filter:
  GET /api/submissions/search/?q=&status=&similarity_min=&date_from=

Batch Operations:
  DELETE /api/submissions/batch/
  GET /api/reports/export/?format=pdf&ids=
  POST /api/submissions/batch/share/

Analytics:
  GET /api/analytics/metrics/
  GET /api/analytics/trends/
  GET /api/analytics/similarity-distribution/
  GET /api/analytics/top-sources/
```

## Styling System

### Tailwind Classes Used
- **Colors**: blue, purple, green, red, orange, gray
- **Sizing**: w-full, p-4, px-6, py-2, h-8, etc.
- **Layout**: flex, grid, gap-3, border, rounded-lg
- **Responsive**: sm:, md:, lg: breakpoints
- **State**: hover:, active:, disabled:, focus:

### Icon System
Using Lucide React icons:
- SearchFilters: Search, Filter, ChevronDown, X
- BatchOperations: Trash2, Share2, Download, CheckCircle2, AlertCircle, Loader
- AnalyticsPage: TrendingUp, Users, Zap, Clock, BarChart3, LineChart
- NotificationCenter: Bell, CheckCircle2, AlertCircle, Info, XCircle
- RBACGuard: Lock
- Plus 20+ more throughout components

## Security Architecture

### Authentication
```
Login → JWT Token → Axios interceptor → Protected routes
  ↓
  Refresh token management
  ↓
  Session expiration handling
```

### Authorization
```
User role check
  ↓
RBAC permission matrix
  ↓
Component render/disable
  ↓
API call with token
```

### Permission Enforcement
```
Frontend (UX):
  RBAC guards hide features user can't access

Backend (Security):
  API validates user role before processing
  (implemented in backend)
```

## Performance Optimizations

1. **Code Splitting**: Routes split by React.lazy() (can be added)
2. **Memoization**: useMemo/useCallback for expensive operations
3. **Redux Selectors**: Reselect pattern (can be added)
4. **Export Performance**: Batch processing with progress
5. **Notification Deduplication**: Redis can track recent notifications

## Accessibility Features

- Semantic HTML (buttons, inputs, labels)
- ARIA labels for icons
- Keyboard navigation support
- Color-coded status (not color-only)
- Focus management
- Error messages

## Error Handling

### Levels
1. Component level: Try-catch, error boundaries
2. Service level: API error handling
3. Global level: Notification service shows errors
4. User feedback: Toast notifications with messages

### Error Types
```
404: Not Found → notificationService.error()
401: Unauthorized → permissionNotifications.unauthorized()
403: Forbidden → permissionNotifications.denied()
500: Server Error → apiNotifications.handleError()
Network: Connection error → notificationService.error()
```

---

## Integration Roadmap

```
Phase 2 Complete (Steps 18-23) ✅
│
├─ Step 18: SearchFilters
│   └─ TO INTEGRATE: Add to Dashboard
│
├─ Step 19: BatchOperations
│   └─ TO INTEGRATE: Add to Dashboard with selection
│
├─ Step 20: ExportService
│   └─ READY: Use in components
│
├─ Step 21: AnalyticsPage
│   └─ ROUTED: Navigate to /analytics
│
├─ Step 22: RBAC
│   └─ READY: Use guards in components
│
└─ Step 23: Notifications
    └─ INTEGRATED: Global system active
```

## Quick Reference

### Import Statements
```typescript
// Components
import SearchFilters from './components/SearchFilters'
import BatchOperations from './components/BatchOperations'
import AnalyticsPage from './pages/AnalyticsPage'
import { NotificationCenter } from './components/NotificationCenter'
import { RBACGuard, usePermission } from './components/RBACGuard'

// Services
import { exportReportsPDF } from './services/exportService'
import { notificationService } from './services/notificationService'

// Utils
import { hasPermission, canPerformAction } from './utils/rbac'

// Redux
import { useSelector, useDispatch } from 'react-redux'
```

### Common Usage Patterns
```typescript
// Show notification
notificationService.success('Done!', 'Success')

// Check permission
if (hasPermission(userRole, 'export_report')) { ... }

// Guard component
<RBACGuard permission="delete_submission">
  <DeleteButton />
</RBACGuard>

// Export reports
await exportReportsPDF(reports, 'reports.pdf')
```

---

**Created**: Step 18-23 Integration Session  
**Architecture**: Frontend with Redux state + Service layer + RBAC system  
**Status**: ✅ Complete and documented  
**Next**: Integration with Dashboard and API
