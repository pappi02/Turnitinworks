import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Share2, AlertCircle } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { ReportPageSkeleton } from '../components/LoadingSkeleton';
import api from '../services/api';

interface ReportData {
  id: string;
  title: string;
  student: string;
  uploadDate: string;
  similarity: number;
  status: 'processing' | 'completed' | 'error';
  sources: Array<{
    id: string;
    title: string;
    url: string;
    percentage: number;
    matches: number;
  }>;
  stats: {
    totalWords: number;
    matchedWords: number;
    uniqueMatches: number;
    suspiciousFragments: number;
  };
  flaggedSections: Array<{
    id: string;
    text: string;
    source: string;
    percentage: number;
  }>;
}

const mockReport: ReportData = {
  id: 'report-1',
  title: 'Research Paper.pdf',
  student: 'John Doe',
  uploadDate: '2024-01-15',
  similarity: 12,
  status: 'completed',
  sources: [
    { id: '1', title: 'Academic Journal Article', url: 'https://example.com', percentage: 5, matches: 145 },
    { id: '2', title: 'Wikipedia Article', url: 'https://wikipedia.org', percentage: 4, matches: 98 },
    { id: '3', title: 'Research Paper #234', url: 'https://example.com', percentage: 2, matches: 52 },
    { id: '4', title: 'Textbook Chapter 5', url: 'https://example.com', percentage: 1, matches: 28 },
  ],
  stats: {
    totalWords: 5230,
    matchedWords: 627,
    uniqueMatches: 12,
    suspiciousFragments: 3,
  },
  flaggedSections: [
    {
      id: '1',
      text: 'The methodology section describes the experimental approach used in this study...',
      source: 'Academic Journal Article',
      percentage: 85,
    },
    {
      id: '2',
      text: 'Results indicate significant correlation between variables...',
      source: 'Wikipedia Article',
      percentage: 72,
    },
    {
      id: '3',
      text: 'In conclusion, the findings support the hypothesis...',
      source: 'Research Paper #234',
      percentage: 68,
    },
  ],
};

