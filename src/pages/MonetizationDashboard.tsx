import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { TopBar } from '@/components/layout/TopBar';
import {
  DollarSign, TrendingUp, Users, BarChart3, Eye,
  Loader2, ExternalLink, Lock, CheckCircle2, XCircle, Star
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';

const MONETIZATION_THRESHOLD = 1000; // subscribers required

export function MonetizationDashboard() {
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
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    try {
      const [monRes, profileRes, earningsRes, subsRes, tipsRes, videosRes] = await Promise.all([
        supabase.from('user_monetization').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_profiles').select('subscriber_count, followers_count, is_creator, can_monetize').eq('id', user.id).single(),
        supabase.from('creator_earnings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('creator_subscriptions').select('*').eq('creator_id', user.id).eq('status', 'active'),
        supabase.from('tips').select('*').eq('to_user_id', user.id),
        supabase.from('posts').select('views_count').eq('user_id', user.id).eq('is_video', true),
      ]);

      setMonetizationStatus(monRes.data);
      setUserProfile(profileRes.data);
      setEarnings(earningsRes.data || []);

      const total = (earningsRes.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const videoRev = (earningsRes.data || []).filter((e: any) => e.source === 'video_ads').reduce((s: number, e: any) => s + Number(e.amount), 0);
      const productRev = (earningsRes.data || []).filter((e: any) => e.source === 'product_sales').reduce((s: number, e: any) => s + Number(e.amount), 0);
      const subsRevenue = (subsRes.data || []).reduce((s: number, e: any) => s + Number(e.price), 0);
      const tipsRevenue = (tipsRes.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0);
      const totalViews = (videosRes.data || []).reduce((s: number, e: any) => s + (e.views_count || 0), 0);

      setStats({
        totalEarnings: total + subsRevenue + tipsRevenue,
        videoRevenue: videoRev,
        subscriptions: subsRevenue,
        tips: tipsRevenue,
        videoViews: totalViews,
        productSales: productRev
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load monetization data');
    } finally {
      setLoading(false);
    }
  };

  const enableMonetization = async () => {
    if (!user) return;
    const subscriberCount = userProfile?.subscriber_count || userProfile?.followers_count || 0;
    if (subscriberCount < MONETIZATION_THRESHOLD) {
      toast.error(`You need ${MONETIZATION_THRESHOLD.toLocaleString()} subscribers to monetize`, {
        description: `You currently have ${subscriberCount.toLocaleString()} subscribers. Keep growing!`
      });
      return;
    }

    try {
      const { error: monError } = await supabase
        .from('user_monetization')
        .upsert({ user_id: user.id, is_monetized: true, eligibility_status: 'approved' }, { onConflict: 'user_id' });

      if (monError) throw monError;

      await supabase
        .from('user_profiles')
        .update({ is_creator: true, can_monetize: true, creator_tier: 'basic' })
        .eq('id', user.id);

      toast.success('🎉 Monetization enabled! Start earning from your content.');
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to enable monetization');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const subscriberCount = userProfile?.subscriber_count || userProfile?.followers_count || 0;
  const isEligible = subscriberCount >= MONETIZATION_THRESHOLD;
  const progressPct = Math.min(100, (subscriberCount / MONETIZATION_THRESHOLD) * 100);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Monetization" showBack />

      <div className="max-w-2xl mx-auto p-4 space-y-6">

        {/* Eligibility Banner */}
        {!monetizationStatus?.is_monetized && (
          <div className={`border rounded-2xl p-5 ${
            isEligible
              ? 'bg-gradient-to-r from-primary/10 to-green-500/10 border-primary/30'
              : 'bg-card border-border'
          }`}>
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                isEligible ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {isEligible ? <CheckCircle2 className="w-6 h-6" /> : <Lock className="w-6 h-6 text-muted-foreground" />}
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {isEligible ? '🎉 You\'re eligible to monetize!' : 'Unlock Monetization'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isEligible
                    ? 'You\'ve reached 1,000 subscribers. Start earning from your content.'
                    : `Reach ${MONETIZATION_THRESHOLD.toLocaleString()} subscribers to unlock monetization`}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            {!isEligible && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{subscriberCount.toLocaleString()} subscribers</span>
                  <span>{MONETIZATION_THRESHOLD.toLocaleString()} required</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 text-right">
                  {Math.max(0, MONETIZATION_THRESHOLD - subscriberCount).toLocaleString()} more needed
                </p>
              </div>
            )}

            {/* Requirements checklist */}
            <div className="space-y-2 mb-4">
              {[
                { label: '1,000+ subscribers/followers', met: isEligible },
                { label: 'Active account in good standing', met: true },
                { label: 'Post original content', met: true },
              ].map((req, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {req.met ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>{req.label}</span>
                </div>
              ))}
            </div>

            <button
              onClick={enableMonetization}
              disabled={!isEligible}
              className={`w-full py-3 rounded-full font-semibold transition-all ${
                isEligible
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {isEligible ? 'Enable Monetization' : `Need ${(MONETIZATION_THRESHOLD - subscriberCount).toLocaleString()} more subscribers`}
            </button>
          </div>
        )}

        {monetizationStatus?.is_monetized && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground font-medium">Total Earnings</span>
                </div>
                <p className="text-4xl font-bold text-primary">${stats.totalEarnings.toFixed(2)}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Creator since {new Date(monetizationStatus.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {[
                { label: 'Video Revenue', value: stats.videoRevenue, sub: `${formatNumber(stats.videoViews)} views`, icon: BarChart3, color: 'text-green-500' },
                { label: 'Subscriptions', value: stats.subscriptions, sub: 'monthly', icon: Users, color: 'text-blue-500' },
                { label: 'Tips', value: stats.tips, sub: 'received', icon: TrendingUp, color: 'text-purple-500' },
                { label: 'Product Sales', value: stats.productSales, sub: 'total', icon: ExternalLink, color: 'text-orange-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-xl font-bold">${stat.value.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/payouts')}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Request Payout
              </button>
              <button
                onClick={() => navigate('/creator-studio')}
                className="flex-1 py-3 border border-border rounded-xl font-semibold hover:bg-muted transition-colors"
              >
                Creator Studio
              </button>
            </div>

            {/* Recent Earnings */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h2 className="font-bold mb-3">Recent Earnings</h2>
              {earnings.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">No earnings yet</p>
              ) : (
                <div className="space-y-2">
                  {earnings.slice(0, 8).map(earning => (
                    <div key={earning.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm capitalize">{earning.source.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">{new Date(earning.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className="font-bold text-green-600">+${Number(earning.amount).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Tips to grow */}
        <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-2xl p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Grow Your Subscribers
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Post consistently — at least once per day</li>
            <li>• Upload engaging short videos (TikTok-style)</li>
            <li>• Use trending hashtags in your posts</li>
            <li>• Engage with comments on your posts</li>
            <li>• Collaborate with other creators</li>
            <li>• Host audio Spaces to attract followers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
