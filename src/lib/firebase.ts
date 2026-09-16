import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  UserCredential,
  Auth,
} from 'firebase/auth';

export const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || "AIzaSyCcg5LLZiwfCIEHfmNHJ-PVGbU3kxqAkjg",
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || "ghar-ghar-6a8f4.firebaseapp.com",
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "ghar-ghar-6a8f4",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || "ghar-ghar-6a8f4.firebasestorage.app",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "73788003900",
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || "1:73788003900:web:205cc8f226a391141d5539",
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string) || "G-30V0Q22XRC",
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseAuth(): { app: FirebaseApp; auth: Auth } | null {
  try {
    if (!firebaseConfig.apiKey) {
      return null;
    }
    if (!appInstance) {
      appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      authInstance = getAuth(appInstance);
      // Ensure Hindi/English device language
      if (typeof window !== 'undefined') {
        authInstance.useDeviceLanguage();
      }
    }
    return { app: appInstance, auth: authInstance! };
  } catch (err) {
    console.warn('[Firebase Auth] Initialization skipped or failed:', err);
    return null;
  }
}

function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export interface FirebaseGoogleUser {
  idToken: string;
  email: string;
  name: string;
  picture?: string;
  uid: string;
}

/**
 * Sign in with Google via Firebase Popup with automatic fallback to Redirect if popup is blocked
 */
