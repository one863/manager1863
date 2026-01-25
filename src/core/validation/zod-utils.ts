import { ZodError } from "zod";

/**
 * Utilitaires pour la validation Zod dans les services
 */

export class ValidationError extends Error {
	constructor(
		public errors: ZodError["issues"],
		message = "Erreur de validation",
	) {
		super(message);
		this.name = "ValidationError";
	}

	getErrorMessages(): string[] {
		return this.errors.map((err: any) => `${err.path.join(".")} → ${err.message}`);
	}
}

/**
 * Wrapper pour valider et logger les erreurs
 */
export function validateOrThrow<T>(schema: any, data: unknown, context: string): T {
	try {
		return schema.parse(data);
	} catch (error) {
		if (error instanceof ZodError) {
			const validationErr = new ValidationError(error.issues, `Validation failed in ${context}`);
			console.error(`[${context}]`, validationErr.getErrorMessages());
			throw validationErr;
		}
		throw error;
	}
}

/**
 * Wrapper pour valider sans lever d'erreur
 */
export function validateSafe<T>(schema: any, data: unknown): { success: boolean; data?: T; error?: ValidationError } {
	try {
		return { success: true, data: schema.parse(data) };
	} catch (error) {
		if (error instanceof ZodError) {
			const validationErr = new ValidationError(error.issues);
			return { success: false, error: validationErr };
		}
		return { success: false, error: new ValidationError([], String(error)) };
	}
}
