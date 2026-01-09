import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { userProfile } = useUser();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
    setMenuOpen(false);
  }, [logout, navigate]);

  const getDashboardPath = useCallback(() => {
    if (userProfile?.role === 'customer') return '/customer-dashboard';
    if (userProfile?.role === 'driver') return '/driver-dashboard';
    return '/';
  }, [userProfile]);

  return (
    <header className="sticky top-0 z-50 bg-emerald-600 dark:bg-emerald-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          <button onClick={() => navigate(getDashboardPath())} className="focus:outline-none">
            E-Rickshaw Finder
          </button>
        </h1>
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-2 focus:outline-none"
            >
              <img
                src={currentUser.photoURL || 'https://picsum.photos/50/50'}
                alt="User Avatar"
                className="w-8 h-8 rounded-full border-2 border-white"
              />
              <span className="hidden sm:inline">{currentUser.displayName || currentUser.email}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 text-gray-900 dark:text-gray-100">
                <div className="px-4 py-2 text-sm font-medium border-b border-gray-200 dark:border-gray-700">
                  {userProfile?.role ? `Role: ${userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}` : 'Role: Not set'}
                </div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
