import { type Team, db } from "@/db/db";
import { Landmark, MapPin, Shield, Trophy, Users, ArrowLeft, Store } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import PlayerAvatar from "./PlayerAvatar";

interface ClubDetailsProps {
	teamId: number;
	onClose: () => void;
}

export default function ClubDetails({ teamId, onClose }: ClubDetailsProps) {
	const [team, setTeam] = useState<Team | null>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [keyPlayers, setKeyPlayers] = useState<any[]>([]);
	const [stats, setStats] = useState({ avgSkill: 0, totalValue: 0 });
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadClubData = async () => {
			const teamData = await db.teams.get(teamId);
			if (teamData) {
				setTeam(teamData);
				const players = await db.players
					.where("teamId")
					.equals(teamId)
					.toArray();

				const sorted = [...players].sort((a, b) => b.skill - a.skill);
				setKeyPlayers(sorted.slice(0, 3));

				const avg =
					players.reduce((acc, p) => acc + p.skill, 0) / (players.length || 1);
				const totalV = players.reduce((acc, p) => acc + p.marketValue, 0);
				setStats({ avgSkill: Math.round(avg), totalValue: totalV });
			}
			setIsLoading(false);
		};
		loadClubData();
	}, [teamId]);

	if (isLoading || !team) return null;

	return (
		<div
			className="fixed inset-0 z-[200] bg-white flex flex-col max-w-md mx-auto border-x border-paper-dark shadow-2xl overflow-hidden animate-fade-in"
			onClick={(e) => e.stopPropagation()}
		>
			{/* Unified Header */}
			<div className="bg-paper-dark p-6 text-center border-b border-gray-300 relative flex flex-col items-center shrink-0">
				<button
					onClick={onClose}
					className="absolute top-6 left-6 text-ink-light hover:text-accent p-1 transition-colors"
				>
					<ArrowLeft size={24} />
				</button>
				
				<div className="w-20 h-20 bg-white rounded-full mb-3 flex items-center justify-center border-4 border-accent shadow-lg">
					<Trophy size={40} className="text-accent" />
				</div>
				<h2 className="text-2xl font-serif font-bold text-ink leading-tight">
					{team.name}
				</h2>
				<div className="text-[10px] uppercase tracking-[0.3em] text-ink-light font-bold mt-1">
					Fondé en 1863
				</div>
			</div>

			{/* Unified Body */}
			<div className="flex-1 p-5 space-y-6 overflow-y-auto">
				<div className="grid grid-cols-2 gap-4">
					<div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
						<div className="text-[10px] text-ink-light uppercase font-bold mb-1 tracking-widest">
							Niveau Moyen
						</div>
						<div className="text-3xl font-mono font-bold text-accent">
							{stats.avgSkill}
						</div>
					</div>
					<div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
						<div className="text-[10px] text-ink-light uppercase font-bold mb-1 tracking-widest">
							Réputation
						</div>
						<div className="text-3xl font-mono font-bold text-ink">
							{Math.round(team.reputation)}
						</div>
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-center gap-4 text-sm bg-white p-3 rounded-xl border border-gray-50 shadow-sm">
						<div className="w-10 h-10 rounded-xl bg-paper-dark flex items-center justify-center text-accent shrink-0">
							<Store size={20} />
						</div>
						<div>
							<div className="text-[10px] text-ink-light uppercase font-bold tracking-wider">
								Stade principal
							</div>
							<div className="font-bold text-ink">
								{team.stadiumName}{" "}
								<span className="text-xs font-normal text-ink-light ml-1">
									({team.stadiumCapacity.toLocaleString()} places)
								</span>
							</div>
						</div>
					</div>
					<div className="flex items-center gap-4 text-sm bg-white p-3 rounded-xl border border-gray-50 shadow-sm">
						<div className="w-10 h-10 rounded-xl bg-paper-dark flex items-center justify-center text-accent shrink-0">
							<Landmark size={20} />
						</div>
						<div>
							<div className="text-[10px] text-ink-light uppercase font-bold tracking-wider">
								Valeur de l'Effectif
							</div>
							<div className="font-bold text-ink">
								M {stats.totalValue.toLocaleString()}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-4 text-sm bg-white p-3 rounded-xl border border-gray-50 shadow-sm">
						<div className="w-10 h-10 rounded-xl bg-paper-dark flex items-center justify-center text-accent shrink-0">
							<Shield size={20} />
						</div>
						<div>
							<div className="text-[10px] text-ink-light uppercase font-bold tracking-wider">
								Style Tactique
							</div>
							<div className="font-bold text-ink capitalize">
								{(team.tacticType || "Normal").replace("_", " ")}
							</div>
						</div>
					</div>
				</div>

				<div className="pt-2">
					<h3 className="text-xs font-black uppercase tracking-widest text-ink-light mb-4 flex items-center gap-2">
						<Users size={16} /> Joueurs clés
					</h3>
					<div className="space-y-3">
						{keyPlayers.map((player) => (
							<div
								key={player.id}
								className="flex items-center justify-between p-3 bg-paper-dark/30 rounded-2xl border border-gray-100"
							>
								<div className="flex items-center gap-3">
									<PlayerAvatar
										dna={player.dna}
										size={40}
										className="border-2 border-white shadow-sm"
									/>
									<div>
										<div className="font-bold text-ink text-sm">
											{player.lastName}
										</div>
										<div className="text-[10px] text-ink-light font-bold uppercase tracking-wider">
											{player.position}
										</div>
									</div>
								</div>
								<div className="text-right">
									<div className="font-mono font-bold text-accent text-lg">
										{player.skill}
									</div>
									<div className="text-[8px] uppercase font-black text-ink-light tracking-tighter">SKILL</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
			{/* Bottom spacer for footer safety */}
			<div className="h-16 shrink-0 bg-white" />
		</div>
	);
}
