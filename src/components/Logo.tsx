import React from 'react';

export const INDIA_AUTOMOBILES_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="saffronWave" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E85D1E"/>
      <stop offset="50%" stop-color="#F26E27"/>
      <stop offset="100%" stop-color="#D9480F"/>
    </linearGradient>
    <linearGradient id="greenWave" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1B8738"/>
      <stop offset="50%" stop-color="#229C42"/>
      <stop offset="100%" stop-color="#166B2C"/>
    </linearGradient>
  </defs>
  <circle cx="300" cy="300" r="285" fill="#ffffff" stroke="#142642" stroke-width="7"/>
  <!-- Top Saffron / Orange Stroke -->
  <path d="M 140 200 C 190 225, 270 195, 360 150 C 420 120, 470 140, 460 210 C 455 235, 440 260, 430 255 C 450 210, 435 165, 385 178 C 300 200, 210 230, 140 200 Z" fill="url(#saffronWave)"/>
  <path d="M 180 215 C 240 228, 320 185, 410 160 C 445 150, 455 175, 440 215 C 448 185, 430 168, 395 178 C 315 200, 240 238, 180 215 Z" fill="#D9480F" opacity="0.6"/>
  <!-- Sport Motorcycle & Rider Silhouette -->
  <g fill="#142642">
    <path d="M 165 255 C 175 250, 195 240, 220 248 C 245 255, 255 270, 280 265 C 305 260, 325 220, 370 225 C 390 227, 410 240, 440 260 C 415 265, 390 275, 370 273 C 340 270, 320 250, 290 252 C 265 255, 245 272, 215 270 C 190 268, 175 260, 165 255 Z"/>
    <!-- Wheels and fairings detail -->
    <path d="M 165 252 L 180 275 L 205 270 L 225 258 C 240 250, 260 252, 280 262 C 300 272, 330 278, 355 268 L 380 250 L 415 240 L 440 260 L 410 275 C 385 278, 355 275, 335 270 L 290 275 L 235 278 L 185 280 L 165 252 Z"/>
    <circle cx="210" cy="272" r="16" fill="#ffffff"/>
    <circle cx="210" cy="272" r="9" fill="#142642"/>
    <circle cx="395" cy="265" r="16" fill="#ffffff"/>
    <circle cx="395" cy="265" r="9" fill="#142642"/>
    <!-- Rider silhouette -->
    <path d="M 345 210 C 355 200, 375 202, 385 215 C 375 220, 360 218, 345 210 Z"/>
    <path d="M 380 195 C 392 195, 400 205, 392 218 C 382 225, 370 215, 380 195 Z"/>
    <!-- Fairing visor & nose -->
    <path d="M 380 192 L 420 225 L 440 260 L 400 250 L 385 220 Z"/>
  </g>
  <!-- Brand Text: INDIA -->
  <text x="300" y="335" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="64" fill="#142642" text-anchor="middle" letter-spacing="4">INDIA</text>
  <!-- Brand Text: AUTOMOBILES -->
  <text x="300" y="370" font-family="'Arial Black', sans-serif" font-weight="800" font-size="28" fill="#142642" text-anchor="middle" letter-spacing="7">AUTOMOBILES</text>
  <!-- Bottom Green Waves / Strokes -->
  <path d="M 140 345 C 140 405, 175 440, 240 435 C 330 428, 400 375, 460 395 C 410 395, 330 420, 240 420 C 180 420, 155 385, 150 345 Z" fill="url(#greenWave)"/>
  <path d="M 155 390 C 220 445, 330 410, 440 375 C 390 388, 310 420, 220 415 C 180 412, 160 395, 155 390 Z" fill="#166B2C" opacity="0.6"/>
</svg>`;

export const APP_LOGO_DATA_URL = 'data:image/svg+xml;utf8,' + encodeURIComponent(INDIA_AUTOMOBILES_LOGO_SVG);

let cachedPngUrl: string | null = null;

export async function getLogoPngDataUrl(): Promise<string> {
  if (cachedPngUrl) return cachedPngUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 600, 600);
          cachedPngUrl = canvas.toDataURL('image/png');
          resolve(cachedPngUrl);
          return;
        }
      } catch (err) {
        console.warn('Canvas rasterization failed:', err);
      }
      resolve(APP_LOGO_DATA_URL);
    };
    img.onerror = () => resolve(APP_LOGO_DATA_URL);
    img.src = APP_LOGO_DATA_URL;
  });
}

interface LogoProps {
  className?: string;
  alt?: string;
}

export const BrandLogo: React.FC<LogoProps> = ({ className = 'w-10 h-10', alt = 'India Automobiles' }) => {
  return (
    <img
      src={APP_LOGO_DATA_URL}
      alt={alt}
      className={`${className} object-contain rounded-full`}
      referrerPolicy="no-referrer"
    />
  );
};
