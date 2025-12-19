/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0a0a0a",
                foreground: "#ededed",
                primary: {
                    DEFAULT: "#3b82f6",
                    foreground: "#ffffff",
                },
                secondary: {
                    DEFAULT: "#1e293b",
                    foreground: "#ffffff",
                },
                card: {
                    DEFAULT: "#171717",
                    foreground: "#ededed",
                },
                border: "#262626",
            },
        },
    },
    plugins: [],
}
