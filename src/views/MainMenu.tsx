import { useTranslation } from 'react-i18next';
import Button from '@/components/Common/Button';

export default function MainMenu({
  onNewGame,
  onLoadGame,
}: {
  onNewGame: () => void;
  onLoadGame: () => void;
}) {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-paper items-center justify-center p-6 space-y-8 relative animate-fade-in">
      {/* Sélecteur de langue */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => changeLanguage('en')}
          className={`w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-bold transition-all ${i18n.resolvedLanguage === 'en' ? 'bg-accent text-white shadow-md' : 'bg-white text-ink-light opacity-50 hover:opacity-100'}`}
        >
          EN
        </button>
        <button
          onClick={() => changeLanguage('fr')}
          className={`w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-xs font-bold transition-all ${i18n.resolvedLanguage === 'fr' ? 'bg-accent text-white shadow-md' : 'bg-white text-ink-light opacity-50 hover:opacity-100'}`}
        >
          FR
        </button>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-5xl font-serif font-bold text-accent tracking-tighter drop-shadow-sm">
          1863
          <br />
          FOOTBALL
        </h1>
        <p className="text-ink-light italic text-sm">{t('menu.subtitle')}</p>
      </div>

      <div className="w-full space-y-4 max-w-[280px]">
        <Button onClick={onNewGame} variant="primary" className="py-4 text-lg">
          {t('menu.new_game')}
        </Button>

        <Button onClick={onLoadGame} variant="secondary">
          {t('menu.load_game')}
        </Button>
      </div>

      <div className="text-center text-xs text-ink-light opacity-60 absolute bottom-4">
        {t('menu.version')}
      </div>
    </div>
  );
}
