import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { LatLng, DriverProfile, RideRequest, RideStatus, UserRole } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import { listenForNearbyDrivers, requestRide, listenForCustomerRideRequests, cancelRide } from '../services/rideService';
import { getCurrentLocation } from '../services/locationService';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const CustomerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { userProfile, loading: userProfileLoading } = useUser();
  const [customerLocation, setCustomerLocation] = useState<LatLng | null>(null);
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [destinationLocation, setDestinationLocation] = useState<LatLng | null>(null); // Simulate destination LatLng
  const [nearbyDrivers, setNearbyDrivers] = useState<DriverProfile[]>([]);
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRequestingRide, setIsRequestingRide] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (!currentUser || userProfileLoading) return;

    setLoading(true);
    try {
      const location = await getCurrentLocation();
      setCustomerLocation(location);
      setPickupAddress(`Lat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}`);
    } catch (err) {
      console.error("Failed to get customer location:", err);
      setError("Failed to get your current location. Please enable location services.");
    } finally {
      setLoading(false);
    }
  }, [currentUser, userProfileLoading]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Listen for nearby drivers
  useEffect(() => {
    if (!customerLocation) return;

    const unsubscribe = listenForNearbyDrivers((drivers) => {
      // Simple filter for "nearby" - in a real app, this would be more sophisticated
      const filteredDrivers = drivers.filter(driver => driver.isOnline && driver.currentLocation);
      setNearbyDrivers(filteredDrivers);
    });

    return () => unsubscribe();
  }, [customerLocation]);

  // Listen for active ride requests by the customer
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = listenForCustomerRideRequests(currentUser.uid, (rides) => {
      const pendingOrActive = rides.find(
        (ride) =>
          ride.status === RideStatus.PENDING ||
          ride.status === RideStatus.ACCEPTED ||
          ride.status === RideStatus.IN_PROGRESS
      );
      setActiveRide(pendingOrActive || null);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const handleRequestRide = useCallback(async () => {
    if (!currentUser || !userProfile || !customerLocation || !destinationLocation || !pickupAddress || !destinationAddress) {
      setError('Please provide all ride details.');
      return;
    }
    if (activeRide) {
      setError('You already have an active or pending ride.');
      return;
    }

    setIsRequestingRide(true);
    setError(null);
    try {
      await requestRide(
        currentUser.uid,
        userProfile.displayName || currentUser.email || 'Customer',
        customerLocation,
        pickupAddress,
        destinationLocation,
        destinationAddress
      );
      alert('Ride requested successfully!');
    } catch (err) {
      console.error('Error requesting ride:', err);
      setError('Failed to request ride. Please try again.');
    } finally {
      setIsRequestingRide(false);
    }
  }, [currentUser, userProfile, customerLocation, destinationLocation, pickupAddress, destinationAddress, activeRide]);

  const handleCancelRide = useCallback(async () => {
    if (!activeRide) return;
    setIsRequestingRide(true); // Reusing for cancel loading state
    setError(null);
    try {
      await cancelRide(activeRide.id);
      alert('Ride cancelled successfully!');
      setActiveRide(null);
    } catch (err) {
      console.error('Error cancelling ride:', err);
      setError('Failed to cancel ride. Please try again.');
    } finally {
      setIsRequestingRide(false);
    }
  }, [activeRide]);

  // Simulate setting a destination location
  const simulateDestination = useCallback(() => {
    // In a real app, this would come from a map selection or geocoding
    setDestinationLocation({ latitude: customerLocation!.latitude + 0.01, longitude: customerLocation!.longitude + 0.01 });
    setDestinationAddress('Simulated Destination Address');
  }, [customerLocation]);

  if (loading || userProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (userProfile?.role !== UserRole.CUSTOMER) {
    return <p className="p-4 text-center text-red-500">Access Denied: You are not a customer.</p>;
  }

  return (
    <div className="container mx-auto p-4 max-w-md md:max-w-lg lg:max-w-xl">
      <h2 className="text-3xl font-bold text-center text-emerald-700 dark:text-emerald-300 mb-6">
        Customer Dashboard
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Map Placeholder */}
      <div className="relative w-full h-64 bg-gray-300 dark:bg-gray-700 rounded-lg shadow-md mb-6 overflow-hidden">
        <img
          src={`https://picsum.photos/600/300?random=1&v=${Date.now()}`}
          alt="Map Placeholder"
          className="absolute inset-0 w-full h-full object-cover blur-sm"
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-lg font-bold bg-black bg-opacity-40">
          <p className="mb-2">Your Location:</p>
          {customerLocation ? (
            <p>{customerLocation.latitude.toFixed(4)}, {customerLocation.longitude.toFixed(4)}</p>
          ) : (
            <p>Fetching location...</p>
          )}
          {nearbyDrivers.length > 0 && (
            <p className="mt-2 text-sm">
              {nearbyDrivers.length} {nearbyDrivers.length === 1 ? 'driver' : 'drivers'} nearby
            </p>
          )}
        </div>
      </div>

      {activeRide ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl mb-6">
          <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
            Current Ride Status
          </h3>
          <p className="mb-2"><strong>Status:</strong> <span className={`font-medium ${activeRide.status === RideStatus.PENDING ? 'text-yellow-500' : activeRide.status === RideStatus.ACCEPTED ? 'text-green-500' : 'text-blue-500'}`}>
            {activeRide.status.replace(/_/g, ' ')}
          </span></p>
          <p className="mb-2"><strong>Pickup:</strong> {activeRide.pickupAddress}</p>
          <p className="mb-4"><strong>Destination:</strong> {activeRide.destinationAddress}</p>
          {activeRide.driverName && <p className="mb-4"><strong>Driver:</strong> {activeRide.driverName}</p>}
          <Button
            onClick={handleCancelRide}
            variant="danger"
            fullWidth
            loading={isRequestingRide}
            disabled={activeRide.status === RideStatus.IN_PROGRESS || activeRide.status === RideStatus.COMPLETED}
          >
            Cancel Ride
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl mb-6">
          <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
            Request a Ride
          </h3>
          <div className="mb-4">
            <label htmlFor="pickup" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Pickup Location
            </label>
            <input
              type="text"
              id="pickup"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Enter pickup location"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-700 dark:text-gray-100 leading-tight focus:outline-none focus:shadow-outline mb-2"
              disabled={!customerLocation}
            />
             {!customerLocation && <p className="text-red-500 text-xs italic">Please enable location services.</p>}
          </div>
          <div className="mb-6">
            <label htmlFor="destination" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
              Destination
            </label>
            <input
              type="text"
              id="destination"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="Enter destination"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:bg-gray-700 dark:text-gray-100 leading-tight focus:outline-none focus:shadow-outline mb-2"
            />
            {!destinationLocation && (
              <Button onClick={simulateDestination} size="sm" variant="secondary" className="mt-2">
                Simulate Destination
              </Button>
            )}
          </div>
          <Button
            onClick={handleRequestRide}
            fullWidth
            loading={isRequestingRide}
            disabled={!customerLocation || !destinationLocation || !pickupAddress || !destinationAddress}
          >
            Request E-Rickshaw
          </Button>
        </div>
      )}

      {nearbyDrivers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
          <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
            Available Drivers
          </h3>
          <ul className="space-y-3">
            {nearbyDrivers.map((driver) => (
              <li key={driver.id} className="flex items-center space-x-3 text-gray-800 dark:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Driver {driver.id.substring(0, 5)} at {driver.currentLocation?.latitude.toFixed(4)}, {driver.currentLocation?.longitude.toFixed(4)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
