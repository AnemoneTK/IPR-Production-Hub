import type { Config } from "next";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0f172a", // น้ำเงินเข้ม (Slate 900)
          light: "#1e293b", // Slate 800
        },
        accent: {
          DEFAULT: "#2563eb", // ฟ้า (Blue 600)
          hover: "#1d4ed8", // Blue 700
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f8fafc",
        },
      },
    },
  },
  plugins: [],
};
export default config;
