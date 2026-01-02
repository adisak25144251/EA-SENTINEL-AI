import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // โหลด env ทุกตัว (ไม่บังคับ prefix)
  const env = loadEnv(mode, process.cwd(), "");

  const aiServiceUrl = env.AI_SERVICE_URL ?? "http://localhost:8000";

  // ✅ GitHub Pages base path (ต้องตรงกับชื่อ repo)
  const repoName = "EA-SENTINEL-AI";

  return {
    // ✅ สำคัญมาก: ทำให้ asset/path ถูกต้องบน GitHub Pages
    base: `/${repoName}/`,

    server: {
      port: 3000,
      host: "0.0.0.0",
      // ถ้าคุณเจอ CORS ค่อยเปิด proxy ได้ (เลือกใช้)
      // proxy: {
      //   "/analyze-ea": {
      //     target: aiServiceUrl,
      //     changeOrigin: true,
      //     secure: false,
      //   },
      // },
    },

    plugins: [react()],

    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.AI_SERVICE_URL": JSON.stringify(aiServiceUrl),
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
