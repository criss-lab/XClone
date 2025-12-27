import { useState, useEffect } from 'react';
import { ComposePost } from '@/components/features/ComposePost';
import { PostCard } from '@/components/features/PostCard';
import { UserSuggestions } from '@/components/features/UserSuggestions';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Loader2, Sparkles } from 'lucide-react';

const PAGE_SIZE = 10;

export default function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'foryou' | 'following'>('foryou');
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchInitialPosts();
  }, [activeTab, user]);

  const fetchInitialPosts = async () => {
    setLoading(true);
    setPosts([]);
    setPage(0);
    const newPosts = await fetchPosts(0);
    setPosts(newPosts);
    setLoading(false);
  };

  const fetchPosts = async (pageNum: number): Promise<Post[]> => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          user_profiles (*)
        `)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (activeTab === 'following' && user) {
        // Get posts from users the current user follows
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followingData?.map((f) => f.following_id) || [];
        
        if (followingIds.length === 0) {
          return [];
        }

        query = query.in('user_id', followingIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
  };

  const loadMorePosts = async (): Promise<boolean> => {
    const nextPage = page + 1;
    const newPosts = await fetchPosts(nextPage);
    
    if (newPosts.length > 0) {
      setPosts((prev) => [...prev, ...newPosts]);
      setPage(nextPage);
      return newPosts.length === PAGE_SIZE;
    }
    
    return false;
  };

  const { lastElementRef, loading: loadingMore } = useInfiniteScroll(loadMorePosts);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
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

      <ComposePost onSuccess={fetchInitialPosts} />

      <div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-semibold mb-2">No posts yet</p>
            <p className="text-sm">
              {activeTab === 'following'
                ? 'Follow some users to see their posts here'
                : 'Be the first to post!'}
            </p>
          </div>
        ) : (
          <>
            {posts.map((post, index) => (
              <div 
                key={post.id}
                ref={index === posts.length - 1 ? lastElementRef : null}
                className="animate-slide-in"
              >
                <PostCard post={post} onUpdate={fetchInitialPosts} />
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
