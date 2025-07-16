'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function RouteGuard({ 
  children, 
  requireAuth = false, 
  redirectTo 
}: RouteGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !user) {
        // User needs to be authenticated but isn't
        router.push('/login');
      } else if (!requireAuth && user && redirectTo) {
        // User is authenticated but shouldn't be on this page
        router.push(redirectTo);
      }
    }
  }, [user, isLoading, requireAuth, redirectTo, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show content based on auth requirements
  if (requireAuth && !user) {
    return null; // Will redirect
  }

  if (!requireAuth && user && redirectTo) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
