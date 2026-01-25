import { z } from "zod";
import { BaseEntitySchema, NewsCategorySchema } from "../common/schemas";

/**
 * Schémas Zod pour le domaine News
 */

export const NewsArticleSchema = BaseEntitySchema.extend({
	day: z.number().int().min(0),
	date: z.coerce.date(),
	title: z.string().min(1).max(200),
	content: z.string().min(1).max(5000),
	category: NewsCategorySchema,
	isRead: z.boolean(),
	importance: z.number().int().min(0).max(10),
});

export const CreateNewsArticleSchema = NewsArticleSchema.omit({ id: true });
export const UpdateNewsArticleSchema = NewsArticleSchema.partial();

export type NewsArticleInput = z.infer<typeof NewsArticleSchema>;
export type CreateNewsArticleInput = z.infer<typeof CreateNewsArticleSchema>;
export type UpdateNewsArticleInput = z.infer<typeof UpdateNewsArticleSchema>;
