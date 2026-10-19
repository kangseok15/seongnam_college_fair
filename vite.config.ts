import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// GitHub Pages(https://<아이디>.github.io/<저장소이름>/) 하위 경로에서도
// 동작하도록 상대 경로('./')로 빌드합니다. 이 앱은 ?pc=... 같은 쿼리 파라미터로
// 화면을 전환하므로 별도의 라우터 설정이 필요 없습니다.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
