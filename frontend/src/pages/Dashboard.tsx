import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Upload, BarChart3, FileText, Clock } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import SearchFilters from '../components/SearchFilters';
import BatchOperations from '../components/BatchOperations';
import { RBACGuard } from '../components/RBACGuard';
import { notificationService, permissionNotifications } from '../services/notificationService';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import api from '../services/api';

interface Submission {
  id: string;
  title: string;
  student: string;
  date: string;
  similarity: number;
  status: 'pending' | 'completed' | 'processing';
  reportUrl?: string;
}

interface FilterOptions {
  status: string[];
  similarity: { min: number; max: number };
  dateRange: { start: string; end: string };
  sortBy: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.auth.user);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<FilterOptions>({
    status: [],
    similarity: { min: 0, max: 100 },
    dateRange: { start: '', end: '' },
    sortBy: 'recent',
  });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch submissions from API
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get('/submissions/');
        
        // Transform API response to component format
        const rawSubmissions = Array.isArray(response.data.submissions) ? response.data.submissions : [];
        const submissionsData = rawSubmissions.map((sub: any) => ({
          id: sub.id,
          title: sub.title || sub.original_filename,
          student: sub.user?.name || sub.user?.username || 'Unknown',
          date: sub.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          similarity: sub.similarity_score || 0,
          status: sub.status || 'pending',
          reportUrl: sub.report_url || '#',
        }));
        
        setSubmissions(submissionsData);
        
        if (submissionsData.length === 0) {
          notificationService.info('No submissions found', 'Empty');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch submissions';
        setError(errorMessage);
        notificationService.error(errorMessage, 'Load Error');
        
        // Fallback to empty array on error
        setSubmissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  // Filter submissions based on applied filters and search
  const getFilteredSubmissions = () => {
    let filtered = submissions;

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.student.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (appliedFilters.status.length > 0) {
      filtered = filtered.filter((s) => appliedFilters.status.includes(s.status));
    }

    // Apply similarity filter
    filtered = filtered.filter(
      (s) =>
        s.similarity >= appliedFilters.similarity.min &&
        s.similarity <= appliedFilters.similarity.max
    );

    // Apply date range filter
    if (appliedFilters.dateRange.start) {
      filtered = filtered.filter((s) => s.date >= appliedFilters.dateRange.start);
    }
    if (appliedFilters.dateRange.end) {
      filtered = filtered.filter((s) => s.date <= appliedFilters.dateRange.end);
    }

    // Apply sorting
    switch (appliedFilters.sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'highest_similarity':
        filtered.sort((a, b) => b.similarity - a.similarity);
        break;
      case 'lowest_similarity':
        filtered.sort((a, b) => a.similarity - b.similarity);
        break;
      case 'name_asc':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'name_desc':
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    return filtered;
  };

  const filteredSubmissions = getFilteredSubmissions();

  // Calculate stats dynamically from submissions
  const stats = {
    totalSubmissions: submissions.length,
    processingNow: submissions.filter(s => s.status === 'processing').length,
    highSimilarity: submissions.filter(s => s.similarity >= 30).length,
    averageSimilarity: submissions.length > 0
      ? Math.round(submissions.reduce((sum, s) => sum + s.similarity, 0) / submissions.length)
      : 0,
  };

  // Handle search and filter
  const handleSearch = (query: string, filters: FilterOptions) => {
    setSearchQuery(query);
    setAppliedFilters(filters);
    notificationService.info(`Applied ${Object.values(filters).filter(f => f).length} filters`, 'Filters Updated');
  };

  // Handle reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setAppliedFilters({
      status: [],
      similarity: { min: 0, max: 100 },
      dateRange: { start: '', end: '' },
      sortBy: 'recent',
    });
    notificationService.info('Filters have been reset', 'Reset Complete');
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    const ids = selectedIds;
    const userRole = user?.role;
    
    // Check permission
    if (!['admin', 'instructor'].includes(userRole)) {
      permissionNotifications.denied('delete submissions');
      return;
    }
    
    try {
      notificationService.info(`Deleting ${ids.length} submission${ids.length > 1 ? 's' : ''}...`, 'Processing');
      
      // Make API calls to delete each submission
      const deletePromises = ids.map(id =>
        api.delete(`/submissions/${id}/`)
          .catch(err => {
            console.error(`Failed to delete submission ${id}:`, err);
            throw err;
          })
      );
      
      await Promise.all(deletePromises);
      
      // Remove from state
      setSubmissions((prev) => prev.filter((s) => !ids.includes(s.id)));
      setSelectedIds([]);
      
      notificationService.success(
        `Successfully deleted ${ids.length} submission${ids.length > 1 ? 's' : ''}`,
        'Delete Complete'
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete submissions';
      notificationService.error(errorMessage, 'Delete Error');
    }
  };

  // Handle batch export
  const handleBatchExport = async (format: 'pdf' | 'csv') => {
    const ids = selectedIds;
    try {
      notificationService.info(`Exporting ${ids.length} submission${ids.length > 1 ? 's' : ''} as ${format.toUpperCase()}...`, 'Export Started');
      
      // Call API to generate export
      const response = await api.post('/reports/export/', {
        submission_ids: ids,
        format: format.toLowerCase(),
      }, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `submissions_export.${format === 'pdf' ? 'pdf' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      notificationService.success(
        `Export completed (${format.toUpperCase()})`,
        'Export Complete'
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to export submissions';
      notificationService.error(errorMessage, 'Export Error');
    }
  };

  // Handle batch share
  const handleBatchShare = async () => {
    const ids = selectedIds;
    try {
      notificationService.info(`Generating share links for ${ids.length} submission${ids.length > 1 ? 's' : ''}...`, 'Processing');
      
      // Call API to generate share links
      const response = await api.post('/submissions/batch/share/', {
        submission_ids: ids,
      });
      
      // Copy share links to clipboard or show them
      const shareLinks = response.data.share_links || [];
      const linksText = shareLinks.join('\n');
      
      navigator.clipboard.writeText(linksText).then(() => {
        notificationService.success(
          `Share links generated and copied to clipboard for ${ids.length} submission${ids.length > 1 ? 's' : ''}`,
          'Share Complete'
        );
      }).catch(() => {
        notificationService.success(
          `Share links generated for ${ids.length} submission${ids.length > 1 ? 's' : ''}`,
          'Share Complete'
        );
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to generate share links';
      notificationService.error(errorMessage, 'Share Error');
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.length === filteredSubmissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSubmissions.map((s) => s.id));
    }
  };

  // Toggle submission selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity < 15) return 'text-green-600';
    if (similarity < 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSimilarityBgColor = (similarity: number) => {
    if (similarity < 15) return 'bg-green-50';
    if (similarity < 30) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-50 text-green-700 border-green-200',
      processing: 'bg-blue-50 text-blue-700 border-blue-200',
      pending: 'bg-gray-50 text-gray-700 border-gray-200',
    };
    return styles[status] || styles.pending;
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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">TextVerity</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-6">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/reports')}
                  className="text-gray-600 hover:text-blue-600"
                >
                  Reports
                </button>
                <RBACGuard
                  permission="view_course_analytics"
                  fallback={
                    <span className="text-gray-400 cursor-not-allowed opacity-50">Analytics</span>
                  }
                >
                  <button
                    onClick={() => navigate('/analytics')}
                    className="text-gray-600 hover:text-blue-600 transition"
                  >
                    Analytics
                  </button>
                </RBACGuard>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-gray-600 hover:text-blue-600"
                >
                  Settings
                </button>
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
                onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-gray-700 hover:text-blue-600 font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => { navigate('/reports'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-gray-600 hover:text-blue-600"
              >
                Reports
              </button>
              <button
                onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-gray-600 hover:text-blue-600"
              >
                Settings
              </button>
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full text-left text-gray-600 hover:text-blue-600 py-2"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user?.first_name || 'User'}!</h2>
          <p className="text-gray-600">Manage and review your document submissions</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: <FileText className="w-6 h-6" />, label: 'Total Submissions', value: stats.totalSubmissions, color: 'bg-blue-50' },
            { icon: <Clock className="w-6 h-6" />, label: 'Processing Now', value: stats.processingNow, color: 'bg-purple-50' },
            { icon: <BarChart3 className="w-6 h-6" />, label: 'High Similarity', value: stats.highSimilarity, color: 'bg-red-50' },
            { icon: <BarChart3 className="w-6 h-6" />, label: 'Avg Similarity', value: `${stats.averageSimilarity}%`, color: 'bg-green-50' },
          ].map((stat, idx) => (
            <div key={idx} className={`${stat.color} p-6 rounded-xl border border-gray-200`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className="text-gray-400">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter Section */}
        <div className="mb-8">
          <SearchFilters
            onSearch={handleSearch}
            onReset={handleResetFilters}
            totalResults={filteredSubmissions.length}
          />
        </div>

        {/* Batch Operations Section */}
        {selectedIds.length > 0 && (
          <div className="mb-8">
            <RBACGuard
              permissions={['delete_submission', 'export_report', 'read_submission']}
              permissionType="any"
              fallback={
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                  <p className="font-medium">Limited Actions Available</p>
                  <p className="text-sm">You don't have permissions for bulk operations</p>
                </div>
              }
            >
              <BatchOperations
                selectedCount={selectedIds.length}
                onSelectAll={handleSelectAll}
                onBatchDelete={handleBatchDelete}
                onBatchExport={handleBatchExport}
                onBatchShare={handleBatchShare}
              />
            </RBACGuard>
          </div>
        )}

        {/* Action Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <RBACGuard
              permission="create_submission"
              fallback={
                <button
                  disabled
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-400 text-white rounded-lg opacity-50 cursor-not-allowed font-medium"
                  title="You don't have permission to upload submissions"
                >
                  <Upload className="w-5 h-5" />
                  Upload Document
                </button>
              }
            >
              <button
                onClick={() => navigate('/upload')}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Upload className="w-5 h-5" />
                Upload Document
              </button>
            </RBACGuard>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {selectedIds.length > 0 && (
                <>
                  <span>{selectedIds.length} selected</span>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="bg-white rounded-lg border border-red-200 overflow-hidden p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 font-bold">!</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800">Failed to Load Submissions</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setIsLoading(true);
                    // Retry fetch
                    const fetchSubmissions = async () => {
                      try {
                        const response = await api.get('/submissions/');
                        const rawSubmissions = Array.isArray(response.data.submissions) ? response.data.submissions : [];
                        const submissionsData = rawSubmissions.map((sub: any) => ({
                          id: sub.id,
                          title: sub.title || sub.original_filename,
                          student: sub.user?.name || sub.user?.username || 'Unknown',
                          date: sub.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                          similarity: sub.similarity_score || 0,
                          status: sub.status || 'pending',
                          reportUrl: sub.report_url || '#',
                        }));
                        setSubmissions(submissionsData);
                      } catch (err: any) {
                        setError(err.response?.data?.message || err.message || 'Failed to fetch submissions');
                      } finally {
                        setIsLoading(false);
                      }
                    };
                    fetchSubmissions();
                  }}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <FileText className="w-12 h-12 text-gray-400" />
              <p className="text-gray-600 font-medium">No submissions found</p>
              <p className="text-gray-500 text-sm">Try adjusting your filters or upload a new submission</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredSubmissions.length && filteredSubmissions.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 border-gray-300 rounded cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Similarity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((submission) => (
                  <tr
                    key={submission.id}
                    className={`border-t border-gray-200 hover:bg-gray-50 transition ${
                      selectedIds.includes(submission.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(submission.id)}
                        onChange={() => toggleSelection(submission.id)}
                        className="w-4 h-4 border-gray-300 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{submission.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{submission.student}</td>
                    <td className="px-6 py-4 text-gray-700">{submission.date}</td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full font-semibold text-sm ${getSimilarityBgColor(submission.similarity)}`}>
                        <span className={getSimilarityColor(submission.similarity)}>{submission.similarity}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(submission.status)}`}>
                        {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {submission.status === 'completed' ? (
                        <button
                          onClick={() => navigate(`/report/${submission.id}`)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          View Report
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">{submission.status === 'processing' ? 'In Progress' : 'Pending'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