export default function ReportPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'flagged'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to fetch from API
        const response = await api.get(`/submissions/${reportId}/report/`);
        
        // Transform API response to component format
        if (response.data?.report) {
          const apiReport = response.data.report;
          setReport({
            id: apiReport.id || reportId || 'report-1',
            title: apiReport.title || apiReport.file_name || 'Unknown Document',
            student: apiReport.user?.name || apiReport.user?.username || 'Unknown Student',
            uploadDate: apiReport.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            similarity: apiReport.similarity_percentage || 0,
            status: apiReport.status || 'processing',
            sources: apiReport.matched_sources?.map((source: any) => ({
              id: source.id,
              title: source.title,
              url: source.url,
              percentage: source.percentage,
              matches: source.matches || 0,
            })) || [],
            stats: {
              totalWords: apiReport.total_words || 0,
              matchedWords: apiReport.matched_words || 0,
              uniqueMatches: apiReport.unique_matches || 0,
              suspiciousFragments: apiReport.suspicious_fragments || 0,
            },
            flaggedSections: apiReport.flagged_sections?.map((section: any) => ({
              id: section.id,
              text: section.text,
              source: section.source_title,
              percentage: section.percentage,
            })) || [],
          });
        } else {
          // Fallback to mock data
          setReport(mockReport);
          notificationService.info('Using sample report data', 'Demo Mode');
        }
      } catch (err: any) {
        console.error('Report fetch error:', err);
        // Use mock data on error
        setReport(mockReport);
        const errorMessage = err.response?.data?.message || 'Failed to fetch report. Showing sample data.';
        setError(errorMessage);
        notificationService.warning(errorMessage, 'Load Error');
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ReportPageSkeleton />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">Report not found</p>
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-blue-600 hover:text-blue-700 font-medium">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity < 15) return { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    if (similarity < 30) return { text: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
  };

  const handleDownloadReport = async () => {
    try {
      notificationService.info('Downloading report...', 'Download');
      
      const response = await api.get(`/submissions/${reportId}/report/download/`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportId}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      notificationService.success('Report downloaded successfully', 'Download Complete');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to download report';
      notificationService.error(errorMessage, 'Download Error');
    }
  };

  const handleShareReport = async () => {
    try {
      notificationService.info('Generating share link...', 'Share');
      
      const response = await api.post(`/submissions/${reportId}/share/`);
      
      const shareLink = response.data?.share_link || window.location.href;
      navigator.clipboard.writeText(shareLink).then(() => {
        notificationService.success('Share link copied to clipboard', 'Share Complete');
      }).catch(() => {
        notificationService.info(`Share link: ${shareLink}`, 'Share');
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to generate share link';
      notificationService.error(errorMessage, 'Share Error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
              <p className="text-sm text-gray-600">by {report.student}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={handleDownloadReport}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" 
                title="Download Report"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={handleShareReport}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" 
                title="Share Report"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">API Connection Issue</h3>
              <p className="text-sm text-yellow-800 mt-1">{error}</p>
              <p className="text-xs text-yellow-700 mt-2">Showing sample data. Connect backend API to see real reports.</p>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Similarity', value: `${report.similarity}%`, color: getSimilarityColor(report.similarity) },
            { label: 'Total Words', value: report.stats.totalWords.toLocaleString(), color: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' } },
            { label: 'Matched Words', value: report.stats.matchedWords.toLocaleString(), color: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' } },
            { label: 'Suspicious', value: report.stats.suspiciousFragments, color: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' } },
          ].map((stat, idx) => (
            <div key={idx} className={`border ${stat.color.border} rounded-lg p-6`}>
              <p className="text-gray-600 text-sm font-medium mb-2">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color.text}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 mb-6 rounded-t-lg">
          <div className="flex gap-8 px-6 h-14">
            {(['overview', 'sources', 'flagged'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'sources' && `Sources (${report.sources.length})`}
                {tab === 'flagged' && `Flagged (${report.flaggedSections.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg border border-gray-200 border-t-0">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-8 space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Similarity Distribution</h3>
                <div className="space-y-3">
                  {report.sources.slice(0, 3).map((source) => (
                    <div key={source.id}>
                      <div className="flex justify-between items-center mb-2">
                        <a href={source.url} className="text-blue-600 hover:text-blue-700 font-medium">
                          {source.title}
                        </a>
                        <span className="text-gray-600 font-semibold">{source.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${source.percentage * 10}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{source.matches} matches</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 text-sm mb-2">Original Content</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(((report.stats.totalWords - report.stats.matchedWords) / report.stats.totalWords) * 100)}%
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 text-sm mb-2">Matched Content</p>
                    <p className="text-2xl font-bold text-blue-600">{report.similarity}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sources Tab */}
          {activeTab === 'sources' && (
            <div className="divide-y divide-gray-200">
              {report.sources.map((source) => (
                <div key={source.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <a href={source.url} className="text-blue-600 hover:text-blue-700 font-semibold">
                        {source.title}
                      </a>
                      <p className="text-sm text-gray-600 mt-1">{source.url}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-blue-600">{source.percentage}%</p>
                      <p className="text-sm text-gray-600">{source.matches} matches</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${source.percentage * 10}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Flagged Tab */}
          {activeTab === 'flagged' && (
            <div className="divide-y divide-gray-200">
              {report.flaggedSections.map((section) => (
                <div key={section.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-1">
                      <p className="text-gray-900 leading-relaxed bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                        "{section.text}"
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Matched with:</p>
                          <p className="text-blue-600 hover:text-blue-700 cursor-pointer">{section.source}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600 mb-1">Similarity</p>
                          <div className="inline-flex items-center px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-full">
                            <span className="text-yellow-600 font-semibold">{section.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Report Information</p>
              <p className="text-sm text-blue-800 mt-1">
                This report was generated on {report.uploadDate}. Similarity scores are based on comparison against
                billions of sources. Always review flagged sections carefully.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
