/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	// Configuration minimale pour Tailwind v4
	// Les couleurs sont définies dans src/index.css avec @theme
};
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
