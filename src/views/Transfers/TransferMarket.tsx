import Button from "@/components/Common/Button";
import Card from "@/components/Common/Card";
import CreditAmount from "@/components/Common/CreditAmount";
import PlayerAvatar from "@/components/PlayerAvatar";
import PlayerCard from "@/components/PlayerCard";
import StaffCard from "@/components/StaffCard";
import { type Player, type Team, type StaffMember, db } from "@/db/db";
import { TransferService } from "@/services/transfer-service";
import { useGameStore } from "@/store/gameSlice";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertCircle, ShoppingCart, UserPlus, Users, Briefcase } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";

export default function TransferMarket() {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);

	const [activeTab, setActiveTab] = useState<"players" | "staff">("players");
	const [marketPlayers, setMarketPlayers] = useState<Player[]>([]);
	const [marketStaff, setMarketStaff] = useState<StaffMember[]>([]);
	const [userTeam, setUserTeam] = useState<Team | null>(null);
	const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
	const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
	const [itemToBuy, setItemToBuy] = useState<{ type: "player" | "staff"; item: any } | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [message, setMessage] = useState<{
		text: string;
		type: "success" | "error";
	} | null>(null);

	const parentRef = useRef<HTMLDivElement>(null);

	const loadData = async () => {
		if (!currentSaveId || !userTeamId) return;
		setIsLoading(true);

		try {
			const team = await db.teams.get(userTeamId);
			setUserTeam(team || null);

			if (team) {
				await TransferService.refreshMarketForReputation(
					currentSaveId,
					team.reputation,
				);
			}

			const [players, staff] = await Promise.all([
				db.players
					.where("[saveId+teamId]")
					.equals([currentSaveId, -1])
					.toArray(),
				db.staff
					.where("[saveId+teamId]")
					.equals([currentSaveId, -1])
					.toArray(),
			]);

			players.sort((a, b) => b.skill - a.skill);
			staff.sort((a, b) => b.skill - a.skill);

			setMarketPlayers(players);
			setMarketStaff(staff);
		} catch (e) {
			console.error("Erreur chargement marché", e);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, [currentSaveId, userTeamId]);

	const rowVirtualizer = useVirtualizer({
		count: activeTab === "players" ? marketPlayers.length : marketStaff.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 100,
		overscan: 5,
	});

	const handleBuy = async () => {
		if (!userTeamId || !userTeam || !itemToBuy) return;

		try {
			if (itemToBuy.type === "player") {
				await TransferService.buyPlayer(itemToBuy.item.id!, userTeamId);
				setMessage({ text: `${itemToBuy.item.lastName} a rejoint votre club !`, type: "success" });
			} else {
				await TransferService.hireStaff(itemToBuy.item.id!, userTeamId);
				setMessage({ text: `${itemToBuy.item.name} a rejoint votre staff !`, type: "success" });
			}
			setItemToBuy(null);
			await loadData();
		} catch (err: any) {
			setMessage({ text: err.message, type: "error" });
			setItemToBuy(null);
		}
		setTimeout(() => setMessage(null), 3000);
	};

	if (isLoading)
		return (
			<div className="p-8 text-center animate-pulse">{t("game.loading")}</div>
		);

	return (
		<div className="flex flex-col h-full animate-fade-in relative">
			{/* HEADER */}
			<div className="flex justify-between items-center px-2 mb-4 shrink-0">
				<div className="flex flex-col">
					<h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
						<ShoppingCart /> Marché
					</h2>
					<span className="text-[10px] text-ink-light uppercase font-bold tracking-widest">
						Réputation {userTeam?.reputation || 0}
					</span>
				</div>
				<div className="bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
					<CreditAmount amount={userTeam?.budget || 0} size="md" />
				</div>
			</div>

			{/* TABS */}
			<div className="px-2 mb-4">
				<div className="flex bg-paper-dark rounded-xl p-1 border border-gray-200 shadow-inner">
					<button
						onClick={() => setActiveTab("players")}
						className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "players" ? "bg-white text-accent shadow-sm" : "text-ink-light"}`}
					>
						<Users size={16} /> Joueurs
					</button>
					<button
						onClick={() => setActiveTab("staff")}
						className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "staff" ? "bg-white text-accent shadow-sm" : "text-ink-light"}`}
					>
						<Briefcase size={16} /> Staff
					</button>
				</div>
			</div>

			{message && (
				<div
					className={`mx-2 mb-4 p-3 rounded-lg text-xs font-bold text-center animate-fade-in shrink-0 ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
				>
					{message.text}
				</div>
			)}

			{/* CONTENT */}
			<div
				ref={parentRef}
				className="flex-1 overflow-y-auto px-2"
			>
				{(activeTab === "players" ? marketPlayers.length : marketStaff.length) === 0 ? (
					<div className="text-center p-8 text-ink-light italic text-sm">
						Aucune opportunité disponible avec votre réputation actuelle.
					</div>
				) : (
					<div
						style={{
							height: `${rowVirtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative",
						}}
					>
						{rowVirtualizer.getVirtualItems().map((virtualRow) => {
							if (activeTab === "players") {
								const player = marketPlayers[virtualRow.index];
								return (
									<div
										key={player.id}
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											height: `${virtualRow.size}px`,
											transform: `translateY(${virtualRow.start}px)`,
											paddingBottom: "0.5rem",
										}}
									>
										<Card noPadding className="hover:border-accent transition-colors h-full">
											<div className="flex items-center p-3 gap-3 h-full">
												<PlayerAvatar
													dna={player.dna}
													size={44}
													className="shrink-0 cursor-pointer"
													onClick={() => setSelectedPlayer(player)}
												/>
												<div className="flex-1 min-w-0" onClick={() => setSelectedPlayer(player)}>
													<div className="font-bold text-ink truncate text-sm">{player.lastName}</div>
													<div className="flex items-center gap-2 text-[9px] text-ink-light uppercase font-bold">
														<span className="bg-paper-dark px-1 rounded">{player.position}</span>
														<span>{player.age} ans</span>
														<span className="text-accent">GEN {player.skill}</span>
													</div>
												</div>
												<div className="text-right shrink-0 flex flex-col items-end gap-1">
													<CreditAmount amount={player.marketValue} size="sm" color="text-ink" />
													<button
														onClick={() => setItemToBuy({ type: "player", item: player })}
														className="bg-accent text-white p-2 rounded-lg shadow-sm active:scale-90 transition-transform"
														disabled={!!userTeam && userTeam.budget < player.marketValue}
													>
														<UserPlus size={16} />
													</button>
												</div>
											</div>
										</Card>
									</div>
								);
							} else {
								const staff = marketStaff[virtualRow.index];
								const hireCost = staff.skill * 2;
								return (
									<div
										key={staff.id}
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											height: `${virtualRow.size}px`,
											transform: `translateY(${virtualRow.start}px)`,
											paddingBottom: "0.5rem",
										}}
									>
										<Card noPadding className="hover:border-accent transition-colors h-full">
											<div className="flex items-center p-3 gap-3 h-full">
												<PlayerAvatar 
													dna={`0-0-${staff.skill % 5}-0`} 
													isStaff 
													size={44} 
													className="shrink-0 cursor-pointer" 
													onClick={() => setSelectedStaff(staff)}
												/>
												<div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedStaff(staff)}>
													<div className="font-bold text-ink truncate text-sm">{staff.name}</div>
													<div className="text-[9px] text-ink-light uppercase font-black">
														{staff.role.replace("_", " ")} • SKILL {staff.skill}
													</div>
												</div>
												<div className="text-right shrink-0 flex flex-col items-end gap-1">
													<div className="text-[10px] font-bold text-accent uppercase tracking-tighter">Prime: M {hireCost}</div>
													<button
														onClick={() => setItemToBuy({ type: "staff", item: staff })}
														className="bg-accent text-white p-2 rounded-lg shadow-sm active:scale-90 transition-transform"
														disabled={!!userTeam && userTeam.budget < hireCost}
													>
														<UserPlus size={16} />
													</button>
												</div>
											</div>
										</Card>
									</div>
								);
							}
						})}
					</div>
				)}
			</div>

			{/* MODAL CONFIRMATION */}
			{itemToBuy && (
				<div className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
					<div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border-2 border-accent text-center">
						<div className="p-3 bg-accent/10 rounded-full text-accent inline-block mb-4">
							<ShoppingCart size={32} />
						</div>
						<h3 className="font-serif font-bold text-xl text-ink">Recrutement</h3>
						<p className="text-sm text-ink-light mt-2 leading-relaxed">
							Voulez-vous engager <span className="font-bold text-ink">{itemToBuy.type === "player" ? itemToBuy.item.lastName : itemToBuy.item.name}</span> ?
							<br />
							Coût total : <span className="font-bold text-accent">M {itemToBuy.type === "player" ? itemToBuy.item.marketValue : itemToBuy.item.skill * 2}</span>
						</p>
						<div className="flex gap-3 w-full pt-6">
							<button onClick={() => setItemToBuy(null)} className="flex-1 py-3 bg-paper-dark rounded-xl font-bold text-xs uppercase tracking-widest text-ink-light">Annuler</button>
							<button onClick={handleBuy} className="flex-1 py-3 bg-accent text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg">Confirmer</button>
						</div>
					</div>
				</div>
			)}

			{selectedPlayer && (
				<PlayerCard
					player={selectedPlayer}
					onClose={() => setSelectedPlayer(null)}
				/>
			)}

			{selectedStaff && (
				<StaffCard
					staff={selectedStaff}
					onClose={() => setSelectedStaff(null)}
				/>
			)}
		</div>
	);
}
