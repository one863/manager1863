import { getRandomElement } from "@/core/utils/math";
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
		console.debug(`[Narrative] Missing: narratives.${category}.${subCategory}`);
		return { content: `[Missing Narrative: ${category}.${subCategory}]` };
	}

	let selected: any;

	// Si c'est un tableau, on en pioche un
	if (Array.isArray(narratives)) {
		selected = getRandomElement(narratives);
	} else {
		selected = narratives;
	}

	// Fonction de sélection récursive si title/content sont eux-mêmes des tableaux
	const pickVariant = (val: any): string => {
		if (Array.isArray(val)) return getRandomElement(val);
		return String(val || "");
	};

	// Si c'est une string directe
	if (typeof selected === "string") {
		return { content: interpolate(selected, params) };
	}

	// Si c'est un objet {title, content}
	const finalTitle = selected.title ? pickVariant(selected.title) : undefined;
	const finalContent = pickVariant(selected.content);

	return {
		title: finalTitle ? interpolate(finalTitle, params) : undefined,
		content: interpolate(finalContent, params),
	};
}

function interpolate(text: string, params: NarrativeParams): string {
	if (typeof text !== "string") return "";
	return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
		return String(params[key] || `{{${key}}}`);
	});
}
