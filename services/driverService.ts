import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DriverProfile, LatLng, UserRole } from '../types';

export const createDriverProfile = async (userId: string): Promise<DriverProfile> => {
  const driverRef = doc(db, 'drivers', userId);
  const newProfile: DriverProfile = {
    id: userId,
    userId: userId,
    isOnline: false,
    updatedAt: serverTimestamp() as any,
  };
  await setDoc(driverRef, newProfile);
  return newProfile;
};

export const getDriverProfile = async (userId: string): Promise<DriverProfile | null> => {
  const driverRef = doc(db, 'drivers', userId);
  const docSnap = await getDoc(driverRef);
  if (docSnap.exists()) {
    return docSnap.data() as DriverProfile;
  }
  return null;
};

export const updateDriverStatus = async (userId: string, isOnline: boolean): Promise<void> => {
  const driverRef = doc(db, 'drivers', userId);
  await updateDoc(driverRef, {
    isOnline,
    updatedAt: serverTimestamp(),
  });
};

export const updateDriverCurrentLocation = async (userId: string, location: LatLng): Promise<void> => {
  const driverRef = doc(db, 'drivers', userId);
  await updateDoc(driverRef, {
    currentLocation: location,
    updatedAt: serverTimestamp(),
  });
};
