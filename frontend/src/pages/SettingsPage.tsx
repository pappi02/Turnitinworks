import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Settings, User, Bell, Lock, Shield } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';

export default function SettingsPage() {
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
                  className="text-gray-600 hover:text-blue-600"
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
                  className="text-gray-700 hover:text-blue-600 font-medium"
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
                className="block w-full text-left text-gray-600 hover:text-blue-600"
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
                className="block w-full text-left text-gray-700 hover:text-blue-600 font-medium"
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Settings</h2>
          <p className="text-gray-600">Manage your account and preferences</p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <Settings className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Settings Coming Soon</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            This feature is under development. You'll soon be able to customize your preferences, manage your profile, and configure notification settings.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Planned Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <User className="w-6 h-6" />,
              title: 'Profile Settings',
              description: 'Update your personal information and profile photo',
            },
            {
              icon: <Bell className="w-6 h-6" />,
              title: 'Notifications',
              description: 'Configure email and in-app notification preferences',
            },
            {
              icon: <Lock className="w-6 h-6" />,
              title: 'Security',
              description: 'Change password and manage two-factor authentication',
            },
            {
              icon: <Shield className="w-6 h-6" />,
              title: 'Privacy',
              description: 'Control data sharing and privacy settings',
            },
          ].map((feature, idx) => (
            <div key={idx} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-50 rounded-lg mb-4 text-purple-600">
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
