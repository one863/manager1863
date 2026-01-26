import Button from "@/ui/components/Common/Button";
import { auth } from "@/infrastructure/config/firebase";
import { CloudService } from "@/core/services/cloud-service";
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
		if (!auth) return;

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
		<div className="flex flex-col h-screen max-w-md mx-auto bg-white items-center justify-center p-6 space-y-12 relative animate-fade-in">
			{/* User Status / Cloud Auth */}
			{isCloudAvailable && (
				<div className="absolute top-4 left-4 z-10">
					{user ? (
						<div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
							{user.photoURL && (
								<img
									src={user.photoURL}
									alt="User"
									className="w-6 h-6 rounded-full"
								/>
							)}
							<button
								onClick={handleLogout}
								className="text-slate-600 hover:text-red-500 transition-colors"
							>
								<LogOut size={16} />
							</button>
						</div>
					) : (
						<button
							onClick={handleLogin}
							className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 text-[10px] font-black uppercase tracking-widest text-ink hover:bg-slate-50 transition-colors"
						>
							<LogIn size={14} /> Connexion
						</button>
					)}
				</div>
			)}

			{/* Language Selector */}
			<div className="absolute top-4 right-4 flex gap-2 z-10">
				<button
					onClick={() => changeLanguage("en")}
					className={`w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-black transition-all ${i18n.resolvedLanguage === "en" ? "bg-ink text-white shadow-md border-ink" : "bg-white text-ink-light opacity-40 hover:opacity-100"}`}
				>
					EN
				</button>
				<button
					onClick={() => changeLanguage("fr")}
					className={`w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-[10px] font-black transition-all ${i18n.resolvedLanguage === "fr" ? "bg-ink text-white shadow-md border-ink" : "bg-white text-ink-light opacity-40 hover:opacity-100"}`}
				>
					FR
				</button>
			</div>

			<div className="text-center space-y-4">
				<div className="space-y-0">
					<h1 className="text-6xl font-black italic tracking-tighter text-ink leading-[0.85] drop-shadow-sm">
						1863
					</h1>
					<h2 className="text-2xl font-black italic tracking-tighter text-ink uppercase">
						Football
					</h2>
				</div>
				<div className="h-1 w-12 bg-ink mx-auto rounded-full" />
				<p className="text-ink-light text-xs font-serif italic max-w-[200px] mx-auto leading-relaxed">
					{t("menu.subtitle")}
				</p>
				{user && (
					<div className="flex items-center justify-center gap-1.5 text-[10px] text-green-600 font-black uppercase tracking-[0.2em] mt-2">
						<div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
						Cloud Sync Active
					</div>
				)}
			</div>

			<div className="w-full space-y-3 max-w-[260px]">
				<Button onClick={onNewGame} variant="primary" className="py-4.5 text-xs">
					{t("menu.new_game")}
				</Button>

				<Button onClick={onLoadGame} variant="secondary" className="py-4 text-xs">
					{t("menu.load_game")}
				</Button>
			</div>

			<div className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-ink opacity-20 absolute bottom-8">
				{t("menu.version")}
			</div>
		</div>
	);
}
