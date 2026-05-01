import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  type UserCredential,
} from 'firebase/auth';

// ─── Firebase Client Config ───────────────────────────────────────────────────
// Nilai diambil dari .env (prefix VITE_ agar Vite expose ke client)

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Hindari inisialisasi ganda (hot reload)
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// ─── Google Sign-In ───────────────────────────────────────────────────────────

export interface GoogleCredential {
  idToken:      string;
  refreshToken: string;
  displayName:  string;
  email:        string;
  photoURL:     string | null;
}

export async function signInWithGoogle(): Promise<GoogleCredential> {
  const result: UserCredential = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  const idToken = await user.getIdToken();

  return {
    idToken,
    refreshToken: user.refreshToken,
    displayName:  user.displayName  ?? '',
    email:        user.email        ?? '',
    photoURL:     user.photoURL,
  };
}

export { auth };
