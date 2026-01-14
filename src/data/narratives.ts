import { getRandomElement } from "@/utils/math";
import i18next from "i18next";

/**
 * Moteur narratif internationalisé.
 * Lit les textes depuis les fichiers locales/XX.json
 */

type NarrativeParams = Record<string, string | number>;

export function getNarrative(
	category: string,
	subCategory: string,
	params: NarrativeParams = {},
): { title?: string; content: string } {
	// i18next permet de récupérer des tableaux ou des objets avec returnObjects: true
	const narratives = i18next.t(`narratives.${category}.${subCategory}`, {
		returnObjects: true,
		defaultValue: [],
	}) as any;

	if (!narratives || (Array.isArray(narratives) && narratives.length === 0)) {
		return { content: `[Missing Narrative: ${category}.${subCategory}]` };
	}

	let selected: any;

	// Si c'est un tableau de chaînes (ex: goal)
	if (Array.isArray(narratives)) {
		selected = getRandomElement(narratives);
		if (typeof selected === "string") {
			return {
				content: i18next.t(
					`narratives.${category}.${subCategory}.${narratives.indexOf(selected)}`,
					params,
				),
			};
		}
	}

	// Si c'est un objet complexe avec des titres (ex: victory)
	if (typeof narratives === "object") {
		// Si on a des tableaux title/content à l'intérieur
		if (narratives.title && narratives.content) {
			const titleIndex = Math.floor(Math.random() * narratives.title.length);
			const contentIndex = Math.floor(
				Math.random() * narratives.content.length,
			);

			return {
				title: i18next.t(
					`narratives.${category}.${subCategory}.title.${titleIndex}`,
					params,
				),
				content: i18next.t(
					`narratives.${category}.${subCategory}.content.${contentIndex}`,
					params,
				),
			};
		}

		// Si c'est un tableau d'objets (ex: sponsors ou weekly)
		const keys = Object.keys(narratives).filter(
			(k) => !Number.isNaN(Number(k)),
		);
		if (keys.length > 0) {
			const randomKey = getRandomElement(keys);
			const item = narratives[randomKey];
			return {
				title: i18next.t(
					`narratives.${category}.${subCategory}.${randomKey}.title`,
					params,
				),
				content: i18next.t(
					`narratives.${category}.${subCategory}.${randomKey}.content`,
					params,
				),
			};
		}
	}

	return { content: "Erreur de format narratif" };
}
