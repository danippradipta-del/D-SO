
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

const init = () => {
  const container = document.getElementById('root');
  if (container) {
    try {
      const root = createRoot(container);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      console.log("Aplikasi berhasil dimuat");
    } catch (error) {
      console.error("Gagal merender aplikasi:", error);
      container.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">Gagal memuat aplikasi. Silakan muat ulang halaman. <br><br> Detail: ${error.message}</div>`;
    }
  } else {
    console.error("Elemen root tidak ditemukan!");
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
