import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const auth = sessionStorage.getItem('topline_admin_auth');
    setIsAuthenticated(auth === 'true');
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation('/admin/login');
    return null;
  }

  return <>{children}</>;
}

export function AdminPublicRoute({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const auth = sessionStorage.getItem('topline_admin_auth');
    if (auth === 'true') {
      setLocation('/admin');
      return;
    }
    setChecked(true);
  }, [setLocation]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