export async function signInWithGoogleViaFirebase(options: {
  mode?: 'popup' | 'redirect';
  allowRedirectFallback?: boolean;
} = {}): Promise<FirebaseGoogleUser | { redirected: true }> {
  const fb = getFirebaseAuth();
  if (!fb) {
    throw new Error('Firebase Auth is not configured. Please check your Firebase settings.');
  }

  const provider = createGoogleProvider();
  const mode = options.mode || 'popup';
  const allowFallback = options.allowRedirectFallback !== false;

  if (mode === 'redirect') {
    await signInWithRedirect(fb.auth, provider);
    return { redirected: true };
  }

  try {
    const result: UserCredential = await signInWithPopup(fb.auth, provider);
    const user = result.user;
    const idToken = await user.getIdToken();

    if (!user.email) {
      throw new Error('Google account did not provide an email address.');
    }

    return {
      idToken,
      email: user.email,
      name: user.displayName || 'Vastu Homeowner',
      picture: user.photoURL || undefined,
      uid: user.uid,
    };
  } catch (err: any) {
    // If popup was blocked by browser and fallback is allowed, trigger redirect
    if (allowFallback && (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked'))) {
      console.warn('[Firebase Auth] Popup blocked by browser, falling back to signInWithRedirect...');
      await signInWithRedirect(fb.auth, provider);
      return { redirected: true };
    }
    throw err;
  }
}

/**
 * Direct Redirect flow for mobile or strict privacy browsers
 */
export async function signInWithGoogleViaFirebaseRedirect(): Promise<void> {
  const fb = getFirebaseAuth();
  if (!fb) {
    throw new Error('Firebase Auth is not configured.');
  }
  const provider = createGoogleProvider();
  await signInWithRedirect(fb.auth, provider);
}

/**
 * Check if the user just returned from a Firebase OAuth Redirect
 */
export async function checkFirebaseRedirectResult(): Promise<FirebaseGoogleUser | null> {
  const fb = getFirebaseAuth();
  if (!fb) {
    return null;
  }

  try {
    const result = await getRedirectResult(fb.auth);
    if (!result || !result.user || !result.user.email) {
      return null;
    }

    const idToken = await result.user.getIdToken();
    return {
      idToken,
      email: result.user.email,
      name: result.user.displayName || 'Vastu Homeowner',
      picture: result.user.photoURL || undefined,
      uid: result.user.uid,
    };
  } catch (err: any) {
    console.error('[Firebase Auth] Redirect result error:', err);
    throw err;
  }
}

/**
 * Detailed error diagnostics for Firebase Auth errors
 */
export function parseFirebaseAuthError(err: any, lang: string = 'hi'): {
  code: string;
  title: string;
  message: string;
  canTryRedirect: boolean;
} {
  const code = err?.code || 'auth/unknown';
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'ghargharvastu.com';
  const isHi = lang === 'hi' || lang === 'hinglish';

  switch (code) {
    case 'auth/unauthorized-domain':
      return {
        code,
        title: isHi ? 'डोमेन अधिकृत नहीं है (Unauthorized Domain)' : 'Domain Not Authorized',
        message: isHi
          ? `यह डोमेन (${currentHost}) अभी Firebase में अधिकृत नहीं है या Google CDN पर अपडेट होने में 5-10 मिनट का समय ले रहा है। कृपया Firebase Console > Authentication > Settings > Authorized Domains में "${currentHost}" की जांच करें।`
          : `The domain (${currentHost}) is not recognized by Firebase Authentication yet. If you recently added it to Firebase Console > Authentication > Settings > Authorized Domains, please allow 5-10 minutes for Google CDN propagation.`,
        canTryRedirect: false,
      };

    case 'auth/operation-not-allowed':
      return {
        code,
        title: isHi ? 'Google साइन-इन अक्षम है' : 'Google Sign-In Disabled',
        message: isHi
          ? 'Firebase Console में Google Provider सक्षम (Enabled) नहीं है। कृपया Firebase Console > Authentication > Sign-in method में जाकर "Google" को Enable करें और Project Support Email सेट करें।'
          : 'Google Sign-In provider is disabled in Firebase Console. Please visit Firebase Console > Authentication > Sign-in method, click Google, toggle Enable, set a support email, and click Save.',
        canTryRedirect: false,
      };

    case 'auth/popup-blocked':
      return {
        code,
        title: isHi ? 'पॉपअप ब्लॉक हुआ' : 'Popup Blocked',
        message: isHi
          ? 'आपके ब्राउज़र ने Google लॉगिन पॉपअप विंडो को रोक दिया है। आप नीचे "Google Redirect से लॉगिन करें" बटन दबाकर सीधे लॉगिन कर सकते हैं।'
          : 'Your browser blocked the Google authentication popup. You can use the "Sign In via Redirect" option below.',
        canTryRedirect: true,
      };

    case 'auth/popup-closed-by-user':
      return {
        code,
        title: isHi ? 'लॉगिन विंडो बंद हो गई' : 'Popup Window Closed',
        message: isHi
          ? 'Google साइन-इन पॉपअप पूरा होने से पहले बंद हो गया। यदि आपने इसे बंद नहीं किया, तो ब्राउज़र में थर्ड-पार्टी कुकीज़ या क्रॉस-साइट सुरक्षा के कारण ऐसा हो सकता है। आप पुनः प्रयास करें या "Redirect से लॉगिन" विकल्प चुनें।'
          : 'The Google sign-in window was closed before completion. If you did not close it, browser privacy settings or third-party cookie restrictions may have interrupted the session. Please try again or use the Redirect option.',
        canTryRedirect: true,
      };

    case 'auth/cancelled-popup-request':
      return {
        code,
        title: isHi ? 'अनुरोध रद्द' : 'Request Cancelled',
        message: isHi
          ? 'नया लॉगिन अनुरोध शुरू होने से पिछला अनुरोध रद्द हो गया। कृपया एक बार क्लिक करके प्रतीक्षा करें।'
          : 'A previous sign-in attempt was in progress. Please click once and wait.',
        canTryRedirect: true,
      };

    case 'auth/network-request-failed':
      return {
        code,
        title: isHi ? 'नेटवर्क त्रुटि' : 'Network Error',
        message: isHi
          ? 'इंटरनेट कनेक्शन या नेटवर्क में रुकावट आई। कृपया अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।'
          : 'A network error occurred. Please check your internet connection and try again.',
        canTryRedirect: true,
      };

    case 'auth/account-exists-with-different-credential':
      return {
        code,
        title: isHi ? 'खाता पहले से मौजूद है' : 'Account Exists',
        message: isHi
          ? 'इस ईमेल से पहले से खाता मौजूद है। कृपया अपने मोबाइल नंबर या ईमेल/पासवर्ड से लॉगिन करें।'
          : 'An account already exists with this email address under a different login method. Please sign in using your existing method.',
        canTryRedirect: false,
      };

    default:
      return {
        code,
        title: isHi ? 'Google साइन-इन त्रुटि' : 'Google Sign-In Error',
        message: err?.message || (isHi ? 'Google साइन-इन में अज्ञात त्रुटि आई। कृपया पुनः प्रयास करें।' : 'An error occurred during Google sign-in. Please try again.'),
        canTryRedirect: true,
      };
  }
}

