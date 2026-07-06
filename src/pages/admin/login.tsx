import { useState } from 'react';
import { useLocation } from 'wouter';
import { Lock, User, AlertCircle, Building2 } from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-data';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAdminAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(username, password);

    if (success) {
      setLocation('/admin');
    } else {
      setError('Invalid username or password');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Admin Portal
          </h1>
          <p className="text-gray-400 mt-1">Topline Flooring & Waterproofing</p>
        </div>

        <div className="bg-navy-900 rounded-xl p-8 border border-navy-800 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-900/50 text-red-300 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-navy-800">
            <p className="text-xs text-gray-500 text-center">
              Default credentials: <span className="text-primary-400">admin</span> / <span className="text-primary-400">admin123</span>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Access restricted to authorized personnel only
        </p>
      </div>
    </div>
  );
}
