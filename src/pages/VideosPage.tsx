import { useState, useEffect, useRef } from 'react';
import { VideoPlayer } from '@/components/features/VideoPlayer';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types';
import { Loader2, Gift, X, Zap } from 'lucide-react';
import { initAdMob, showInterstitial, showRewarded, ADMOB_CONFIG } from '@/lib/admob';

const AD_EVERY_N_VIDEOS = 4; // interstitial frequency
const PRELOAD_AHEAD = 2;      // number of videos ahead to preload

export default function VideosPage() {
  const [videos, setVideos] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rewarded ad state
  const [showRewardPrompt, setShowRewardPrompt] = useState(false);
  const [rewardPending, setRewardPending] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const lastRewardedAt = useRef(0);

  // Preload map for videos
  const [preloadMap, setPreloadMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchVideos();
    initAdMob();
  }, []);

  // Scroll handling for activeIndex, ads, and preloading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const idx = Math.round(container.scrollTop / window.innerHeight);
      if (idx === activeIndex || idx >= videos.length) return;
      setActiveIndex(idx);

      // Interstitial ads
      if (idx > 0 && idx % AD_EVERY_N_VIDEOS === 0) {
        showInterstitial(ADMOB_CONFIG.INTERSTITIAL);
      }

      // Rewarded ad every 8 videos with 30s cooldown
      if (idx > 0 && idx % 8 === 0 && Date.now() - lastRewardedAt.current > 30_000) {
        setShowRewardPrompt(true);
      }

      // Preload active + next PRELOAD_AHEAD videos
      setPreloadMap(prev => {
        const newMap = { ...prev };
        for (let i = idx; i <= idx + PRELOAD_AHEAD && i < videos.length; i++) {
          newMap[i] = true;
        }
        return newMap;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, videos.length]);

  // Fetch videos
  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, user_profiles (*)')
        .eq('is_video', true)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      setVideos(data || []);

      // Initial preloading of first PRELOAD_AHEAD videos
      const initialPreload: Record<number, boolean> = {};
      for (let i = 0; i < PRELOAD_AHEAD + 1 && i < (data?.length || 0); i++) {
        initialPreload[i] = true;
      }
      setPreloadMap(initialPreload);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Rewarded ad handler
  const handleWatchRewardedAd = async () => {
    setRewardPending(true);
    try {
      const reward = await showRewarded(ADMOB_CONFIG.REWARDED);
      if (reward) {
        lastRewardedAt.current = Date.now();
        setRewardMessage('🎉 You unlocked 2× reach boost on your next post!');
        supabase.from('user_analytics').upsert(
          { user_id: undefined, post_impressions: 0 },
          { onConflict: 'user_id' }
        ).then(() => {});
        setTimeout(() => {
          setShowRewardPrompt(false);
          setRewardMessage('');
        }, 3500);
      } else {
        setShowRewardPrompt(false);
      }
    } finally {
      setRewardPending(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl font-bold mb-2">No videos yet</p>
          <p className="text-white/60">Be the first to post a video!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-screen w-full max-w-full overflow-x-hidden overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        {videos.map((video, index) => (
          <VideoPlayer
            key={video.id}
            post={video}
            isActive={index === activeIndex}
            onUpdate={fetchVideos}
            shouldPreload={!!preloadMap[index]}
          />
        ))}
      </div>

      {/* Rewarded Ad Prompt */}
      {showRewardPrompt && !rewardMessage && (
        <div className="absolute bottom-20 left-0 right-0 mx-4 z-50 animate-slide-in">
          <div className="bg-black/85 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Watch an ad</p>
              <p className="text-white/70 text-xs">Unlock 2× reach boost on your next post</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRewardPrompt(false)}
                className="p-2 text-white/60 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleWatchRewardedAd}
                disabled={rewardPending}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold text-sm px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {rewardPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Watch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reward success toast */}
      {rewardMessage && (
        <div className="absolute bottom-24 left-4 right-4 z-50">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold text-sm px-5 py-3.5 rounded-2xl text-center shadow-lg">
            {rewardMessage}
          </div>
        </div>
      )}
    </div>
  );
}
