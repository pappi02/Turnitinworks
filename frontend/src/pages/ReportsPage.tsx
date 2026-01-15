import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, FileText, Calendar, Download } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';

export default function ReportsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.auth.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TextVerity
              </h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-6">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-blue-600"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/reports')}
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  Reports
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  className="text-gray-600 hover:text-blue-600"
                >
                  Analytics
                </button>
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
                className="block w-full text-left text-gray-600 hover:text-blue-600"
              >
                Dashboard
              </button>
              <button
                onClick={() => { navigate('/reports'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-gray-700 hover:text-blue-600 font-medium"
              >
                Reports
              </button>
              <button
                onClick={() => { navigate('/analytics'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-gray-600 hover:text-blue-600"
              >
                Analytics
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Reports</h2>
          <p className="text-gray-600">View and manage plagiarism reports</p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Reports Coming Soon</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            This feature is under development. You'll soon be able to view detailed plagiarism reports, export data, and track submission history.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/upload')}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Upload Document
            </button>
          </div>
        </div>

        {/* Planned Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <FileText className="w-6 h-6" />,
              title: 'Detailed Reports',
              description: 'View comprehensive plagiarism analysis with highlighted matches',
            },
            {
              icon: <Calendar className="w-6 h-6" />,
              title: 'Report History',
              description: 'Access past reports and track submission trends over time',
            },
            {
              icon: <Download className="w-6 h-6" />,
              title: 'Export Options',
              description: 'Download reports in PDF, CSV, or other formats for sharing',
            },
          ].map((feature, idx) => (
            <div key={idx} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg mb-4 text-blue-600">
                {feature.icon}
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
