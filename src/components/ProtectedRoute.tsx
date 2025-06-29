import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, User } from '../modules/auth/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

// Access Denied Component
const AccessDenied: React.FC<{ userRole?: string; requiredRole: string }> = ({ 
  userRole, 
  requiredRole 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full space-y-8">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 text-red-500">
          <svg 
            className="h-12 w-12" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Access Denied
        </h2>
        
        <p className="mt-2 text-sm text-gray-600">
          You don't have permission to access this page.
        </p>
        
        {userRole && requiredRole && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <span className="font-medium">Required role:</span> {requiredRole}
              <br />
              <span className="font-medium">Your role:</span> {userRole}
            </p>
          </div>
        )}
        
        <div className="mt-6 space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go Back
          </button>
          
          <Navigate to="/" replace className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Go to Dashboard
          </Navigate>
        </div>
      </div>
    </div>
  </div>
);

// Loading Component
const AuthLoading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Checking authentication...</p>
    </div>
  </div>
);

/**
 * ProtectedRoute Component
 * 
 * Protects routes based on authentication status and optional role requirements.
 * 
 * @param children - Components to render if access is granted
 * @param requiredRole - Optional role requirement ('admin' or 'user')
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return <AuthLoading />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname + location.search }}
        replace 
      />
    );
  }

  // Check role requirements
  if (requiredRole) {
    // Admin role can access everything
    if (user.role === 'admin') {
      return <>{children}</>;
    }
    
    // Check if user has required role
    if (user.role !== requiredRole) {
      return (
        <AccessDenied 
          userRole={user.role} 
          requiredRole={requiredRole} 
        />
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

/**
 * PublicRoute Component
 * 
 * Redirects authenticated users away from public-only pages (like login/register)
 */
export const PublicRoute: React.FC<{ 
  children: React.ReactNode;
  redirectTo?: string;
}> = ({ 
  children, 
  redirectTo = '/' 
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return <AuthLoading />;
  }

  // Redirect authenticated users
  if (isAuthenticated) {
    // If user came from a protected page, redirect there
    const from = (location.state as any)?.from || redirectTo;
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

/**
 * AdminRoute Component
 * 
 * Convenience component for admin-only routes
 */
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="admin">
    {children}
  </ProtectedRoute>
);

/**
 * UserRoute Component
 * 
 * Convenience component for user routes (both user and admin can access)
 */
export const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute>
    {children}
  </ProtectedRoute>
);

/**
 * withAuth HOC
 * 
 * Higher-order component for wrapping components with authentication
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: 'admin' | 'user'
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <ProtectedRoute requiredRole={requiredRole}>
      <Component {...props} />
    </ProtectedRoute>
  );

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * useRequireAuth Hook
 * 
 * Hook that throws if user is not authenticated or doesn't have required role
 */
export const useRequireAuth = (requiredRole?: 'admin' | 'user'): User => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    throw new Error('Authentication required');
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    throw new Error(`Role '${requiredRole}' required`);
  }

  return user;
};

export default ProtectedRoute;
