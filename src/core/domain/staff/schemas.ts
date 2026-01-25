import { z } from "zod";
import { BaseEntitySchema, StaffRoleSchema, StatsSchema } from "../common/schemas";

/**
 * Schémas Zod pour le domaine Staff
 */

export const StaffSchema = BaseEntitySchema.extend({
	teamId: z.number().int().positive().optional(),
	firstName: z.string().min(1).max(50),
	lastName: z.string().min(1).max(50),
	role: StaffRoleSchema,
	dna: z.string().regex(/^\d+(-\d+)*$/), // Format: "1-4-2-1-0"
	stats: StatsSchema,
	wage: z.number().int().min(0),
	age: z.number().int().min(25).max(70),
	joinedDay: z.number().int().min(0),
	joinedSeason: z.number().int().min(0),
});

export const CreateStaffSchema = StaffSchema.omit({ id: true });
export const UpdateStaffSchema = StaffSchema.partial();

export type StaffInput = z.infer<typeof StaffSchema>;
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;
