import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { useAuth } from './AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

interface UserContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  assignUserRole: (role: UserRole) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateUserProfile = useCallback(async (user: { uid: string; email: string; displayName: string | null; photoURL: string | null; }) => {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      setUserProfile(data);
    } else {
      const newProfile: UserProfile = {
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: null, // Role needs to be assigned later
        createdAt: serverTimestamp() as any, // Firebase Timestamp
        updatedAt: serverTimestamp() as any, // Firebase Timestamp
      };
      await setDoc(userRef, newProfile);
      setUserProfile(newProfile);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (currentUser) {
      fetchOrCreateUserProfile(currentUser);

      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          setUserProfile(null);
        }
      }, (error) => {
        console.error("Error listening to user profile:", error);
        setUserProfile(null);
      });

      return () => unsubscribe();
    } else {
      setUserProfile(null);
      setLoading(false);
    }
  }, [currentUser, authLoading, fetchOrCreateUserProfile]);

  const updateUserProfile = useCallback(async (profile: Partial<UserProfile>) => {
    if (!currentUser) return;
    setLoading(true);
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      await updateDoc(userRef, {
        ...profile,
        updatedAt: serverTimestamp(),
      });
      setUserProfile(prev => prev ? { ...prev, ...profile, updatedAt: serverTimestamp() as any } : null);
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const assignUserRole = useCallback(async (role: UserRole) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      await updateUserProfile({ role });
      setUserProfile(prev => prev ? { ...prev, role } : null); // Optimistic update
    } catch (error) {
      console.error("Error assigning user role:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser, updateUserProfile]);

  const value = {
    userProfile,
    loading: loading || authLoading,
    updateUserProfile,
    assignUserRole,
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
