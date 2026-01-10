import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { DollarSign, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export function MonetizationDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEarnings: 0,
    videoRevenue: 0,
    subscriptions: 0,
    tips: 0
  });
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useState(() => {
    if (user) {
      fetchMonetizationData();
    }
  }, [user]);

  const fetchMonetizationData = async () => {
    if (!user) return;

    try {
      // Fetch total earnings
      const { data: earningsData } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'paid');

      const total = earningsData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const videoRev = earningsData?.filter(e => e.source === 'video_ads').reduce((sum, e) => sum + Number(e.amount), 0) || 0;

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

      setStats({
        totalEarnings: total + subsRevenue + tipsRevenue,
        videoRevenue: videoRev,
        subscriptions: subsRevenue,
        tips: tipsRevenue
      });

      setEarnings(earningsData || []);
    } catch (error) {
      console.error('Error fetching monetization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const enableMonetization = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_creator: true,
          can_monetize: true,
          creator_tier: 'basic'
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Monetization enabled! Start earning from your content.');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Monetization Dashboard</h1>
        <p className="text-muted-foreground">Track your earnings and manage your creator monetization</p>
      </div>

      {!user?.can_monetize ? (
        <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-8 text-center">
          <DollarSign className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Start Earning from Your Content</h2>
          <p className="text-muted-foreground mb-6">
            Enable monetization to earn from video ads, subscriptions, and tips
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Total Earnings</span>
              </div>
              <p className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-sm text-muted-foreground">Video Revenue</span>
              </div>
              <p className="text-2xl font-bold">${stats.videoRevenue.toFixed(2)}</p>
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
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Recent Earnings</h2>
            {earnings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No earnings yet</p>
            ) : (
              <div className="space-y-3">
                {earnings.slice(0, 10).map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{earning.source.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(earning.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-600">+${Number(earning.amount).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20 rounded-xl p-6">
            <h3 className="font-bold mb-2">How to maximize your earnings</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Create engaging video content to earn from ads</li>
              <li>• Offer exclusive content to subscribers</li>
              <li>• Enable tips on your posts</li>
              <li>• Tag products to earn commissions</li>
              <li>• Engage with your audience regularly</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
