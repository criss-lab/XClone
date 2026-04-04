import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { TopBar } from '@/components/layout/TopBar';
import { Gift, Zap, CheckCircle2, Clock, Loader2, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { showRewarded, ADMOB_CONFIG } from '@/lib/admob';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface RewardUnlock {
  id: string;
  reward_type: string;
  reward_amount: number;
  ad_unit: string;
  used: boolean;
  expires_at: string | null;
  created_at: string;
}

const REWARD_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  reach_boost: { label: '2× Reach Boost', icon: '🚀', color: 'text-purple-600' },
  extra_impressions: { label: 'Extra Impressions', icon: '👁️', color: 'text-blue-600' },
  analytics_unlock: { label: 'Analytics Unlock', icon: '📊', color: 'text-green-600' },
};

export default function RewardedAdHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<RewardUnlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    fetchRewards();
  }, [user]);

  const fetchRewards = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('rewarded_ad_unlocks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setRewards(data || []);
    setLoading(false);
  };

  const handleWatchAd = async () => {
    setWatching(true);
    try {
      const reward = await showRewarded(ADMOB_CONFIG.REWARDED);
      if (reward) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('rewarded_ad_unlocks').insert({
          user_id: user!.id,
          reward_type: 'reach_boost',
          reward_amount: 2,
          ad_unit: ADMOB_CONFIG.REWARDED,
          used: false,
          expires_at: expiresAt,
        });
        toast.success('🎉 2× Reach Boost unlocked! Valid for 24 hours.');
        fetchRewards();
      } else {
        toast.error('Ad not completed — reward not granted');
      }
    } catch {
      toast.error('Could not load ad. Try again shortly.');
    } finally {
      setWatching(false);
    }
  };

  const activeRewards = rewards.filter(r => !r.used && (!r.expires_at || new Date(r.expires_at) > new Date()));
  const usedRewards = rewards.filter(r => r.used || (r.expires_at && new Date(r.expires_at) <= new Date()));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="Reward History" showBack />

      <div className="max-w-2xl mx-auto p-4 space-y-6">

        {/* ── Watch Ad CTA ── */}
        <div className="bg-gradient-to-br from-amber-400/10 via-orange-400/10 to-pink-500/10 border-2 border-amber-400/30 rounded-2xl p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Watch Ad, Earn Rewards</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Watch a short ad to unlock 2× reach boost on your next post
            </p>
          </div>
          <Button
            onClick={handleWatchAd}
            disabled={watching}
            className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold h-12 px-8 hover:opacity-90"
          >
            {watching ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            {watching ? 'Loading Ad…' : 'Watch Ad & Earn'}
          </Button>
          <p className="text-xs text-muted-foreground">Rewards expire after 24 hours</p>
        </div>

        {/* ── Active Rewards ── */}
        {activeRewards.length > 0 && (
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Active Rewards ({activeRewards.length})
            </h3>
            <div className="space-y-3">
              {activeRewards.map(reward => {
                const meta = REWARD_LABELS[reward.reward_type] || { label: reward.reward_type, icon: '🎁', color: 'text-primary' };
                const expiresIn = reward.expires_at
                  ? formatDistanceToNow(new Date(reward.expires_at), { addSuffix: true })
                  : 'No expiry';
                return (
                  <div key={reward.id} className="bg-card border-2 border-amber-400/30 rounded-xl p-4 flex items-center gap-4">
                    <div className="text-2xl shrink-0">{meta.icon}</div>
                    <div className="flex-1">
                      <p className={`font-bold ${meta.color}`}>{meta.label}</p>
                      <p className="text-xs text-muted-foreground">Expires {expiresIn}</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                      Active
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Reward History ── */}
        <div>
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            History ({rewards.length})
          </h3>

          {rewards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-semibold">No rewards yet</p>
              <p className="text-sm">Watch an ad above to earn your first reward</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rewards.map(reward => {
                const meta = REWARD_LABELS[reward.reward_type] || { label: reward.reward_type, icon: '🎁', color: 'text-primary' };
                const expired = reward.expires_at && new Date(reward.expires_at) <= new Date();
                return (
                  <div key={reward.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                    <div className="text-xl shrink-0">{meta.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{meta.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reward.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {reward.used ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900/20 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Used
                        </span>
                      ) : expired ? (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Expired
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
