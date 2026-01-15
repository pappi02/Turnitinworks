import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { TrendingUp, BarChart3, PieChart, Calendar, Download, LogOut, Menu, X, AlertCircle } from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import { notificationService } from '../services/notificationService';
import { AnalyticsPageSkeleton } from '../components/LoadingSkeleton';
import api from '../services/api';

interface AnalyticsData {
  totalSubmissions: number;
  averageSimilarity: number;
  highestSimilarity: number;
  lowestSimilarity: number;
  totalProcessingTime: number;
  successRate: number;
  failureRate: number;
  submissionsByStatus: {
    completed: number;
    processing: number;
    failed: number;
  };
  similarityDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  submissionsTrend: {
    date: string;
    count: number;
    avgSimilarity: number;
  }[];
  topSources: {
    title: string;
    count: number;
    percentage: number;
  }[];
}

interface AnalyticsDashboardProps {
  data?: AnalyticsData;
  dateRange: 'week' | 'month' | 'quarter' | 'year';
  onDateRangeChange: (range: 'week' | 'month' | 'quarter' | 'year') => void;
  onExport: () => void;
}

const mockAnalyticsData: AnalyticsData = {
  totalSubmissions: 847,
  averageSimilarity: 18.5,
  highestSimilarity: 92,
  lowestSimilarity: 2,
  totalProcessingTime: 3450, // minutes
  successRate: 97.5,
  failureRate: 2.5,
  submissionsByStatus: {
    completed: 825,
    processing: 12,
    failed: 10,
  },
  similarityDistribution: [
    { range: '0-10%', count: 312, percentage: 37 },
    { range: '10-20%', count: 245, percentage: 29 },
    { range: '20-30%', count: 156, percentage: 18 },
    { range: '30-40%', count: 78, percentage: 9 },
    { range: '>40%', count: 56, percentage: 7 },
  ],
  submissionsTrend: [
    { date: 'Jan 8', count: 125, avgSimilarity: 16.2 },
    { date: 'Jan 9', count: 118, avgSimilarity: 17.8 },
    { date: 'Jan 10', count: 142, avgSimilarity: 19.3 },
    { date: 'Jan 11', count: 156, avgSimilarity: 18.9 },
    { date: 'Jan 12', count: 134, avgSimilarity: 20.1 },
    { date: 'Jan 13', count: 148, avgSimilarity: 17.5 },
    { date: 'Jan 14', count: 124, avgSimilarity: 18.7 },
  ],
  topSources: [
    { title: 'Academic Database', count: 234, percentage: 28 },
    { title: 'Wikipedia', count: 189, percentage: 22 },
    { title: 'Published Papers', count: 167, percentage: 20 },
    { title: 'Student Work', count: 142, percentage: 17 },
    { title: 'Online Articles', count: 115, percentage: 13 },
  ],
};

