import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Shield, Zap, Users, BarChart3, Lock, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: <Shield className="w-8 h-8 text-blue-600" />, title: 'Advanced Detection', description: 'AI-powered plagiarism detection with 99.8% accuracy' },
    { icon: <Zap className="w-8 h-8 text-blue-600" />, title: 'Instant Results', description: 'Get similarity scores within minutes of submission' },
    { icon: <Users className="w-8 h-8 text-blue-600" />, title: 'Multi-User Support', description: 'Manage multiple students with role-based access' },
    { icon: <BarChart3 className="w-8 h-8 text-blue-600" />, title: 'Analytics', description: 'Track trends and patterns across submissions' },
    { icon: <Lock className="w-8 h-8 text-blue-600" />, title: 'Enterprise Security', description: 'Bank-level encryption and GDPR compliance' },
    { icon: <Zap className="w-8 h-8 text-blue-600" />, title: 'API Integration', description: 'Integrate seamlessly with your systems' },
  ];

  const stats = [
    { number: '50M+', label: 'Documents Analyzed' },
    { number: '99.9%', label: 'Uptime' },
    { number: '10K+', label: 'Institutions' },
    { number: '<2s', label: 'Avg Response' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Turnitin</div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className={`transition-colors ${scrolled ? 'text-gray-700' : 'text-gray-600'} hover:text-blue-600`}>Features</a>
              <a href="#how-it-works" className={`transition-colors ${scrolled ? 'text-gray-700' : 'text-gray-600'} hover:text-blue-600`}>How It Works</a>
              <a href="#pricing" className={`transition-colors ${scrolled ? 'text-gray-700' : 'text-gray-600'} hover:text-blue-600`}>Pricing</a>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/login')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${scrolled ? 'text-gray-700' : 'text-gray-600'} hover:text-blue-600`}>Login</button>
              <button onClick={() => navigate('/register')} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Sign Up</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            <p className="text-sm text-blue-700 font-medium">Now with AI-powered detection</p>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Detect Plagiarism with
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Industry-Leading Accuracy</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Turnitin uses advanced AI to detect plagiarism with 99.8% accuracy. Protect academic integrity while supporting original thinking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button onClick={() => navigate('/register')} className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-lg">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/login')} className="px-8 py-4 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-lg">View Demo</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-gray-200">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <div className="text-gray-600 text-sm md:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
            <p className="text-xl text-gray-600">Everything you need to ensure academic integrity</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="p-8 border border-gray-200 rounded-xl hover:border-blue-600 hover:shadow-lg transition-all">
                <div className="mb-4 inline-flex p-3 bg-blue-50 rounded-lg">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple 3-step process to detect plagiarism</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Submit Document', description: 'Upload any document with a single click', icon: '📤' },
              { step: '2', title: 'Automated Analysis', description: 'Our AI analyzes against billions of sources', icon: '⚙️' },
              { step: '3', title: 'Get Results', description: 'Receive detailed reports instantly', icon: '📊' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full font-bold text-xl mb-4">{item.step}</div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that works for you</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Starter', price: '$29', features: ['100 submissions/month', 'Email support', 'Basic reports'], highlighted: false },
              { name: 'Professional', price: '$99', features: ['Unlimited submissions', 'Priority support', 'Advanced analytics', 'API access'], highlighted: true },
              { name: 'Enterprise', price: 'Custom', features: ['Unlimited everything', '24/7 support', 'Custom integration', 'Account manager'], highlighted: false },
            ].map((plan) => (
              <div key={plan.name} className={`p-8 rounded-xl border-2 transition-all ${plan.highlighted ? 'border-blue-600 bg-blue-50 shadow-xl' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-gray-600">/month</span>}
                </div>
                <button onClick={() => navigate('/register')} className={`w-full py-3 rounded-lg font-semibold transition-colors mb-8 ${plan.highlighted ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>Get Started</button>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Classroom?</h2>
          <p className="text-xl mb-10 opacity-90">Join thousands of educators using Turnitin</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/register')} className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">Start Free Today</button>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:bg-opacity-10 transition-colors">View Pricing</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div><h4 className="text-white font-bold mb-4">Turnitin</h4><p className="text-sm">Enterprise plagiarism detection for academic integrity.</p></div>
            <div><h5 className="text-white font-semibold mb-4">Product</h5><ul className="space-y-2 text-sm"><li><a href="#features" className="hover:text-white transition">Features</a></li><li><a href="#pricing" className="hover:text-white transition">Pricing</a></li></ul></div>
            <div><h5 className="text-white font-semibold mb-4">Resources</h5><ul className="space-y-2 text-sm"><li><a href="#" className="hover:text-white transition">Documentation</a></li><li><a href="#" className="hover:text-white transition">Support</a></li></ul></div>
            <div><h5 className="text-white font-semibold mb-4">Legal</h5><ul className="space-y-2 text-sm"><li><a href="#" className="hover:text-white transition">Privacy</a></li><li><a href="#" className="hover:text-white transition">Terms</a></li></ul></div>
          </div>
          <div className="border-t border-gray-800 pt-8"><p className="text-center text-sm">© 2026 Turnitin. All rights reserved.</p></div>
        </div>
      </footer>
    </div>
  );
}
