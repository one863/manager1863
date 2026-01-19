import { db } from "@/core/db/db";
import { generateWorld } from "@/core/generators/world-generator";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { ArrowLeft, Check, Globe, Shield, User, RefreshCw } from "lucide-preact";
import { useState, useMemo, useCallback } from "preact/hooks";
import { useTranslation } from "react-i18next";
import Button from "@/ui/components/Common/Button";
import { TeamCrest } from "../components/Common/TeamCrest";

interface CreateTeamProps {
	onGameCreated: () => void;
	onCancel: () => void;
}

const PRESET_COLORS = [
	"#ffffff", "#000000", "#da291c", "#004d98", "#a50044", 
    "#fde100", "#6cabdd", "#034694", "#0068a8", "#fb090b", 
    "#004170", "#003a70", "#fdb913", "#009b3a", "#ed1c24", 
    "#6366f1", "#f97316", "#a855f7", "#14b8a6", "#4b5563",
];

const LOGO_TYPES_COUNT = 5;

export default function CreateTeam({ onGameCreated, onCancel }: CreateTeamProps) {
	const { t } = useTranslation();
	const initializeGame = useGameStore((state) => state.initialize);

	const [managerFirstName, setManagerFirstName] = useState("");
	const [managerLastName, setManagerLastName] = useState("");
	const [teamName, setTeamName] = useState("");
	const [primaryColor, setPrimaryColor] = useState(PRESET_COLORS[2]);
	const [secondaryColor, setSecondaryColor] = useState(PRESET_COLORS[0]);
    const [logoType, setLogoType] = useState(0);
	const [isGenerating, setIsGenerating] = useState(false);

    const isFormValid = useMemo(() => 
        managerFirstName.trim().length > 0 && 
        managerLastName.trim().length > 0 && 
        teamName.trim().length > 0, 
    [managerFirstName, managerLastName, teamName]);

    const rotateLogo = useCallback(() => {
        setLogoType(prev => (prev + 1) % LOGO_TYPES_COUNT);
    }, []);

	const handleCreate = async () => {
		if (!isFormValid || isGenerating) return;
		setIsGenerating(true);
		try {
			const managerFullName = `${managerFirstName.trim()} ${managerLastName.trim()}`;
            const trimmedTeamName = teamName.trim();
			const saveId = await db.saveSlots.add({
				managerName: managerFullName,
				teamName: trimmedTeamName,
				lastPlayedDate: new Date(),
				day: 1,
				season: 1,
			});

			const { userTeamId } = await generateWorld(saveId as number, trimmedTeamName);
			await db.teams.update(userTeamId, {
				primaryColor,
				secondaryColor,
				colors: [primaryColor, secondaryColor],
                // @ts-ignore
                logoType: logoType
			});

			const startDate = new Date();
			await db.gameState.add({
				saveId: saveId as number,
				currentDate: startDate,
				season: 1,
				day: 1,
				userTeamId,
				isGameOver: false,
                version: 1
			});

			await initializeGame(saveId as number, startDate, userTeamId, managerFullName, trimmedTeamName);
			onGameCreated();
		} catch (e) {
			console.error("World generation failed", e);
			alert(t("create.error_msg", "Erreur lors de la création de la partie."));
			setIsGenerating(false);
		}
	};

	const ColorPicker = ({ label, selected, onChange }: { label: string, selected: string, onChange: (c: string) => void }) => (
		<div className="space-y-3">
			<label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {label}
            </label>
			<div className="grid grid-cols-5 gap-2">
				{PRESET_COLORS.map((c) => (
					<button
						key={c}
						onClick={() => onChange(c)}
						className={`w-full aspect-square rounded-lg border-2 transition-all duration-200 ${
							selected === c 
								? "border-accent scale-105 shadow-md" 
								: "border-slate-100 hover:border-slate-300"
						}`}
						style={{ backgroundColor: c }}
					/>
				))}
			</div>
		</div>
	);

	return (
		<div className="flex flex-col h-screen bg-slate-50 animate-fade-in w-full max-w-md mx-auto relative overflow-hidden font-sans text-ink">
			<div className="p-6 flex-1 flex flex-col overflow-y-auto relative z-10">
                {/* Header - Clean Dashboard Style */}
				<div className="flex items-center gap-4 mb-10">
					<button 
						onClick={onCancel}
						className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-ink transition-all"
					>
						<ArrowLeft size={20} />
					</button>
					<div>
						<h1 className="text-xl font-black tracking-tight uppercase leading-none">
							{t("create.title", "Nouveau Club")}
						</h1>
						<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
							Création de votre club
						</p>
					</div>
				</div>

				<div className="space-y-6 pb-20">
                    {/* Visual Preview Section */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 pointer-events-none" />
                        
                        <div className="relative z-10 flex-1 min-w-0">
                            <span className="text-[10px] font-black text-accent uppercase tracking-widest block mb-1">Blason Officiel</span>
                            <h2 className="text-2xl font-black italic tracking-tighter truncate leading-tight mb-2">
                                {teamName || "Nom du Club"}
                            </h2>
                            <div className="flex items-center gap-2 text-slate-400">
                                <User size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-tight truncate">
                                    {managerFirstName && managerLastName ? `${managerFirstName} ${managerLastName}` : "Fondateur"}
                                </span>
                            </div>
                        </div>

                        <div className="relative shrink-0">
                            <div className="w-24 h-24 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner">
                                <TeamCrest primary={primaryColor} secondary={secondaryColor} size="md" type={logoType} />
                            </div>
                            <button 
                                onClick={rotateLogo}
                                className="absolute -bottom-2 -right-2 bg-accent text-white rounded-xl p-2 shadow-lg hover:scale-110 active:scale-95 transition-all border-2 border-white"
                            >
                                <RefreshCw size={14} strokeWidth={3} />
                            </button>
                        </div>
                    </div>

                    {/* Inputs Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Prénom</label>
                            <input
                                type="text"
                                value={managerFirstName}
                                onInput={(e) => setManagerFirstName((e.target as HTMLInputElement).value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-sm font-bold focus:bg-white focus:border-accent outline-none transition-all"
                                placeholder="Jean"
                            />
                        </div>
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom</label>
                            <input
                                type="text"
                                value={managerLastName}
                                onInput={(e) => setManagerLastName((e.target as HTMLInputElement).value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3 text-sm font-bold focus:bg-white focus:border-accent outline-none transition-all"
                                placeholder="Dupont"
                            />
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nom du club</label>
                        <input
                            type="text"
                            value={teamName}
                            onInput={(e) => setTeamName((e.target as HTMLInputElement).value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-base font-black italic tracking-tight focus:bg-white focus:border-accent outline-none transition-all"
                            placeholder="Toulouse Football Club"
                        />
                    </div>

                    {/* Colors Section */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 gap-8">
                        <ColorPicker label="Couleurs Primordiales" selected={primaryColor} onChange={setPrimaryColor} />
                        <ColorPicker label="Couleurs Secondaires" selected={secondaryColor} onChange={setSecondaryColor} />
                    </div>
				</div>
			</div>

			{/* Bottom Bar - Clear Fixed Position */}
			<div className="p-6 bg-white border-t border-slate-100 pb-10">
				<Button
					onClick={handleCreate}
					disabled={!isFormValid || isGenerating}
					variant="accent"
					className="w-full py-5 text-sm font-black shadow-xl shadow-accent/20 rounded-2xl uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all hover:translate-y-[-2px] active:translate-y-0"
				>
					{isGenerating ? (
						<><Globe className="animate-spin" size={18} /> {t("create.creating")}</>
					) : (
						<><Check size={20} strokeWidth={3} /> {t("create.sign_button")}</>
					)}
				</Button>
			</div>
		</div>
	);
}
