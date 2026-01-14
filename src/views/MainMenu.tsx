import Button from "@/components/Common/Button";
import { auth } from "@/config/firebase";
import { CloudService } from "@/services/cloud-service";
import { type User, onAuthStateChanged } from "firebase/auth";
import { Cloud, LogIn, LogOut } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

export default function MainMenu({
	onNewGame,
	onLoadGame,
}: {
	onNewGame: () => void;
	onLoadGame: () => void;
}) {
	const { t, i18n } = useTranslation();
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		if (!auth) return; // Si Firebase n'est pas configuré, on ne fait rien

		const unsubscribe = onAuthStateChanged(auth, (u) => {
			setUser(u);
		});
		return () => unsubscribe();
	}, []);

	const changeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
	};

	const handleLogin = async () => {
		try {
			if (CloudService.isAvailable()) {
				await CloudService.login();
			} else {
				alert("Le service Cloud n'est pas configuré.");
			}
		} catch (e) {
			console.error(e);
		}
	};

	const handleLogout = async () => {
		await CloudService.logout();
	};

	const isCloudAvailable = CloudService.isAvailable();

	return (
		<div className="flex flex-col h-screen max-w-md mx-auto bg-paper items-center justify-center p-6 space-y-8 relative animate-fade-in">
			{/* User Status / Cloud Auth - Visible seulement si Cloud dispo */}
			{isCloudAvailable && (
				<div className="absolute top-4 left-4 z-10">
					{user ? (
						<div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow border border-gray-200">
							{user.photoURL && (
								<img
									src={user.photoURL}
									alt="User"
									className="w-6 h-6 rounded-full"
								/>
							)}
							<button
								onClick={handleLogout}
								className="text-gray-500 hover:text-red-500 transition-colors"
							>
								<LogOut size={16} />
							</button>
						</div>
					) : (
						<button
							onClick={handleLogin}
							className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
						>
							<LogIn size={14} /> Connexion
						</button>
					)}
				</div>
			)}

			{/* Sélecteur de langue */}
			<div className="absolute top-4 right-4 flex gap-2 z-10">
				<button
					onClick={() => changeLanguage("en")}
					className={`w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-bold transition-all ${i18n.resolvedLanguage === "en" ? "bg-accent text-white shadow-md" : "bg-white text-ink-light opacity-50 hover:opacity-100"}`}
				>
					EN
				</button>
				<button
					onClick={() => changeLanguage("fr")}
					className={`w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-bold transition-all ${i18n.resolvedLanguage === "fr" ? "bg-accent text-white shadow-md" : "bg-white text-ink-light opacity-50 hover:opacity-100"}`}
				>
					FR
				</button>
			</div>

			<div className="text-center space-y-2">
				<h1 className="text-5xl font-serif font-bold text-accent tracking-tighter drop-shadow-sm">
					1863
					<br />
					FOOTBALL
				</h1>
				<p className="text-ink-light italic text-sm">{t("menu.subtitle")}</p>
				{user && (
					<div className="flex items-center justify-center gap-1 text-[10px] text-green-600 font-bold uppercase tracking-widest mt-2">
						<Cloud size={10} /> Cloud Sync Active
					</div>
				)}
			</div>

			<div className="w-full space-y-4 max-w-[280px]">
				<Button onClick={onNewGame} variant="primary" className="py-4 text-lg">
					{t("menu.new_game")}
				</Button>

				<Button onClick={onLoadGame} variant="secondary">
					{t("menu.load_game")}
				</Button>
			</div>

			<div className="text-center text-xs text-ink-light opacity-60 absolute bottom-4">
				{t("menu.version")}
			</div>
		</div>
	);
}
