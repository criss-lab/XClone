import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Capacitor } from '@capacitor/core';

/**
 * Boot sequence (native):
 * 1. Initialize AdMob in production mode
 * 2. Pre-load interstitial + rewarded silently (non-blocking)
 * 3. Render React
 *
 * AdMob IDs:
 *   App:          ca-app-pub-7234579833875016~4829778821
 *   Banner:       ca-app-pub-7234579833875016/4099641690
 *   Interstitial: ca-app-pub-7234579833875016/8911947261
 *   Rewarded:     ca-app-pub-7234579833875016/2031881558
 *   Native:       ca-app-pub-7234579833875016/3193754134
 */

// Render React immediately — ads init in background
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(<App />);

// Boot AdMob after render to not block Time-To-Interactive
if (Capacitor.isNativePlatform()) {
  setTimeout(async () => {
    try {
      const { AdMob } = await import('@capacitor-community/admob');

      // Production initialization — no test mode
      await AdMob.initialize({
        requestTrackingAuthorization: true,   // Required for iOS 14+ ATT
        initializeForTesting: false,           // PRODUCTION ONLY
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });

      console.log('[AdMob] ✓ Production initialized');

      // Pre-load interstitial (full-screen between page transitions)
      AdMob.prepareInterstitial({
        adId: 'ca-app-pub-7234579833875016/8911947261',
        isTesting: false,
      }).then(() => console.log('[AdMob] ✓ Interstitial ready'))
        .catch(e => console.warn('[AdMob] Interstitial preload:', e));

      // Pre-load rewarded (user watches for boost/unlock)
      AdMob.prepareRewardVideoAd({
        adId: 'ca-app-pub-7234579833875016/2031881558',
        isTesting: false,
      }).then(() => console.log('[AdMob] ✓ Rewarded ready'))
        .catch(e => console.warn('[AdMob] Rewarded preload:', e));

    } catch (e) {
      console.warn('[AdMob] Boot error (non-fatal):', e);
    }
  }, 1500); // Small delay so app renders first
}
