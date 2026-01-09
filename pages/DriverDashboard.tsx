import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { LatLng, DriverProfile, RideRequest, RideStatus, UserRole } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import { updateDriverLocation, updateDriverOnlineStatus, listenForDriverRequests, acceptRide, rejectRide, listenForActiveDriverRide } from '../services/rideService';
import { getCurrentLocation } from '../services/locationService';
// Import onSnapshot from firebase/firestore
import { setDoc, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const LOCATION_UPDATE_INTERVAL = 10000; // Update every 10 seconds

const DriverDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { userProfile, loading: userProfileLoading } = useUser();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<RideRequest[]>([]);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const watchIdRef = useRef<number | null>(null); // To store geolocation watch ID

  const fetchOrCreateDriverProfile = useCallback(async (userId: string) => {
    const driverRef = doc(db, 'drivers', userId);
    const docSnap = await getDoc(driverRef);

    if (docSnap.exists()) {
      setDriverProfile(docSnap.data() as DriverProfile);
    } else {
      const newDriverProfile: DriverProfile = {
        id: userId,
        userId: userId,
        isOnline: false,
        updatedAt: new Date() as any, // Will be replaced by serverTimestamp on write
      };
      await setDoc(driverRef, newDriverProfile);
      setDriverProfile(newDriverProfile);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userProfileLoading) return;
    if (currentUser && userProfile?.role === UserRole.DRIVER) {
      fetchOrCreateDriverProfile(currentUser.uid);
    } else {
      setLoading(false);
    }
  }, [currentUser, userProfile, userProfileLoading, fetchOrCreateDriverProfile]);

  // Listener for driver profile changes
  useEffect(() => {
    if (!currentUser?.uid || userProfile?.role !== UserRole.DRIVER) return;

    const driverRef = doc(db, 'drivers', currentUser.uid);
    const unsubscribe = onSnapshot(driverRef, (docSnap) => {
      if (docSnap.exists()) {
        setDriverProfile(docSnap.data() as DriverProfile);
      }
    }, (err) => {
      console.error("Error listening to driver profile:", err);
      setError("Failed to load driver profile in real-time.");
    });
    return () => unsubscribe();
  }, [currentUser?.uid, userProfile?.role]);

  // Handle location updates
  const startLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const newLocation: LatLng = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (currentUser) {
          try {
            await updateDriverLocation(currentUser.uid, newLocation);
          } catch (err) {
            console.error("Error updating driver location:", err);
            // Optionally set an error, but don't stop tracking
          }
        }
      },
      (geoError) => {
        console.error("Geolocation error:", geoError);
        setError(`Geolocation error: ${geoError.message}. Please allow location access.`);
        if (currentUser) {
          updateDriverOnlineStatus(currentUser.uid, false); // Go offline if location fails
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000, // Accept cached position up to 10 seconds old
        timeout: 5000,
      }
    );
  }, [currentUser]);

  const stopLocationTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Toggle online status
  const handleToggleOnline = useCallback(async () => {
    if (!currentUser || !driverProfile) return;

    const newOnlineStatus = !driverProfile.isOnline;
    setError(null);
    try {
      await updateDriverOnlineStatus(currentUser.uid, newOnlineStatus);
      if (newOnlineStatus) {
        startLocationTracking();
      } else {
        stopLocationTracking();
      }
    } catch (err) {
      console.error('Error toggling online status:', err);
      setError('Failed to update online status.');
    }
  }, [currentUser, driverProfile, startLocationTracking, stopLocationTracking]);

  // Initial setup for location tracking if already online
  useEffect(() => {
    if (driverProfile?.isOnline) {
      startLocationTracking();
    }
    return () => stopLocationTracking(); // Cleanup on unmount
  }, [driverProfile?.isOnline, startLocationTracking, stopLocationTracking]);

  // Listen for ride requests for this driver
  useEffect(() => {
    if (!currentUser?.uid || !driverProfile?.isOnline) {
      setPendingRequests([]);
      return;
    }

    const unsubscribe = listenForDriverRequests(currentUser.uid, (rides) => {
      setPendingRequests(rides);
    });
    return () => unsubscribe();
  }, [currentUser?.uid, driverProfile?.isOnline]);

  // Listen for the active ride assigned to this driver
  useEffect(() => {
    if (!currentUser?.uid) {
      setActiveRide(null);
      return;
    }
    const unsubscribe = listenForActiveDriverRide(currentUser.uid, (ride) => {
      setActiveRide(ride);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  const handleAcceptRide = useCallback(async (rideId: string) => {
    if (!currentUser || !driverProfile) return;
    setError(null);
    try {
      await acceptRide(rideId, currentUser.uid, userProfile?.displayName || currentUser.email || 'Driver');
      alert('Ride accepted!');
    } catch (err) {
      console.error('Error accepting ride:', err);
      setError('Failed to accept ride.');
    }
  }, [currentUser, driverProfile, userProfile?.displayName]);

  const handleRejectRide = useCallback(async (rideId: string) => {
    if (!currentUser) return;
    setError(null);
    try {
      await rejectRide(rideId);
      alert('Ride rejected!');
    } catch (err) {
      console.error('Error rejecting ride:', err);
      setError('Failed to reject ride.');
    }
  }, [currentUser]);

  if (loading || userProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (userProfile?.role !== UserRole.DRIVER) {
    return <p className="p-4 text-center text-red-500">Access Denied: You are not a driver.</p>;
  }

  if (!driverProfile) {
    return <p className="p-4 text-center text-gray-500 dark:text-gray-400">Error: Driver profile not found.</p>;
  }

  return (
    <div className="container mx-auto p-4 max-w-md md:max-w-lg lg:max-w-xl">
      <h2 className="text-3xl font-bold text-center text-emerald-700 dark:text-emerald-300 mb-6">
        Driver Dashboard
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl mb-6 flex items-center justify-between">
        <span className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Status: {driverProfile.isOnline ? 'Online' : 'Offline'}
        </span>
        <Button
          onClick={handleToggleOnline}
          variant={driverProfile.isOnline ? 'danger' : 'primary'}
          size="md"
        >
          Go {driverProfile.isOnline ? 'Offline' : 'Online'}
        </Button>
      </div>

      {driverProfile.isOnline && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl mb-6">
          <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
            Live Location
          </h3>
          <p className="text-gray-800 dark:text-gray-200">
            {driverProfile.currentLocation ? (
              <>Lat: {driverProfile.currentLocation.latitude.toFixed(4)}, Lng: {driverProfile.currentLocation.longitude.toFixed(4)}</>
            ) : (
              'Fetching location...'
            )}
          </p>
          <div className="mt-4 w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden relative">
            <img
              src={`https://picsum.photos/400/200?random=2&v=${Date.now()}`}
              alt="Map showing current location"
              className="absolute inset-0 w-full h-full object-cover blur-sm"
            />
            <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-40 text-white font-bold">
              Map View Placeholder
            </div>
          </div>
        </div>
      )}

      {activeRide && (
        <div className="bg-emerald-100 dark:bg-emerald-900 p-6 rounded-lg shadow-xl mb-6 border-l-4 border-emerald-500">
          <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200 mb-4">
            Active Ride
          </h3>
          <p className="mb-2"><strong>Customer:</strong> {activeRide.customerName}</p>
          <p className="mb-2"><strong>Pickup:</strong> {activeRide.pickupAddress}</p>
          <p className="mb-2"><strong>Destination:</strong> {activeRide.destinationAddress}</p>
          <p className="mb-4"><strong>Status:</strong> <span className="font-medium text-emerald-700 dark:text-emerald-300">{activeRide.status.replace(/_/g, ' ')}</span></p>
          <div className="flex space-x-2 mt-4">
            {activeRide.status === RideStatus.ACCEPTED && (
              <Button onClick={() => alert('Simulate Start Ride')} variant="primary" fullWidth>
                Start Ride
              </Button>
            )}
            {activeRide.status === RideStatus.IN_PROGRESS && (
              <Button onClick={() => alert('Simulate Complete Ride')} variant="primary" fullWidth>
                Complete Ride
              </Button>
            )}
          </div>
        </div>
      )}


      {driverProfile.isOnline && pendingRequests.length > 0 && !activeRide && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl mb-6">
          <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
            Pending Ride Requests ({pendingRequests.length})
          </h3>
          <ul className="space-y-4">
            {pendingRequests.map((request) => (
              <li key={request.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Customer: {request.customerName}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  From: {request.pickupAddress}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  To: {request.destinationAddress}
                </p>
                <div className="flex space-x-2 mt-3">
                  <Button
                    onClick={() => handleAcceptRide(request.id)}
                    variant="primary"
                    size="sm"
                    className="flex-1"
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleRejectRide(request.id)}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {driverProfile.isOnline && pendingRequests.length === 0 && !activeRide && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl mb-6 text-center text-gray-600 dark:text-gray-400">
          No pending ride requests. Waiting for new rides...
        </div>
      )}

      {!driverProfile.isOnline && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl mb-6 text-center text-gray-600 dark:text-gray-400">
          Go online to start receiving ride requests.
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;