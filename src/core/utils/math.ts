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
