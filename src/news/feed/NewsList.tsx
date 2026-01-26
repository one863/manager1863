import type { NewsArticle, Player } from "@/core/db/db";
import { db } from "@/core/db/db";
import { NewsService } from "@/news/service/news-service";
import { ClubService } from "@/club/club-service";
import { useGameStore } from "@/infrastructure/store/gameSlice";
import {
	Building2,
	CheckCheck,
	ChevronLeft,
	ChevronRight,
	Info,
	Newspaper,
	Target,
	Handshake,
	Mail,
	History,
    TrendingUp,
    TrendingDown,
    CircleDollarSign
} from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import Button from "@/ui/components/Common/Button";
import DetailViewLayout from "@/ui/components/Common/DetailViewLayout";

interface NewsListProps {
	onNavigate?: (view: any) => void;
	onSelectPlayer?: (p: Player) => void;
    onSelectTeam?: (id: number) => void;
    onClose?: () => void;
    selectedArticleIdFromProps?: number | null;
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

export default function NewsView({ onNavigate, onSelectPlayer, onSelectTeam, onClose, selectedArticleIdFromProps }: NewsListProps) {
	const { t } = useTranslation();
	const currentSaveId = useGameStore((state) => state.currentSaveId);
	const day = useGameStore((state) => state.day);
	const userTeamId = useGameStore((state) => state.userTeamId);
	const refreshUnreadNewsCount = useGameStore(
		(state) => state.refreshUnreadNewsCount,
	);
	const [articles, setArticles] = useState<NewsArticle[]>([]);
	const [selectedArticleId, setSelectedArticleId] = useState<number | null>(
		selectedArticleIdFromProps || null
	);
	const [isLoading, setIsLoading] = useState(true);

	const loadNews = async () => {
		if (!currentSaveId) return;
		const data = await NewsService.getAllNews(currentSaveId, day);
		setArticles(data);
		setIsLoading(false);
	};

	useEffect(() => {
		loadNews();
	}, [currentSaveId, day]);

    useEffect(() => {
        if (selectedArticleIdFromProps) {
            setSelectedArticleId(selectedArticleIdFromProps);
        }
    }, [selectedArticleIdFromProps]);

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

	const handleLinkClick = async (type: string, id: string, label: string) => {
		if (type === "view" && onNavigate) {
			onNavigate(id);
		} else if (type === "player" && onSelectPlayer) {
			const player = await db.players.get(parseInt(id));
			if (player) onSelectPlayer(player);
		} else if (type === "team" && onSelectTeam) {
            onSelectTeam(parseInt(id));
        }
	};

	const renderRichText = (text: string, isHeadline = false) => {
		const parts = text.split(/(\[\[.+?\]\]|\*\*.+?\*\*)/g);

		return parts.map((part, index) => {
            // Match for [[type:id|label]] or [[badge:variant|label]]
			const linkMatch = part.match(/^\[\[(\w+):(.+?)\|(.+?)\]\]$/);
            const badgeMatch = part.match(/^\[\[badge:(\w+)\|(.+?)\]\]$/);

            if (badgeMatch) {
                const [, variant, label] = badgeMatch;
                if (isHeadline) return <span key={index}>{label}</span>;
                
                let badgeClass = "bg-gray-600 text-white";
                let Icon = Info;

                if (variant === 'positive') {
                    badgeClass = "bg-green-600 text-white";
                    Icon = TrendingUp;
                } else if (variant === 'negative') {
                    badgeClass = "bg-red-600 text-white";
                    Icon = TrendingDown;
                } else if (variant === 'budget') {
                    badgeClass = "bg-amber-500 text-white";
                    Icon = CircleDollarSign;
                }

                return (
                    <span 
                        key={index}
                        style={{ fontFamily: "'Product Sans', sans-serif" }}
                        className={`
                            inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-bold text-xs leading-none whitespace-nowrap shadow-md my-1 mr-1
                            ${badgeClass}
                        `}
                    >
                        <Icon size={14} strokeWidth={3} />
                        {label}
                    </span>
                );
            }

			if (linkMatch) {
				const [, type, id, label] = linkMatch;
				if (isHeadline) return <span key={index}>{label}</span>;

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
			<div className="flex-1 flex flex-col h-full bg-white overflow-hidden animate-slide-up">
                <DetailViewLayout
                    title={renderRichText(selectedArticle.title, true)}
                    subtitle={
                        <div className="text-[10px] text-ink-light font-mono">
                            Jour {selectedArticle.day}
                        </div>
                    }
                    icon={
                        <div className="w-10 h-10 bg-paper-dark rounded-xl flex items-center justify-center border-2 border-accent/10 shadow-sm">
                            {selectedArticle?.type && getIcon(selectedArticle.type)}
                        </div>
                    }
                    headerRight={
                        <div className="text-lg font-mono font-black text-ink">{selectedIndex + 1}/{articles.length}</div>
                    }
                    onClose={() => {
                        if (onClose) onClose();
                        else setSelectedArticleId(null);
                    }}
                    footer={
                        <div className="p-4 bg-paper-dark border-t border-gray-200 flex gap-3 items-center">
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
                    }
                >
                    <div className="p-6 space-y-6">
                        <div className="w-12 h-1 bg-accent/20 rounded-full" />
                        <div className="text-ink leading-relaxed font-sans text-lg space-y-4">
                            {renderRichText(selectedArticle.content)}
                        </div>

                        {selectedArticle.actionData && (
                            <div className="mt-8 p-6 bg-paper-dark rounded-2xl border border-gray-100 shadow-inner">
                                {selectedArticle.actionData.type === "SIGN_SPONSOR" && (
                                    <div className="space-y-4 text-center">
                                        <p className="text-xs font-bold uppercase text-accent tracking-widest">Offre Contractuelle</p>
                                        <p className="text-sm italic text-ink-light">Voulez-vous ratifier cet accord de partenariat ?</p>
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
                </DetailViewLayout>
			</div>
		);
	}

	return (
		<div className="animate-fade-in space-y-4 p-4">
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
					<p className="font-sans italic text-lg text-ink-light">
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
								{article?.type && getIcon(article.type)}
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
									<p className={`text-xs text-ink-light truncate opacity-80 ${article.isRead ? "font-normal" : "font-medium"}`}>
										{article.content.replace(/\[\[.*?\]\]|\*\*.*?\*\*/g, "").substring(0, 70)}...
									</p>
								</div>
							</div>

							{!article.isRead && (
								<div className="w-2 h-2 bg-red-600 rounded-full shrink-0 shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
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
