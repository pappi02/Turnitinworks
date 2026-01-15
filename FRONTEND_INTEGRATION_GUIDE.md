# Frontend Phase 2 Integration Guide

## Overview

All Step 18-23 features are now complete and ready for integration. This guide provides detailed instructions on how to integrate all components into your existing application.

## Completed Features

### ✅ Step 18: Advanced Search & Filtering
- **File**: `src/components/SearchFilters.tsx`
- **Type**: Reusable Component
- **Props**: 
  - `onSearch(query, filters): void`
  - `onReset(): void`
  - `totalResults?: number`

### ✅ Step 19: Batch Operations
- **File**: `src/components/BatchOperations.tsx`
- **Type**: Reusable Component
- **Props**: 
  - `selectedCount: number`
  - `onSelectAll(): void`
  - `onBatchDelete(ids[]): void`
  - `onBatchExport(ids[], format): void`
  - `onBatchShare(ids[]): void`

### ✅ Step 20: Export Functionality
- **File**: `src/services/exportService.ts`
- **Type**: Service Module
- **Functions**:
  - `exportReportsPDF(reports[], fileName)`
  - `exportReportsCSV(reports[], fileName)`
  - `exportDetailedReportPDF(report, fileName)`
  - `exportReportsJSON(reports[], fileName)`
  - `batchExportReports(reports[], format, onProgress)`

### ✅ Step 21: Analytics Dashboard
- **File**: `src/pages/AnalyticsPage.tsx`
- **Type**: Page Component
- **Route**: `/analytics`
- **Features**: 4 metrics, 4 charts, date selector

### ✅ Step 22: Roles & Permissions
- **File**: `src/utils/rbac.ts`
- **Type**: Utility Module
- **Functions**:
  - `hasPermission(role, permission)`
  - `hasAnyPermission(role, permissions[])`
  - `hasAllPermissions(role, permissions[])`
  - `getRole(roleId)`
  - `getRolePermissions(roleId)`
  - `canPerformAction(role, resource, action)`

### ✅ Step 23: Notifications System
- **Files**:
  - `src/components/NotificationCenter.tsx` (Component)
  - `src/components/RBACGuard.tsx` (RBAC Guard Components)
  - `src/store/slices/notificationSlice.ts` (Redux Slice)
  - `src/services/notificationService.ts` (Service Layer)
- **Type**: Global System
- **Route Integration**: Already added to `App.tsx`

## Integration Checklist

### 1. Dashboard Integration (High Priority)

#### Add SearchFilters to Dashboard
```typescript
import SearchFilters from './components/SearchFilters';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});

  const handleSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    setFilters(filters);
    // TODO: Call API with filters
  };

  return (
    <div>
      <SearchFilters 
        onSearch={handleSearch}
        onReset={() => { /* reset logic */ }}
        totalResults={0}
      />
      {/* Rest of dashboard */}
    </div>
  );
}
```

#### Add BatchOperations to Dashboard
```typescript
import BatchOperations from './components/BatchOperations';

export default function Dashboard() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleBatchDelete = async (ids: string[]) => {
    // TODO: Call delete API endpoint
    notificationService.success(`Deleted ${ids.length} submissions`);
  };

  return (
    <div>
      {selectedIds.length > 0 && (
        <BatchOperations 
          selectedCount={selectedIds.length}
          onSelectAll={() => { /* select all */ }}
          onBatchDelete={handleBatchDelete}
          onBatchExport={handleBatchExport}
          onBatchShare={handleBatchShare}
        />
      )}
      {/* Rest of dashboard */}
    </div>
  );
}
```

### 2. Notifications Integration (Already Done ✅)

The `NotificationCenter` has been automatically added to `App.tsx`. You can now use notifications throughout the app:

```typescript
import { notificationService } from './services/notificationService';

// Success notification
notificationService.success('Operation completed!', 'Success');

// Error notification
notificationService.error('Something went wrong', 'Error');

// With action button
notificationService.withAction(
  'info',
  'Your report is ready',
  'View Report',
  () => navigate('/report/123')
);

// API-specific helpers
apiNotifications.handleSuccess('Submission uploaded');
apiNotifications.handleError(error);
```

### 3. RBAC Implementation

#### Using RBACGuard Component
```typescript
import { RBACGuard, PermissionButton } from './components/RBACGuard';

// Hide entire component if no permission
<RBACGuard permission="delete_submission">
  <DeleteButton />
</RBACGuard>

// Show fallback if no permission
<RBACGuard 
  permission="export_report"
  fallback={<p>No export permission</p>}
>
  <ExportButton />
</RBACGuard>

// Multiple permissions (AND logic)
<RBACGuard 
  permissions={['read_report', 'export_report']}
  permissionType="all"
>
  <ExportReportButton />
</RBACGuard>

// Multiple permissions (OR logic)
<RBACGuard 
  permissions={['read_report', 'manage_users']}
  permissionType="any"
>
  <ActionButton />
</RBACGuard>
```

#### Using PermissionButton
```typescript
<PermissionButton 
  permission="delete_submission"
  onClick={handleDelete}
  className="px-4 py-2 bg-red-600 text-white rounded"
>
  Delete Submission
</PermissionButton>
```

#### Using Hooks
```typescript
import { 
  usePermission, 
  useHasAnyPermission, 
  useRole 
} from './components/RBACGuard';

function MyComponent() {
  const canExport = usePermission('export_report');
  const canDelete = usePermission('delete_submission');
  const userRole = useRole();

  if (!canExport) {
    return <p>You cannot export reports</p>;
  }

  return <ExportButton />;
}
```

