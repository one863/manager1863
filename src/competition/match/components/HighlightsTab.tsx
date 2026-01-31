
import { useComputed } from "@preact/signals";
import EventItem from "./EventItem";
import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
import { useLiveMatchStats } from "./useLiveMatchStats";

// Copie de la fonction cleanText depuis MatchLive pour un affichage cohérent
const cleanText = (text?: string, drawnToken?: any) => {
    if (!text) return '...';
    let result = text.replace(/undefined|Collectif/g, "L'équipe");
    if (drawnToken) {
        if (drawnToken.playerName) {
            result = result.replace(/\{p1\}/g, drawnToken.playerName);
        }
        if (drawnToken.secondaryPlayerName) {
            result = result.replace(/\{p2\}/g, drawnToken.secondaryPlayerName);
        }
    }
    return result.replace(/\{p1\}|\{p2\}/g, "un joueur");
};

export default function HighlightsTab({ logs }: { logs: any[] }) {
    const liveMatch = useLiveMatchStore((s) => s.liveMatch);

    // On initialise le hook avec des valeurs par défaut pour extraire les IDs
    // On utilise "as any" pour court-circuiter les contraintes de types des signaux ici
    const stats = useLiveMatchStats(
        liveMatch, 
        { value: 0 } as any, 
        { value: 0 } as any
    );
    
    const homeId = stats?.homeId;



    // On ne garde que les logs de buts pour les temps forts
    const highlights = useComputed(() =>
        logs.filter((l: any) => l.type === 'GOAL' || l.matchEvent?.type === 'GOAL')
    );

    if (highlights.value.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-medium italic">Aucun but marqué pour le moment.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {highlights.value.map((event, i) => {
                // Utilise la même logique de texte que l'onglet live
                const description = cleanText(
                    event.text || event.matchEvent?.text || event.matchEvent?.description || '',
                    event.drawnToken
                );
                const eventWithDescription = {
                    ...event,
                    description
                };
                return (
                    <EventItem 
                        key={`highlight-${event.time}-${i}`} 
                        event={eventWithDescription} 
                        homeTeamId={homeId} 
                    />
                );
            })}
        </div>
    );
}