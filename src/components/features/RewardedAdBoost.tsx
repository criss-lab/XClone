import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { showRewarded, ADMOB_CONFIG, AD_REVENUE_SPLIT, isAdMobSupported } from '@/lib/admob';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Zap, Play, TrendingUp, Gift, Loader2, CheckCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RewardedAdBoostProps {
  postId: string;
  postContent?: string;
  onClose?: () => void;
  onBoostApplied?: () => void;
}

type BoostState = 'idle' | 'loading' | 'watching' | 'applying' | 'success';

const BOOST_OPTIONS = [
  {
    id: 'reach',
    label: 'Reach Boost',
    description: 'Increase post reach by 2× for 24 hours',
    rewardType: 'reach_boost',
    rewardAmount: 1,
    icon: TrendingUp,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    id: 'featured',
    label: 'Featured Spot',
    description: 'Pin post to Explore for 12 hours',
    rewardType: 'featured_boost',
    rewardAmount: 2,
    icon: Star,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  {
    id: 'viral',
    label: 'Viral Push',
    description: 'Push to 5× more follower feeds',
    rewardType: 'viral_boost',
    rewardAmount: 3,
    icon: Zap,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
];

export function RewardedAdBoost({ postId, postContent, onClose, onBoostApplied }: RewardedAdBoostProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(BOOST_OPTIONS[0]);
  const [boostState, setBoostState] = useState<BoostState>('idle');
  const [earnedReward, setEarnedReward] = useState<any>(null);
  const isNative = isAdMobSupported();

  const handleWatchAd = async () => {
    if (!user) { toast.error('Sign in to boost posts'); return; }
    setBoostState('loading');

    try {
      if (isNative) {
        // Real AdMob rewarded ad on native
        setBoostState('watching');
        const reward = await showRewarded(ADMOB_CONFIG.REWARDED);
        if (!reward) {
          toast.error('Ad not completed — boost not applied');
          setBoostState('idle');
          return;
        }
        setEarnedReward(reward);
      } else {
        // Web simulation: show loading for 2s then grant reward
        setBoostState('watching');
        await new Promise(r => setTimeout(r, 2000));
        setEarnedReward({ type: selected.rewardType, amount: selected.rewardAmount });
      }

      // Apply boost
      setBoostState('applying');
      await applyBoost();
    } catch (e: any) {
      console.error('[RewardedBoost] Error:', e);
      toast.error('Failed to show ad. Try again.');
      setBoostState('idle');
    }
  };

  const applyBoost = async () => {
    if (!user) return;

    try {
      // Record the reward unlock
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (selected.id === 'featured' ? 12 : 24));

      const { error: rewardError } = await supabase.from('rewarded_ad_unlocks').insert({
        user_id: user.id,
        reward_type: selected.rewardType,
        reward_amount: selected.rewardAmount,
        ad_unit: ADMOB_CONFIG.REWARDED,
        used: true,
        expires_at: expiresAt.toISOString(),
      });

      if (rewardError) throw rewardError;

      // Apply the boost via boosted_posts
      const { error: boostError } = await supabase.from('boosted_posts').insert({
        post_id: postId,
        user_id: user.id,
        boost_type: selected.rewardType,
        budget: 0, // free via rewarded ad
        is_active: true,
        is_sponsored: false,
        end_date: expiresAt.toISOString(),
      });

      // Tolerate duplicate boost errors
      if (boostError && !boostError.message.includes('duplicate')) {
        console.warn('[RewardedBoost] Boost insert warn:', boostError.message);
      }

      // Track creator earnings from rewarded ad (30% split)
      const estimatedRevenue = AD_REVENUE_SPLIT.ESTIMATED_CPM.rewarded / 1000;
      const creatorShare = estimatedRevenue * AD_REVENUE_SPLIT.CREATOR_SHARE;

      await supabase.from('creator_earnings').insert({
        user_id: user.id,
        source: 'rewarded_ads',
        amount: creatorShare,
        post_id: postId,
        status: 'pending',
      }).catch(() => {});

      setBoostState('success');
      toast.success(`${selected.label} applied! Your post is now boosted.`);
      onBoostApplied?.();
    } catch (e: any) {
      console.error('[RewardedBoost] Apply error:', e);
      toast.error(e.message || 'Failed to apply boost');
      setBoostState('idle');
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (boostState === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-lg text-foreground mb-1">{selected.label} Applied!</h3>
          <p className="text-sm text-muted-foreground">
            Your post will receive boosted reach for the next{' '}
            {selected.id === 'featured' ? '12' : '24'} hours.
          </p>
        </div>
        <Button onClick={onClose} className="w-full">
          Done
        </Button>
      </div>
    );
  }

  // ── Watching / Loading state ──────────────────────────────────────────────
  if (boostState === 'watching' || boostState === 'applying') {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          {boostState === 'applying' ? (
            <Zap className="w-8 h-8 text-primary animate-pulse" />
          ) : (
            <Play className="w-8 h-8 text-primary" />
          )}
        </div>
        <div className="text-center">
          <h3 className="font-bold text-foreground mb-1">
            {boostState === 'applying' ? 'Applying Boost...' : isNative ? 'Watching Ad...' : 'Processing...'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {boostState === 'applying' ? 'Just a moment' : 'Please watch the full ad to earn your boost'}
          </p>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl p-4 text-center">
        <Gift className="w-8 h-8 text-primary mx-auto mb-2" />
        <h3 className="font-bold text-foreground text-lg">Free Post Boost</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Watch a short ad to boost your post reach — completely free!
        </p>
        {!isNative && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 bg-amber-500/10 px-3 py-1 rounded-full inline-block">
            Native app: real AdMob rewarded ads
          </p>
        )}
      </div>

      {/* Post preview */}
      {postContent && (
        <div className="bg-muted/30 border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Boosting:</p>
          <p className="text-sm line-clamp-2">{postContent}</p>
        </div>
      )}

      {/* Boost options */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">Choose boost type:</p>
        {BOOST_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setSelected(opt)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
              selected.id === opt.id
                ? `${opt.bg} ${opt.border} border-2`
                : 'bg-card border-border hover:bg-muted/30'
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', opt.bg)}>
              <opt.icon className={cn('w-5 h-5', opt.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
            <div className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
              selected.id === opt.id ? `${opt.border.replace('/30', '')} ${opt.color.replace('text-', 'bg-').replace('-500', '-500')}` : 'border-muted-foreground'
            )}>
              {selected.id === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
            </div>
          </button>
        ))}
      </div>

      {/* Revenue info */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
        <p className="text-xs text-green-700 dark:text-green-400">
          You earn <strong>30% of ad revenue</strong> from every rewarded ad watched — credited automatically.
        </p>
      </div>

      {/* CTA */}
      <Button onClick={handleWatchAd} disabled={boostState !== 'idle'} className="w-full gap-2 h-12 text-base font-semibold">
        <Play className="w-5 h-5" />
        Watch Ad & Boost Post
      </Button>

      <button onClick={onClose} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
        Maybe later
      </button>
    </div>
  );
}
