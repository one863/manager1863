import type { Player, PlayerTrait } from "@/core/db/db";
import { TransferService } from "@/market/transfers/transfer-service";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import { ArrowLeft, Trash2, Zap, Shield, Repeat, Handshake, Heart, Activity, ShieldAlert, Footprints, Target, Brain, PersonStanding, Star, Info, Timer, Sparkles, Lightbulb, Focus, Gauge } from "lucide-preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import PlayerAvatar from "./PlayerAvatar";
import CareerHistoryView from "@/ui/components/Common/CareerHistoryView";

interface PlayerCardProps {
	player: Player | null;
	onClose: () => void;
	onPlayerAction?: () => void;
}

const PLAYER_TRAIT_DATA: Record<PlayerTrait, { label: string; desc: string }> = {
    COUNTER_ATTACKER: { label: "Contre-Attaquant", desc: "Bonus de vitesse lors des transitions offensives rapides." },
    SHORT_PASSER: { label: "Relanceur Court", desc: "Précision accrue sur les passes courtes et le jeu de possession." },
    CLUTCH_FINISHER: { label: "Buteur Décisif", desc: "Bonus important à la finition dans les 10 dernières minutes." },
    WING_WIZARD: { label: "Magicien des Ailes", desc: "Bonus de dribble et de centre lorsqu'il joue sur un côté." },
    IRON_DEFENDER: { label: "Défenseur de Fer", desc: "Bonus aux tacles et à l'intimidation physique." },
    MARATHON_MAN: { label: "Marathonien", desc: "Perd moins d'énergie (Volume) au fil du match." },
    BOX_TO_BOX: { label: "Box-to-Box", desc: "Contribution égale en attaque et en défense (Milieu)." },
    FREE_KICK_EXPERT: { label: "Expert Coups Francs", desc: "Bonus significatif sur les coups francs directs et indirects." },
    SWEEPER_GK: { label: "Gardien Libéro", desc: "Participe au jeu et coupe les ballons en profondeur." },
    PENALTY_SPECIALIST: { label: "Spécialiste Penalty", desc: "Sang-froid maximal lors des séances de tirs au but." },
    CORNER_SPECIALIST: { label: "Spécialiste Corner", desc: "Précision accrue sur les corners (qualité de centre)." },
    LONG_THROW_SPECIALIST: { label: "Touches Longues", desc: "Peut transformer une touche en occasion de but." },
    BIG_MATCH_PLAYER: { label: "Homme des Grands Matchs", desc: "Bonus de performance contre les équipes plus fortes." },
    GHOST_PLAYER: { label: "Joueur Fantôme", desc: "Difficile à marquer, se fait oublier des défenseurs." },
};

