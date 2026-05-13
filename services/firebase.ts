import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
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

// ─── Platform Detection ───────────────────────────────────────────────────────
// Deteksi apakah berjalan di native Capacitor (Android / iOS)

function isNativePlatform(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any).Capacitor;
    return cap?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

// ─── Google Sign-In ───────────────────────────────────────────────────────────

export interface GoogleCredential {
  idToken:      string;
  refreshToken: string;
  displayName:  string;
  email:        string;
  photoURL:     string | null;
}

export async function signInWithGoogle(): Promise<GoogleCredential> {
  if (isNativePlatform()) {
    // Native Android / iOS: gunakan plugin @capacitor-firebase/authentication
    // Plugin ini memanggil native Google Sign-In SDK sehingga tidak butuh popup.
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

    const result = await FirebaseAuthentication.signInWithGoogle();

    const googleIdToken = result.credential?.idToken ?? '';
    const googleAccessToken = result.credential?.accessToken ?? '';

    console.log('[Firebase] googleIdToken length:', googleIdToken.length);
    console.log('[Firebase] googleAccessToken length:', googleAccessToken.length);

    if (!googleIdToken && !googleAccessToken) {
      throw new Error('Google Sign-In gagal: credential kosong.');
    }

    // skipNativeAuth: true → plugin hanya mengurus Google OAuth
    // Kita tangani Firebase auth sendiri via web SDK agar dapat Firebase ID token
    let firebaseIdToken = '';
    let refreshToken = '';
    let displayName = result.user?.displayName ?? '';
    let email = result.user?.email ?? '';
    let photoURL = result.user?.photoUrl ?? null;

    try {
      console.log('[Firebase] Calling signInWithCredential...');
      const firebaseCredential = GoogleAuthProvider.credential(
        googleIdToken || null,
        googleAccessToken || null,
      );
      const userCredential = await signInWithCredential(auth, firebaseCredential);
      console.log('[Firebase] signInWithCredential OK, uid:', userCredential.user.uid);

      firebaseIdToken = await userCredential.user.getIdToken();
      refreshToken    = userCredential.user.refreshToken;
      displayName     = userCredential.user.displayName  ?? displayName;
      email           = userCredential.user.email        ?? email;
      photoURL        = userCredential.user.photoURL     ?? photoURL;

      console.log('[Firebase] Firebase ID token length:', firebaseIdToken.length);
    } catch (credErr: unknown) {
      // signInWithCredential gagal — kirim Google OAuth token ke backend sebagai fallback
      // Backend akan handle verifikasi via Google tokeninfo API
      console.warn('[Firebase] signInWithCredential failed:', (credErr as Error).message);
      console.log('[Firebase] Falling back: kirim Google OAuth token ke backend');
      firebaseIdToken = googleIdToken;
      refreshToken    = '';
    }

    return {
      idToken:      firebaseIdToken,
      refreshToken,
      displayName,
      email,
      photoURL,
    };
  }

  // Web browser: tetap gunakan popup seperti biasa
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
