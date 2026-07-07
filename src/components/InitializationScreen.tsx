import { AlertCircle, Settings, ExternalLink } from 'lucide-react';

export function InitializationScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                Configuration Required
              </h1>
              <p className="text-slate-600 mt-1">
                Topline Flooring & Waterproofing
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 font-medium">
              This application requires environment variables to function properly.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Missing Environment Variables
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <code className="bg-slate-200 px-2 py-1 rounded text-xs font-mono">VITE_SUPABASE_URL</code>
                  <span>- Your Supabase project URL</span>
                </li>
                <li className="flex items-start gap-2">
                  <code className="bg-slate-200 px-2 py-1 rounded text-xs font-mono">VITE_SUPABASE_ANON_KEY</code>
                  <span>- Your Supabase anonymous key</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-2">How to Configure</h3>
              <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
                <li>Create a <code className="bg-slate-200 px-1 rounded">.env</code> file in the project root</li>
                <li>Add the required environment variables (see <code className="bg-slate-200 px-1 rounded">.env.example</code>)</li>
                <li>Restart the development server</li>
                <li>For Vercel deployment, add these variables in project settings</li>
              </ol>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://supabase.com/docs/guides/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Supabase Documentation
            </a>
            <a
              href="https://vercel.com/docs/projects/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-900 px-6 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Vercel Environment Variables
            </a>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Need help? Contact your system administrator or development team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
