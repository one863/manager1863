import path from "node:path";
import preact from "@preact/preset-vite";
/// <reference types="vitest" />
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
	plugins: [
		preact({
			babel: {
				plugins: [
					mode === "development" && "@babel/plugin-transform-react-jsx-source",
				].filter(Boolean),
			},
		}),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
			manifest: {
				name: "Football Manager 1863",
				short_name: "FM1863",
				description: "Historical Football Management Simulation",
				theme_color: "#3d1d13",
				background_color: "#fdf8f1",
				display: "standalone",
				icons: [
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
				],
			},
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
	},
}));
