import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposePost } from '@/components/features/ComposePost';
import { PostCard } from '@/components/features/PostCard';
import { UserSuggestions } from '@/components/features/UserSuggestions';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Loader2, Sparkles, Hash, MessageCircle, Repeat2, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatNumber } from '@/lib/utils';
import { DynamicAd } from '@/components/features/DynamicAd';
import { VideoAdPlayer } from '@/components/features/VideoAdPlayer';
import { SponsoredPostCard } from '@/components/features/SponsoredPostCard';

const PAGE_SIZE = 10;

type FeedItem = 
  | { type: 'post'; data: Post }
  | { type: 'thread'; data: any };

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [page, setPage] = useState(0);
  const [sponsoredPosts, setSponsoredPosts] = useState<any[]>([]);
  const [showVideoAd, setShowVideoAd] = useState(false);
  const [videoAdShown, setVideoAdShown] = useState(false);

  useEffect(() => {
    fetchInitialFeed();
    fetchSponsoredContent();
  }, [activeTab, user]);

  useEffect(() => {
    if (!videoAdShown && feedItems.length > 0 && activeTab === 'foryou') {
      const shouldShowAd = Math.random() < 0.3;
      if (shouldShowAd) {
        setShowVideoAd(true);
        setVideoAdShown(true);
      }
    }
  }, [feedItems, videoAdShown, activeTab]);

  const fetchSponsoredContent = async () => {
    try {
      const { data, error } = await supabase.rpc('get_sponsored_posts', {
        user_id_param: user?.id,
        limit_param: 3
      });

      if (!error && data) {
        setSponsoredPosts(data);
      }
    } catch (error) {
      console.error('Error fetching sponsored content:', error);
    }
  };

  const fetchInitialFeed = async () => {
    setLoading(true);
    setFeedItems([]);
    setPage(0);
    const newItems = await fetchFeed(0);
    setFeedItems(newItems);
    setLoading(false);
  };

  const fetchFeed = async (pageNum: number): Promise<FeedItem[]> => {
    try {
      const items: FeedItem[] = [];
      
      // Fetch posts
      let postsQuery = supabase
        .from('posts')
        .select(`
          *,
          user_profiles (*)
        `)
        .is('community_id', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      // Fetch threads
      let threadsQuery = supabase
        .from('threads')
        .select(`
          *,
          user_profiles (*)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (activeTab === 'following' && user) {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followingData?.map((f) => f.following_id) || [];
        
        if (followingIds.length === 0) {
          return [];
        }

        postsQuery = postsQuery.in('user_id', followingIds);
        threadsQuery = threadsQuery.in('user_id', followingIds);
      }

      const [postsResult, threadsResult] = await Promise.all([
        postsQuery,
        threadsQuery
      ]);

      // Combine and sort by created_at
      const posts = (postsResult.data || []).map(p => ({ type: 'post' as const, data: p, created_at: p.created_at }));
      const threads = (threadsResult.data || []).map(t => ({ type: 'thread' as const, data: t, created_at: t.created_at }));
      
      const combined = [...posts, ...threads]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE);

      // Insert sponsored posts organically (every 5-7 items)
      const withSponsored: any[] = [];
      let sponsoredIndex = 0;
      
      for (let i = 0; i < combined.length; i++) {
        withSponsored.push(combined[i]);
        
        if ((i + 1) % (5 + Math.floor(Math.random() * 3)) === 0 && sponsoredIndex < sponsoredPosts.length) {
          withSponsored.push({
            type: 'sponsored',
            data: sponsoredPosts[sponsoredIndex]
          });
          sponsoredIndex++;
        }
      }

      return withSponsored.map(({ type, data }) => ({ type, data }));
    } catch (error) {
      console.error('Error fetching feed:', error);
      return [];
    }
  };

  const loadMoreFeed = async (): Promise<boolean> => {
    const nextPage = page + 1;
    const newItems = await fetchFeed(nextPage);
    
    if (newItems.length > 0) {
      setFeedItems((prev) => [...prev, ...newItems]);
      setPage(nextPage);
      return newItems.length === PAGE_SIZE;
    }
    
    return false;
  };

  const { lastElementRef, loading: loadingMore } = useInfiniteScroll(loadMoreFeed);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      {showVideoAd && (
        <VideoAdPlayer
          videoUrl=""
          onAdComplete={() => setShowVideoAd(false)}
          onSkip={() => setShowVideoAd(false)}
          allowSkip={true}
          skipAfter={5}
        />
      )}
      
      <TopBar title="Home" />

      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('foryou')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 ${
              activeTab === 'foryou'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>For you</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 ${
              activeTab === 'following'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/50'
            }`}
          >
            Following
          </button>
        </div>
      </div>

      <ComposePost onSuccess={fetchInitialFeed} />

      {/* Top Ad Placement */}
      <DynamicAd location="feed_top" className="border-b border-border p-4" />

      <div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : feedItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-semibold mb-2">No content yet</p>
            <p className="text-sm">
              {activeTab === 'following'
                ? 'Follow some users to see their posts and threads here'
                : 'Be the first to post!'}
            </p>
          </div>
        ) : (
          <>
            {feedItems.map((item, index) => (
              <div key={`${item.type}-${item.data.id}`}>
                <div 
                  ref={index === feedItems.length - 1 ? lastElementRef : null}
                  className="animate-slide-in"
                >
                  {item.type === 'post' ? (
                    <PostCard post={item.data} onUpdate={fetchInitialFeed} />
                  ) : item.type === 'sponsored' ? (
                    <SponsoredPostCard post={item.data} />
                  ) : (
                    <ThreadCard thread={item.data} />
                  )}
                </div>
                {/* Inline Ad every 5 posts */}
                {(index + 1) % 5 === 0 && (
                  <DynamicAd location="feed_inline" className="border-b border-border p-4" />
                )}
              </div>
            ))}
            {loadingMore && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </>
        )}
      </div>

      <div className="hidden lg:block fixed right-8 top-20 w-80">
        <UserSuggestions />
      </div>
    </div>
  );
}

function ThreadCard({ thread }: { thread: any }) {
  const navigate = useNavigate();
  const [coverImage, setCoverImage] = useState('');

  useEffect(() => {
    if (thread.cover_image) {
      setCoverImage(thread.cover_image);
    }
  }, [thread.cover_image]);

  return (
    <div
      onClick={() => navigate(`/thread/${thread.id}`)}
      className="border-b border-border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
          {thread.user_profiles?.avatar_url ? (
            <img
              src={thread.user_profiles.avatar_url}
              alt={thread.user_profiles.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold">
              {thread.user_profiles?.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold hover:underline">
              {thread.user_profiles?.username}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
            </span>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-lg">{thread.title}</h3>
            </div>
            <p className="text-muted-foreground line-clamp-2">{thread.content}</p>
          </div>

          {coverImage && (
            <div className="mb-3 rounded-xl overflow-hidden border border-border">
              <img
                src={coverImage}
                alt={thread.title}
                className="w-full max-h-60 object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="flex items-center gap-6 text-muted-foreground">
            <button className="flex items-center gap-2 hover:text-primary transition-colors group">
              <MessageCircle className="w-5 h-5 group-hover:fill-primary/10" />
              <span className="text-sm">{formatNumber(thread.replies_count || 0)}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-green-500 transition-colors group">
              <Repeat2 className="w-5 h-5" />
              <span className="text-sm">{formatNumber(thread.reposts_count || 0)}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-red-500 transition-colors group">
              <Heart className="w-5 h-5 group-hover:fill-red-500/20" />
              <span className="text-sm">{formatNumber(thread.likes_count || 0)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
