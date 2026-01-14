import { auth, db, googleProvider } from "@/config/firebase";
import { type User, signInWithPopup, signOut } from "firebase/auth";
import {
	collection,
	doc,
	getDocs,
	query,
	setDoc,
	where,
} from "firebase/firestore";

export interface CloudSaveMetadata {
	id: string; // saveId
	userId: string;
	clubName: string;
	season: number;
	day: number;
	updatedAt: number;
	data: string; // JSON content
}

export const CloudService = {
	// Vérification si le service est actif
	isAvailable(): boolean {
		return !!auth && !!db;
	},

	// Authentification
	async login() {
		if (!auth || !googleProvider) {
			console.warn("Firebase Auth not initialized");
			return null;
		}
		try {
			const result = await signInWithPopup(auth, googleProvider);
			return result.user;
		} catch (error) {
			console.error("Login failed", error);
			throw error;
		}
	},

	async logout() {
		if (auth) await signOut(auth);
	},

	getCurrentUser(): User | null {
		return auth?.currentUser || null;
	},

	// Sauvegarde (Upload)
	async uploadSave(
		saveId: number,
		saveDataJSON: string,
		metadata: { clubName: string; season: number; day: number },
	) {
		if (!auth || !db) return false;

		const user = auth.currentUser;
		if (!user)
			throw new Error(
				"Vous devez être connecté pour sauvegarder dans le Cloud.",
			);

		// ID unique composite : UserID + SaveID
		const docId = `${user.uid}_${saveId}`;
		const saveRef = doc(db, "saves", docId);

		const payload: CloudSaveMetadata = {
			id: saveId.toString(),
			userId: user.uid,
			clubName: metadata.clubName,
			season: metadata.season,
			day: metadata.day,
			updatedAt: Date.now(),
			data: saveDataJSON,
		};

		await setDoc(saveRef, payload);
		return true;
	},

	// Récupération (Download List)
	async getCloudSaves(): Promise<CloudSaveMetadata[]> {
		if (!auth || !db) return [];

		const user = auth.currentUser;
		if (!user) return [];

		try {
			const q = query(collection(db, "saves"), where("userId", "==", user.uid));
			const querySnapshot = await getDocs(q);

			// Trier par date décroissante
			return querySnapshot.docs
				.map((doc) => doc.data() as CloudSaveMetadata)
				.sort((a, b) => b.updatedAt - a.updatedAt);
		} catch (e) {
			console.error("Failed to fetch cloud saves", e);
			return [];
		}
	},
};
