import { doc, collection, addDoc, updateDoc, serverTimestamp, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { LatLng, RideRequest, RideStatus, DriverProfile } from '../types';
import { getDriverProfile, updateDriverStatus } from './driverService';

export const requestRide = async (
  customerId: string,
  customerName: string,
  customerLocation: LatLng,
  pickupAddress: string,
  destinationLocation: LatLng,
  destinationAddress: string
): Promise<string> => {
  const rideRequestsRef = collection(db, 'rideRequests');
  const newRideRequest: Omit<RideRequest, 'id'> = {
    customerId,
    customerName,
    customerLocation,
    pickupAddress,
    destinationLocation,
    destinationAddress,
    driverId: null,
    driverName: null,
    status: RideStatus.PENDING,
    fare: null, // Fare calculation can be added later
    requestedAt: serverTimestamp() as any,
  };

  const docRef = await addDoc(rideRequestsRef, newRideRequest);
  return docRef.id;
};

export const cancelRide = async (rideId: string): Promise<void> => {
  const rideRef = doc(db, 'rideRequests', rideId);
  await updateDoc(rideRef, {
    status: RideStatus.CANCELLED,
    updatedAt: serverTimestamp(),
  });
};


export const acceptRide = async (rideId: string, driverId: string, driverName: string): Promise<void> => {
  const rideRef = doc(db, 'rideRequests', rideId);
  await updateDoc(rideRef, {
    driverId,
    driverName,
    status: RideStatus.ACCEPTED,
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const rejectRide = async (rideId: string): Promise<void> => {
  const rideRef = doc(db, 'rideRequests', rideId);
  await updateDoc(rideRef, {
    status: RideStatus.REJECTED,
    driverId: null, // Clear driver if rejected
    driverName: null,
    updatedAt: serverTimestamp(),
  });
};

export const updateRideStatus = async (rideId: string, status: RideStatus): Promise<void> => {
  const rideRef = doc(db, 'rideRequests', rideId);
  await updateDoc(rideRef, {
    status,
    updatedAt: serverTimestamp(),
    ...(status === RideStatus.IN_PROGRESS && { startedAt: serverTimestamp() }),
    ...(status === RideStatus.COMPLETED && { completedAt: serverTimestamp() }),
  });
};

// --- Real-time Listeners ---

export const listenForNearbyDrivers = (callback: (drivers: DriverProfile[]) => void) => {
  const driversRef = collection(db, 'drivers');
  const q = query(driversRef, where('isOnline', '==', true)); // Filter for online drivers

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const drivers: DriverProfile[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as DriverProfile));
    callback(drivers);
  }, (error) => {
    console.error("Error listening for nearby drivers:", error);
  });

  return unsubscribe;
};

export const listenForCustomerRideRequests = (customerId: string, callback: (rides: RideRequest[]) => void) => {
  const rideRequestsRef = collection(db, 'rideRequests');
  const q = query(
    rideRequestsRef,
    where('customerId', '==', customerId),
    where('status', 'in', [RideStatus.PENDING, RideStatus.ACCEPTED, RideStatus.IN_PROGRESS])
    // orderBy('requestedAt', 'desc') // Order by date, for example
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const rides: RideRequest[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as RideRequest));
    callback(rides);
  }, (error) => {
    console.error("Error listening for customer ride requests:", error);
  });

  return unsubscribe;
};

export const listenForDriverRequests = (driverId: string, callback: (rides: RideRequest[]) => void) => {
  const rideRequestsRef = collection(db, 'rideRequests');
  // Query for pending rides not yet assigned to any driver, or assigned to this driver
  const q = query(
    rideRequestsRef,
    where('status', '==', RideStatus.PENDING),
    // A driver might only see requests within a certain radius in a real app
    orderBy('requestedAt', 'desc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const requests: RideRequest[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as RideRequest));
    // Filter out requests already assigned to another driver if such logic is needed
    // For simplicity, showing all pending unassigned requests for now.
    callback(requests);
  }, (error) => {
    console.error("Error listening for driver requests:", error);
  });

  return unsubscribe;
};

export const listenForActiveDriverRide = (driverId: string, callback: (ride: RideRequest | null) => void) => {
  const rideRequestsRef = collection(db, 'rideRequests');
  const q = query(
    rideRequestsRef,
    where('driverId', '==', driverId),
    where('status', 'in', [RideStatus.ACCEPTED, RideStatus.IN_PROGRESS])
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const activeRide = snapshot.docs.length > 0 ? (snapshot.docs[0].data() as RideRequest) : null;
    if (activeRide) {
      callback({ id: snapshot.docs[0].id, ...activeRide });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error listening for active driver ride:", error);
  });

  return unsubscribe;
};

// Driver-specific update functions (exposed for DriverDashboard usage)
export const updateDriverLocation = async (userId: string, location: LatLng): Promise<void> => {
  const driverRef = doc(db, 'drivers', userId);
  await updateDoc(driverRef, {
    currentLocation: location,
    updatedAt: serverTimestamp(),
  });
};

export const updateDriverOnlineStatus = async (userId: string, isOnline: boolean): Promise<void> => {
  const driverRef = doc(db, 'drivers', userId);
  await updateDoc(driverRef, {
    isOnline,
    updatedAt: serverTimestamp(),
  });
};
