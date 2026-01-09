import { Timestamp } from 'firebase/firestore';

export enum UserRole {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
  ADMIN = 'admin', // Future expansion
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  role: UserRole | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface DriverProfile {
  id: string;
  userId: string; // Link to UserProfile
  licenseNumber?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  isOnline: boolean;
  currentLocation?: LatLng;
  updatedAt: Timestamp;
}

export enum RideStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface RideRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerLocation: LatLng; // Pickup location
  destinationLocation: LatLng;
  destinationAddress: string;
  pickupAddress: string;
  driverId: string | null; // Null until accepted by a driver
  driverName: string | null;
  status: RideStatus;
  fare: number | null; // Optional, could be calculated later
  requestedAt: Timestamp;
  acceptedAt?: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}
