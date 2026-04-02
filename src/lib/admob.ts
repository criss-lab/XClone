/**
 * AdMob Production Configuration
 * App ID: ca-app-pub-7234579833875016~4829778821
 *
 * All isTesting flags are FALSE — production mode only.
 * Test ads are completely removed.
 */

import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

export const ADMOB_CONFIG = {
  APP_ID: 'ca-app-pub-7234579833875016~4829778821',

  // Banner ads
  BANNER_FEED:        'ca-app-pub-7234579833875016/6498069741',
  BANNER_BOTTOM:      'ca-app-pub-7234579833875016/8657343194',

  // Interstitial
  INTERSTITIAL:       'ca-app-pub-7234579833875016/6306498055',

  // Rewarded
  REWARDED:           'ca-app-pub-7234579833875016/2575150572',
} as const;

let initialized = false;

/** Call once on app start. No testing devices, no test mode. */
export async function initAdMob() {
  if (initialized) return;
  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true, // iOS ATT
      initializeForTesting: false,        // ← production
    });
    initialized = true;
    console.log('[AdMob] Initialized in production mode');
  } catch (err) {
    console.error('[AdMob] Init error:', err);
  }
}

/** Show a banner at the given position. Returns cleanup fn. */
export async function showBanner(
  adId: string = ADMOB_CONFIG.BANNER_FEED,
  position: BannerAdPosition = BannerAdPosition.TOP_CENTER,
  margin = 0
) {
  try {
    await AdMob.showBanner({
      adId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position,
      margin,
      isTesting: false,
    });
  } catch (err) {
    console.error('[AdMob] Banner error:', err);
  }
}

export async function hideBanner() {
  try {
    await AdMob.hideBanner();
  } catch (_) {/* ignore */}
}

/** Prepare + show interstitial. Returns true on success. */
export async function showInterstitial(adId = ADMOB_CONFIG.INTERSTITIAL): Promise<boolean> {
  try {
    await AdMob.prepareInterstitial({ adId, isTesting: false });
    await AdMob.showInterstitial();
    return true;
  } catch (err) {
    console.error('[AdMob] Interstitial error:', err);
    return false;
  }
}

/** Prepare + show rewarded ad. Returns the reward item or null. */
export async function showRewarded(adId = ADMOB_CONFIG.REWARDED) {
  try {
    await AdMob.prepareRewardVideoAd({ adId, isTesting: false });
    const result = await AdMob.showRewardVideoAd();
    return result?.reward ?? null;
  } catch (err) {
    console.error('[AdMob] Rewarded error:', err);
    return null;
  }
}
