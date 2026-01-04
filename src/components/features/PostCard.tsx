import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, BadgeCheck, Trash2 } from 'lucide-react';
import { Post } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn, parseContent, formatNumber } from '@/lib/utils';
import { SharePostDialog } from './SharePostDialog';
import { BookmarkButton } from './BookmarkButton';
import { PollCard } from './PollCard';
import { EditPostDialog } from './EditPostDialog';

interface PostCardProps {
  post: Post;
  onUpdate?: () => void;
}

export function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [repostsCount, setRepostsCount] = useState(post.reposts_count);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [poll, setPoll] = useState<any>(null);

  // Fetch poll if it exists
  useEffect(() => {
    const fetchPoll = async () => {
      const { data } = await supabase
        .from('polls')
        .select(`
          *,
          options:poll_options(*)
        `)
        .eq('post_id', post.id)
        .single();

      if (data) setPoll(data);
    };

    fetchPoll();
  }, [post.id]);

  // Check if user has already liked/reposted this post
  useEffect(() => {
    if (!user) return;

    const checkUserInteractions = async () => {
      try {
        // Check if liked
        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', post.id)
          .maybeSingle();

        setIsLiked(!!likeData);

        // Check if reposted
        const { data: repostData } = await supabase
          .from('reposts')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', post.id)
          .maybeSingle();

        setIsReposted(!!repostData);
      } catch (error) {
        console.error('Error checking user interactions:', error);
      }
    };

    checkUserInteractions();
  }, [user, post.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/auth');
      return;
    }

    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

    setIsLiked(newIsLiked);
    setLikesCount(newCount);

    try {
      if (newIsLiked) {
        const { error: insertError } = await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: post.id });
        
        if (insertError) throw insertError;

        const { error: updateError } = await supabase
          .from('posts')
          .update({ likes_count: newCount })
          .eq('id', post.id);
        
        if (updateError) throw updateError;
        
        if (post.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            type: 'like',
            from_user_id: user.id,
            post_id: post.id,
          });
        }
      } else {
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
        
        if (deleteError) throw deleteError;

        const { error: updateError } = await supabase
          .from('posts')
          .update({ likes_count: newCount })
          .eq('id', post.id);
        
        if (updateError) throw updateError;
      }
      onUpdate?.();
    } catch (error: any) {
      console.error('Like error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to like post',
        variant: 'destructive',
      });
      setIsLiked(!newIsLiked);
      setLikesCount(likesCount);
    }
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate('/auth');
      return;
    }

    const newIsReposted = !isReposted;
    const newCount = newIsReposted ? repostsCount + 1 : Math.max(0, repostsCount - 1);

    setIsReposted(newIsReposted);
    setRepostsCount(newCount);

    try {
      if (newIsReposted) {
        const { error: insertError } = await supabase
          .from('reposts')
          .insert({ user_id: user.id, post_id: post.id });
        
        if (insertError) throw insertError;

        const { error: updateError } = await supabase
          .from('posts')
          .update({ reposts_count: newCount })
          .eq('id', post.id);
        
        if (updateError) throw updateError;
        
        if (post.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            type: 'repost',
            from_user_id: user.id,
            post_id: post.id,
          });
        }
        
        toast({ title: 'Reposted successfully' });
      } else {
        const { error: deleteError } = await supabase
          .from('reposts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
        
        if (deleteError) throw deleteError;

        const { error: updateError } = await supabase
          .from('posts')
          .update({ reposts_count: newCount })
          .eq('id', post.id);
        
        if (updateError) throw updateError;
        
        toast({ title: 'Repost removed' });
      }
      onUpdate?.();
    } catch (error: any) {
      console.error('Repost error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to repost',
        variant: 'destructive',
      });
      setIsReposted(!newIsReposted);
      setRepostsCount(repostsCount);
    }
  };

  const handlePostClick = () => {
    navigate(`/post/${post.id}`);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({ title: 'Post deleted successfully' });
      onUpdate?.();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete post',
        variant: 'destructive',
      });
    }
  };

  return (
    <div 
      className="border-b border-border p-4 hover:bg-muted/5 transition-colors cursor-pointer"
      onClick={handlePostClick}
    >
      <div className="flex space-x-3">
        <div 
          className="w-10 h-10 rounded-full bg-muted flex-shrink-0 overflow-hidden cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${post.user_profiles?.username}`);
          }}
        >
          {post.user_profiles?.avatar_url ? (
            <img
              src={post.user_profiles.avatar_url}
              alt={post.user_profiles.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-semibold">
              {post.user_profiles?.username[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-1 min-w-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${post.user_profiles?.username}`);
              }}
            >
              <span className="font-bold text-foreground truncate">
                {post.user_profiles?.username}
              </span>
              {post.user_profiles?.verified && (
                <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" />
              )}
              <span className="text-muted-foreground text-sm truncate">
                @{post.user_profiles?.username}
              </span>
              <span className="text-muted-foreground text-sm flex-shrink-0">·</span>
              <span className="text-muted-foreground text-sm flex-shrink-0">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            {user?.id === post.user_id && (
              <div className="relative">
                <button 
                  className="text-muted-foreground hover:text-primary p-2 -mr-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteMenu(!showDeleteMenu);
                  }}
                  title="Options"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {showDeleteMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEditDialog(true);
                        setShowDeleteMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-muted flex items-center gap-2"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      Edit post
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteMenu(false);
                        handleDelete();
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-destructive/10 text-destructive flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div 
            className="post-content text-foreground mt-1 whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: parseContent(post.content) }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'A') {
                e.stopPropagation();
              }
            }}
          />

          {post.image_url && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-border">
              <img src={post.image_url} alt="Post" className="w-full" />
            </div>
          )}

          {poll && <PollCard poll={poll} postId={post.id} />}

          <div className="flex justify-between mt-3 max-w-md">
            <button 
              className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors group"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/post/${post.id}`);
              }}
            >
              <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-sm">{formatNumber(post.replies_count)}</span>
            </button>

            <button
              onClick={handleRepost}
              className={cn(
                'flex items-center space-x-2 transition-colors group',
                isReposted ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'
              )}
            >
              <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                <Repeat2 className="w-5 h-5" />
              </div>
              <span className="text-sm">{formatNumber(repostsCount)}</span>
            </button>

            <button
              onClick={handleLike}
              className={cn(
                'flex items-center space-x-2 transition-colors group',
                isLiked ? 'text-pink-600' : 'text-muted-foreground hover:text-pink-600'
              )}
            >
              <div className="p-2 rounded-full group-hover:bg-pink-600/10 transition-colors">
                <Heart className={cn('w-5 h-5', isLiked && 'fill-current')} />
              </div>
              <span className="text-sm">{formatNumber(likesCount)}</span>
            </button>

            <button 
              className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors group"
              onClick={(e) => {
                e.stopPropagation();
                setShowShareDialog(true);
              }}
            >
              <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                <Share className="w-5 h-5" />
              </div>
            </button>

            <div onClick={(e) => e.stopPropagation()}>
              <BookmarkButton postId={post.id} />
            </div>
          </div>
        </div>
      </div>

      <SharePostDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        post={post}
      />

      {user?.id === post.user_id && (
        <EditPostDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          post={post}
          onSuccess={() => {
            onUpdate?.();
            toast({ title: 'Post updated' });
          }}
        />
      )}
    </div>
  );
}
