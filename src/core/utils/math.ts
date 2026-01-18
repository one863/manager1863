/**
 * Utilitaires mathématiques pour la simulation et les probabilités.
 */

/**
 * Retourne un entier aléatoire entre min et max (inclus).
 */
export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Retourne un élément aléatoire d'un tableau.
 */
export function getRandomElement<T>(arr: T[]): T {
	return arr[randomInt(0, arr.length - 1)];
}

/**
 * Contraint une valeur entre un minimum et un maximum.
 */
export function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, val));
}

/**
 * Teste une probabilité (ex: 0.7 pour 70% de chance).
 */
export function probability(chance: number): boolean {
	return Math.random() < chance;
}

/**
 * Sélectionne un élément dans une liste pondérée
 */
export function weightedPick<T>(items: { item: T; weight: number }[]): T {
    const totalWeight = items.reduce((acc, i) => acc + i.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
        if (random < item.weight) return item.item;
        random -= item.weight;
    }
    return items[0].item;
}

/**
 * Génère un nombre aléatoire selon une distribution normale (Box-Muller)
 */
export function boxMullerRandom(mean: number, std: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * std + mean;
}
