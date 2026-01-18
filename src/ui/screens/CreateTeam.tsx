import { db } from "@/core/db/db";
import { generateWorld } from "@/core/generators/world-generator";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { ArrowLeft, Check, Globe, Shield, User, RefreshCw } from "lucide-preact";
import { useState, useMemo } from "preact/hooks";
import { useTranslation } from "react-i18next";
import Button from "@/ui/components/Common/Button";
import { TeamCrest } from "@/ui/components/Common/TeamCrest";

interface CreateTeamProps {
	onGameCreated: () => void;
	onCancel: () => void;
}

const PRESET_COLORS = [
	"#ffffff", // White (Real Madrid, Spurs)
	"#000000", // Black (Juventus)
	"#da291c", // Red (Man Utd, Liverpool, Arsenal, Bayern)
	"#004d98", // Royal Blue (Barça, Everton)
	"#a50044", // Garnet (Barça)
	"#fde100", // Yellow (Dortmund, Brazil)
	"#6cabdd", // Sky Blue (Man City, Argentina)
	"#034694", // Chelsea Blue
	"#0068a8", // Inter Blue
	"#fb090b", // Milan Red
	"#004170", // PSG Dark Blue
	"#003a70", // Boca Blue
	"#fdb913", // Gold (Boca, Wolves)
	"#009b3a", // Green (Brazil, Celtic)
	"#ed1c24", // River Plate Red
	"#6366f1", // Indigo
	"#f97316", // Orange (Netherlands)
	"#a855f7", // Purple
	"#14b8a6", // Teal
	"#4b5563", // Slate
];

