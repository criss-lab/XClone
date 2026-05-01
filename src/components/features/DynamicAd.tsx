import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';

interface DynamicAdProps {
  location: 'feed_top' | 'feed_inline' | 'sidebar' | 'profile' | 'explore';
  className?: string;
}

interface AdPlacement {
  id: string;
  network: string;
  placement_type: string;
  code: string;
  location: string;
}

export function DynamicAd({ location, className = '' }: DynamicAdProps) {
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([]);
  const [loading, setLoading] = useState(true);

  // Never render AdSense on native Capacitor — AdMob handles ads there
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    fetchAds();
  }, [location]);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_active_ads', { location_filter: location });

      if (error) {
        setLoading(false);
        return;
      }

      // On native, filter out web-only adsense placements
      const filtered = isNative
        ? (data || []).filter((a: AdPlacement) => a.network !== 'adsense')
        : (data || []);

      setAdPlacements(filtered);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const trackImpression = async (adId: string) => {
    try {
      await supabase.rpc('track_ad_view', {
        ad_id_param: adId,
        user_id_param: null
      });
    } catch {}
  };

  if (loading || adPlacements.length === 0) return null;

  // On native platform — AdMob banners are managed per-page. No web ads rendered.
  if (isNative) return null;

  const ad = adPlacements[0];

  // AdSense on web only — and only when adSlot is non-empty
  if (ad.network === 'adsense' && ad.code) {
    return (
      <div className={className}>
        <WebAdSense adSlot={ad.code} onLoad={() => trackImpression(ad.id)} />
      </div>
    );
  }

  return null;
}

// Lightweight AdSense renderer — only shown on web, only when slot is valid
function WebAdSense({ adSlot, onLoad }: { adSlot: string; onLoad: () => void }) {
  useEffect(() => {
    try {
      if ((window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        onLoad();
      }
    } catch {}
  }, []);

  if (!adSlot) return null;

  return (
    <div>
      <p className="text-xs text-center text-muted-foreground mb-1">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-app-pub-7234579833875016"
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
