import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AdSenseAd } from './AdSenseAd';

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

  useEffect(() => {
    fetchAds();
  }, [location]);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_active_ads', { location_filter: location });

      if (error) {
        console.error('Error fetching ads:', error);
        setLoading(false);
        return;
      }

      setAdPlacements(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ads:', error);
      setLoading(false);
    }
  };

  const trackImpression = async (adId: string) => {
    try {
      // Track ad impression
      await supabase.rpc('track_ad_view', {
        ad_id_param: adId,
        user_id_param: null
      });
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  };

  if (loading || adPlacements.length === 0) {
    return null;
  }

  // Get first matching ad (you can implement rotation logic here)
  const ad = adPlacements[0];

  if (ad.network === 'adsense') {
    return (
      <div className={className}>
        <AdSenseAd
          adSlot={ad.code}
          adFormat="auto"
          fullWidthResponsive={true}
          onAdLoad={() => trackImpression(ad.id)}
        />
      </div>
    );
  }

  // For AdMob (mobile), render nothing on web
  return null;
}
