import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage: React.FC = () => {
  const { currentUser, loginWithGoogle, loading: authLoading } = useAuth();
  const { userProfile, loading: userProfileLoading } = useUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !userProfileLoading && currentUser) {
      if (userProfile?.role) {
        if (userProfile.role === 'customer') {
          navigate('/customer-dashboard', { replace: true });
        } else if (userProfile.role === 'driver') {
          navigate('/driver-dashboard', { replace: true });
        }
      } else {
        navigate('/select-role', { replace: true });
      }
    }
  }, [currentUser, navigate, authLoading, userProfileLoading, userProfile?.role]);

  const handleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Failed to log in:', err);
      setError('Failed to log in with Google. Please try again.');
    }
  };

  if (authLoading || userProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4 bg-gray-50 dark:bg-gray-800">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-xl w-full max-w-sm text-center">
        <h2 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-6">
          Welcome to E-Rickshaw Finder
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-8">
          Sign in to find your next ride or start driving.
        </p>
        <Button
          onClick={handleLogin}
          fullWidth
          loading={authLoading}
          className="flex items-center justify-center gap-2"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google icon" className="w-5 h-5" />
          Sign in with Google
        </Button>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
