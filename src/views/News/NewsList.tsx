import Card from "@/components/Common/Card";
import type { NewsArticle, Player } from "@/db/db";
import { db } from "@/db/db";
import { NewsService } from "@/services/news-service";
import { ClubService } from "@/services/club-service";
import { useGameStore } from "@/store/gameSlice";
import {
	ArrowLeft,
	Bell,
	Building2,
	CheckCheck,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Info,
	Newspaper,
	Shield,
	Target,
	Handshake,
	Mail,
	History
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import Button from "@/components/Common/Button";

import ClubDetails from "@/components/ClubDetails";
import PlayerCard from "@/components/PlayerCard";

interface NewsListProps {
	onNavigate?: (view: any) => void;
}

const VIEW_MAPPING: Record<string, string> = {
	"Tableau de Bord": "dashboard",
	Effectif: "squad",
	Club: "club",
	Marché: "transfers",
	Classement: "league",
	Entraînement: "training",
	Tactique: "squad",
};

export default function NewsView({ onNavigate }: NewsListProps) {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const refreshUnreadNewsCount = useGameStore(
		(state) => state.refreshUnreadNewsCount,
	);
	const [articles, setArticles] = useState<NewsArticle[]>([]);
	const [selectedArticleId, setSelectedArticleId] = useState<number | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(true);

	const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
	const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

	const loadNews = async () => {
		if (!currentSaveId) return;
		const data = await NewsService.getAllNews(currentSaveId);
		setArticles(data);
		setIsLoading(false);
	};

	useEffect(() => {
		loadNews();
	}, [currentSaveId]);

	const selectedArticle =
		articles.find((a) => a.id === selectedArticleId) || null;
	const selectedIndex = articles.findIndex((a) => a.id === selectedArticleId);

	const handleRead = async (article: NewsArticle) => {
		setSelectedArticleId(article.id!);
		if (!article.isRead) {
			await NewsService.markAsRead(article.id!);
			setArticles((prev) =>
				prev.map((a) => (a.id === article.id ? { ...a, isRead: true } : a)),
			);
			await refreshUnreadNewsCount();
		}
	};

	const handleMarkAllRead = async () => {
		const unreadIds = articles.filter((a) => !a.isRead).map((a) => a.id!);
		if (unreadIds.length === 0) return;

		await db.news.where("id").anyOf(unreadIds).modify({ isRead: true });

		setArticles((prev) => prev.map((a) => ({ ...a, isRead: true })));
		await refreshUnreadNewsCount();
	};

	const navigateNews = (direction: "newer" | "older") => {
		if (selectedIndex === -1) return;
		const newIndex =
			direction === "older" ? selectedIndex + 1 : selectedIndex - 1;
		if (newIndex >= 0 && newIndex < articles.length) {
			handleRead(articles[newIndex]);
		}
	};

	const handleAction = async (article: NewsArticle) => {
		if (!article.actionData || !userTeamId) return;

		if (article.actionData.type === "SIGN_SPONSOR") {
			const offer = article.actionData.offer;
			
			// Vérification du sponsor actuel
			const team = await db.teams.get(userTeamId);
			if (team?.sponsorName) {
				const confirmReplacement = window.confirm(
					`Nous sommes déjà engagés avec ${team.sponsorName}. Souhaitez-vous remplacer ce partenariat par celui de ${offer.name} ?`
				);
				if (!confirmReplacement) return;
			}

			await ClubService.signSponsor(userTeamId, offer);
			alert(`Félicitations ! Partenariat avec ${offer.name} signé.`);
			await db.news.update(article.id!, { actionData: null });
			await loadNews();
		}
	};

	const handleLinkClick = async (type: string, id: string, label: string) => {
		if (type === "view" && onNavigate) {
			onNavigate(id);
		} else if (type === "team") {
			setSelectedTeamId(Number.parseInt(id, 10));
		} else if (type === "player") {
			const player = await db.players.get(Number.parseInt(id, 10));
			if (player) setSelectedPlayer(player);
		}
	};

	const renderRichText = (text: string) => {
		const parts = text.split(/(\[\[.+?\]\]|\*\*.+?\*\*)/g);

		return parts.map((part, index) => {
			const linkMatch = part.match(/^\[\[(\w+):(.+?)\|(.+?)\]\]$/);
			if (linkMatch) {
				const [, type, id, label] = linkMatch;
				return (
					<span
						key={index}
						className="text-accent font-bold cursor-pointer hover:underline"
						onClick={(e) => {
							e.stopPropagation();
							handleLinkClick(type, id, label);
						}}
					>
						{label}
					</span>
				);
			}

			const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
			if (boldMatch) {
				const content = boldMatch[1];
				const viewKey = Object.keys(VIEW_MAPPING).find((key) =>
					content.includes(key),
				);

				if (viewKey && onNavigate) {
					return (
						<span
							key={index}
							className="text-accent font-bold cursor-pointer hover:underline"
							onClick={(e) => {
								e.stopPropagation();
								handleLinkClick("view", VIEW_MAPPING[viewKey], content);
							}}
						>
							{content}
						</span>
					);
				}

				return (
					<strong key={index} className="text-ink font-bold">
						{content}
					</strong>
				);
			}

			return part;
		});
	};

	const getIcon = (type: string) => {
		switch (type) {
			case "PRESS":
				return <Newspaper className="text-blue-700" size={18} />;
			case "CLUB":
				return <Info className="text-accent" size={18} />;
			case "BOARD":
				return <Target className="text-red-700" size={18} />;
			case "LEAGUE":
				return <Building2 className="text-amber-800" size={18} />;
			case "SPONSOR":
				return <Handshake className="text-green-700" size={18} />;
			default:
				return <Mail className="text-gray-500" size={18} />;
		}
	};

	if (isLoading)
		return (
			<div className="p-8 text-center animate-pulse">{t("game.loading")}</div>
		);

	if (selectedTeamId) {
		return (
			<ClubDetails
				teamId={selectedTeamId}
				onClose={() => setSelectedTeamId(null)}
			/>
		);
	}

	if (selectedPlayer) {
		return (
			<PlayerCard
				player={selectedPlayer}
				onClose={() => setSelectedPlayer(null)}
			/>
		);
	}

	if (selectedArticle) {
		const hasOlder = selectedIndex < articles.length - 1;
		const hasNewer = selectedIndex > 0;

		return (
			<div className="absolute inset-0 z-50 bg-paper flex flex-col animate-fade-in overflow-hidden pb-16">
				<div className="flex justify-between items-center p-4 border-b bg-paper-dark/50">
					<button
						onClick={() => setSelectedArticleId(null)}
						className="flex items-center gap-1 text-ink-light hover:text-ink transition-colors font-bold uppercase text-[10px] tracking-widest"
					>
						<ArrowLeft size={16} /> <span>Retour</span>
					</button>

					<div className="flex gap-4">
						<button
							onClick={() => navigateNews("older")}
							disabled={!hasOlder}
							className={`p-1 transition-all ${hasOlder ? "text-ink hover:text-accent" : "text-ink/10"}`}
						>
							<ChevronLeft size={24} />
						</button>
						<button
							onClick={() => navigateNews("newer")}
							disabled={!hasNewer}
							className={`p-1 transition-all ${hasNewer ? "text-ink hover:text-accent" : "text-ink/10"}`}
						>
							<ChevronRight size={24} />
						</button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-6 space-y-8 pb-20 max-w-2xl mx-auto w-full">
					<div className="space-y-4">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-paper-dark rounded-lg shadow-inner">
								{getIcon(selectedArticle.type)}
							</div>
							<div>
								<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
									{selectedArticle.type === "PRESS" ? "Gazette Sportive" : selectedArticle.type}
								</p>
								<p className="text-[10px] text-ink-light font-mono">
									Journal du Jour {selectedArticle.day} • {selectedArticle.date.toLocaleDateString()}
								</p>
							</div>
						</div>
						
						<h2 className="text-3xl font-serif font-bold text-ink leading-tight border-b-2 border-ink/5 pb-4">
							{renderRichText(selectedArticle.title)}
						</h2>
					</div>

					<div className="text-ink leading-relaxed font-serif text-xl space-y-4 first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:text-accent">
						{renderRichText(selectedArticle.content)}
					</div>

					{selectedArticle.actionData && (
						<div className="mt-12 p-6 bg-accent/5 rounded-xl border-2 border-accent/20 border-dashed">
							{selectedArticle.actionData.type === "SIGN_SPONSOR" && (
								<div className="space-y-4">
									<div className="text-center space-y-1">
										<p className="text-xs font-bold uppercase text-accent tracking-widest">Offre Contractuelle</p>
										<p className="text-sm italic text-ink-light">Voulez-vous ratifier cet accord de partenariat ?</p>
									</div>
									<Button 
										onClick={() => handleAction(selectedArticle)}
										className="w-full flex items-center justify-center gap-2 py-4 shadow-lg shadow-accent/20"
									>
										<Handshake size={20} />
										SIGNER LE CONTRAT
									</Button>
								</div>
							)}
						</div>
					)}

					<div className="pt-12 border-t border-ink/5 flex flex-col items-center opacity-30 pointer-events-none">
						<div className="w-12 h-0.5 bg-ink/20 mb-4" />
						<p className="text-[9px] uppercase tracking-[0.4em] font-bold text-ink">
							Manager 1863 News Service
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 animate-fade-in pb-24">
			<div className="flex items-center justify-between px-2 pt-2">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-accent rounded-lg text-paper shadow-lg">
						<Newspaper size={20} />
					</div>
					<h2 className="text-xl font-serif font-bold text-ink">
						Messagerie
					</h2>
				</div>
				<div className="flex items-center gap-2">
					{articles.some((a) => !a.isRead) && (
						<button
							onClick={handleMarkAllRead}
							className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-light hover:text-accent transition-colors border border-ink/10 rounded-full bg-paper-dark/50"
						>
							<CheckCheck size={14} />
							<span>Marquer tout lu</span>
						</button>
					)}
				</div>
			</div>

			{articles.length === 0 ? (
				<div className="text-center py-20 px-8 flex flex-col items-center gap-4 opacity-30">
					<Mail size={64} strokeWidth={1} />
					<p className="font-serif italic text-lg">
						Votre boîte de réception est vide.
					</p>
				</div>
			) : (
				<div className="space-y-1 border border-ink/5 rounded-2xl overflow-hidden bg-white shadow-sm">
					{articles.map((article) => (
						<div
							key={article.id}
							onClick={() => handleRead(article)}
							className={`
								group cursor-pointer transition-all border-b border-ink/5 last:border-0
								flex items-center gap-4 p-4
								${article.isRead ? "bg-paper-dark/20 opacity-70" : "bg-white hover:bg-paper-dark/40"}
							`}
						>
							<div className={`
								shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors
								${article.isRead ? "bg-ink/5 text-ink/40" : "bg-accent/10 text-accent"}
							`}>
								{getIcon(article.type)}
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex justify-between items-baseline mb-0.5">
									<h4 className={`text-sm truncate pr-2 ${article.isRead ? "text-ink-light font-normal" : "font-bold text-ink"}`}>
										{renderRichText(article.title)}
									</h4>
									<span className="text-[9px] font-mono text-ink-light shrink-0 opacity-60">
										Jour {article.day}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
										article.isRead ? "bg-ink/5 text-ink/30" : "bg-accent text-paper"
									}`}>
										{article.type}
									</span>
									<p className="text-[10px] text-ink-light truncate opacity-60">
										{article.content.replace(/\[\[.*?\]\]|\*\*.*?\*\*/g, "").substring(0, 60)}...
									</p>
								</div>
							</div>

							{!article.isRead && (
								<div className="w-2 h-2 bg-accent rounded-full shrink-0 shadow-[0_0_8px_rgba(var(--color-accent),0.5)]" />
							)}
							
							<ChevronRight size={16} className={`text-ink/10 group-hover:text-accent transition-colors ${article.isRead ? "" : "group-hover:translate-x-1"}`} />
						</div>
					))}
				</div>
			)}
			
			<div className="px-4 py-8 text-center opacity-20 flex flex-col items-center gap-2">
				<History size={24} />
				<p className="text-[9px] font-bold uppercase tracking-[0.3em]">Archives Archivées</p>
			</div>
		</div>
	);
}
