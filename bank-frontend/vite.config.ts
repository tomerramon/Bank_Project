import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(), // Tailwind v4 plugin
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@components": path.resolve(__dirname, "./src/components"),
			"@assets": path.resolve(__dirname, "./src/assets"),
			"@pages": path.resolve(__dirname, "./src/pages"),
			"@hooks": path.resolve(__dirname, "./src/hooks"),
			"@lib": path.resolve(__dirname, "./src/lib"),
			"@styles": path.resolve(__dirname, "./src/styles"),
			"@store": path.resolve(__dirname, "./src/store"),
			"@api": path.resolve(__dirname, "./src/api"),
			"@types": path.resolve(__dirname, "./src/types"),
		},
	},
	server: {
		port: 3000,
		proxy: {
			"/api": {
				target: "http://localhost:5000",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
});
