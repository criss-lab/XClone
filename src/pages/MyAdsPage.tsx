import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Megaphone, Eye, MousePointer, DollarSign, Loader2, Plus, Pause, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

export default function MyAdsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAds();
    } else {
      navigate('/auth');
    }

    // Show real AdMob banner below TopBar
    AdMob.showBanner({
      adId: "ca-app-pub-7234579833875016/5392885600", // Real Sidebar/Banner ID
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.TOP_CENTER
    });

    // Hide banner when leaving page
    return () => {
      AdMob.hideBanner();
    };
  }, [user]);

  const fetchAds = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_ads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ads:', error);
      toast.error('Failed to load ads');
      return;
    }

    setAds(data || []);
    setLoading(false);
  };

  const pauseAd = async (adId: string) => {
    const { error } = await supabase
      .from('user_ads')
      .update({ status: 'paused' })
      .eq('id', adId);

    if (error) {
      toast.error('Failed to pause ad');
      return;
    }

    toast.success('Ad paused');
    fetchAds();
  };

  const resumeAd = async (adId: string) => {
    const { error } = await supabase
      .from('user_ads')
      .update({ status: 'active' })
      .eq('id', adId);

    if (error) {
      toast.error('Failed to resume ad');
      return;
    }

    toast.success('Ad resumed');
    fetchAds();
  };

  const deleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;

    const { error } = await supabase
      .from('user_ads')
      .delete()
      .eq('id', adId);

    if (error) {
      toast.error('Failed to delete ad');
      return;
    }

    toast.success('Ad deleted');
    fetchAds();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="My Advertisements" showBack />

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Ads</h1>
          <Button onClick={() => navigate('/create-ad')} className="rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Create Ad
          </Button>
        </div>

        {ads.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-xl">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">No ads yet</h2>
            <p className="text-muted-foreground mb-6">Start promoting your content to reach more users</p>
            <Button onClick={() => navigate('/create-ad')}>
              Create Your First Ad
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-card border border-border rounded-xl p-6">
                {/* Ad content unchanged */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
