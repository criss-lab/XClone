import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Heart, Share, BadgeCheck, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { parseContent, formatNumber } from '@/lib/utils';
import { PostCard } from '@/components/features/PostCard';
import { useToast } from '@/hooks/use-toast';

export default function ThreadDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [thread, setThread] = useState<any>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (id) {
      fetchThread();
      incrementViews();
    }
  }, [id]);

  const incrementViews = async () => {
    if (!id) return;
    
    await supabase
      .from('threads')
      .update({ views_count: supabase.raw('views_count + 1') })
      .eq('id', id);
  };

  const fetchThread = async () => {
    try {
      const { data, error } = await supabase
        .from('threads')
        .select(`
          *,
          user_profiles (
            id,
            username,
            avatar_url,
            verified
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setThread(data);

      // Extract hashtags and fetch related posts
      const hashtags = (data.content.match(/#\w+/g) || []).map(tag => tag.substring(1).toLowerCase());
      
      if (hashtags.length > 0) {
        const { data: hashtagsData } = await supabase
          .from('hashtags')
          .select('id')
          .in('tag', hashtags);

        if (hashtagsData && hashtagsData.length > 0) {
          const hashtagIds = hashtagsData.map(h => h.id);
          
          const { data: postsData } = await supabase
            .from('post_hashtags')
            .select(`
              post_id,
              posts (
                *,
                user_profiles (*)
              )
            `)
            .in('hashtag_id', hashtagIds)
            .limit(10);

          const posts = (postsData || []).map((item: any) => item.posts).filter(Boolean);
          setRelatedPosts(posts);
        }
      }
    } catch (error) {
      console.error('Error fetching thread:', error);
      toast({
        title: 'Error',
        description: 'Thread not found',
        variant: 'destructive',
      });
      navigate('/threads');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user || !thread) return;

    const newLikesCount = isLiked ? thread.likes_count - 1 : thread.likes_count + 1;
    setIsLiked(!isLiked);
    setThread({ ...thread, likes_count: newLikesCount });

    await supabase
      .from('threads')
      .update({ likes_count: newLikesCount })
      .eq('id', thread.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!thread) return null;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Thread" showBack />

      <article className="max-w-3xl mx-auto">
        {/* Thread Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3 mb-4">
            <div
              className="w-12 h-12 rounded-full bg-muted overflow-hidden cursor-pointer"
              onClick={() => navigate(`/profile/${thread.user_profiles.username}`)}
            >
              {thread.user_profiles.avatar_url ? (
                <img
                  src={thread.user_profiles.avatar_url}
                  alt={thread.user_profiles.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold">
                  {thread.user_profiles.username[0].toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold">{thread.user_profiles.username}</span>
                {thread.user_profiles.verified && (
                  <BadgeCheck className="w-4 h-4 text-primary" fill="currentColor" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4">{thread.title}</h1>

          {thread.cover_image && (
            <img
              src={thread.cover_image}
              alt={thread.title}
              className="rounded-xl w-full max-h-[500px] object-cover mb-6"
            />
          )}

          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: parseContent(thread.content) }}
          />
        </div>

        {/* Thread Actions */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Button
              variant={isLiked ? 'default' : 'ghost'}
              size="sm"
              onClick={handleLike}
              className="rounded-full"
            >
              <Heart className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
              {formatNumber(thread.likes_count)}
            </Button>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">{formatNumber(thread.views_count)} views</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-full">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="border-t border-border">
            <div className="p-4 bg-muted/30">
              <h2 className="font-bold text-lg">Related Posts</h2>
              <p className="text-sm text-muted-foreground">Posts with similar topics</p>
            </div>
            <div>
              {relatedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
