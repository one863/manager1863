import { db } from "@/core/db/db";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { SubTabs } from "@/ui/components/Common/SubTabs";
import { ArrowLeft, LogOut, Info, Bell, Database, User, Briefcase, Award, Download } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import type { Team } from "@/core/engine/core/types";
import { exportSaveToJSON } from "@/core/db/export-system";

interface ManagerViewProps {
	onClose: () => void;
	onQuit: () => void;
}

export default function ManagerView({ onClose, onQuit }: ManagerViewProps) {
	const { t, i18n } = useTranslation();
	const [activeTab, setActiveTab] = useState<"profile" | "settings">("profile");
	const userTeamId = useGameStore((state) => state.userTeamId);
    const currentSaveId = useGameStore((state) => state.currentSaveId);
	const [userTeam, setUserTeam] = useState<Team | null>(null);

	useEffect(() => {
		if (userTeamId) {
			db.teams.get(userTeamId).then(setUserTeam);
		}
	}, [userTeamId]);

	const toggleLanguage = () => {
		const newLang = i18n.language === "fr" ? "en" : "fr";
		i18n.changeLanguage(newLang);
	};

    const handleExportSave = async () => {
        if (!currentSaveId) return;
        try {
            const json = await exportSaveToJSON(currentSaveId);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fm1863_save_${currentSaveId}_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed", error);
            alert("Erreur lors de l'export de la sauvegarde.");
        }
    };

	const tabs = [
		{ id: "profile", label: "Mon Profil" },
		{ id: "settings", label: "Paramètres" },
	];

	return (
		<div className="flex flex-col h-full bg-white animate-fade-in">
			{/* Header */}
			<div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
				<button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
					<ArrowLeft size={24} />
				</button>
				<h2 className="text-lg font-bold text-gray-900">Ma Fiche Manager</h2>
			</div>

			<SubTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

			{/* Body */}
			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{activeTab === "profile" ? (
					<div className="space-y-6">
						{/* Manager Info Card */}
						<div className="bg-paper-dark rounded-2xl p-6 border border-gray-200 shadow-sm">
							<div className="flex items-center gap-4 mb-6">
								<div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-white">
									<User size={32} />
								</div>
								<div>
									<h3 className="text-xl font-black text-ink">
										{userTeam?.managerName || "Manager"}
									</h3>
									<p className="text-sm font-bold text-ink-light flex items-center gap-1">
										<Briefcase size={14} />
										{userTeam?.name || "Sans club"}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="bg-white/50 p-3 rounded-xl border border-gray-100">
									<p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Réputation</p>
									<p className="text-lg font-black text-ink">{userTeam?.reputation || 0}%</p>
								</div>
								<div className="bg-white/50 p-3 rounded-xl border border-gray-100">
									<p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Confiance</p>
									<p className="text-lg font-black text-ink">{userTeam?.confidence || 0}%</p>
								</div>
							</div>
						</div>

						{/* Career Stats */}
						<div className="space-y-2">
							<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Carrière</h3>
							<div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50">
								<div className="p-4 flex justify-between items-center">
									<div className="flex items-center gap-3">
										<Award size={18} className="text-yellow-500" />
										<span className="text-sm font-bold text-gray-900">Palmarès</span>
									</div>
									<span className="text-xs font-black text-gray-400">0 titres</span>
								</div>
								<div className="p-4 flex justify-between items-center">
									<div className="flex items-center gap-3">
										<Database size={18} className="text-blue-500" />
										<span className="text-sm font-bold text-gray-900">Matchs dirigés</span>
									</div>
									<span className="text-xs font-black text-gray-400">{userTeam?.matchesPlayed || 0}</span>
								</div>
							</div>
						</div>
					</div>
				) : (
					<div className="space-y-6">
						<div className="space-y-2">
							<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Général</h3>
							
							<button 
								onClick={toggleLanguage}
								className="w-full bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
										<Info size={18} />
									</div>
									<span className="text-sm font-bold text-gray-900">Langue / Language</span>
								</div>
								<span className="text-xs font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded">
									{i18n.language}
								</span>
							</button>

                            <button 
								onClick={handleExportSave}
								className="w-full bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
										<Download size={18} />
									</div>
									<span className="text-sm font-bold text-gray-900">Exporter Sauvegarde (JSON)</span>
								</div>
							</button>

							<div className="w-full bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between opacity-50">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
										<Bell size={18} />
									</div>
									<span className="text-sm font-bold text-gray-900">Notifications</span>
								</div>
								<div className="w-10 h-5 bg-gray-200 rounded-full relative">
									<div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Jeu</h3>
							
							<div className="w-full bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between opacity-50">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
										<Database size={18} />
									</div>
									<span className="text-sm font-bold text-gray-900">Cloud Sync</span>
								</div>
								<span className="text-[10px] font-bold text-gray-400">OFF</span>
							</div>
						</div>

						<div className="pt-8">
							<button 
								onClick={onQuit}
								className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
							>
								<LogOut size={18} />
								Quitter la partie
							</button>
							<p className="text-center text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-widest">
								Version 1.0.0 (Alpha)
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
