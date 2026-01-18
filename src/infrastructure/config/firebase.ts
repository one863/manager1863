import { initializeApp } from "firebase/app";
import { type Auth, GoogleAuthProvider, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

// Configuration Firebase
const firebaseConfig = {
	apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
	authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
};

let app = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let db: Firestore | null = null;

// DÉSACTIVATION TEMPORAIRE DU CLOUD FIREBASE
const ENABLE_FIREBASE = false;

// On n'initialise que si la clé API est présente
if (ENABLE_FIREBASE && firebaseConfig.apiKey) {
	try {
		app = initializeApp(firebaseConfig);
		auth = getAuth(app);
		googleProvider = new GoogleAuthProvider();
		db = getFirestore(app);
	} catch (e) {
		console.warn("Firebase initialization failed. Cloud features disabled.", e);
	}
}

export { auth, googleProvider, db };
export default app;
