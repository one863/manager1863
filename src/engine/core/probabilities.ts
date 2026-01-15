import { clamp } from "@/utils/math";

/**
 * Bibliothèque de probabilités avancées pour le moteur de simulation.
 * Permet des calculs non-linéaires plus réalistes que le hasard pur.
 */

/**
 * Calcule un taux de succès basé sur une courbe Sigmoïde.
 * Idéal pour comparer deux puissances (ex: Attaque vs Défense).
 * @param power L'attaquant
 * @param resistance Le défenseur
 * @param steepness Courbure (plus haut = plus punitif)
 */
export function calculateSuccessRate(power: number, resistance: number, steepness = 2): number {
	if (power <= 0) return 0;
	if (resistance <= 0) return 1;
	
	// Ratio de force
	const ratio = power / resistance;
	
	// Fonction logistique : 1 / (1 + exp(-k * (x - 1)))
	// Centrée sur ratio = 1 (50% de chance si égalité)
	return 1 / (1 + Math.exp(-steepness * (ratio - 1)));
}

/**
 * Calcule l'impact de la fatigue de manière non-linéaire.
 * L'impact est faible au début, puis s'accélère dramatiquement sous les 50% d'énergie.
 */
export function getFatiguePenalty(energy: number): number {
	const e = clamp(energy / 100, 0, 1);
	
	// Si énergie > 80%, performance optimale (100%)
	if (e > 0.8) return 1.0;
	
	// Entre 50% et 80%, légère baisse (de 100% à 85%)
	if (e > 0.5) return 0.85 + (e - 0.5) * 0.5; 
	
	// Sous 50%, chute brutale (Courbe quadratique)
	return Math.pow(e, 2) * 2; 
}

/**
 * Génère un nombre suivant une distribution normale (Courbe de Gauss).
 * Utile pour les notes de performance (Ratings) pour éviter les extrêmes trop fréquents.
 */
export function boxMullerRandom(mean: number, stdDev: number): number {
	const u = 1 - Math.random(); 
	const v = Math.random();
	const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	return z * stdDev + mean;
}

/**
 * Sélectionne un élément dans une liste en fonction de son poids.
 * @param items Liste d'objets avec une propriété weight
 */
export function weightedPick<T>(items: { item: T; weight: number }[]): T {
	const totalWeight = items.reduce((acc, i) => acc + i.weight, 0);
	let random = Math.random() * totalWeight;
	
	for (const { item, weight } of items) {
		if (random < weight) return item;
		random -= weight;
	}
	
	return items[0].item;
}

/**
 * Probabilité de blessure ou carton basée sur l'agressivité et la fatigue.
 */
export function calculateRiskEvent(baseRisk: number, fatiguePenalty: number, intensityBonus = 1.0): boolean {
	const adjustedRisk = baseRisk * (2 - fatiguePenalty) * intensityBonus;
	return Math.random() < adjustedRisk;
}
