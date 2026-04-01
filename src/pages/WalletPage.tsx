import { useEffect } from "react";
import { TopBar } from '@/components/layout/TopBar';
import { WalletDashboard } from '@/components/features/WalletDashboard';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

export default function WalletPage() {

  useEffect(() => {
    // Show the real AdMob banner below TopBar
    AdMob.showBanner({
      adId: "ca-app-pub-7234579833875016/8657343194", // Real Feed Top Banner ID
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.TOP_CENTER
    });

    // Hide banner when leaving page
    return () => {
      AdMob.hideBanner();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="My Wallet" showBack />

      <div className="max-w-2xl mx-auto p-6">
        <WalletDashboard />
      </div>
    </div>
  );
}
