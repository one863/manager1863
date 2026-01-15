import CreditAmount from "@/components/Common/CreditAmount";
import { type Player, type Team, type StaffMember, db } from "@/db/db";
import { TransferService } from "@/services/transfer-service";
import { useGameStore } from "@/store/gameSlice";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ShoppingCart, UserPlus } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { SubTabs } from "@/components/Common/SubTabs";
import { PlayerRow, StaffRow } from "@/views/Squad";

export default function TransferMarket({ 
	onSelectPlayer, 
	onSelectStaff 
}: { 
	onSelectPlayer: (p: Player) => void, 
	onSelectStaff: (s: StaffMember) => void 
}) {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);

	const [activeTab, setActiveTab] = useState<"players" | "staff">("players");
	const [marketPlayers, setMarketPlayers] = useState<Player[]>([]);
	const [marketStaff, setMarketStaff] = useState<StaffMember[]>([]);
	const [userTeam, setUserTeam] = useState<Team | null>(null);
	const [itemToBuy, setItemToBuy] = useState<{ type: "player" | "staff"; item: any } | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [message, setMessage] = useState<{
		text: string;
		type: "success" | "error";
	} | null>(null);

	const parentRef = useRef<HTMLDivElement>(null);

	const tabs = [
		{ id: "players", label: t("market.players", "Joueurs") },
		{ id: "staff", label: t("market.staff", "Staff") },
	];

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
		estimateSize: () => 85,
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

	const getHireCost = (skill: number) => Math.round(skill * 10);

	return (
		<div className="animate-fade-in relative flex flex-col h-full overflow-hidden">
			<SubTabs
				tabs={tabs}
				activeTab={activeTab}
				onChange={(id) => setActiveTab(id as any)}
			/>

			{/* HEADER INFOS */}
			<div className="flex justify-between items-center px-4 mb-4 shrink-0">
				<div className="flex flex-col">
					<span className="text-[10px] text-ink-light uppercase font-bold tracking-widest">
						Réputation {userTeam?.reputation || 0}
					</span>
				</div>
				<div className="bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
					<CreditAmount amount={userTeam?.budget || 0} size="md" />
				</div>
			</div>

			{message && (
				<div
					className={`mx-4 mb-4 p-3 rounded-lg text-xs font-bold text-center animate-fade-in shrink-0 ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
				>
					{message.text}
				</div>
			)}

			{/* CONTENT */}
			<div
				ref={parentRef}
				className="flex-1 overflow-y-auto px-4 pb-24"
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
										}}
										className="border border-gray-100 rounded-xl overflow-hidden mb-2 shadow-sm"
									>
										<PlayerRow 
											player={player} 
											onSelect={onSelectPlayer}
											action={
												<button
													onClick={(e) => { e.stopPropagation(); setItemToBuy({ type: "player", item: player }); }}
													className="bg-accent text-white p-2 rounded-lg shadow-sm active:scale-90 transition-transform disabled:opacity-30"
													disabled={!!userTeam && userTeam.budget < player.marketValue}
												>
													<UserPlus size={16} />
												</button>
											}
										/>
									</div>
								);
							} else {
								const staff = marketStaff[virtualRow.index];
								const hireCost = getHireCost(staff.skill);
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
										}}
										className="border border-gray-100 rounded-xl overflow-hidden mb-2 shadow-sm"
									>
										<StaffRow 
											staff={staff} 
											onSelect={onSelectStaff}
											action={
												<button
													onClick={(e) => { e.stopPropagation(); setItemToBuy({ type: "staff", item: staff }); }}
													className="bg-accent text-white p-2 rounded-lg shadow-sm active:scale-90 transition-transform disabled:opacity-30"
													disabled={!!userTeam && userTeam.budget < hireCost}
												>
													<UserPlus size={16} />
												</button>
											}
										/>
									</div>
								);
							}
						})}
					</div>
				)}
			</div>

			{/* MODAL CONFIRMATION */}
			{itemToBuy && (
				<div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
					<div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border-2 border-accent text-center">
						<div className="p-3 bg-accent/10 rounded-full text-accent inline-block mb-4">
							<ShoppingCart size={32} />
						</div>
						<h3 className="font-serif font-bold text-xl text-ink">Recrutement</h3>
						<p className="text-sm text-ink-light mt-2 leading-relaxed">
							Voulez-vous engager <span className="font-bold text-ink">{itemToBuy.type === "player" ? itemToBuy.item.lastName : itemToBuy.item.name}</span> ?
							<br />
							Prime de signature : <span className="font-bold text-accent">M {itemToBuy.type === "player" ? itemToBuy.item.marketValue : getHireCost(itemToBuy.item.skill)}</span>
							<br />
							Salaire hebdo : <span className="font-bold text-accent">M {itemToBuy.item.wage}</span>
						</p>
						<div className="flex gap-3 w-full pt-6">
							<button onClick={() => setItemToBuy(null)} className="flex-1 py-3 bg-paper-dark rounded-xl font-bold text-xs uppercase tracking-widest text-ink-light">Annuler</button>
							<button onClick={handleBuy} className="flex-1 py-3 bg-accent text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg">Confirmer</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
