import { db, Team, League, Player, NewsArticle } from '@/db/db';
import { generateSquad } from './squad-generator';
import { randomInt, getRandomElement } from '@/utils/math';

const CITIES = [
  'London', 'Manchester', 'Liverpool', 'Birmingham', 'Leeds', 'Sheffield',
  'Newcastle', 'Bristol', 'Nottingham', 'Leicester', 'Sunderland', 'Brighton',
  'Hull', 'Plymouth', 'Stoke', 'Derby', 'Southampton', 'Portsmouth', 'Preston',
  'Blackburn', 'Bolton', 'Wolverhampton', 'Coventry', 'Bradford', 'Cardiff',
  'Swansea', 'Reading', 'Middlesbrough', 'Blackpool', 'Ipswich', 'Norwich'
];

const SUFFIXES = [
  'United', 'City', 'FC', 'Rovers', 'Wanderers', 'Athletic', 'Town', 'Albion',
  'Villa', 'County', 'Rangers', 'Hotspur', 'Alexandra', 'North End', 'Stanley'
];

const STADIUM_SUFFIXES = ['Park', 'Road', 'Ground', 'Stadium', 'Field', 'Lane'];

function generateTeamName(usedNames: Set<string>): string {
  let name = '';
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
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

async function generateTutorialNews(saveId: number, managerName: string) {
  const tutorials = [
    {
      day: 1,
      title: 'Bienvenue au Club',
      content: `Cher M. ${managerName}, bienvenue à la tête du club. Prenez le temps aujourd'hui de visiter votre **Tableau de Bord**. C'est ici que vous verrez les informations essentielles : prochain match, état des finances et confiance du comité. Familiarisez-vous avec ces indicateurs, ils sont le pouls de votre club.`
    },
    {
      day: 2,
      title: 'Gestion de l\'Effectif',
      content: "Une équipe ne vaut que par ses hommes. Allez dans le menu **Effectif** pour passer en revue vos joueurs. Observez leur moral et leur condition physique. Un joueur fatigué ou mécontent sera moins performant. Identifiez vos piliers et vos faiblesses."
    },
    {
      day: 3,
      title: 'La Vie du Club',
      content: "La gestion ne se limite pas au terrain. La section **Club** vous permet de gérer les infrastructures et les finances. Un stade plus grand attire plus de fans, et plus de fans signifient plus de revenus. Mais attention à ne pas vider les caisses trop vite !"
    },
    {
      day: 4,
      title: 'Le Marché des Transferts',
      content: "Si votre effectif a des lacunes, le **Marché** est l'endroit où chercher. Vous pouvez y recruter des joueurs libres ou sous contrat. N'oubliez pas : le talent a un prix, et les salaires pèsent lourd sur le budget."
    },
    {
      day: 5,
      title: 'Surveiller la Compétition',
      content: "Jetez un œil au **Classement**. Connaître la position de vos rivaux est crucial. Chaque match compte dans la lutte pour la promotion ou le maintien. Ne sous-estimez jamais une équipe, même en bas de tableau."
    },
    {
      day: 6,
      title: 'L\'Entraînement',
      content: "Vos joueurs doivent progresser. La section **Entraînement** (si disponible) ou la gestion individuelle est vitale. Assurez-vous qu'ils restent affûtés. La discipline et l'effort constant sont les clés du succès à long terme."
    },
    {
      day: 7,
      title: 'Jour de Match : La Tactique',
      content: "C'est le grand jour. Avant le coup d'envoi, rendez-vous sur l'écran **Tactique** (via l'Effectif ou l'avant-match). Choisissez votre formation (2-3-5 est classique, mais oserez-vous innover ?) et donnez vos consignes. La victoire dépend de vos choix stratégiques aujourd'hui. Bonne chance !"
    }
  ];

  const newsItems: NewsArticle[] = tutorials.map(tuto => ({
    saveId,
    day: tuto.day,
    date: new Date(1863, 8, tuto.day), // Septembre 1863
    title: tuto.title,
    content: tuto.content,
    type: 'BOARD',
    importance: 1, // Haute importance pour être vu
    isRead: false
  }));

  await db.news.bulkAdd(newsItems);
}

export const WorldGenerator = {
  async generateWorld(saveId: number, userTeamName: string, managerName: string, primaryColor: string, secondaryColor: string) {
    const usedNames = new Set<string>();
    usedNames.add(userTeamName);

    const DIVISIONS = 6;
    const TEAMS_PER_DIV = 10; // Petit championnat pour commencer

    let userTeamId = -1;

    // Générer les divisions et les équipes
    for (let level = 1; level <= DIVISIONS; level++) {
      // Créer la ligue
      const leagueName = level === 1 ? 'Premier Division' : `Division ${level}`;
      const leagueId = await db.leagues.add({
        saveId,
        name: leagueName,
        level,
        promotionSpots: level === 1 ? 0 : 3,
        relegationSpots: level === DIVISIONS ? 0 : 3
      } as League);

      // Générer les équipes pour cette ligue
      const teamsCount = level === DIVISIONS ? TEAMS_PER_DIV - 1 : TEAMS_PER_DIV; // Une place pour le joueur en Div 5
      
      // Définir la force moyenne de la division (Div 1 = fort, Div 5 = faible)
      // Div 1: 85, Div 2: 75, Div 3: 65, Div 4: 55, Div 5: 45
      const baseSkill = 95 - (level * 10); 

      for (let i = 0; i < teamsCount; i++) {
        const name = generateTeamName(usedNames);
        const stadiumName = `${name.split(' ')[0]} ${getRandomElement(STADIUM_SUFFIXES)}`;
        
        const teamId = await db.teams.add({
          saveId,
          leagueId,
          name,
          managerName: 'CPU Manager',
          primaryColor: generateColor(),
          secondaryColor: generateColor(),
          matchesPlayed: 0,
          points: 0,
          budget: baseSkill * 1000,
          reputation: baseSkill,
          fanCount: baseSkill * 50,
          confidence: 50,
          stadiumName,
          stadiumCapacity: baseSkill * 200,
          stadiumLevel: Math.ceil(baseSkill / 20),
          tacticType: 'NORMAL',
          formation: '4-4-2',
          version: 1
        } as Team);

        await generateSquad(saveId, teamId as number, baseSkill);
      }

      // Ajouter l'équipe du joueur en Division 6
      if (level === DIVISIONS) {
        userTeamId = await db.teams.add({
          saveId,
          leagueId,
          name: userTeamName,
          managerName,
          primaryColor,
          secondaryColor,
          matchesPlayed: 0,
          points: 0,
          budget: 250, // Budget très serré (réaliste 1863)
          reputation: 20,
          fanCount: 150,
          confidence: 50,
          stadiumName: 'Community Field',
          stadiumCapacity: 300, // Petit terrain communal
          stadiumLevel: 1,
          tacticType: 'NORMAL',
          formation: '4-4-2',
          seasonGoal: 'PROMOTION', // Objectif ambitieux
          seasonGoalStatus: 'PENDING',
          version: 1
        } as Team) as number;

        // Générer l'équipe du joueur (skill moyen pour Div 6 ~35)
        await generateSquad(saveId, userTeamId, 35);
      }
    }

    // Générer les dépêches de tutoriel
    if (userTeamId !== -1) {
        await generateTutorialNews(saveId, managerName);
    }

    return userTeamId;
  }
};