// Dashboard component
const AnalyticsDashboard = ({
  data = mockAnalyticsData,
  dateRange,
  onDateRangeChange,
  onExport,
}: AnalyticsDashboardProps) => {

  const StatCard = ({
    title,
    value,
    unit,
    trend,
    icon: Icon,
    color,
  }: {
    title: string;
    value: number | string;
    unit?: string;
    trend?: number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <div className={`${color} rounded-lg p-6 border border-gray-200`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
        <div className="text-gray-400">{Icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {unit && <p className="text-gray-600 text-sm">{unit}</p>}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3 text-green-600">
          <TrendingUp className="w-4 h-4" />
          <p className="text-xs font-medium">{trend > 0 ? '+' : ''}{trend}% vs last period</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Performance metrics and insights</p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'quarter', 'year'] as const).map(range => (
            <button
              key={range}
              onClick={() => onDateRangeChange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
          <button
            onClick={onExport}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Submissions"
          value={data.totalSubmissions}
          trend={12}
          icon={<BarChart3 className="w-6 h-6 text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          title="Average Similarity"
          value={data.averageSimilarity}
          unit="%"
          trend={-5}
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          title="Success Rate"
          value={data.successRate}
          unit="%"
          trend={3}
          icon={<PieChart className="w-6 h-6 text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          title="Processing Time"
          value={(data.totalProcessingTime / 60).toFixed(0)}
          unit="hrs"
          trend={-8}
          icon={<Calendar className="w-6 h-6 text-orange-600" />}
          color="bg-orange-50"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Similarity Distribution */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Similarity Distribution</h3>
          <div className="space-y-3">
            {data.similarityDistribution.map((item) => (
              <div key={item.range}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.range}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage * 3}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submissions Trend */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submissions Trend</h3>
          <div className="flex items-end justify-between gap-3" style={{ height: '200px' }}>
            {data.submissionsTrend.map((item) => {
              const maxCount = Math.max(...data.submissionsTrend.map(d => d.count));
              const height = (item.count / maxCount) * 100;
              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-t" style={{ height: `${height}%` }}>
                  </div>
                  <span className="text-xs text-gray-600 text-center">{item.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status & Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submissions by Status</h3>
          <div className="space-y-4">
            {[
              { label: 'Completed', value: data.submissionsByStatus.completed, color: 'bg-green-100', barColor: 'bg-green-600' },
              { label: 'Processing', value: data.submissionsByStatus.processing, color: 'bg-blue-100', barColor: 'bg-blue-600' },
              { label: 'Failed', value: data.submissionsByStatus.failed, color: 'bg-red-100', barColor: 'bg-red-600' },
            ].map((status) => (
              <div key={status.label}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{status.label}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {status.value} ({((status.value / data.totalSubmissions) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${status.barColor} h-3 rounded-full transition-all`}
                    style={{ width: `${(status.value / data.totalSubmissions) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Sources */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Matched Sources</h3>
          <div className="space-y-4">
            {data.topSources.map((source, idx) => (
              <div key={source.title} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{source.title}</p>
                  <p className="text-sm text-gray-600">{source.count} matches</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{source.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 font-medium mb-2">Highest Similarity</p>
          <p className="text-3xl font-bold text-red-600">{data.highestSimilarity}%</p>
          <p className="text-xs text-gray-500 mt-2">Maximum detected</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 font-medium mb-2">Lowest Similarity</p>
          <p className="text-3xl font-bold text-green-600">{data.lowestSimilarity}%</p>
          <p className="text-xs text-gray-500 mt-2">Minimum detected</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 font-medium mb-2">Failure Rate</p>
          <p className="text-3xl font-bold text-orange-600">{data.failureRate}%</p>
          <p className="text-xs text-gray-500 mt-2">Failed submissions</p>
        </div>
      </div>
    </div>
  );
};

// Main Analytics Page Component
export default function AnalyticsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.auth.user);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(mockAnalyticsData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data when date range changes
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Call API endpoint
        const response = await api.get('/analytics/', {
          params: { date_range: dateRange },
        });
        
        // Transform API response to component format
        if (response.data?.data) {
          setAnalyticsData(response.data.data);
        } else {
          // Use mock data if API doesn't return data
          setAnalyticsData(mockAnalyticsData);
        }
      } catch (err: any) {
        console.error('Analytics fetch error:', err);
        // Use mock data on error
        setAnalyticsData(mockAnalyticsData);
        const errorMessage = err.response?.data?.message || 'Failed to fetch analytics. Using sample data.';
        setError(errorMessage);
        notificationService.warning(errorMessage, 'Analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [dateRange]);

  const handleDateRangeChange = (range: 'week' | 'month' | 'quarter' | 'year') => {
    setDateRange(range);
  };

  const handleExport = async () => {
    try {
      notificationService.info('Generating analytics report...', 'Export');
      
      const response = await api.post('/analytics/export/', {
        date_range: dateRange,
        format: 'pdf',
      }, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${dateRange}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      notificationService.success('Analytics report exported successfully', 'Export Complete');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to export analytics';
      notificationService.error(errorMessage, 'Export Error');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Turnitin</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-6">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-blue-600 font-medium transition"
                >
                  Dashboard
                </button>
                <a href="#" className="text-gray-600 hover:text-blue-600">Reports</a>
                <button
                  onClick={() => navigate('/analytics')}
                  className="text-blue-600 hover:text-blue-700 font-medium transition"
                >
                  Analytics
                </button>
                <a href="#" className="text-gray-600 hover:text-blue-600">Settings</a>
              </nav>
              <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
                <span className="text-sm text-gray-700">{user?.email || 'User'}</span>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4 space-y-4">
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left text-gray-700 hover:text-blue-600 font-medium py-2"
              >
                Dashboard
              </button>
              <a href="#" className="block text-gray-600 hover:text-blue-600 py-2">Reports</a>
              <a href="#" className="block text-gray-600 hover:text-blue-600 py-2">Settings</a>
              <button onClick={handleLogout} className="w-full text-left text-gray-600 hover:text-blue-600 py-2">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">API Connection Issue</h3>
              <p className="text-sm text-yellow-800 mt-1">{error}</p>
              <p className="text-xs text-yellow-700 mt-2">Showing sample data. Connect backend API to see real analytics.</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <AnalyticsPageSkeleton />
        ) : (
          <AnalyticsDashboard
            data={analyticsData}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onExport={handleExport}
          />
        )}
      </main>
    </div>
  );
}
