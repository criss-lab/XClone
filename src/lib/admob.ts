/**
 * AdMob Production Configuration
 * App ID: ca-app-pub-7234579833875016~4829778821
 *
 * Production mode only — no isTesting, no testingDevices.
 * Ad units are mapped to specific placements for best UX.
 */

import { AdMob, BannerAdSize, BannerAdPosition, AdMobRewardItem } from '@capacitor-community/admob';

export const ADMOB_CONFIG = {
  APP_ID: 'ca-app-pub-7234579833875016~4829778821',

  // ── Banners ───────────────────────────────────────────────────────
  /** Feed / timeline top-of-page banner */
  BANNER_FEED:        'ca-app-pub-7234579833875016/4099641690',
  /** Profile page banner */
  BANNER_PROFILE:     'ca-app-pub-7234579833875016/8657343194',

  // ── Interstitial ──────────────────────────────────────────────────
  /** Between-video full-screen interstitial */
  INTERSTITIAL:       'ca-app-pub-7234579833875016/8911947261',

  // ── Rewarded ──────────────────────────────────────────────────────
  /** Watch-to-unlock rewarded video */
  REWARDED:           'ca-app-pub-7234579833875016/2031881558',

  // ── Extra banners ─────────────────────────────────────────────────
  BANNER_EXPLORE:     'ca-app-pub-7234579833875016/3193754134',
} as const;

let initialized = false;
let interstitialReady = false;
let rewardedReady = false;

// ─── Core Init ───────────────────────────────────────────────────────────────
/** Call once on app start. No testing, no blank startup ads. */
export async function initAdMob() {
  if (initialized) return;
  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true, // iOS App Tracking Transparency
      initializeForTesting: false,        // production
    });
    initialized = true;
    console.log('[AdMob] Initialized — production mode');

    // Pre-load interstitial and rewarded silently
    await Promise.allSettled([
      preloadInterstitial(),
      preloadRewarded(),
    ]);
  } catch (err) {
    console.error('[AdMob] Init error:', err);
  }
}

// ─── Banner ──────────────────────────────────────────────────────────────────
/**
 * Show a native banner.
 * @param adId   Production ad unit ID
 * @param position BannerAdPosition enum value
 * @param margin  Bottom margin in px — use 64 to clear the bottom nav
 */
export async function showBanner(
  adId: string = ADMOB_CONFIG.BANNER_FEED,
  position: BannerAdPosition = BannerAdPosition.BOTTOM_CENTER,
  margin = 64           // ← default above bottom nav
) {
  if (!initialized) await initAdMob();
  try {
    await AdMob.showBanner({
      adId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position,
      margin,
      isTesting: false,
    });
    console.log('[AdMob] Banner shown:', adId);
  } catch (err) {
    console.error('[AdMob] Banner error:', err);
  }
}

export async function hideBanner() {
  try { await AdMob.hideBanner(); } catch (_) {/* ignore */}
}

// ─── Interstitial ────────────────────────────────────────────────────────────
async function preloadInterstitial(adId = ADMOB_CONFIG.INTERSTITIAL) {
  try {
    await AdMob.prepareInterstitial({ adId, isTesting: false });
    interstitialReady = true;
    console.log('[AdMob] Interstitial ready');
  } catch (err) {
    console.error('[AdMob] Interstitial preload error:', err);
    interstitialReady = false;
  }
}

/**
 * Show interstitial. Auto-reloads for next call.
 * Returns true on success.
 */
export async function showInterstitial(adId = ADMOB_CONFIG.INTERSTITIAL): Promise<boolean> {
  if (!initialized) await initAdMob();
  try {
    if (!interstitialReady) {
      await preloadInterstitial(adId);
    }
    await AdMob.showInterstitial();
    interstitialReady = false;
    // Silently preload next
    preloadInterstitial(adId).catch(() => {});
    return true;
  } catch (err) {
    console.error('[AdMob] Interstitial show error:', err);
    return false;
  }
}

// ─── Rewarded ────────────────────────────────────────────────────────────────
async function preloadRewarded(adId = ADMOB_CONFIG.REWARDED) {
  try {
    await AdMob.prepareRewardVideoAd({ adId, isTesting: false });
    rewardedReady = true;
    console.log('[AdMob] Rewarded ready');
  } catch (err) {
    console.error('[AdMob] Rewarded preload error:', err);
    rewardedReady = false;
  }
}

/**
 * Show rewarded ad. Returns the reward item or null on failure/skip.
 */
export async function showRewarded(adId = ADMOB_CONFIG.REWARDED): Promise<AdMobRewardItem | null> {
  if (!initialized) await initAdMob();
  try {
    if (!rewardedReady) {
      await preloadRewarded(adId);
    }
    const result = await AdMob.showRewardVideoAd();
    rewardedReady = false;
    // Silently reload next
    preloadRewarded(adId).catch(() => {});
    return result?.reward ?? null;
  } catch (err) {
    console.error('[AdMob] Rewarded show error:', err);
    return null;
  }
}
