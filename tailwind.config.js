/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				paper: "rgb(var(--color-paper) / <alpha-value>)",
				"paper-dark": "rgb(var(--color-paper-dark) / <alpha-value>)",
				ink: "rgb(var(--color-ink) / <alpha-value>)",
				"ink-light": "rgb(var(--color-ink-light) / <alpha-value>)",
				accent: "rgb(var(--color-accent) / <alpha-value>)",
				grass: "rgb(var(--color-grass) / <alpha-value>)",
			},
			fontFamily: {
				serif: ["Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
				sans: [
					'"Instrument Sans"',
					'"Product Sans"',
					"system-ui",
					"-apple-system",
					"BlinkMacSystemFont",
					'"Segoe UI"',
					"Roboto",
					"sans-serif",
				],
			},
			animation: {
				"fade-in": "fadeIn 0.3s ease-out",
				"slide-up": "slideUp 0.4s ease-out",
				"progress-indefinite": "progressIndefinite 1.5s infinite linear",
			},
			keyframes: {
				fadeIn: {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
				slideUp: {
					"0%": { opacity: "0", transform: "translateY(20px)" },
					"100%": { opacity: "1" },
				},
				progressIndefinite: {
					"0%": { marginLeft: "-50%" },
					"100%": { marginLeft: "100%" },
				},
			},
		},
	},
	plugins: [],
};
