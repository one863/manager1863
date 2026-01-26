import type { BaseEntity, NewsCategory } from "../common/types";

export interface NewsArticle extends BaseEntity {
	day: number;
	date: Date;
	title: string;
	content: string;
	category: NewsCategory;
	type?: string; // Pour compatibilité usages (ex: "SPONSOR", "CLUB")
	actionData?: any; // Pour actions interactives (ex: SIGN_SPONSOR)
	isRead: boolean;
	importance: number;
}
