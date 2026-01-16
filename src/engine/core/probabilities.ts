import { clamp } from "@/utils/math";

/**
 * Calcule un taux de succès basé sur une courbe Sigmoïde.
 */
export function calculateSuccessRate(power: number, resistance: number, steepness = 2): number {
	if (power <= 0) return 0;
	if (resistance <= 0) return 1;
	const ratio = power / resistance;
	return 1 / (1 + Math.exp(-steepness * (ratio - 1)));
}

/**
 * Calcule l'impact de la fatigue de manière non-linéaire.
 * DURCISSEMENT PLATINUM : La chute est désormais exponentielle sous les 60%.
 */
export function getFatiguePenalty(energy: number): number {
	const e = clamp(energy / 100, 0, 1);
	
	// Si énergie > 85%, performance optimale (100%)
	if (e > 0.85) return 1.0;
	
	// Entre 60% et 85%, baisse linéaire modérée (de 100% à 75%)
	if (e > 0.6) return 0.75 + (e - 0.6) * 1.0; 
	
	// Sous 60%, chute TRÈS BRUTALE (Courbe cubique)
	// À 40% (e=0.4), le joueur ne vaut plus que ~18% de sa note initiale
	return Math.pow(e, 3) * 2.8; 
}

/**
 * Génère un nombre suivant une distribution normale (Courbe de Gauss).
 */
export function boxMullerRandom(mean: number, stdDev: number): number {
	const u = 1 - Math.random(); 
	const v = Math.random();
	const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
	return z * stdDev + mean;
}

/**
 * Sélectionne un élément dans une liste en fonction de son poids.
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
	// Higher fatigue penalty (closer to 0) means higher risk
	// 2 - 1.0 = 1.0 risk multiplier at full health
	// 2 - 0.2 = 1.8 risk multiplier at high fatigue
	const adjustedRisk = baseRisk * (2 - fatiguePenalty) * intensityBonus;
	return Math.random() < adjustedRisk;
}

/**
 * Calculate expected goals based on position and pressure (Simplified)
 */
export function calculateXG(attackPower: number, defensePower: number, skill: number): number {
	const base = calculateSuccessRate(attackPower, defensePower, 1.5);
	const skillFactor = 0.5 + skill / 10;
	return clamp(base * 0.3 * skillFactor, 0.01, 0.8);
}
