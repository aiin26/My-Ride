import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, loginWithGoogle as firebaseLogin, logout as firebaseLogout } from '../firebase';
import { User as FirebaseAuthUser } from 'firebase/auth';
import LoadingSpinner from '../components/LoadingSpinner';

interface AuthContextType {
  currentUser: FirebaseAuthUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<FirebaseAuthUser | undefined>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      const user = await firebaseLogin();
      setCurrentUser(user);
      return user;
    } catch (error) {
      console.error("Login with Google failed in AuthContext:", error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await firebaseLogout();
      setCurrentUser(null);
    } catch (error) {
      console.error("Logout failed in AuthContext:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    currentUser,
    loading,
    loginWithGoogle,
    logout,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
