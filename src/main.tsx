import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Only initialize AdMob on native platforms
async function boot() {
  if (Capacitor.isNativePlatform()) {
    try {
      await AdMob.initialize();
    } catch (e) {
      console.warn('[AdMob] Init skipped:', e);
    }
  }
}

boot();

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
