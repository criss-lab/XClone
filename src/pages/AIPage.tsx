import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { PostCard } from '@/components/features/PostCard';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types';
import { Loader2, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const PAGE_SIZE = 10;

export default function AIPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suggested' | 'trending' | 'news'>('suggested');
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadContent(0);
  }, [activeTab]);

  const loadContent = async (pageNum: number) => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          user_profiles (*)
        `)
        .order('created_at', { ascending: false });

      switch (activeTab) {
        case 'suggested':
          // AI-powered content suggestion algorithm
          // For now, fetch posts with high engagement
          query = query
            .gte('likes_count', 5)
            .order('likes_count', { ascending: false });
          break;
        case 'trending':
          // Trending content based on recent engagement
          query = query
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('likes_count', { ascending: false });
          break;
        case 'news':
          // Verified news from verified accounts
          query = supabase
            .from('posts')
            .select(`
              *,
              user_profiles!inner (*)
            `)
            .eq('user_profiles.verified', true)
            .order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query.range(
        pageNum * PAGE_SIZE,
        (pageNum + 1) * PAGE_SIZE - 1
      );

      if (error) throw error;

      if (pageNum === 0) {
        setPosts(data || []);
      } else {
        setPosts((prev) => [...prev, ...(data || [])]);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async (): Promise<boolean> => {
    const nextPage = page + 1;
    await loadContent(nextPage);
    return posts.length % PAGE_SIZE === 0;
  };

  const { lastElementRef, loading: loadingMore } = useInfiniteScroll(loadMore);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="T AI" />

      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">T AI</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered content discovery and insights
            </p>
          </div>
        </div>
      </div>

      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('suggested')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 flex items-center justify-center space-x-2 ${
              activeTab === 'suggested'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/5'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>For You</span>
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 flex items-center justify-center space-x-2 ${
              activeTab === 'trending'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/5'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Trending</span>
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 flex items-center justify-center space-x-2 ${
              activeTab === 'news'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/5'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Breaking</span>
          </button>
        </div>
      </div>

      <div>
        {posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No {activeTab} content available</p>
            <p className="text-sm mt-1">Check back later for AI-curated content</p>
          </div>
        ) : (
          <>
            {posts.map((post, index) => (
              <div
                key={post.id}
                ref={index === posts.length - 1 ? lastElementRef : null}
              >
                <PostCard post={post} onUpdate={() => loadContent(0)} />
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
    </div>
  );
}
