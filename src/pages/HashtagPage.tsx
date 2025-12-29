import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { PostCard } from '@/components/features/PostCard';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types';
import { Loader2, Hash, TrendingUp } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export default function HashtagPage() {
  const { tag } = useParams<{ tag: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hashtagInfo, setHashtagInfo] = useState<any>(null);

  useEffect(() => {
    if (tag) {
      fetchHashtagInfo();
      fetchPosts();
    }
  }, [tag]);

  const fetchHashtagInfo = async () => {
    if (!tag) return;

    try {
      const { data } = await supabase
        .from('hashtags')
        .select('*')
        .eq('tag', tag.toLowerCase())
        .single();

      setHashtagInfo(data);
    } catch (error) {
      console.error('Error fetching hashtag info:', error);
    }
  };

  const fetchPosts = async () => {
    if (!tag) return;

    try {
      // First get the hashtag ID
      const { data: hashtagData } = await supabase
        .from('hashtags')
        .select('id')
        .eq('tag', tag.toLowerCase())
        .single();

      if (!hashtagData) {
        setLoading(false);
        return;
      }

      // Get posts with this hashtag
      const { data: postHashtags } = await supabase
        .from('post_hashtags')
        .select('post_id')
        .eq('hashtag_id', hashtagData.id);

      if (!postHashtags || postHashtags.length === 0) {
        setLoading(false);
        return;
      }

      const postIds = postHashtags.map(ph => ph.post_id);

      const { data: postsData } = await supabase
        .from('posts')
        .select(`
          *,
          user_profiles (*)
        `)
        .in('id', postIds)
        .order('created_at', { ascending: false });

      setPosts(postsData || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
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
      <TopBar title={`#${tag}`} showBack />

      {/* Hashtag Header */}
      <div className="border-b border-border p-6">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Hash className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">#{tag}</h1>
            {hashtagInfo && (
              <div className="flex items-center space-x-4 mt-2 text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">{formatNumber(hashtagInfo.usage_count)} posts</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        {posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Hash className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">No posts found</p>
            <p className="text-sm">Be the first to use #{tag}</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
          ))
        )}
      </div>
    </div>
  );
}
