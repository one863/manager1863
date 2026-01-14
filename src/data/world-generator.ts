import {
	CURRENT_DATA_VERSION,
	type League,
	type NewsArticle,
	Player,
	type StaffMember,
	type Team,
	db,
} from "@/db/db";
import { getRandomElement, randomInt } from "@/utils/math";
import { generateSquad } from "./squad-generator";

const CITIES = [
	"London", "Manchester", "Liverpool", "Birmingham", "Leeds", "Sheffield", "Newcastle", "Bristol", "Nottingham", "Leicester", "Sunderland", "Brighton", "Hull", "Plymouth", "Stoke", "Derby", "Southampton", "Portsmouth", "Preston", "Blackburn", "Bolton", "Wolverhampton", "Coventry", "Bradford", "Cardiff", "Swansea", "Reading", "Middlesbrough", "Blackpool", "Ipswich", "Norwich",
];

const SUFFIXES = [
	"United", "City", "FC", "Rovers", "Wanderers", "Athletic", "Town", "Albion", "Villa", "County", "Rangers", "Hotspur", "Alexandra", "North End", "Stanley",
];

const STADIUM_SUFFIXES = ["Park", "Road", "Ground", "Stadium", "Field", "Lane"];

function generateTeamName(usedNames: Set<string>): string {
	let name = "";
	let attempts = 0;
	do {
		const city = getRandomElement(CITIES);
		const suffix = getRandomElement(SUFFIXES);
		name = `${city} ${suffix}`;
		attempts++;
	} while (usedNames.has(name) && attempts < 100);
	if (usedNames.has(name)) name = `Club ${randomInt(1, 999)}`;
	usedNames.add(name);
	return name;
}

