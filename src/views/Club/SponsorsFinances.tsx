import { useState, useEffect } from 'preact/hooks';
import { db, Team } from '@/db/db';
import { useGameStore } from '@/store/gameSlice';
import { ClubService } from '@/services/club-service';
import Card from '@/components/Common/Card';
import Button from '@/components/Common/Button';
import CreditAmount from '@/components/Common/CreditAmount';
import { 
  Handshake, 
  Coins, 
  TrendingUp, 
  History,
  FileText,
  Calendar
} from 'lucide-preact';
import { useTranslation } from 'react-i18next';

export default function SponsorsFinances() {
  const { t } = useTranslation();
  const userTeamId = useGameStore(state => state.userTeamId);
  const currentDate = useGameStore(state => state.currentDate);
  const [team, setTeam] = useState<Team | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!userTeamId) return;
    const teamData = await db.teams.get(userTeamId);
    setTeam(teamData || null);

    if (teamData) {
      const sponsorOffers = await ClubService.getSponsorOffers(teamData.reputation, currentDate);
      setOffers(sponsorOffers);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userTeamId, currentDate]);

  const handleSignSponsor = async (offer: any) => {
    if (!userTeamId) return;
    await ClubService.signSponsor(userTeamId, offer);
    alert(`Contrat signé avec ${offer.name} jusqu'en ${offer.expiryDate.toLocaleDateString()} !`);
    loadData();
  };

  if (isLoading || !team) return <div className="p-8 text-center animate-pulse">{t('game.loading')}</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex items-center gap-2 px-2">
        <Coins className="text-accent" />
        <h2 className="text-xl font-serif font-bold text-ink">Finances & Sponsors</h2>
      </div>

      {/* État Actuel */}
      <Card title="Partenariat Actuel">
        {team.sponsorName ? (
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-lg text-accent">{team.sponsorName}</h4>
                <div className="flex items-center gap-1 text-xs text-ink-light italic">
                   <Calendar size={12} />
                   Expire le {new Date(team.sponsorExpiryDate!).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <CreditAmount amount={team.sponsorIncome || 0} size="lg" />
                <span className="text-[10px] block uppercase text-ink-light">par match</span>
              </div>
            </div>
        ) : (
            <div className="text-center py-4 italic text-ink-light">
                Aucun contrat actif. Vous perdez des revenus potentiels !
            </div>
        )}
      </Card>

      {/* Offres de Sponsors */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-ink-light uppercase tracking-wider px-2 flex items-center gap-2">
          <Handshake size={16} />
          Offres de Partenariat
        </h3>
        <p className="text-[10px] text-ink-light px-2 italic">Note : Signer un nouveau contrat remplacera l'actuel.</p>
        
        {offers.map((offer, idx) => (
          <Card key={idx} className="border-l-4 border-l-green-600">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-ink">{offer.name}</h4>
                <p className="text-[10px] text-ink-light">Durée : {offer.durationMonths} mois</p>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <CreditAmount amount={offer.income} size="md" />
                <Button 
                  onClick={() => handleSignSponsor(offer)} 
                  variant="secondary" 
                  className="py-1 px-3 text-[10px] h-7 w-auto"
                >
                  SIGNER
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Bilan */}
      <Card title="Prévisions de Revenus">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-ink-light">Billetterie estimée</span>
            <CreditAmount amount={Math.round(team.fanCount * 0.1)} size="sm" color="text-ink" />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-light">Sponsoring</span>
            <CreditAmount amount={team.sponsorIncome || 0} size="sm" color="text-ink" />
          </div>
          <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
            <span>Total par match à domicile</span>
            <CreditAmount amount={Math.round(team.fanCount * 0.1) + (team.sponsorIncome || 0)} size="md" />
          </div>
        </div>
      </Card>
    </div>
  );
}