export default function PlayerCard({
	player,
	onClose,
	onPlayerAction,
}: PlayerCardProps) {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
    const currentDay = useGameStore((state) => state.day);
    const currentSeason = useGameStore((state) => state.season);
	const triggerRefresh = useGameStore((state) => state.triggerRefresh);
	const [showConfirmSell, setShowConfirmSell] = useState(false);
	const [showConfirmBuy, setShowConfirmBuy] = useState(false);
	const [activeTab, setActiveTab] = useState<"stats" | "data" | "transfer" | "history">("stats");

	if (!player) return null;

	const isUserPlayer = player.teamId === userTeamId;
	const sellPercentage = TransferService.getSellingPercentage(player.skill);
	const sellValue = Math.round(player.marketValue * sellPercentage);

    // Calcul de la fidélité
    const totalDaysAtClub = (currentSeason - (player.joinedSeason || 1)) * 365 + (currentDay - (player.joinedDay || 1));
    const loyaltyBonus = Math.min(20, Math.floor(totalDaysAtClub / 100) * 2);

	const handleSell = async () => {
		if (!userTeamId) return;
		try {
			await TransferService.sellPlayer(player.id!, userTeamId);
			triggerRefresh();
			setShowConfirmSell(false);
			if (onPlayerAction) onPlayerAction();
			onClose();
		} catch (e) {
			alert("Erreur lors de la vente");
		}
	};

	const handleBuy = async () => {
		if (!userTeamId || !player.id) return;
		const res = await TransferService.buyPlayer(player.id, userTeamId, player.marketValue);
		if (res.success) {
			triggerRefresh();
			setShowConfirmBuy(false);
			if (onPlayerAction) onPlayerAction();
			onClose();
		} else {
			alert(res.error);
		}
	};

	const getPositionColor = (pos: string) => {
		switch (pos) {
			case "GK": return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "DEF": return "bg-blue-100 text-blue-800 border-blue-200";
			case "MID": return "bg-green-100 text-green-800 border-green-200";
			case "FWD": return "bg-red-100 text-red-800 border-red-200";
			default: return "bg-gray-100";
		}
	};

	const StatBar = ({ label, value, max=20 }: { label: string; value: number, max?: number }) => {
		const progressPercentage = (value / max) * 100;
		return (
			<div className="flex items-center mb-1.5">
				<span className="w-28 text-gray-500 truncate font-bold uppercase tracking-tight text-[9px]">
					{label}
				</span>
				<div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden mx-2">
					<div
						className={`h-full transition-all duration-500 ${value > 16 ? "bg-green-500" : value > 12 ? "bg-blue-500" : value > 8 ? "bg-yellow-500" : "bg-red-500"}`}
						style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
					/>
				</div>
				<span className="w-6 text-right font-bold text-gray-800 text-[10px]">
					{Math.floor(value)}
				</span>
			</div>
		);
	};

	const DataMetric = ({ label, value, sub, color="text-gray-900", icon }: { label: string, value: string | number, sub?: string, color?: string, icon?: any }) => (
		<div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
			<span className="block text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-1">{label}</span>
			<div className="flex items-baseline gap-1">
                {icon && <span className="mr-1">{icon}</span>}
				<span className={`text-lg font-bold ${color}`}>{value}</span>
				{sub && <span className="text-[10px] text-gray-400 font-medium">{sub}</span>}
			</div>
		</div>
	);

    const isGK = player.position === "GK";

	return (
		<div className="flex flex-col h-full bg-white animate-fade-in">
			{/* Header */}
			<div className="bg-white px-4 py-4 border-b flex justify-between items-center sticky top-0 z-10">
				<div className="flex gap-3 items-center">
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
						<ArrowLeft size={24} />
					</button>
					<div className="relative">
						<PlayerAvatar
							dna={player.dna}
							size={48}
							className={`border-2 ${player.injuryDays > 0 ? "border-red-500 grayscale" : "border-gray-100"}`}
						/>
					</div>
					<div>
						<h2 className="text-lg font-bold text-gray-900 leading-tight">{player.firstName} {player.lastName}</h2>
						<div className="flex items-center gap-2 mt-0.5">
							<span className={`px-1.5 py-0 rounded text-[10px] font-bold border ${getPositionColor(player.position)}`}>
								{player.position}
							</span>
                            {!isGK && (
                                <span className="px-1.5 py-0 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                    {player.side === "L" ? "Gaucher" : player.side === "R" ? "Droitier" : "Axial"}
                                </span>
                            )}
							<span className="text-xs text-gray-500">{player.age} ans</span>
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="text-2xl font-black text-gray-900">{Math.floor(player.skill)}</div>
					<div className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">Skill</div>
				</div>
			</div>

			{/* Status Alerts */}
			{(player.injuryDays > 0 || player.suspensionMatches > 0) && (
				<div className={`px-4 py-2 flex items-center gap-3 border-b ${player.injuryDays > 0 ? "bg-red-50 text-red-700" : "bg-red-100 text-red-900"}`}>
					{player.injuryDays > 0 ? <Activity size={16} /> : <ShieldAlert size={16} />}
					<p className="text-xs font-bold">
						{player.injuryDays > 0 ? `Blessé (${player.injuryDays}j)` : `Suspendu (${player.suspensionMatches}m)`}
					</p>
				</div>
			)}

			{/* Tabs Navigation */}
			<div className="flex border-b bg-white">
                {[
                    { id: "stats", label: "Profil" },
                    { id: "data", label: "Stats" },
                    { id: "history", label: "Carrière" },
                    { id: "transfer", label: "Contrat" }
                ].map((tab) => (
					<button 
						key={tab.id}
						onClick={() => setActiveTab(tab.id as any)}
						className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-ink"}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Body */}
			<div className="flex-1 overflow-y-auto p-4 space-y-6">
				{activeTab === "stats" && (
					<>
                        {/* Section Traits */}
						<div className="mb-4">
                            {player.traits && player.traits.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {player.traits.map(t => {
                                        const traitInfo = PLAYER_TRAIT_DATA[t] || { label: t, desc: "" };
                                        return (
                                            <div key={t} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                                <div className="mt-0.5">
                                                    <Star size={14} className="text-blue-600 fill-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-blue-800 leading-none mb-1">{traitInfo.label}</p>
                                                    <p className="text-[10px] text-blue-600 leading-tight">{traitInfo.desc}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center gap-2 text-gray-400">
                                    <Star size={14} />
                                    <span className="text-[10px] italic">Aucun style de jeu particulier</span>
                                </div>
                            )}
                        </div>

						<div className="grid grid-cols-2 gap-3">
							<DataMetric label="Potentiel" value={Math.floor(player.potential || player.skill)} />
							<DataMetric 
                                label="Confiance" 
                                value={Math.round(player.confidence || 50)} 
                                sub="/ 100"
                                color={player.confidence > 70 ? "text-green-600" : player.confidence < 30 ? "text-red-600" : "text-blue-600"}
                                icon={<Activity size={14} />}
                            />
						</div>

                        {isUserPlayer && (
                            <div className="bg-pink-50 border border-pink-100 rounded-xl p-3 flex items-center gap-3">
                                <Heart size={16} className="text-pink-500 fill-pink-500" />
                                <p className="text-[11px] font-bold text-pink-700">
                                    Au club depuis {totalDaysAtClub} jours (+{loyaltyBonus}% fidélité).
                                </p>
                            </div>
                        )}

						<div className="space-y-4">
                            
                            {/* BLOCK GARDIEN MIS EN AVANT SI GK */}
                            {isGK && (
                                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 shadow-sm">
                                    <h3 className="text-[10px] font-bold text-yellow-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <ShieldAlert size={14} className="text-yellow-600" /> Gardien
                                    </h3>
                                    <StatBar label="Réflexes" value={player.stats.goalkeeping || 10} />
                                    <StatBar label="Agilité" value={player.stats.agility || 10} />
                                    <StatBar label="Anticipation" value={player.stats.anticipation || 10} />
                                    <StatBar label="Placement" value={player.stats.positioning} />
                                </div>
                            )}

                            {/* Q - Technique */}
							<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
								<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
									<Target size={14} className="text-blue-500" /> Technique (Q)
								</h3>
                                {!isGK && <StatBar label="Tir" value={player.stats.shooting} />}
								<StatBar label="Passe" value={player.stats.passing} />
                                {!isGK && <StatBar label="Centres" value={player.stats.crossing || 10} />}
								{!isGK && <StatBar label="Dribble" value={player.stats.dribbling} />}
                                <StatBar label="Contrôle" value={player.stats.ballControl || 10} />
                                {!isGK && <StatBar label="Tacle" value={player.stats.tackling} />}
							</div>

                            {/* N - Mental */}
							<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
								<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
									<Brain size={14} className="text-purple-500" /> Mental (N)
								</h3>
								<StatBar label="Vision" value={player.stats.vision} />
								<StatBar label="Sang-Froid" value={player.stats.composure} />
                                <StatBar label="Leadership" value={player.stats.leadership || 10} />
                                {!isGK && <StatBar label="Placement" value={player.stats.positioning} />}
                                {!isGK && <StatBar label="Anticipation" value={player.stats.anticipation || 10} />}
                                <StatBar label="Agressivité" value={player.stats.aggression || 10} />
                                <StatBar label="Décisions" value={player.stats.decisions || 10} />
                                <StatBar label="Concentration" value={player.stats.concentration || 10} />
                                <StatBar label="Flair" value={player.stats.flair || 10} />
							</div>

                            {/* V - Physique */}
							<div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
								<h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
									<PersonStanding size={14} className="text-orange-500" /> Physique (V)
								</h3>
								<StatBar label="Vitesse" value={player.stats.speed} />
								<StatBar label="Force" value={player.stats.strength} />
                                {!isGK && <StatBar label="Agilité" value={player.stats.agility || 10} />}
                                <StatBar label="Détente" value={player.stats.jumping || 10} />
								<StatBar label="Endurance" value={player.stats.stamina} />
                                <StatBar label="Workrate" value={player.stats.workrate || 10} />
							</div>
						</div>
					</>
				)}

				{activeTab === "data" && (
					<div className="space-y-6">
						{!player.seasonStats || player.seasonStats.matches === 0 ? (
							<div className="py-12 text-center">
								<p className="text-xs text-gray-400 font-bold uppercase">Aucune donnée cette saison</p>
							</div>
						) : (
							<>
								<div className="grid grid-cols-3 gap-2">
									<DataMetric label="Matchs" value={player.seasonStats.matches} />
									<DataMetric label="Buts" value={player.seasonStats.goals} color="text-green-600" />
									<DataMetric label="Passes D." value={player.seasonStats.assists} color="text-blue-600" />
                                    <DataMetric label="Note Moy." value={player.seasonStats.avgRating.toFixed(2)} />
                                    <DataMetric label="xG" value={player.seasonStats.xg.toFixed(1)} />
								</div>
							</>
						)}
					</div>
				)}

                {activeTab === "history" && (
                    <CareerHistoryView playerName={`${player.firstName} ${player.lastName}`} />
                )}

				{activeTab === "transfer" && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 gap-3">
							<DataMetric label="Salaire" value={`M ${player.wage}`} sub="/ semaine" />
							<DataMetric label="Valeur" value={`M ${player.marketValue}`} />
						</div>

						{isUserPlayer ? (
							<div className="pt-4">
								{showConfirmSell ? (
									<div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-4">
										<p className="text-xs font-bold text-red-700">Vendre pour M {sellValue} ?</p>
										<div className="flex gap-2">
											<button onClick={() => setShowConfirmSell(false)} className="flex-1 py-2 bg-white text-gray-500 border border-gray-200 rounded-lg text-xs font-bold">Annuler</button>
											<button onClick={handleSell} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">Confirmer</button>
										</div>
									</div>
								) : (
									<button
										onClick={() => setShowConfirmSell(true)}
										className="w-full py-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
									>
										<Trash2 size={16} /> Vendre le joueur
									</button>
								)}
							</div>
						) : (
							<div className="pt-4">
								{showConfirmBuy ? (
									<div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
										<p className="text-xs font-bold text-blue-700">Recruter pour M {player.marketValue} ?</p>
										<div className="flex gap-2">
											<button onClick={() => setShowConfirmBuy(false)} className="flex-1 py-2 bg-white text-gray-500 border border-gray-200 rounded-lg text-xs font-bold">Annuler</button>
											<button onClick={handleBuy} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Confirmer</button>
										</div>
									</div>
								) : (
									<button
										onClick={() => setShowConfirmBuy(true)}
										className="w-full py-4 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
									>
										<Handshake size={16} /> Recruter le joueur
									</button>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
