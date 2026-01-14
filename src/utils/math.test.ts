import { describe, expect, it } from "vitest";
import { clamp, probability, randomInt } from "./math";

describe("Math Utils", () => {
	describe("clamp", () => {
		it("should clamp a value below min", () => {
			expect(clamp(5, 10, 20)).toBe(10);
		});

		it("should clamp a value above max", () => {
			expect(clamp(25, 10, 20)).toBe(20);
		});

		it("should return the value if within range", () => {
			expect(clamp(15, 10, 20)).toBe(15);
		});
	});

	describe("randomInt", () => {
		it("should return an integer within range", () => {
			for (let i = 0; i < 100; i++) {
				const val = randomInt(1, 10);
				expect(val).toBeGreaterThanOrEqual(1);
				expect(val).toBeLessThanOrEqual(10);
				expect(Number.isInteger(val)).toBe(true);
			}
		});
	});

	describe("probability", () => {
		it("should always return true for probability 1", () => {
			expect(probability(1)).toBe(true);
		});

		it("should always return false for probability 0", () => {
			expect(probability(0)).toBe(false);
		});
	});
});
