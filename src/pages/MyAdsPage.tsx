import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Megaphone, Eye, MousePointer, DollarSign, Loader2, Plus, Pause, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';

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
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold">{ad.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        ad.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                        ad.status === 'pending' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' :
                        ad.status === 'paused' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
                        ad.status === 'approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {ad.status}
                      </span>
                      {ad.payment_status === 'pending' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                          Payment Pending
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">{ad.description}</p>
                    
                    {ad.image_url && (
                      <img src={ad.image_url} alt={ad.title} className="w-full max-h-48 object-cover rounded-lg mb-3" />
                    )}

                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Impressions
                        </p>
                        <p className="text-lg font-bold">{formatNumber(ad.impressions)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MousePointer className="w-3 h-3" />
                          Clicks
                        </p>
                        <p className="text-lg font-bold">{formatNumber(ad.clicks)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Spent
                        </p>
                        <p className="text-lg font-bold">${ad.spent?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Budget
                        </p>
                        <p className="text-lg font-bold">${ad.budget}</p>
                      </div>
                    </div>

                    {ad.ai_verification_notes && (
                      <div className="bg-muted/50 rounded-lg p-3 text-sm">
                        <p className="font-semibold mb-1">AI Verification</p>
                        <p className="text-muted-foreground">{ad.ai_verification_notes}</p>
                        {ad.ai_verification_score && (
                          <p className="mt-1 text-primary font-medium">
                            Score: {ad.ai_verification_score}/100
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {ad.status === 'active' && (
                    <Button onClick={() => pauseAd(ad.id)} variant="outline" size="sm">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  )}
                  {ad.status === 'paused' && (
                    <Button onClick={() => resumeAd(ad.id)} variant="outline" size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                  )}
                  {(ad.status === 'pending' || ad.status === 'rejected') && (
                    <Button onClick={() => deleteAd(ad.id)} variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
