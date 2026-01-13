import { useState, useEffect } from 'preact/hooks';
import { useGameStore } from '@/store/gameSlice';
import { NewsService } from '@/services/news-service';
import { NewsArticle, Player } from '@/db/db'; // Import Player
import { db } from '@/db/db'; // Import db
import Card from '@/components/Common/Card';
import { Newspaper, Bell, Info, ArrowLeft, CheckCircle, Target, Building2, ChevronLeft, ChevronRight, Shield } from 'lucide-preact';
import { useTranslation } from 'react-i18next';

// Import des composants pour les modales
import ClubDetails from '@/components/ClubDetails';
import PlayerCard from '@/components/PlayerCard';

interface NewsListProps {
  onNavigate?: (view: any) => void;
}

const VIEW_MAPPING: Record<string, string> = {
  'Tableau de Bord': 'dashboard',
  'Effectif': 'squad',
  'Club': 'club',
  'Marché': 'transfers',
  'Classement': 'league',
  'Entraînement': 'training',
  'Tactique': 'squad'
};

export default function NewsView({ onNavigate }: NewsListProps) {
  const { t } = useTranslation();
  const currentSaveId = useGameStore((state) => state.currentSaveId);
  const refreshUnreadNewsCount = useGameStore((state) => state.refreshUnreadNewsCount);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // États pour les modales
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const loadNews = async () => {
      if (!currentSaveId) return;
      const data = await NewsService.getAllNews(currentSaveId);
      setArticles(data);
      setIsLoading(false);
    };
    loadNews();
  }, [currentSaveId]);

  const selectedArticle = articles.find(a => a.id === selectedArticleId) || null;
  const selectedIndex = articles.findIndex(a => a.id === selectedArticleId);

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

  const navigateNews = (direction: 'newer' | 'older') => {
    if (selectedIndex === -1) return;
    const newIndex = direction === 'older' ? selectedIndex + 1 : selectedIndex - 1;
    if (newIndex >= 0 && newIndex < articles.length) {
      handleRead(articles[newIndex]);
    }
  };

  const handleLinkClick = async (type: string, id: string, label: string) => {
    if (type === 'view' && onNavigate) {
      onNavigate(id);
    } else if (type === 'team') {
      setSelectedTeamId(parseInt(id, 10));
    } else if (type === 'player') {
      const player = await db.players.get(parseInt(id, 10));
      if (player) setSelectedPlayer(player);
    }
  };

  const renderRichText = (text: string) => {
    // 1. Gérer les liens explicites [[type:id|Label]]
    // 2. Gérer le gras Markdown **Texte** -> Si "Texte" est une vue, on en fait un lien

    const parts = text.split(/(\[\[.+?\]\]|\*\*.+?\*\*)/g);

    return parts.map((part, index) => {
      // Lien interne [[type:id|Label]]
      const linkMatch = part.match(/^\[\[(\w+):(.+?)\|(.+?)\]\]$/);
      if (linkMatch) {
        const [, type, id, label] = linkMatch;
        return (
          <span 
            key={index} 
            className="text-accent font-bold cursor-pointer hover:underline"
            onClick={(e) => { e.stopPropagation(); handleLinkClick(type, id, label); }}
          >
            {label}
          </span>
        );
      }

      // Gras Markdown **Texte**
      const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
      if (boldMatch) {
        const content = boldMatch[1];
        // Vérifier si c'est un lien de navigation connu
        const viewKey = Object.keys(VIEW_MAPPING).find(key => content.includes(key));
        
        if (viewKey && onNavigate) {
           return (
            <span 
              key={index} 
              className="text-accent font-bold cursor-pointer hover:underline"
              onClick={(e) => { e.stopPropagation(); handleLinkClick('view', VIEW_MAPPING[viewKey], content); }}
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
      case 'PRESS': return <Newspaper className="text-blue-600" size={20} />;
      case 'CLUB': return <Info className="text-accent" size={20} />;
      case 'BOARD': return <Target className="text-red-600" size={20} />;
      case 'LEAGUE': return <Building2 className="text-amber-700" size={20} />;
      default: return <Bell className="text-gray-500" size={20} />;
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  if (selectedArticle) {
    const hasOlder = selectedIndex < articles.length - 1;
    const hasNewer = selectedIndex > 0;

    return (
      <div className="space-y-4 animate-fade-in pb-24">
        {/* Modales */}
        {selectedTeamId && <ClubDetails teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />}
        {selectedPlayer && <PlayerCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}

        <div className="flex justify-between items-center px-1">
          <button onClick={() => setSelectedArticleId(null)} className="flex items-center gap-1 text-ink-light hover:text-accent transition-colors py-2 text-sm">
            <ArrowLeft size={16} /> <span>Retour</span>
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => navigateNews('older')} 
              disabled={!hasOlder}
              className={`p-2 rounded-full border transition-all ${hasOlder ? 'bg-white text-ink hover:border-accent shadow-sm' : 'bg-gray-50 text-gray-300 border-gray-100'}`}
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => navigateNews('newer')} 
              disabled={!hasNewer}
              className={`p-2 rounded-full border transition-all ${hasNewer ? 'bg-white text-ink hover:border-accent shadow-sm' : 'bg-gray-50 text-gray-300 border-gray-100'}`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <Card className="min-h-[50vh] flex flex-col shadow-xl border-accent/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="border-b border-gray-100 pb-4 mb-6 relative z-10">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-accent bg-accent/5 border border-accent/20 px-2 py-0.5 rounded-full">
                {selectedArticle.type}
              </span>
              <span className="text-[10px] text-ink-light font-mono bg-paper-dark px-2 py-0.5 rounded flex items-center gap-1">
                <Shield size={10} /> Jour {selectedArticle.day}
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-ink leading-tight">
              {selectedArticle.title}
            </h2>
          </div>

          <div className="flex-1 text-ink leading-relaxed font-serif text-lg whitespace-pre-wrap italic relative z-10 px-2">
            {renderRichText(selectedArticle.content)}
          </div>

          <div className="mt-12 pt-6 border-t border-gray-100 text-center relative z-10">
            <p className="text-[10px] tracking-[0.2em] uppercase text-ink-light font-bold mb-1">Gazette Officielle</p>
            <p className="text-xs italic text-ink-light opacity-60">— The Football Chronicle 1863 —</p>
          </div>
        </Card>

        <div className="flex justify-between text-[10px] text-ink-light uppercase tracking-tighter px-2 font-bold opacity-50">
          <span>{hasOlder ? 'Archives' : ''}</span>
          <span className="text-center italic">{selectedIndex + 1} / {articles.length}</span>
          <span>{hasNewer ? 'Plus récent' : ''}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-24">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
          <Newspaper className="text-accent" /> {t('dashboard.news')}
        </h2>
        <span className="text-xs text-ink-light italic">Archives du club</span>
      </div>

      {articles.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-ink-light italic">Aucune dépêche pour le moment.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => handleRead(article)}
              className={`
                cursor-pointer transition-all hover:translate-x-1 active:scale-[0.98]
                relative bg-white border rounded-xl p-4 flex gap-4 items-center shadow-sm
                ${article.isRead ? 'border-gray-100 opacity-60' : 'border-accent border-l-4 shadow-md bg-white'}
              `}
            >
              <div className="shrink-0 p-2 bg-paper-dark rounded-full">
                {getIcon(article.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className={`text-sm truncate pr-2 ${article.isRead ? 'text-ink-light font-normal' : 'font-bold text-ink'}`}>
                    {article.title}
                  </h4>
                  {article.isRead && <CheckCircle size={14} className="text-green-600 shrink-0" />}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-accent font-bold uppercase tracking-tighter">
                    {article.type}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                    <Shield size={10} /> Jour {article.day}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
