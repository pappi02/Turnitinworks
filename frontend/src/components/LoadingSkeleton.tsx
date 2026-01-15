/**
 * Skeleton Loading Components
 * Use for placeholder content while loading
 */

const Skeleton = ({ width = 'w-full', height = 'h-4', className = '' }: {
  width?: string;
  height?: string;
  className?: string;
}) => (
  <div className={`${width} ${height} bg-gray-300 rounded animate-pulse ${className}`} />
);

/**
 * Submission Table Row Skeleton
 * Matches the submissions table structure
 */
export const SubmissionRowSkeleton = () => (
  <tr className="border-t border-gray-200">
    <td className="px-6 py-4">
      <Skeleton width="w-4" height="h-4" />
    </td>
    <td className="px-6 py-4">
      <div className="flex gap-2">
        <Skeleton width="w-4" height="h-4" />
        <Skeleton width="w-32" height="h-4" />
      </div>
    </td>
    <td className="px-6 py-4">
      <Skeleton width="w-24" height="h-4" />
    </td>
    <td className="px-6 py-4">
      <Skeleton width="w-20" height="h-4" />
    </td>
    <td className="px-6 py-4">
      <Skeleton width="w-16" height="h-4" />
    </td>
    <td className="px-6 py-4">
      <Skeleton width="w-20" height="h-4" />
    </td>
    <td className="px-6 py-4">
      <Skeleton width="w-24" height="h-4" />
    </td>
  </tr>
);

/**
 * Submissions Table Skeleton
 * Shows loading state for entire table
 */
export const SubmissionsTableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3">
              <Skeleton width="w-4" height="h-4" />
            </th>
            <th className="px-6 py-3 text-left">
              <Skeleton width="w-20" height="h-4" />
            </th>
            <th className="px-6 py-3 text-left">
              <Skeleton width="w-20" height="h-4" />
            </th>
            <th className="px-6 py-3 text-left">
              <Skeleton width="w-20" height="h-4" />
            </th>
            <th className="px-6 py-3 text-left">
              <Skeleton width="w-20" height="h-4" />
            </th>
            <th className="px-6 py-3 text-left">
              <Skeleton width="w-20" height="h-4" />
            </th>
            <th className="px-6 py-3 text-left">
              <Skeleton width="w-20" height="h-4" />
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SubmissionRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/**
 * Statistics Card Skeleton
 * Matches the stats card structure
 */
export const StatCardSkeleton = () => (
  <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
    <div className="flex items-start justify-between mb-4">
      <Skeleton width="w-32" height="h-4" />
      <Skeleton width="w-6" height="h-6" />
    </div>
    <Skeleton width="w-24" height="h-8" />
  </div>
);

/**
 * Statistics Grid Skeleton
 * Shows loading for 4 stat cards
 */
export const StatsGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {Array.from({ length: count }).map((_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
);

/**
 * Chart Skeleton
 * Matches analytics chart structure
 */
export const ChartSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <Skeleton width="w-32" height="h-6" className="mb-6" />
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton width="w-24" height="h-4" />
        <Skeleton width="w-12" height="h-4" />
      </div>
      <Skeleton width="w-full" height="h-2" />
    </div>
    <div className="mt-6 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton width="w-24" height="h-4" />
        <Skeleton width="w-12" height="h-4" />
      </div>
      <Skeleton width="w-full" height="h-2" />
    </div>
  </div>
);

/**
 * Report Summary Skeleton
 * Shows loading for report summary cards
 */
export const ReportSummarySkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="border border-gray-200 rounded-lg p-6">
        <Skeleton width="w-24" height="h-4" className="mb-4" />
        <Skeleton width="w-20" height="h-8" />
      </div>
    ))}
  </div>
);

/**
 * Search Filters Skeleton
 * Shows loading for filter controls
 */
export const SearchFiltersSkeleton = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton width="w-32" height="h-10" />
        <Skeleton width="w-32" height="h-10" />
        <Skeleton width="w-32" height="h-10" />
      </div>
      <Skeleton width="w-full" height="h-4" />
    </div>
  </div>
);

/**
 * Full Page Dashboard Skeleton
 * Complete loading state for dashboard
 */
export const DashboardSkeleton = () => (
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Welcome section */}
    <div className="mb-8">
      <Skeleton width="w-48" height="h-8" className="mb-2" />
      <Skeleton width="w-64" height="h-4" />
    </div>

    {/* Stats Grid */}
    <StatsGridSkeleton count={4} />

    {/* Search Filters */}
    <div className="mb-8">
      <SearchFiltersSkeleton />
    </div>

    {/* Action Bar */}
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
      <Skeleton width="w-48" height="h-10" />
    </div>

    {/* Submissions Table */}
    <SubmissionsTableSkeleton rows={6} />
  </main>
);

/**
 * Full Page Report Skeleton
 * Complete loading state for report page
 */
export const ReportPageSkeleton = () => (
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Summary Cards */}
    <ReportSummarySkeleton />

    {/* Tabs */}
    <div className="bg-white border-b border-gray-200 mb-6 rounded-t-lg">
      <div className="flex gap-8 px-6 h-14">
        <Skeleton width="w-20" height="h-4" />
        <Skeleton width="w-20" height="h-4" />
        <Skeleton width="w-20" height="h-4" />
      </div>
    </div>

    {/* Tab Content */}
    <div className="bg-white rounded-b-lg border border-gray-200 border-t-0 p-8">
      <div className="space-y-6">
        <Skeleton width="w-48" height="h-6" />
        <Skeleton width="w-full" height="h-40" />
      </div>
    </div>
  </main>
);

/**
 * Full Page Analytics Skeleton
 * Complete loading state for analytics page
 */
export const AnalyticsPageSkeleton = () => (
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Header */}
    <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
      <div>
        <Skeleton width="w-48" height="h-8" className="mb-2" />
        <Skeleton width="w-64" height="h-4" />
      </div>
      <div className="flex gap-2">
        <Skeleton width="w-20" height="h-10" />
        <Skeleton width="w-20" height="h-10" />
      </div>
    </div>

    {/* Key Metrics */}
    <StatsGridSkeleton count={4} />

    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <ChartSkeleton />
      <div className="lg:col-span-2">
        <ChartSkeleton />
      </div>
    </div>

    {/* Status & Sources */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  </main>
);

/**
 * Generic Container Skeleton
 * Flexible skeleton for custom layouts
 */
export const ContainerSkeleton = ({ rows = 3, columns = 1 }: {
  rows?: number;
  columns?: number;
}) => (
  <div className={`grid grid-cols-${columns} gap-4`}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} width="w-full" height="h-32" />
    ))}
  </div>
);

export default Skeleton;
