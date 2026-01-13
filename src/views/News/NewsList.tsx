import { useState, useEffect } from 'preact/hooks';
import { useGameStore } from '@/store/gameSlice';
import { NewsService } from '@/services/news-service';
import { NewsArticle } from '@/db/db';
import Card from '@/components/Common/Card';
import { Newspaper, Bell, Info, ArrowLeft, CheckCircle } from 'lucide-preact';
import { useTranslation } from 'react-i18next';

export default function NewsView() {
  const { t } = useTranslation();
  const currentSaveId = useGameStore(state => state.currentSaveId);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      if (!currentSaveId) return;
      const data = await NewsService.getAllNews(currentSaveId);
      setArticles(data);
      setIsLoading(false);
    };
    loadNews();
  }, [currentSaveId]);

  const handleRead = async (article: NewsArticle) => {
    setSelectedArticle(article);
    if (!article.isRead) {
      await NewsService.markAsRead(article.id!);
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, isRead: true } : a));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'PRESS': return <Newspaper className="text-blue-600" size={20} />;
      case 'CLUB': return <Info className="text-accent" size={20} />;
      default: return <Bell className="text-gray-500" size={20} />;
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  if (selectedArticle) {
    return (
      <div className="space-y-4 animate-fade-in">
        <button 
          onClick={() => setSelectedArticle(null)}
          className="flex items-center gap-2 text-ink-light hover:text-accent transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Retour aux dépêches</span>
        </button>

        <Card className="min-h-[60vh] flex flex-col">
          <div className="border-b border-gray-100 pb-4 mb-4">
             <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent bg-paper-dark px-2 py-1 rounded">
                  {selectedArticle.type}
                </span>
                <span className="text-xs text-ink-light font-mono">
                  {new Date(selectedArticle.date).toLocaleDateString()}
                </span>
             </div>
             <h2 className="text-2xl font-serif font-bold text-ink leading-tight">
               {selectedArticle.title}
             </h2>
          </div>
          
          <div className="flex-1 text-ink leading-relaxed font-serif text-lg whitespace-pre-wrap">
            {selectedArticle.content}
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 text-center">
             <p className="text-xs italic text-ink-light">— The Football Chronicle —</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
          <Newspaper />
          {t('dashboard.news')}
        </h2>
        <span className="text-xs text-ink-light italic">Archives de la presse</span>
      </div>

      {articles.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-ink-light italic">Aucune dépêche pour le moment.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map(article => (
            <div 
              key={article.id}
              onClick={() => handleRead(article)}
              className={`
                cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]
                relative bg-white border rounded-lg p-4 flex gap-4 items-center shadow-sm
                ${article.isRead ? 'border-gray-200 opacity-80' : 'border-accent border-l-4 shadow-md'}
              `}
            >
              <div className="shrink-0 p-2 bg-paper-dark rounded-full">
                {getIcon(article.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                   <h4 className={`text-sm truncate pr-2 ${article.isRead ? 'text-ink-light' : 'font-bold text-ink'}`}>
                     {article.title}
                   </h4>
                   {article.isRead && <CheckCircle size={14} className="text-green-600 shrink-0" />}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-ink-light uppercase">{article.type}</span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(article.date).toLocaleDateString()}
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
