module.exports = {
    content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
    plugins: [
        require("@tailwindcss/aspect-ratio"),
        require("@tailwindcss/line-clamp"),
        require("tailwind-scrollbar")({ nocompatible: true }),
        require("daisyui"),
        require("tailwindcss-textshadow"),
    ],
    theme: {
        extend: {
            textShadow: {
                black: "1px 1px 2px black",
            },
            animation: {
                marquee: "marquee 20s linear infinite",
            },
            keyframes: {
                marquee: {
                    "0%": { transform: "translateX(100%)" },
                    "100%": { transform: "translateX(-100%)" },
                },
            },
        },
    },
    daisyui: {
        themes: [
            {
                light: {
                    ...require("daisyui/src/colors/themes")["[data-theme=light]"],
                    primary: "#ef4444",
                    secondary: "#6b7280",
                    "--rounded-box": "0.2rem",
                    "--rounded-btn": "0.2rem",
                },
            },
        ],
    },
};
