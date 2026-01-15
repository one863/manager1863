import type { NewsArticle, Player } from "@/db/db";
import { db } from "@/db/db";
import { NewsService } from "@/services/news-service";
import { ClubService } from "@/services/club-service";
import { useGameStore } from "@/store/gameSlice";
import {
	ArrowLeft,
	Building2,
	CheckCheck,
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

	const renderRichText = (text: string, isHeadline = false) => {
		const parts = text.split(/(\[\[.+?\]\]|\*\*.+?\*\*)/g);

		return parts.map((part, index) => {
			const linkMatch = part.match(/^\[\[(\w+):(.+?)\|(.+?)\]\]$/);
			if (linkMatch) {
				const [, type, id, label] = linkMatch;
				if (isHeadline) return <span key={index}>{label}</span>;

				return (
					<span
						key={index}
						className="text-accent font-bold cursor-pointer hover:underline"
						onClick={(e) => {
							e.stopPropagation();
							if (type === "view" && onNavigate) onNavigate(id);
						}}
					>
						{label}
					</span>
				);
			}

			const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
			if (boldMatch) {
				const content = boldMatch[1];
				if (isHeadline) return <span key={index}>{content}</span>;

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
								onNavigate(VIEW_MAPPING[viewKey]);
							}}
						>
							{content}
						</span>
					);
				}

				return <strong key={index} className="text-ink font-bold">{content}</strong>;
			}

			return part;
		});
	};

	const getIcon = (type: string) => {
		switch (type) {
			case "PRESS": return <Newspaper className="text-blue-700" size={18} />;
			case "CLUB": return <Info className="text-accent" size={18} />;
			case "BOARD": return <Target className="text-red-700" size={18} />;
			case "LEAGUE": return <Building2 className="text-amber-800" size={18} />;
			case "SPONSOR": return <Handshake className="text-green-700" size={18} />;
			default: return <Mail className="text-gray-500" size={18} />;
		}
	};

	if (isLoading)
		return (
			<div className="p-8 text-center animate-pulse">{t("game.loading")}</div>
		);

	if (selectedArticle) {
		const hasOlder = selectedIndex < articles.length - 1;
		const hasNewer = selectedIndex > 0;

		return (
			<div className="fixed inset-0 z-[200] bg-paper flex flex-col max-w-md mx-auto border-x border-paper-dark shadow-2xl overflow-hidden animate-fade-in">
				{/* HEADER INFO ONLY */}
				<div className="p-4 border-b bg-paper-dark/50 text-center">
					<div className="flex items-center justify-center gap-2">
						<div className="p-1 bg-white rounded shadow-sm">
							{getIcon(selectedArticle.type)}
						</div>
						<span className="text-[10px] font-black uppercase tracking-widest text-ink-light">
							{selectedArticle.type} • Jour {selectedArticle.day}
						</span>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 max-w-2xl mx-auto w-full">
					<div className="space-y-4 text-center">
						<h2 className="text-3xl font-serif font-bold text-ink leading-tight">
							{renderRichText(selectedArticle.title, true)}
						</h2>
						<p className="text-[10px] text-ink-light font-mono opacity-50 uppercase tracking-widest">
							Publié le {selectedArticle.date.toLocaleDateString()}
						</p>
					</div>

					<div className="text-ink leading-relaxed font-serif text-xl space-y-4">
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
				</div>

				{/* NAVIGATION BASSE CONSOLIDÉE */}
				<div className="p-4 bg-paper-dark border-t border-gray-200 flex gap-3 items-center pb-safe shrink-0">
					<button
						onClick={() => setSelectedArticleId(null)}
						className="p-3 bg-white text-ink rounded-2xl shadow-sm active:scale-95 border border-gray-100 hover:text-accent transition-colors"
						title="Retour à la liste"
					>
						<ArrowLeft size={24} />
					</button>

					<div className="flex-1 flex justify-between items-center bg-white rounded-2xl p-1 shadow-sm border border-gray-100 h-[56px]">
						<button
							onClick={() => navigateNews("older")}
							disabled={!hasOlder}
							className={`flex-1 flex items-center justify-center gap-1 h-full rounded-xl transition-all ${hasOlder ? "text-ink active:bg-gray-100" : "text-ink/10 cursor-not-allowed"}`}
						>
							<ChevronLeft size={24} />
							<span className="text-[9px] font-black uppercase tracking-tighter hidden xs:block">Préc.</span>
						</button>

						<div className="w-px h-6 bg-gray-100" />

						<div className="px-4 text-[11px] font-black text-ink-light whitespace-nowrap">
							{selectedIndex + 1} / {articles.length}
						</div>

						<div className="w-px h-6 bg-gray-100" />

						<button
							onClick={() => navigateNews("newer")}
							disabled={!hasNewer}
							className={`flex-1 flex items-center justify-center gap-1 h-full rounded-xl transition-all ${hasNewer ? "text-ink active:bg-gray-100" : "text-ink/10 cursor-not-allowed"}`}
						>
							<span className="text-[9px] font-black uppercase tracking-tighter hidden xs:block">Suiv.</span>
							<ChevronRight size={24} />
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="animate-fade-in space-y-4">
			<div className="flex justify-end px-2 pt-1">
				{articles.some((a) => !a.isRead) && (
					<button
						onClick={handleMarkAllRead}
						className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-ink-light hover:text-accent transition-colors border border-ink/5 rounded-full bg-paper-dark/30"
					>
						<CheckCheck size={14} />
						<span>Tout lire</span>
					</button>
				)}
			</div>

			{articles.length === 0 ? (
				<div className="text-center py-20 px-8 flex flex-col items-center gap-4 opacity-30">
					<Mail size={64} strokeWidth={1} />
					<p className="font-serif italic text-lg text-ink-light">
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
										{renderRichText(article.title, true)}
									</h4>
									<span className="text-[9px] font-mono text-ink-light shrink-0 opacity-60">
										Jour {article.day}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<p className="text-[10px] text-ink-light truncate opacity-60">
										{article.content.replace(/\[\[.*?\]\]|\*\*.*?\*\*/g, "").substring(0, 60)}...
									</p>
								</div>
							</div>

							{!article.isRead && (
								<div className="w-1.5 h-1.5 bg-accent rounded-full shrink-0 shadow-[0_0_8px_rgba(var(--color-accent),0.5)]" />
							)}
							
							<ChevronRight size={14} className="text-ink/10 group-hover:text-accent transition-colors shrink-0" />
						</div>
					))}
				</div>
			)}
			
			<div className="px-4 py-8 text-center opacity-20 flex flex-col items-center gap-2">
				<History size={20} />
				<p className="text-[8px] font-bold uppercase tracking-[0.3em]">Archives Archivées</p>
			</div>
		</div>
	);
}
