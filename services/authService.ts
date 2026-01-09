import { User as FirebaseAuthUser } from 'firebase/auth';
import { loginWithGoogle, logout } from '../firebase';

export const signInWithGoogle = async (): Promise<FirebaseAuthUser> => {
  return loginWithGoogle();
};

export const signOutUser = async (): Promise<void> => {
  return logout();
};
