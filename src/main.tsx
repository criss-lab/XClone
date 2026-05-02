import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Capacitor } from '@capacitor/core';

/**
 * Boot sequence:
 * 1. Initialize AdMob with production settings (native only)
 * 2. Pre-load interstitial + rewarded ads silently
 * 3. Render React app
 *
 * We import admob lazily so web builds don't fail.
 */
async function boot() {
  if (Capacitor.isNativePlatform()) {
    try {
      // Dynamic import to avoid SSR / web errors
      const { AdMob } = await import('@capacitor-community/admob');

      await AdMob.initialize({
        requestTrackingAuthorization: true, // iOS ATT
        initializeForTesting: false,        // PRODUCTION — no test ads
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });

      console.log('[AdMob] Initialized in production mode');

      // Pre-load interstitial silently
      try {
        await AdMob.prepareInterstitial({
          adId: 'ca-app-pub-7234579833875016/8911947261',
          isTesting: false,
        });
        console.log('[AdMob] Interstitial pre-loaded');
      } catch (e) {
        console.warn('[AdMob] Interstitial preload warn:', e);
      }

      // Pre-load rewarded silently
      try {
        await AdMob.prepareRewardVideoAd({
          adId: 'ca-app-pub-7234579833875016/2031881558',
          isTesting: false,
        });
        console.log('[AdMob] Rewarded pre-loaded');
      } catch (e) {
        console.warn('[AdMob] Rewarded preload warn:', e);
      }
    } catch (e) {
      console.warn('[AdMob] Init error (non-fatal):', e);
    }
  }
}

// Start boot then render — don't await to avoid delaying React init
boot();

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);
