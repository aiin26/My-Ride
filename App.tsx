import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import LoginPage from './pages/LoginPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import CustomerDashboard from './pages/CustomerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import Header from './components/Header';
import { useAuth } from './contexts/AuthContext';
import { useUser } from './contexts/UserContext';
import LoadingSpinner from './components/LoadingSpinner';
// Import UserRole from types.ts
import { UserRole } from './types';

const ProtectedRoute: React.FC<React.PropsWithChildren<{ allowedRoles?: UserRole[] }>> = ({ children, allowedRoles }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const { userProfile, loading: userProfileLoading } = useUser();

  if (authLoading || userProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!userProfile?.role) {
    return <Navigate to="/select-role" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/" replace />; // Or a more specific unauthorized page
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <Header />
          <main className="flex-grow">
            <UserProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/select-role"
                  element={
                    <ProtectedRoute>
                      <RoleSelectionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/customer-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
                      <CustomerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/driver-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.DRIVER]}>
                      <DriverDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<HomeRedirect />} />
              </Routes>
            </UserProvider>
          </main>
        </div>
      </HashRouter>
    </AuthProvider>
  );
};

const HomeRedirect: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { userProfile, loading: userProfileLoading } = useUser();

  if (authLoading || userProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!userProfile?.role) {
    return <Navigate to="/select-role" replace />;
  }

  if (userProfile.role === UserRole.CUSTOMER) {
    return <Navigate to="/customer-dashboard" replace />;
  } else if (userProfile.role === UserRole.DRIVER) {
    return <Navigate to="/driver-dashboard" replace />;
  }

  return <Navigate to="/login" replace />; // Fallback
};

export default App;