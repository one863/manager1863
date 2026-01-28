import { useComputed } from "@preact/signals";
import EventItem from "./EventItem";

export default function HighlightsTab({ logs }: { logs: any[] }) {
    // On filtre les logs pour ne garder que les événements marquants (buts, arrêts, etc.)
    const highlights = useComputed(() =>
        logs.filter((l: any) =>
            ["GOAL", "CARD", "PENALTY", "INJURY", "SAVE", "WOODWORK"].includes(l.eventSubtype)
        )
    );

    if (highlights.value.length === 0) {
        return <div className="text-xs text-gray-400 italic p-4">Aucun temps fort pour ce match.</div>;
    }

    return (
        <div className="space-y-2">
            {highlights.value.map((event, i) => (
                <EventItem key={i} event={event} />
            ))}
        </div>
    );
}
