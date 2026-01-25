import type { BaseEntity, NewsCategory } from "../common/types";

export interface NewsArticle extends BaseEntity {
	day: number;
	date: Date;
	title: string;
	content: string;
	category: NewsCategory;
	isRead: boolean;
	importance: number;
}
