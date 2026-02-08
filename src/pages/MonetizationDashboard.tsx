import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { TopBar } from '@/components/layout/TopBar';
import { DollarSign, TrendingUp, Users, BarChart3, Eye, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';

export default function MonetizationDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEarnings: 0,
    videoRevenue: 0,
    subscriptions: 0,
    tips: 0,
    videoViews: 0,
    productSales: 0
  });
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monetizationStatus, setMonetizationStatus] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchMonetizationData();
  }, [user]);

  const fetchMonetizationData = async () => {
    if (!user) return;

    try {
      // Check monetization status
      const { data: monData } = await supabase
        .from('user_monetization')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setMonetizationStatus(monData);

      // Fetch total earnings
      const { data: earningsData } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const total = earningsData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const videoRev = earningsData?.filter(e => e.source === 'video_ads').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const productRev = earningsData?.filter(e => e.source === 'product_sales').reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Fetch subscriptions
      const { data: subsData } = await supabase
        .from('creator_subscriptions')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'active');

      const subsRevenue = subsData?.reduce((sum, s) => sum + Number(s.price), 0) || 0;

      // Fetch tips
      const { data: tipsData } = await supabase
        .from('tips')
        .select('*')
        .eq('to_user_id', user.id);

      const tipsRevenue = tipsData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get video views
      const { data: videoPosts } = await supabase
        .from('posts')
        .select('views_count')
        .eq('user_id', user.id)
        .eq('is_video', true);

      const totalViews = videoPosts?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;

      setStats({
        totalEarnings: total + subsRevenue + tipsRevenue,
        videoRevenue: videoRev,
        subscriptions: subsRevenue,
        tips: tipsRevenue,
        videoViews: totalViews,
        productSales: productRev
      });

      setEarnings(earningsData || []);
    } catch (error) {
      console.error('Error fetching monetization data:', error);
      toast.error('Failed to load monetization data');
    } finally {
      setLoading(false);
    }
  };

  const enableMonetization = async () => {
    if (!user) return;

    try {
      // Create monetization record
      const { error: monError } = await supabase
        .from('user_monetization')
        .insert({
          user_id: user.id,
          is_monetized: true,
          eligibility_status: 'pending'
        });

      if (monError && !monError.message.includes('duplicate')) throw monError;

      // Update profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          is_creator: true,
          can_monetize: true,
          creator_tier: 'basic'
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Monetization enabled! Start earning from your content.');
      fetchMonetizationData();
    } catch (error: any) {
      console.error('Monetization error:', error);
      toast.error(error.message || 'Failed to enable monetization');
    }
  };

  const requestPayout = async () => {
    if (stats.totalEarnings < 50) {
      toast.error('Minimum payout is $50');
      return;
    }

    toast.info('Payout request submitted. You will be contacted by admin.');
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Monetization" showBack />

      <div className="max-w-4xl mx-auto p-6">
        {!monetizationStatus?.is_monetized ? (
          <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-8 text-center">
            <DollarSign className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Start Earning from Your Content</h2>
            <p className="text-muted-foreground mb-6">
              Enable monetization to earn from video ads, subscriptions, tips, and product sales
            </p>
            <button
              onClick={enableMonetization}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90"
            >
              Enable Monetization
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Total Earnings</span>
                </div>
                <p className="text-3xl font-bold text-primary">${stats.totalEarnings.toFixed(2)}</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Video Revenue</span>
                </div>
                <p className="text-2xl font-bold">${stats.videoRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(stats.videoViews)} views
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Subscriptions</span>
                </div>
                <p className="text-2xl font-bold">${stats.subscriptions.toFixed(2)}</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Tips</span>
                </div>
                <p className="text-2xl font-bold">${stats.tips.toFixed(2)}</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <ExternalLink className="w-5 h-5 text-orange-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Product Sales</span>
                </div>
                <p className="text-2xl font-bold">${stats.productSales.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex gap-4 mb-8">
              <button
                onClick={requestPayout}
                disabled={stats.totalEarnings < 50}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Request Payout (Min. $50)
              </button>
              <button
                onClick={() => navigate('/creator-studio')}
                className="flex-1 py-3 border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
              >
                Creator Studio
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Recent Earnings</h2>
              {earnings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No earnings yet</p>
              ) : (
                <div className="space-y-3">
                  {earnings.slice(0, 10).map((earning) => (
                    <div key={earning.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div>
                        <p className="font-medium capitalize">{earning.source.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(earning.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">+${Number(earning.amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{earning.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-xl p-6">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Maximize Your Earnings
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Upload engaging videos to earn from ads</li>
                  <li>• Offer exclusive content to subscribers</li>
                  <li>• Enable tips on your posts</li>
                  <li>• Tag products to earn commissions</li>
                  <li>• Engage with your audience regularly</li>
                </ul>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-bold mb-3">Eligibility Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Monetization</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      monetizationStatus?.is_monetized 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {monetizationStatus?.is_monetized ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Revenue Share</span>
                    <span className="text-sm font-medium">{monetizationStatus?.revenue_share_percentage || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Lifetime Earnings</span>
                    <span className="text-sm font-medium">${Number(monetizationStatus?.total_earnings || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
