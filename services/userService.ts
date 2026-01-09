import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UserRole } from '../types';

export const createUserProfile = async (uid: string, email: string, displayName?: string | null, photoURL?: string | null): Promise<UserProfile> => {
  const userRef = doc(db, 'users', uid);
  const newProfile: UserProfile = {
    id: uid,
    email: email,
    displayName: displayName,
    photoURL: photoURL,
    role: null, // Role needs to be assigned later
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };
  await setDoc(userRef, newProfile);
  return newProfile;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};

export const updateUserProfileInDb = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const assignUserRoleInDb = async (uid: string, role: UserRole): Promise<void> => {
  await updateUserProfileInDb(uid, { role });
};