function generateColor(): string {
	const letters = "0123456789ABCDEF";
	let color = "#";
	for (let i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

async function generateTutorialNews(saveId: number, managerName: string) {
	const currentYear = new Date().getFullYear();
	const tutorials = [
		{ day: 1, title: "BIENVENUE AU BUREAU", content: `Monsieur le Manager, au nom du Conseil d'Administration, je vous souhaite la bienvenue. \n\nVotre priorité aujourd'hui est de prendre connaissance de la situation du club via votre **Tableau de Bord**. Surveillez attentivement la confiance du président : si elle tombe à zéro, votre contrat sera rompu sans préavis. \n\nNous attendons de vous de la rigueur et des résultats.` },
		{ day: 2, title: "ÉTAT DE L'EFFECTIF & MERCATO", content: `La revue d'effectif est terminée. Nos scouts ont listé les forces en présence dans l'onglet **Effectif**. \n\nSachez que le marché des transferts est ouvert. Si vous estimez que certains joueurs n'ont pas le niveau requis pour porter nos couleurs, vous pouvez chercher des renforts dans le **Marché**. Gardez un œil sur la condition physique des joueurs avant chaque décision.` },
		{ day: 3, title: "ENCADREMENT ET DÉVELOPPEMENT", content: `Un bon manager sait s'entourer. Vérifiez les compétences de votre **Staff** actuel. Des préparateurs compétents accéléreront la progression de vos joueurs. \n\nLe recrutement ne s'arrête pas aux joueurs : un scout de talent ou un coach chevronné peut faire la différence entre une promotion et une relégation.` },
		{ day: 4, title: "ACTUALITÉS ET RÉPUTATION", content: `La presse locale commence à parler de votre nomination. Les **Actualités** sont votre lien avec le monde extérieur. \n\nSoyez attentif aux dépêches concernant vos adversaires ou les opportunités financières. Votre réputation influencera directement le type de sponsors qui frapperont à notre porte.` },
		{ day: 5, title: "LA COMPÉTITION", content: `Notre place est dans l'élite, mais le chemin sera long. Le **Classement** de notre ligue est désormais disponible. \n\nAnalysez nos futurs adversaires et leurs résultats. Chaque point compte pour atteindre l'objectif de saison que nous vous avons fixé. Ne nous décevez pas.` },
		{ day: 6, title: "PRÉPARATION AU MATCH", content: `Le match approche. Le système de **Match Live** vous permettra de diriger l'équipe en temps réel. \n\nN'oubliez pas d'ajuster votre **Tactique** et de désigner vos 11 titulaires. Un joueur fatigué (énergie basse) sur le terrain est un risque que nous ne pouvons pas nous permettre.` },
		{ day: 7, title: "GESTION DE LA TRÉSORERIE", content: `C'est le jour du bilan. Chaque semaine (jours 7, 14, 21...), nous faisons les comptes dans l'onglet **Trésorerie**. \n\nLes revenus des sponsors et de la billetterie seront versés aujourd'hui, après déduction des salaires. Assurez-vous que le solde reste positif pour garantir la pérennité du club.` },
	];
	const newsItems: NewsArticle[] = tutorials.map((tuto) => ({
		saveId, day: tuto.day, date: new Date(currentYear, 8, tuto.day), title: tuto.title, content: tuto.content, type: "BOARD", importance: 1, isRead: false,
	}) as NewsArticle);
	await db.news.bulkAdd(newsItems);
}

export const WorldGenerator = {
	async generateWorld(saveId: number, userTeamName: string, managerName: string, primaryColor: string, secondaryColor: string) {
		const usedNames = new Set<string>();
		usedNames.add(userTeamName);
		const DIVISIONS = 6;
		const TEAMS_PER_DIV = 10;
		let userTeamId = -1;
		const LEAGUE_NAMES = ["Premier League", "Championship", "League One", "League Two", "National League", "Regional League"];

		for (let level = 1; level <= DIVISIONS; level++) {
			const leagueName = LEAGUE_NAMES[level - 1] || `Division ${level}`;
			const leagueId = await db.leagues.add({
				saveId, name: leagueName, level, promotionSpots: level === 1 ? 0 : 3, relegationSpots: level === DIVISIONS ? 0 : 3,
			} as League);

			const teamsCount = level === DIVISIONS ? TEAMS_PER_DIV - 1 : TEAMS_PER_DIV;
			const baseSkill = 95 - level * 10;

			for (let i = 0; i < teamsCount; i++) {
				const name = generateTeamName(usedNames);
				const stadiumName = `${name.split(" ")[0]} ${getRandomElement(STADIUM_SUFFIXES)}`;
				let teamSkill = level === DIVISIONS ? randomInt(30, 35) : baseSkill + randomInt(-3, 3);

				await db.teams.add({
					saveId, leagueId: leagueId as number, name, managerName: "CPU Manager", primaryColor: generateColor(), secondaryColor: generateColor(), matchesPlayed: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, budget: teamSkill * 500, reputation: teamSkill, fanCount: teamSkill * 50, confidence: 50, stadiumName, stadiumCapacity: teamSkill * 200, stadiumLevel: Math.ceil(teamSkill / 20), tacticType: "NORMAL", formation: "4-4-2", version: CURRENT_DATA_VERSION,
				} as Team);
				// Squad generator is async but we don't need to wait for each one to continue team creation
				generateSquad(saveId, teamId as any, teamSkill);
			}

			if (level === DIVISIONS) {
				const playerTeamSkill = 35;
				userTeamId = (await db.teams.add({
					saveId, leagueId: leagueId as number, name: userTeamName, managerName, primaryColor, secondaryColor, matchesPlayed: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, budget: 2500, reputation: 30, fanCount: 200, confidence: 50, stadiumName: "Community Field", stadiumCapacity: 500, stadiumLevel: 1, tacticType: "NORMAL", formation: "4-4-2", seasonGoal: "PROMOTION", seasonGoalStatus: "PENDING", version: CURRENT_DATA_VERSION,
				} as Team)) as number;

				await generateSquad(saveId, userTeamId, playerTeamSkill);

				// Génération CORRECTE du DNA pour Archibald
				const isFemale = Math.random() < 0.3;
				const dna = `${randomInt(0, 3)}-${randomInt(0, 5)}-${randomInt(0, 4)}-${randomInt(0, 5)}-${isFemale ? 1 : 0}`;

				await db.staff.add({
					saveId, teamId: userTeamId, name: isFemale ? "Alice Helper" : "Archibald Helper", role: "COACH", skill: randomInt(35, 45), wage: 10, age: 58, dna,
				} as StaffMember);
			}
		}

		if (userTeamId !== -1) await generateTutorialNews(saveId, managerName);
		return userTeamId;
	},
};
