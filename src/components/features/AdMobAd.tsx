import { useEffect } from 'react';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdMobRewardItem } from '@capacitor-community/admob';

interface AdMobAdProps {
  adId: string;
  type: 'banner' | 'interstitial' | 'rewarded';
  position?: BannerAdPosition;
  onAdLoaded?: () => void;
  onAdFailed?: (error: any) => void;
  onRewarded?: (reward: AdMobRewardItem) => void;
}

/**
 * AdMob Component for Capacitor Mobile App
 * 
 * Installation:
 * npm install @capacitor-community/admob
 * npx cap sync
 * 
 * Configure in capacitor.config.json:
 * {
 *   "plugins": {
 *     "AdMob": {
 *       "appId": "ca-app-pub-7234579833875016~4829778821",
 *       "testingDevices": ["YOUR_TEST_DEVICE_ID"]
 *     }
 *   }
 * }
 */
export function AdMobAd({
  adId,
  type,
  position = BannerAdPosition.BOTTOM_CENTER,
  onAdLoaded,
  onAdFailed,
  onRewarded
}: AdMobAdProps) {
  
  useEffect(() => {
    initializeAdMob();
  }, []);

  useEffect(() => {
    if (type === 'banner') {
      showBannerAd();
    }
    
    return () => {
      if (type === 'banner') {
        hideBannerAd();
      }
    };
  }, [adId, type, position]);

  const initializeAdMob = async () => {
    try {
      await AdMob.initialize({
        testingDevices: [], // Add test device IDs for testing
        initializeForTesting: false,
      });
    } catch (error) {
      console.error('AdMob initialization failed:', error);
      onAdFailed?.(error);
    }
  };

  const showBannerAd = async () => {
    try {
      const options: BannerAdOptions = {
        adId: adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: position,
        margin: 0,
        isTesting: false,
      };

      await AdMob.showBanner(options);
      onAdLoaded?.();
    } catch (error) {
      console.error('Banner ad failed:', error);
      onAdFailed?.(error);
    }
  };

  const hideBannerAd = async () => {
    try {
      await AdMob.hideBanner();
    } catch (error) {
      console.error('Hide banner failed:', error);
    }
  };

  // For interstitial ads - call this function when needed
  const showInterstitialAd = async () => {
    try {
      await AdMob.prepareInterstitial({
        adId: adId,
        isTesting: false,
      });

      await AdMob.showInterstitial();
      onAdLoaded?.();
    } catch (error) {
      console.error('Interstitial ad failed:', error);
      onAdFailed?.(error);
    }
  };

  // For rewarded ads - call this function when user triggers reward action
  const showRewardedAd = async () => {
    try {
      await AdMob.prepareRewardVideoAd({
        adId: adId,
        isTesting: false,
      });

      const result = await AdMob.showRewardVideoAd();
      
      if (result && onRewarded) {
        onRewarded(result.reward);
      }
      
      onAdLoaded?.();
    } catch (error) {
      console.error('Rewarded ad failed:', error);
      onAdFailed?.(error);
    }
  };

  // Banner ads are automatically displayed via useEffect
  // Interstitial and Rewarded ads need to be triggered manually
  if (type === 'interstitial') {
    return (
      <button
        onClick={showInterstitialAd}
        className="hidden"
        aria-hidden="true"
      />
    );
  }

  if (type === 'rewarded') {
    return (
      <button
        onClick={showRewardedAd}
        className="hidden"
        aria-hidden="true"
      />
    );
  }

  // Banner ads render nothing (displayed natively)
  return null;
}

// Helper hook to trigger ads programmatically
export const useAdMob = () => {
  const showInterstitial = async (adId: string) => {
    try {
      await AdMob.prepareInterstitial({ adId, isTesting: false });
      await AdMob.showInterstitial();
    } catch (error) {
      console.error('Interstitial error:', error);
    }
  };

  const showRewarded = async (adId: string): Promise<AdMobRewardItem | null> => {
    try {
      await AdMob.prepareRewardVideoAd({ adId, isTesting: false });
      const result = await AdMob.showRewardVideoAd();
      return result?.reward || null;
    } catch (error) {
      console.error('Rewarded error:', error);
      return null;
    }
  };

  return { showInterstitial, showRewarded };
};