export default function CreateTeam({ onGameCreated, onCancel }: CreateTeamProps) {
	const { t } = useTranslation();
	const [managerFirstName, setManagerFirstName] = useState("");
	const [managerLastName, setManagerLastName] = useState("");
	const [teamName, setTeamName] = useState("");
	const [primaryColor, setPrimaryColor] = useState(PRESET_COLORS[2]); // Default Red
	const [secondaryColor, setSecondaryColor] = useState(PRESET_COLORS[0]); // Default White
	const [isGenerating, setIsGenerating] = useState(false);
    // On simule un nom pour changer le type de logo
    const [logoSeed, setLogoSeed] = useState("type0"); 
	const initializeGame = useGameStore((state) => state.initialize);

	const handleCreate = async () => {
		if (!managerFirstName.trim() || !managerLastName.trim() || !teamName.trim()) return;
		
		setIsGenerating(true);
		try {
			// 1. Create Save Slot
			const managerName = `${managerFirstName.trim()} ${managerLastName.trim()}`;
			const saveId = await db.saveSlots.add({
				managerName,
				teamName,
				lastPlayedDate: new Date(),
				day: 1,
				season: 1,
			});

			// 2. Generate World
			const { userTeamId } = await generateWorld(saveId as number, teamName);

            const logoType = parseInt(logoSeed.replace("type", "")) || 0;

			await db.teams.update(userTeamId, {
				primaryColor,
				secondaryColor,
				colors: [primaryColor, secondaryColor],
                // @ts-ignore - Adding extra prop
                logoType: logoType
			});

			// 3. Initialize State
			await db.gameState.add({
				saveId: saveId as number,
				currentDate: new Date("1863-09-01"),
				season: 1,
				day: 1,
				userTeamId,
				isGameOver: false,
			});

			await initializeGame(
				saveId as number,
				new Date("1863-09-01"),
				userTeamId,
				managerName,
				teamName,
			);
			
			onGameCreated();
		} catch (e) {
			console.error("Generation failed", e);
			alert("Erreur lors de la création de la partie.");
			setIsGenerating(false);
		}
	};

    const currentLogoType = useMemo(() => {
        return parseInt(logoSeed.replace("type", "")) || 0;
    }, [logoSeed]);

    const rotateLogo = () => {
        const nextType = (currentLogoType + 1) % 5;
        setLogoSeed(`type${nextType}`);
    };

	const ColorPicker = ({ label, selected, onChange }: { label: string, selected: string, onChange: (c: string) => void }) => (
		<div className="space-y-2">
			<label className="text-[10px] font-black uppercase tracking-widest text-ink-light leading-none">{label}</label>
			<div className="grid grid-cols-10 gap-1.5">
				{PRESET_COLORS.map((c) => (
					<button
						key={c}
						onClick={() => onChange(c)}
						className={`w-6 h-6 rounded-md border transition-all ${
							selected === c 
								? "border-accent scale-110 shadow-sm z-10" 
								: "border-gray-100 hover:scale-110 hover:z-10"
						}`}
						style={{ 
							backgroundColor: c, 
							boxShadow: selected === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none' 
						}}
						title={c}
					/>
				))}
			</div>
		</div>
	);

	return (
		<div className="flex flex-col h-screen bg-white animate-fade-in w-full max-w-md mx-auto shadow-2xl relative overflow-hidden">
			{/* Top Decoration */}
			<div className="absolute top-[-20px] right-[-20px] opacity-[0.03] pointer-events-none">
				<Shield size={240} />
			</div>

			<div className="p-4 pt-6 flex-1 flex flex-col overflow-y-auto">
				<div className="flex items-center gap-4 mb-8 sticky top-0 bg-white/80 backdrop-blur-md z-20 py-2">
					<button 
						onClick={onCancel}
						className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-ink-light hover:bg-gray-100 transition-colors shrink-0"
					>
						<ArrowLeft size={20} />
					</button>
					
					<div>
						<h1 className="text-xl font-black italic tracking-tighter text-ink leading-none">
							Nouvelle Carrière
						</h1>
						<p className="text-ink-light text-[10px] font-serif italic mt-1 uppercase tracking-wider">
							Édition Fondatrice 1863
						</p>
					</div>
				</div>

				<div className="space-y-6 pb-6">
					{/* MANAGER NAMES */}
					<div className="flex gap-3">
						<div className="space-y-2 flex-1">
							<label className="block text-[10px] font-black uppercase tracking-widest text-ink-light ml-1">
								Prénom
							</label>
							<div className="relative group">
								<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors">
									<User size={16} />
								</div>
								<input
									type="text"
									value={managerFirstName}
									onChange={(e) => setManagerFirstName((e.target as HTMLInputElement).value)}
									className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-9 pr-3 text-sm font-bold text-ink focus:border-accent focus:bg-white focus:outline-none transition-all placeholder:text-gray-300"
									placeholder="Prénom"
								/>
							</div>
						</div>

						<div className="space-y-2 flex-1">
							<label className="block text-[10px] font-black uppercase tracking-widest text-ink-light ml-1">
								Nom
							</label>
							<div className="relative group">
								<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors">
									<User size={16} />
								</div>
								<input
									type="text"
									value={managerLastName}
									onChange={(e) => setManagerLastName((e.target as HTMLInputElement).value)}
									className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-9 pr-3 text-sm font-bold text-ink focus:border-accent focus:bg-white focus:outline-none transition-all placeholder:text-gray-300"
									placeholder="Nom"
								/>
							</div>
						</div>
					</div>

					{/* TEAM NAME */}
					<div className="space-y-2">
						<label className="block text-[10px] font-black uppercase tracking-widest text-ink-light ml-1">
							Votre Club
						</label>
						<div className="relative group">
							<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors">
								<Shield size={16} />
							</div>
							<input
								type="text"
								value={teamName}
								onChange={(e) => setTeamName((e.target as HTMLInputElement).value)}
								className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-9 pr-3 text-sm font-bold text-ink focus:border-accent focus:bg-white focus:outline-none transition-all placeholder:text-gray-300"
								placeholder="Nom du Club"
							/>
						</div>
					</div>

					{/* COLORS & PREVIEW */}
					<div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-6">
						<div className="flex items-start gap-6">
							<div className="flex-1 space-y-6">
								<ColorPicker 
									label="Couleur Principale" 
									selected={primaryColor} 
									onChange={setPrimaryColor} 
								/>
								
								<ColorPicker 
									label="Couleur Secondaire" 
									selected={secondaryColor} 
									onChange={setSecondaryColor} 
								/>
							</div>

							<div className="flex flex-col items-center gap-2 pt-2">
								<div className="relative group">
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/50">
                                        <TeamCrest 
                                            primary={primaryColor} 
                                            secondary={secondaryColor} 
                                            size="lg"
                                            // @ts-ignore
                                            type={currentLogoType} 
                                        />
                                    </div>
                                    <button 
                                        onClick={rotateLogo}
                                        className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-md border border-gray-100 text-gray-400 hover:text-accent transition-colors"
                                        title="Changer de style"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
								<span className="text-[9px] font-black uppercase tracking-[0.2em] text-ink-light/50">
									Identité
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Bottom Bar */}
			<div className="p-4 bg-white border-t border-gray-100 pb-safe shrink-0">
				<Button
					onClick={handleCreate}
					disabled={!managerFirstName.trim() || !managerLastName.trim() || !teamName.trim() || isGenerating}
					variant="accent"
					className="w-full py-4 text-sm font-bold shadow-lg shadow-accent/20 rounded-xl uppercase tracking-widest"
				>
					{isGenerating ? (
						<>
							<Globe className="animate-spin" size={18} />
							Génération du Monde...
						</>
					) : (
						<>
							<Check size={18} />
							Fonder le Club
						</>
					)}
				</Button>
			</div>
			
		</div>
	);
}
