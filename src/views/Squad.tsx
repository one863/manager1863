import { type Player, type Team, type StaffMember, db } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import {
	Check,
	Layout,
	Shield,
	Target,
	Zap,
	TrendingUp,
	Activity,
	ShieldAlert,
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import PlayerAvatar from "@/components/PlayerAvatar";
import CreditAmount from "@/components/Common/CreditAmount";

const FORMATIONS: Record<
	string,
	{ GK: number; DEF: number; MID: number; FWD: number }
> = {
	"4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
	"4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
	"3-5-2": { GK: 1, DEF: 3, MID: 5, FWD: 2 },
	"3-4-3": { GK: 1, DEF: 3, MID: 4, FWD: 3 },
	"4-2-4": { GK: 1, DEF: 4, MID: 2, FWD: 4 },
	"5-4-1": { GK: 1, DEF: 5, MID: 4, FWD: 1 },
};

export const PlayerRow = ({ 
	player, 
	onSelect, 
	action 
}: { 
	player: Player; 
	onSelect?: (p: Player) => void;
	action?: preact.VNode;
}) => (
	<div className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-yellow-50 transition-colors ${player.injuryDays > 0 ? "bg-red-50" : player.suspensionMatches > 0 ? "bg-red-100" : "bg-white"}`}>
		<div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => onSelect?.(player)}>
			<div className="relative">
				<PlayerAvatar dna={player.dna} size={40} className={`border ${player.injuryDays > 0 ? "border-red-500 grayscale" : player.suspensionMatches > 0 ? "border-red-700 brightness-50" : "border-gray-200"}`} />
				{player.injuryDays > 0 && (
					<div className="absolute -bottom-1 -right-1 bg-red-600 text-white p-0.5 rounded-full shadow-sm">
						<Activity size={8} />
					</div>
				)}
				{player.suspensionMatches > 0 && (
					<div className="absolute -bottom-1 -right-1 bg-red-800 text-white p-0.5 rounded-full shadow-sm">
						<ShieldAlert size={8} />
					</div>
				)}
			</div>
			<div>
				<div className="font-bold text-ink leading-tight flex items-center gap-1">
					{player.lastName}
					{player.injuryDays > 0 && <span className="text-[8px] px-1 bg-red-600 text-white rounded">Inj</span>}
					{player.suspensionMatches > 0 && <span className="text-[8px] px-1 bg-red-800 text-white rounded">Susp</span>}
				</div>
				<div className="flex items-center gap-2 mt-0.5">
					<span className={`px-1 rounded-[2px] text-[9px] font-bold border ${getPositionClass(player.position)}`}>
						{player.position}{player.position !== "GK" && ` (${player.side || "C"})`}
					</span>
					<span className="text-[10px] text-ink-light font-mono">{player.age} ans</span>
				</div>
				<div className="flex items-center gap-1 mt-1">
					<span className="text-[9px] text-ink-light uppercase font-bold tracking-tighter">Salaire hebdo:</span>
					<CreditAmount amount={player.wage} size="xs" color="text-accent" />
				</div>
			</div>
		</div>
		<div className="flex items-center gap-4">
			<div className="text-right">
				<div className="text-[9px] text-ink-light uppercase font-bold tracking-tighter">Niveau</div>
				<div className={`font-mono font-bold text-sm ${player.skill >= 9 ? "text-accent" : "text-ink"}`}>{Math.floor(player.skill)}</div>
			</div>
			{action}
		</div>
	</div>
);

export const StaffRow = ({ 
	staff, 
	onSelect, 
	action
}: { 
	staff: StaffMember; 
	onSelect?: (s: StaffMember) => void;
	action?: preact.VNode;
}) => (
	<div className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 hover:bg-yellow-50 transition-colors bg-white">
		<div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => onSelect?.(staff)}>
			<PlayerAvatar dna={staff.dna} isStaff size={40} className="border border-gray-200" />
			<div>
				<div className="font-bold text-ink leading-tight">{staff.name}</div>
				<div className="flex items-center gap-2 mt-0.5">
					<span className="px-1 rounded-[2px] text-[9px] font-bold border bg-paper-dark text-ink-light border-gray-300 uppercase tracking-widest">
						{staff.role.replace("_", " ")}
					</span>
					<span className="text-[10px] text-ink-light font-mono">{staff.age} ans</span>
				</div>
				<div className="flex items-center gap-1 mt-1">
					<span className="text-[9px] text-ink-light uppercase font-bold tracking-tighter">Salaire hebdo:</span>
					<CreditAmount amount={staff.wage} size="xs" color="text-accent" />
				</div>
			</div>
		</div>
		<div className="flex items-center gap-4">
			<div className="text-right">
				<div className="text-[9px] text-ink-light uppercase font-bold tracking-tighter">Niveau</div>
				<div className={`font-mono font-bold text-sm text-accent`}>{Math.floor(staff.skill)}</div>
			</div>
			{action}
		</div>
	</div>
);

export default function Squad({ viewMode = "squad", onSelectPlayer }: { viewMode?: "squad" | "list" | "tactics", onSelectPlayer?: (p: Player) => void }) {
	const { t } = useTranslation();
	const userTeamId = useGameStore((state) => state.userTeamId);
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const day = useGameStore((state) => state.day);
	const lastUpdate = useGameStore((state) => state.lastUpdate);
	const [players, setPlayers] = useState<Player[]>([]);
	const [team, setTeam] = useState<Team | null>(null);
	const [coach, setCoach] = useState<StaffMember | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const loadData = async () => {
		if (!userTeamId || currentSaveId === null) return;
		const [squad, teamData, coachData] = await Promise.all([
			db.players.where("[saveId+teamId]").equals([currentSaveId, userTeamId]).toArray(),
			db.teams.get(userTeamId),
			db.staff.where("[saveId+teamId]").equals([currentSaveId, userTeamId]).and(s => s.role === "COACH").first(),
		]);
		setPlayers(squad);
		if (teamData) setTeam(teamData);
		if (coachData) setCoach(coachData);
		setIsLoading(false);
	};

	useEffect(() => { loadData(); }, [userTeamId, currentSaveId, day, lastUpdate]);

	const updateTactic = async (tactic: Team["tacticType"]) => {
		if (!userTeamId) return;
		await db.teams.update(userTeamId, { tacticType: tactic });
		loadData();
	};

	const updateFormation = async (formation: Team["formation"]) => {
		if (!userTeamId) return;
		await db.teams.update(userTeamId, { formation });
		loadData();
	};

	if (isLoading) return <div className="p-8 text-center animate-pulse">{t("game.loading")}</div>;

	const getPlayersByPos = (pos: string) => players.filter((p) => p.position === pos).sort((a, b) => b.skill - a.skill);

	if (viewMode === "tactics") {
		return (
			<div className="space-y-6 animate-fade-in pb-24">
				{/* INFORMATION STRATÉGIQUE (COACH) - LECTURE SEULE */}
				{coach && (
					<section className="bg-paper-dark p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
						<div className={`p-3 rounded-full ${coach.preferredStrategy === "OFFENSIVE" ? "bg-red-100 text-red-600" : coach.preferredStrategy === "DEFENSIVE" ? "bg-blue-100 text-blue-600" : "bg-accent/10 text-accent"}`}>
							{coach.preferredStrategy === "OFFENSIVE" ? <Zap size={24} /> : coach.preferredStrategy === "DEFENSIVE" ? <Shield size={24} /> : <Target size={24} />}
						</div>
						<div>
							<h4 className="text-[10px] font-black uppercase tracking-widest text-ink-light">Stratégie du Coach</h4>
							<p className="text-sm font-bold text-ink">
								{coach.name} ({coach.preferredStrategy === "OFFENSIVE" ? "Offensif" : coach.preferredStrategy === "DEFENSIVE" ? "Défensif" : "Équilibré"})
							</p>
							<p className="text-[9px] text-ink-light italic opacity-70">
								Style : {coach.preferredStrategy === "DEFENSIVE" ? "Prudence et bloc regroupé" : coach.preferredStrategy === "OFFENSIVE" ? "Projection rapide vers l'avant" : "Maîtrise et équilibre des lignes"}.
							</p>
						</div>
					</section>
				)}

				<section className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
					<h3 className="text-sm font-bold text-ink-light uppercase tracking-widest mb-4 flex items-center gap-2">
						<Layout size={18} className="text-accent" /> Schéma Tactique
					</h3>
					<div className="grid grid-cols-3 gap-2">
						{Object.keys(FORMATIONS).map((f) => (
							<button
								key={f}
								onClick={() => updateFormation(f as any)}
								className={`py-3 rounded-xl border-2 font-mono font-bold text-sm transition-all ${team?.formation === f ? "bg-accent border-accent text-white shadow-md" : "bg-paper-dark border-gray-100 text-ink-light hover:border-gray-300"}`}
							>
								{f}
							</button>
						))}
					</div>
				</section>

				<section className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
					<h3 className="text-sm font-bold text-ink-light uppercase tracking-widest mb-4 flex items-center gap-2">
						<Target size={18} className="text-accent" /> Philosophie de Jeu
					</h3>
					<div className="grid grid-cols-1 gap-3">
						<TacticButton
							active={team?.tacticType === "NORMAL"}
							title="Équilibre"
							desc="Tactique standard."
							icon={Target}
							onClick={() => updateTactic("NORMAL")}
						/>
						<TacticButton
							active={team?.tacticType === "PRESSING"}
							title="Pressing"
							desc="Étouffer l'adversaire."
							icon={Zap}
							onClick={() => updateTactic("PRESSING")}
						/>
						<TacticButton
							active={team?.tacticType === "CA"}
							title="Contre-Attaque"
							desc="Attendre l'erreur et jaillir."
							icon={Shield}
							onClick={() => updateTactic("CA")}
						/>
					</div>
				</section>
			</div>
		);
	}

	return (
		<div className="space-y-5 pb-24 px-4">
			{["GK", "DEF", "MID", "FWD"].map((pos) => (
				<section key={pos} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
					<div className={`px-3 py-2 border-b font-bold text-[10px] uppercase tracking-widest flex justify-between items-center ${getSectionBgClass(pos)}`}>
						<span>{t(`squad.${pos.toLowerCase()}`)}</span>
						<span className="opacity-40">{getPlayersByPos(pos).length}</span>
					</div>
					{getPlayersByPos(pos).map((p) => (
						<PlayerRow key={p.id} player={p} onSelect={onSelectPlayer} />
					))}
				</section>
			))}
		</div>
	);
}

function TacticButton({ active, title, desc, icon: Icon, onClick }: any) {
	return (
		<button
			onClick={onClick}
			className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${active ? "bg-accent/5 border-accent shadow-sm" : "bg-white border-gray-100 hover:border-gray-200"}`}
		>
			<div className={`p-2 rounded-lg ${active ? "bg-accent text-white" : "bg-gray-100 text-gray-400"}`}>
				<Icon size={20} />
			</div>
			<div>
				<div className={`font-bold text-sm ${active ? "text-accent" : "text-ink"}`}>{title}</div>
				<div className="text-[10px] text-ink-light italic">{desc}</div>
			</div>
			{active && (
				<div className="ml-auto mt-1">
					<Check size={16} className="text-accent" strokeWidth={3} />
				</div>
			)}
		</button>
	);
}

function getPositionClass(pos: string) {
	switch (pos) {
		case "GK": return "bg-yellow-100 text-yellow-800 border-yellow-300";
		case "DEF": return "bg-blue-100 text-blue-800 border-blue-300";
		case "MID": return "bg-green-100 text-green-800 border-green-100";
		case "FWD": return "bg-red-100 text-red-800 border-red-300";
		default: return "";
	}
}

function getSectionBgClass(pos: string) {
	switch (pos) {
		case "GK": return "bg-yellow-50 text-yellow-800 border-yellow-100";
		case "DEF": return "bg-blue-50 text-blue-800 border-blue-100";
		case "MID": return "bg-green-50 text-green-800 border-green-100";
		case "FWD": return "bg-red-50 text-red-800 border-red-100";
		default: return "";
	}
}
