import { randomInt } from "@/core/utils/math";

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
 * Optimisé : Suppression branchement ternaire simple.
 */
export function getQPerf(base: number, v_dyn: number): number {
    return base * (v_dyn < 50 ? v_dyn * 0.02 : 1.0);
}

/**
 * Calcul de la perte de volume par minute
 * Optimisé : Pré-calcul partiel.
 */
export function calculateVolumeLoss(stamina: number, intensity: number, recoveryBonus: number): number {
    return (0.85 - stamina * 0.025) * (0.7 + intensity * 0.15) * (1 - recoveryBonus);
}

/**
 * Sélectionne un élément dans une liste avec des poids
 * Optimisé : Rapidité d'exécution sur petites listes.
 */
export function weightedPick<T>(items: { item: T; weight: number }[]): T | null {
    const len = items.length;
    if (len === 0) return null;
    if (len === 1) return items[0].item;
    
    let totalWeight = 0;
    for (let i = 0; i < len; i++) totalWeight += items[i].weight;
    
    if (totalWeight <= 0) return items[0].item;

    let random = Math.random() * totalWeight;
    for (let i = 0; i < len; i++) {
        const { item, weight } = items[i];
        if (random < weight) return item;
        random -= weight;
    }
    return items[0].item;
}

/**
 * L'entonnoir Bradley-Terry
 * Calcule la probabilité de victoire de A face à B.
 * P(A) = PowerA / (PowerA + PowerB)
 */
export function bradleyTerry(powerA: number, powerB: number): number {
    const total = powerA + powerB;
    if (total <= 0) return 0.5;
    return powerA / total;
}
