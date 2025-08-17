import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false, // css in js
        }),
      ],
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://yingyunkeji.top/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')  // Adjust if needed
      }
    }
  }
});
