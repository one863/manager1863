import { type Team, type League, type StaffMember, db, type Match, type Player } from "@/db/db";
import { Landmark, Shield, Trophy, Users, ArrowLeft, Store, Zap, Target, Shield as DefenseIcon, Activity } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import PlayerAvatar from "./PlayerAvatar";

interface ClubDetailsProps {
	teamId: number;
	onClose: () => void;
	onSelectPlayer?: (p: Player) => void;
}

export default function ClubDetails({ teamId, onClose, onSelectPlayer }: ClubDetailsProps) {
	const [team, setTeam] = useState<Team | null>(null);
	const [league, setLeague] = useState<League | null>(null);
	const [coach, setCoach] = useState<StaffMember | null>(null);
	const [lastMatches, setLastMatches] = useState<Match[]>([]);
	const [keyPlayers, setKeyPlayers] = useState<Player[]>([]);
	const [stats, setStats] = useState({ avgSkill: 0, totalValue: 0 });
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadClubData = async () => {
			if (!teamId) return;
			try {
				const teamData = await db.teams.get(teamId);

				if (teamData) {
					const [coachData] = await Promise.all([
						db.staff.where("teamId").equals(teamId).and(s => s.role === "COACH").first()
					]);

					setTeam(teamData);
					setCoach(coachData || null);
					
					if (teamData.leagueId) {
						const leagueData = await db.leagues.get(teamData.leagueId);
						if (leagueData) setLeague(leagueData);
					}

					// Form load - Using safe filter on saveId to avoid index issues
					const recent = await db.matches
						.where("saveId")
						.equals(teamData.saveId)
						.filter(m => m.played === true && (m.homeTeamId === teamId || m.awayTeamId === teamId))
						.toArray();
					
					setLastMatches(recent.sort((a, b) => b.day - a.day).slice(0, 5));

					const players = await db.players
						.where("teamId")
						.equals(teamId)
						.toArray();

					const sorted = [...players].sort((a, b) => b.skill - a.skill);
					setKeyPlayers(sorted.slice(0, 3));

					const avg =
						players.reduce((acc, p) => acc + p.skill, 0) / (players.length || 1);
					const totalV = players.reduce((acc, p) => acc + p.marketValue, 0);
					setStats({ avgSkill: Math.floor(avg), totalValue: totalV });
				}
			} catch (e) {
				console.error("ClubDetails load error", e);
			} finally {
				setIsLoading(false);
			}
		};
		loadClubData();
	}, [teamId]);

	if (isLoading) return (
		<div className="fixed inset-x-0 bottom-0 z-[200] bg-white flex flex-col max-w-md mx-auto rounded-t-3xl shadow-2xl h-[40vh] items-center justify-center">
			<div className="animate-spin text-accent"><Activity size={40} /></div>
		</div>
	);

	if (!team) return null;

	const strategy = coach?.preferredStrategy || "BALANCED";
	const strategyLabel = strategy === "OFFENSIVE" ? "Offensif" : strategy === "DEFENSIVE" ? "Défensif" : "Équilibré";
	const StrategyIcon = strategy === "OFFENSIVE" ? Zap : strategy === "DEFENSIVE" ? DefenseIcon : Target;

	const getFormResult = (m: Match) => {
		const isHomeMatch = m.homeTeamId === teamId;
		const myScore = isHomeMatch ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
		const oppScore = isHomeMatch ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
		if (myScore > oppScore) return 'W';
		if (myScore < oppScore) return 'L';
		return 'D';
	};

	return (
		<div
			className="fixed inset-x-0 bottom-0 z-[200] bg-white flex flex-col max-w-md mx-auto rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up h-[90vh]"
			onClick={(e) => e.stopPropagation()}
		>
			<div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3 shrink-0" />

			<div className="bg-white px-4 pb-4 border-b flex justify-between items-center sticky top-0 z-10 shrink-0">
				<div className="flex gap-4 items-center">
					<button
						onClick={onClose}
						className="text-ink-light hover:text-accent p-1 transition-colors"
					>
						<ArrowLeft size={24} />
					</button>
					<div className="w-14 h-14 bg-paper-dark rounded-2xl flex items-center justify-center border-2 border-accent/20 shadow-sm">
						<Shield size={32} className="text-accent" />
					</div>
					<div>
						<h2 className="text-xl font-serif font-bold text-accent leading-tight">
							{team.name}
						</h2>
						<div className="flex items-center gap-2 mt-0.5">
							<span className="text-[10px] uppercase tracking-widest text-ink-light font-bold">
								Forme
							</span>
							<div className="flex gap-1 ml-1">
								{lastMatches.slice().reverse().map((m, i) => {
									const res = getFormResult(m);
									return (
										<div key={i} className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[7px] font-black text-white shadow-sm ${
											res === 'W' ? 'bg-green-500' : res === 'L' ? 'bg-red-500' : 'bg-gray-400'
										}`}>
											{res}
										</div>
									);
								})}
								{lastMatches.length === 0 && <span className="text-[10px] text-gray-300 italic">Aucun match</span>}
							</div>
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="text-2xl font-black text-ink">{stats.avgSkill}</div>
					<div className="text-[8px] text-ink-light uppercase tracking-widest font-black">
						Niveau Moyen
					</div>
				</div>
			</div>

			<div className="p-5 space-y-6 flex-1 overflow-y-auto">
				<div className="grid grid-cols-2 gap-3">
					<div className="bg-paper-dark p-3 rounded-2xl border border-gray-200">
						<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">
							Réputation
						</span>
						<span className="text-lg font-bold text-ink">{Math.round(team.reputation)}</span>
					</div>
					<div className="bg-paper-dark p-3 rounded-2xl border border-gray-100">
						<span className="block text-[8px] text-ink-light uppercase font-black tracking-widest">
							Moral Supporters
						</span>
						<div className="flex items-center gap-2 mt-1">
							<div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
								<div className="h-full bg-accent" style={{ width: `${team.fanSatisfaction || 70}%` }} />
							</div>
							<span className="text-xs font-bold text-ink">{team.fanSatisfaction || 70}%</span>
						</div>
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-center gap-4 text-sm bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
						<div className="w-10 h-10 rounded-xl bg-paper-dark flex items-center justify-center text-accent shrink-0">
							<Store size={20} />
						</div>
						<div>
							<div className="text-[10px] text-ink-light uppercase font-bold tracking-wider">
								Stade principal
							</div>
							<div className="font-bold text-ink">
								{team.stadiumName}
							</div>
							<div className="text-[10px] text-ink-light">
								{team.stadiumCapacity.toLocaleString()} places
							</div>
						</div>
					</div>

					<div className="flex items-center gap-4 text-sm bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
						<div className="w-10 h-10 rounded-xl bg-paper-dark flex items-center justify-center text-accent shrink-0">
							<Landmark size={20} />
						</div>
						<div>
							<div className="text-[10px] text-ink-light uppercase font-bold tracking-wider">
								Budget
							</div>
							<div className="font-bold text-ink">
								<CreditAmount amount={team.budget} size="sm" color="text-ink" />
							</div>
						</div>
					</div>

					<div className="flex items-center gap-4 text-sm bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
						<div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${strategy === "OFFENSIVE" ? "bg-red-50 text-red-600" : strategy === "DEFENSIVE" ? "bg-blue-50 text-blue-600" : "bg-paper-dark text-accent"}`}>
							<StrategyIcon size={20} />
						</div>
						<div className="flex-1">
							<div className="text-[10px] text-ink-light uppercase font-bold tracking-wider">
								Tactique {team.name}
							</div>
							<div className="flex justify-between items-center">
								<span className="font-bold text-ink">
									{strategyLabel} ({(team.tacticType || "Normal").toLowerCase()})
								</span>
								{coach && <span className="text-[10px] text-ink-light italic">{coach.name}</span>}
							</div>
						</div>
					</div>
				</div>

				<div className="pt-2">
					<h3 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 border-b border-accent/10 pb-1 flex justify-between">
						<span>Meilleurs Joueurs</span>
						<Activity size={12} />
					</h3>
					<div className="space-y-2">
						{keyPlayers.map((player) => (
							<div
								key={player.id}
								onClick={() => onSelectPlayer?.(player)}
								className={`flex items-center justify-between p-3 bg-paper-dark/30 rounded-xl border border-gray-100 transition-colors ${onSelectPlayer ? 'cursor-pointer hover:bg-paper-dark/50' : ''}`}
							>
								<div className="flex items-center gap-3">
									<PlayerAvatar
										dna={player.dna}
										size={40}
										className="border border-white shadow-sm"
									/>
									<div>
										<div className="font-bold text-ink text-sm">
											{player.lastName}
										</div>
										<div className="text-[10px] text-ink-light font-bold uppercase tracking-wider">
											{player.position} {player.position !== "GK" && `(${player.side || "C"})`}
										</div>
									</div>
								</div>
								<div className="text-right">
									<div className="font-mono font-bold text-ink text-lg">
										{Math.floor(player.skill)}
									</div>
									<div className="text-[8px] uppercase font-black text-ink-light tracking-tighter">Skill</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="p-4 bg-paper-dark border-t border-gray-200 pb-10 shrink-0" />
		</div>
	);
}

function CreditAmount({ amount, size = "md", color = "text-accent" }: { amount: number; size?: "xs" | "sm" | "md" | "lg"; color?: string }) {
	const formatted = amount >= 1000000 ? (amount / 1000000).toFixed(1) + "M" : amount >= 1000 ? (amount / 1000).toFixed(0) + "K" : amount;
	const sizes = { xs: "text-[10px]", sm: "text-xs", md: "text-sm", lg: "text-base" };
	return <span className={`${sizes[size]} font-black ${color}`}>{formatted} €</span>;
}
