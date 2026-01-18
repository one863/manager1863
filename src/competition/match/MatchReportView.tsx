import MatchReport from "@/competition/match/MatchReport";
import { db } from "@/core/db/db";
import { useEffect, useState } from "preact/hooks";

interface MatchReportViewProps {
	matchId: number;
	onBack: () => void;
}

export default function MatchReportView({ matchId, onBack }: MatchReportViewProps) {
	const [isValid, setIsValid] = useState(false);

	useEffect(() => {
		const check = async () => {
			const m = await db.matches.get(matchId);
			if (m && m.played) setIsValid(true);
			else onBack();
		};
		check();
	}, [matchId]);

	if (!isValid) return null;

	return <MatchReport matchId={matchId} onClose={onBack} />;
}
