import { randomInt, clamp } from "@/core/utils/math";

/**
 * Boîte à outils mathématique pour le moteur "90-S"
 */

// --- Dés standards ---
export const D20 = () => randomInt(1, 20);
export const D100 = () => randomInt(1, 100);
export const D10 = () => randomInt(1, 10);

/**
 * Calcule la performance technique Q selon le volume dynamique
 * Malus linéaire si V < 50%
 */
export function getQPerf(base: number, v_dyn: number): number {
    const malus = v_dyn < 50 ? (v_dyn / 50) : 1.0;
    return base * malus;
}

/**
 * Calcul de la perte de volume par minute
 */
export function calculateVolumeLoss(stamina: number, intensity: number, recoveryBonus: number): number {
    const baseLoss = (0.85 - stamina / 40);
    const intensityMult = 0.7 + (intensity * 0.15); 
    return baseLoss * intensityMult * (1 - recoveryBonus);
}

/**
 * Sélectionne un élément dans une liste avec des poids
 * Retourne null si la liste est vide.
 */
export function weightedPick<T>(items: { item: T; weight: number }[]): T | null {
    if (!items || items.length === 0) return null;
    
	const totalWeight = items.reduce((acc, i) => acc + i.weight, 0);
    if (totalWeight <= 0) return items[0].item;

	let random = Math.random() * totalWeight;
	for (const { item, weight } of items) {
		if (random < weight) return item;
		random -= weight;
	}
	return items[0].item;
}
