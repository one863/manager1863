import { useComputed } from "@preact/signals";
import EventItem from "./EventItem";

import { useLiveMatchStore } from "@/infrastructure/store/liveMatchStore";
// Importation nommée (doit correspondre au "export function" ci-dessus)
import { useLiveMatchStats } from "./useLiveMatchStats";

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

    // On ne garde que les buts pour les temps forts
    const highlights = useComputed(() =>
        logs.filter((l: any) => l.type === 'GOAL')
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
            {highlights.value.map((event, i) => (
                <EventItem 
                    key={`highlight-${event.time}-${i}`} 
                    event={event} 
                    homeTeamId={homeId} 
                />
            ))}
        </div>
    );
}