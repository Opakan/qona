import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, dbUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  // Allow admin access if the user profile role is ADMIN
  if (!dbUser || dbUser.role !== 'ADMIN') {
    console.warn('[AdminGuard] Unauthorized access attempt — redirecting to user dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
