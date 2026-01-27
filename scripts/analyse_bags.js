// Script d'analyse IA simple pour ajuster les proportions de jetons par zone
// À lancer après avoir récupéré le JSON de stats du test

const fs = require('fs');

// Charger les stats générées par le test
const stats = JSON.parse(fs.readFileSync('stats_bag_zones.json', 'utf-8'));

// Critères d'équilibrage (exemple)
const MIN_OFF = 10; // Minimum de jetons offensifs attendus
const MAX_DEF = 80; // Maximum de jetons défensifs tolérés

const offensifs = [
  'PASS_SHORT','PASS_LONG','PASS_BACK','PASS_SWITCH','THROUGH_BALL','CUT_BACK','DRIBBLE','CROSS','HEAD_PASS','SHOOT_GOAL','SHOOT_WOODWORK','WOODWORK_OUT','HEAD_SHOT','FREE_KICK_SHOT','PENALTY_GOAL','CORNER_GOAL'
];
const defensifs = [
  'TACKLE','INTERCEPT','BLOCK','CLEARANCE','PRESSING_SUCCESS','ERROR','BALL_RECOVERY','CLAIM','PUNCH','SHOOT_SAVED','SHOOT_SAVED_CORNER','SHOOT_OFF_TARGET','PENALTY_SAVED','PENALTY_MISS','GK_SHORT','GK_LONG','GK_BOULETTE','GK_POSSESSION','DUEL_WON','FOUL','FOUL_PENALTY','CORNER_CLEARED','THROW_IN_SAFE','THROW_IN_LONG_BOX','THROW_IN_LOST','FREE_KICK_WALL'
];

const suggestions = {};
for (const zone in stats) {
  const bag = stats[zone];
  let off = 0, def = 0;
  for (const type in bag) {
    if (offensifs.includes(type)) off += bag[type];
    if (defensifs.includes(type)) def += bag[type];
  }
  if (off < MIN_OFF) {
    suggestions[zone] = suggestions[zone] || {};
    suggestions[zone].ajustement = `Augmenter les jetons offensifs (actuel: ${off})`;
  }
  if (def > MAX_DEF) {
    suggestions[zone] = suggestions[zone] || {};
    suggestions[zone].ajustement = (suggestions[zone].ajustement || '') + ` Réduire les jetons défensifs (actuel: ${def})`;
  }
}

fs.writeFileSync('suggestions.json', JSON.stringify(suggestions, null, 2), 'utf-8');
console.log("Suggestions écrites dans suggestions.json.\nValidez zone par zone avant d'appliquer les modifications.");
