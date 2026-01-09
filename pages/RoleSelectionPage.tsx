import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { UserRole } from '../types';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

const RoleSelectionPage: React.FC = () => {
  const { userProfile, assignUserRole, loading: userProfileLoading } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (userProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (userProfile?.role) {
    // If role is already set, redirect
    if (userProfile.role === 'customer') {
      navigate('/customer-dashboard', { replace: true });
    } else if (userProfile.role === 'driver') {
      navigate('/driver-dashboard', { replace: true });
    }
    return null;
  }

  const handleRoleSelect = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      await assignUserRole(role);
      if (role === 'customer') {
        navigate('/customer-dashboard', { replace: true });
      } else if (role === 'driver') {
        navigate('/driver-dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Failed to assign role:', err);
      setError('Failed to set role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4 bg-gray-50 dark:bg-gray-800">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-xl w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-6">
          Select Your Role
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-8">
          Are you looking for a ride or want to drive an E-Rickshaw?
        </p>
        <div className="space-y-4">
          <Button
            onClick={() => handleRoleSelect(UserRole.CUSTOMER)}
            fullWidth
            size="lg"
            loading={loading}
          >
            I need a ride (Customer)
          </Button>
          <Button
            onClick={() => handleRoleSelect(UserRole.DRIVER)}
            fullWidth
            size="lg"
            variant="secondary"
            loading={loading}
          >
            I want to drive (Driver)
          </Button>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default RoleSelectionPage;
