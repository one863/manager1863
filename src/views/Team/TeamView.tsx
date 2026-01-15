import { db, type Player, type Team, type StaffMember } from "@/db/db";
import { useGameStore } from "@/store/gameSlice";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { SubTabs } from "@/components/Common/SubTabs";
import Squad from "@/views/Squad";
import Training from "@/views/Training";

type TeamTab = "squad" | "tactics" | "training" | "staff";

export default function TeamView({ 
	onSelectPlayer, 
	onSelectStaff 
}: { 
	onSelectPlayer: (p: Player) => void, 
	onSelectStaff: (s: StaffMember) => void 
}) {
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState<TeamTab>("squad");

	const tabs = [
		{ id: "squad", label: t("team.squad", "Effectif") },
		{ id: "tactics", label: t("team.tactics", "Tactique") },
		{ id: "training", label: t("team.training", "Entrain.") },
		{ id: "staff", label: t("team.staff", "Staff") },
	];

	return (
		<div className="animate-fade-in">
			<SubTabs
				tabs={tabs}
				activeTab={activeTab}
				onChange={(id) => setActiveTab(id as TeamTab)}
			/>

			<div className="mt-2 px-4">
				{activeTab === "squad" && <Squad viewMode="list" onSelectPlayer={onSelectPlayer} />}
				{activeTab === "tactics" && <Squad viewMode="tactics" />}
				{activeTab === "training" && <Training initialTab="training" />}
				{activeTab === "staff" && <Training initialTab="staff" onSelectStaff={onSelectStaff} />}
			</div>
		</div>
	);
}
