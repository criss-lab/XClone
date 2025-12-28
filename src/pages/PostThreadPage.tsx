import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { PostCard } from '@/components/features/PostCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Post } from '@/types';
import { Loader2, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Reply {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_profiles: {
    id: string;
    username: string;
    avatar_url?: string;
    verified: boolean;
  };
}

export default function PostThreadPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPostAndReplies();
    }
  }, [postId]);

  const fetchPostAndReplies = async () => {
    if (!postId) return;

    try {
      // Fetch main post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          user_profiles (*)
        `)
        .eq('id', postId)
        .single();

      if (postError) throw postError;
      setPost(postData);

      // Fetch replies
      const { data: repliesData, error: repliesError } = await supabase
        .from('replies')
        .select(`
          *,
          user_profiles (*)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;
      setReplies(repliesData || []);
    } catch (error) {
      console.error('Error fetching thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to load post',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!replyContent.trim() || !postId) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.from('replies').insert({
        post_id: postId,
        user_id: user.id,
        content: replyContent.trim(),
      });

      if (error) throw error;

      // Update replies count
      if (post) {
        await supabase
          .from('posts')
          .update({ replies_count: post.replies_count + 1 })
          .eq('id', postId);
      }

      // Create notification
      if (post && post.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'reply',
          from_user_id: user.id,
          post_id: postId,
        });
      }

      setReplyContent('');
      toast({ title: 'Reply posted successfully' });
      fetchPostAndReplies();
    } catch (error: any) {
      console.error('Reply error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to post reply',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Post" showBack />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Post not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Post" showBack />

      {/* Main Post */}
      <PostCard post={post} onUpdate={fetchPostAndReplies} />

      {/* Reply Composer */}
      {user && (
        <div className="border-b border-border p-4">
          <div className="flex space-x-3">
            <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0 overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                  {user.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <Textarea
                placeholder="Post your reply"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px] border-0 resize-none focus-visible:ring-0 p-0 text-base bg-transparent"
                maxLength={280}
              />
              <div className="flex items-center justify-between mt-3">
                {replyContent.length > 0 && (
                  <span
                    className={`text-sm ${
                      replyContent.length > 260 ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {replyContent.length}/280
                  </span>
                )}
                <Button
                  onClick={handleReply}
                  disabled={submitting || !replyContent.trim() || replyContent.length > 280}
                  className="rounded-full px-6 font-semibold ml-auto"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reply'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replies */}
      <div>
        {replies.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No replies yet</p>
            <p className="text-sm mt-1">Be the first to reply!</p>
          </div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="border-b border-border p-4 hover:bg-muted/5 transition-colors">
              <div className="flex space-x-3">
                <div
                  className="w-10 h-10 rounded-full bg-muted flex-shrink-0 overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/profile/${reply.user_profiles.username}`)}
                >
                  {reply.user_profiles.avatar_url ? (
                    <img
                      src={reply.user_profiles.avatar_url}
                      alt={reply.user_profiles.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-semibold">
                      {reply.user_profiles.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-1">
                    <span
                      className="font-bold cursor-pointer hover:underline"
                      onClick={() => navigate(`/profile/${reply.user_profiles.username}`)}
                    >
                      {reply.user_profiles.username}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      @{reply.user_profiles.username}
                    </span>
                  </div>
                  <p className="text-foreground mt-1 whitespace-pre-wrap break-words">{reply.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
