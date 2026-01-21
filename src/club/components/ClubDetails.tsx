import { db, type Team, type Player, type StaffMember } from "@/core/db/db";
import { ArrowLeft, MapPin, Trophy, Users, Wallet, ArrowUpDown, History } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import PlayerAvatar from "@/squad/components/PlayerAvatar";
import { TeamCrest, getTeamColors } from "@/ui/components/Common/TeamCrest";
import CareerHistoryView from "@/ui/components/Common/CareerHistoryView";

interface ClubDetailsProps {
	teamId: number;
	onClose: () => void;
	onSelectPlayer?: (player: Player) => void;
}

export default function ClubDetails({ teamId, onClose, onSelectPlayer }: ClubDetailsProps) {
	const { t } = useTranslation();
	const [team, setTeam] = useState<Team | null>(null);
	const [players, setPlayers] = useState<Player[]>([]);
	const [coach, setCoach] = useState<StaffMember | null>(null);
	const [activeTab, setActiveTab] = useState<"info" | "squad" | "history">("info");

	useEffect(() => {
		const loadData = async () => {
			if (!teamId) return;
			const t = await db.teams.get(teamId);
			setTeam(t || null);

			const p = await db.players.where("teamId").equals(teamId).toArray();
			setPlayers(p.sort((a, b) => b.skill - a.skill));

			const staff = await db.staff
				.where("teamId")
				.equals(teamId)
				.and((s) => s.role === "COACH")
				.first();
			setCoach(staff || null);
		};
		loadData();
	}, [teamId]);

	if (!team) return null;

	const { primary, secondary } = getTeamColors(team);
    // @ts-ignore
    const logoType = team.logoType;

	return (
		<div className="flex flex-col h-full bg-white animate-fade-in">
			{/* HEADER - Reordered Logo & Name to top */}
			<div className="bg-white p-4 pt-6 sticky top-0 z-10 border-b border-gray-100">
				<div className="flex items-start justify-between mb-4">
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-ink hover:bg-gray-100 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    
                    <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm shrink-0">
						<TeamCrest primary={primary} secondary={secondary} name={team.name} type={logoType} />
					</div>
                </div>

				<div className="min-w-0 text-center">
                    <h2 className="text-3xl font-black italic tracking-tighter text-ink truncate leading-none">
                        {team.name}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-ink-light uppercase tracking-tight">
                            <MapPin size={12} className="text-accent" /> 
                            {team.stadiumName}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-ink-light uppercase tracking-tight">
                            <Users size={12} className="text-accent" /> 
                            {team.stadiumCapacity.toLocaleString()}
                        </div>
                    </div>
                </div>
			</div>

			{/* TABS */}
			<div className="flex bg-white px-2">
				<button 
					onClick={() => setActiveTab("info")}
					className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === "info" ? "text-accent border-b-2 border-accent" : "text-gray-600 hover:text-ink"}`}
				>
					Infos
				</button>
				<button 
					onClick={() => setActiveTab("squad")}
					className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === "squad" ? "text-accent border-b-2 border-accent" : "text-gray-600 hover:text-ink"}`}
				>
					Effectif
				</button>
                <button 
					onClick={() => setActiveTab("history")}
					className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === "history" ? "text-accent border-b-2 border-accent" : "text-gray-600 hover:text-ink"}`}
				>
					Histoire
				</button>
			</div>

			{/* CONTENT */}
			<div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
				{activeTab === "squad" ? (
					<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 p-3 bg-gray-50 border-b border-gray-100 text-[9px] font-black uppercase text-gray-400">
                            <div className="w-10 text-center">Pos</div>
                            <div>Nom</div>
                            <div className="w-8 text-center">Age</div>
                            <div className="w-8 text-center">Niv</div>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {players.map((player) => (
                                <div 
                                    key={player.id} 
                                    onClick={() => onSelectPlayer && onSelectPlayer(player)}
                                    className="grid grid-cols-[auto_1fr_auto_auto] gap-2 p-3 items-center hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <div className="w-10 flex justify-center">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${
                                            player.position === "GK" ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                                            player.position === "DEF" ? "bg-blue-50 text-blue-700 border-blue-100" :
                                            player.position === "MID" ? "bg-green-50 text-green-700 border-green-100" :
                                            "bg-red-50 text-red-700 border-red-100"
                                        }`}>
                                            {player.position}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <PlayerAvatar dna={player.dna} size={32} />
                                        <div className="truncate">
                                            <p className="font-bold text-ink text-sm truncate">{player.lastName}</p>
                                            <p className="text-[9px] text-gray-400 truncate">{player.firstName}</p>
                                        </div>
                                    </div>
                                    <div className="w-8 text-center text-xs font-mono text-gray-500">
                                        {player.age}
                                    </div>
                                    <div className="w-8 text-center">
                                        <span className={`font-black font-mono text-sm ${
                                            player.skill >= 16 ? "text-amber-500" : 
                                            player.skill >= 12 ? "text-green-600" : "text-gray-400"
                                        }`}>
                                            {Math.floor(player.skill)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
				) : activeTab === "history" ? (
                    <CareerHistoryView teamId={teamId} />
                ) : (
					<div className="space-y-4">
						<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
							<h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Direction Sportive</h3>
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border border-gray-100">
                                    {coach ? (
                                        <PlayerAvatar dna={coach.dna} size={48} isStaff />
                                    ) : (
                                        <Users size={20} className="text-accent" />
                                    )}
								</div>
								<div>
									<p className="font-bold text-ink text-base">
                                        {coach ? `${coach.firstName} ${coach.lastName}` : "Poste Vacant"}
                                    </p>
									<p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Entraîneur Principal</p>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
								<span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] block mb-2">Budget</span>
								<div className="flex items-center gap-2">
									<div className="p-1.5 bg-green-50 rounded-lg">
										<Wallet size={16} className="text-green-600" />
									</div>
									<p className="text-xl font-black text-ink">
										{team.budget > 1000 ? `${(team.budget / 1000).toFixed(1)}M` : `${team.budget}k`}
									</p>
								</div>
							</div>
							<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
								<span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] block mb-2">Réputation</span>
								<div className="flex items-center gap-2">
									<div className="p-1.5 bg-amber-50 rounded-lg">
										<Trophy size={16} className="text-amber-500" />
									</div>
									<p className="text-xl font-black text-ink">
										{team.reputation}
									</p>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
