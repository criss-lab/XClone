import { useEffect, useRef } from 'react';

interface AdSenseAdProps {
  adSlot: string;
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  fullWidthResponsive?: boolean;
  className?: string;
  onAdLoad?: () => void;
}

/**
 * Google AdSense Ad Component
 * 
 * AdSense script is loaded in index.html with client ID: ca-app-pub-7234579833875016
 * Ad unit IDs are managed via the Ad Configuration page (/admin/ads)
 */
export function AdSenseAd({
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = true,
  className = '',
  onAdLoad
}: AdSenseAdProps) {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      // Push the ad to AdSense
      if (window.adsbygoogle && adRef.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        onAdLoad?.();
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, [onAdLoad]);

  return (
    <div className={`adsense-container ${className}`}>
      <div className="text-xs text-center text-muted-foreground mb-1">Advertisement</div>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-app-pub-7234579833875016"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive.toString()}
      />
    </div>
  );
}

// Declare global adsbygoogle
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}