### 4. Analytics Route (Already Done ✅)

The `/analytics` route has been added to `App.tsx`. Access it directly or add navigation:

```typescript
import { Link } from 'react-router-dom';

// In navigation component
<Link to="/analytics">Analytics Dashboard</Link>

// With permission check
<RBACGuard permission="view_course_analytics">
  <Link to="/analytics">Analytics</Link>
</RBACGuard>
```

## API Integration Points

### For SearchFilters
- **Endpoint**: `GET /api/submissions/search/`
- **Params**: `q`, `status[]`, `similarity_min`, `similarity_max`, `date_from`, `date_to`, `sort_by`
- **Response**: List of submissions matching filters

### For BatchOperations
- **Delete**: `DELETE /api/submissions/batch/`
- **Export**: `GET /api/reports/export/?format=pdf&ids=1,2,3`
- **Share**: `POST /api/submissions/batch/share/`

### For AnalyticsPage
- **Metrics**: `GET /api/analytics/metrics/`
- **Trends**: `GET /api/analytics/trends/`
- **Distribution**: `GET /api/analytics/similarity-distribution/`
- **Top Sources**: `GET /api/analytics/top-sources/`

### For Notifications
Backend can send real-time notifications via:
1. WebSocket (real-time)
2. Polling (fallback)
3. Server-Sent Events (SSE)

Example notification payload:
```json
{
  "type": "success",
  "message": "Your report is ready",
  "title": "Report Ready",
  "action": {
    "label": "View Report",
    "url": "/report/123"
  }
}
```

## Package Dependencies

Make sure these packages are installed:

```bash
npm install
# Should already be installed:
# - react@18+
# - redux-toolkit
# - react-redux
# - react-router-dom@6
# - axios
# - lucide-react
# - jspdf
# - xlsx
# - uuid
```

If any are missing:
```bash
npm install jspdf xlsx uuid
```

## File Structure Reference

```
frontend/src/
├── components/
│   ├── SearchFilters.tsx (Step 18)
│   ├── BatchOperations.tsx (Step 19)
│   ├── NotificationCenter.tsx (Step 23)
│   ├── RBACGuard.tsx (Step 23)
│   └── ProtectedRoute.tsx (existing)
├── pages/
│   ├── Dashboard.tsx (needs integration)
│   ├── AnalyticsPage.tsx (Step 21)
│   └── ... (other pages)
├── services/
│   ├── exportService.ts (Step 20)
│   ├── notificationService.ts (Step 23)
│   └── api.ts (existing)
├── store/
│   ├── store.ts (updated with notifications)
│   └── slices/
│       ├── authSlice.ts (existing)
│       └── notificationSlice.ts (Step 23)
├── utils/
│   └── rbac.ts (Step 22)
└── App.tsx (updated with NotificationCenter and /analytics route)
```

## Next Steps

### Immediate (Priority 1)
1. **Test Notifications**: Use `notificationService` in your components
2. **Integrate SearchFilters**: Add to Dashboard submissions list
3. **Integrate BatchOperations**: Add to Dashboard with selection logic
4. **Test Analytics**: Navigate to `/analytics` and verify charts render

### Short-term (Priority 2)
1. **Connect to API**: Replace mock data with real API calls
2. **Add RBAC Guards**: Wrap sensitive components with permission checks
3. **Test Permissions**: Verify each role sees correct features
4. **Refine Export**: Test PDF/CSV export with real data

### Medium-term (Priority 3)
1. **WebSocket Integration**: Implement real-time notifications
2. **Advanced Analytics**: Add drill-down and export from analytics
3. **Batch Operation History**: Persist operation logs
4. **User Preferences**: Save filter and view preferences

## Testing Checklist

- [ ] Notifications appear and dismiss correctly
- [ ] SearchFilters apply filters and show results
- [ ] BatchOperations work with selected items
- [ ] Export creates downloadable files
- [ ] Analytics charts display with mock data
- [ ] RBAC guards hide/show features correctly
- [ ] Permissions are enforced across app
- [ ] Protected routes redirect unauthorized users
- [ ] All routes are accessible and working

## Troubleshooting

### Notifications not showing
1. Check that `NotificationCenter` is in `App.tsx`
2. Verify Redux store has `notificationSlice` reducer
3. Check browser console for errors

### RBAC guards not working
1. Verify user has `role` property in auth state
2. Check that role matches one of: 'admin', 'instructor', 'student', 'reviewer'
3. Check permission names match exactly (case-sensitive)

### Export not working
1. Verify `jspdf` and `xlsx` are installed: `npm ls jspdf xlsx`
2. Check that reports array has correct structure
3. Test in modern browser (Chrome/Firefox)

### Analytics not displaying
1. Verify mock data structure matches interface
2. Check that component is on `/analytics` route
3. Verify Redux store has notifications reducer

## Documentation Files

- `IMPLEMENTATION_PROGRESS.md` - Overall project progress
- `FRONTEND_SETUP.md` - Frontend environment setup
- `QUICK_START.md` - Quick start guide
- This file - Integration guide

---

**Last Updated**: After Step 23 completion
**Status**: All Phase 2 features (Steps 18-23) complete and ready for integration
**Next Phase**: Steps 24-35 (Backend optimization, testing, deployment)
