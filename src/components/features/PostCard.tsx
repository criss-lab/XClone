import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, BadgeCheck } from 'lucide-react';
import { Post } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn, parseContent, formatNumber } from '@/lib/utils';

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
        await supabase.from('likes').insert({ user_id: user.id, post_id: post.id });
        await supabase.from('posts').update({ likes_count: newCount }).eq('id', post.id);
        
        if (post.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            type: 'like',
            from_user_id: user.id,
            post_id: post.id,
          });
        }
      } else {
        await supabase.from('likes').delete().match({ user_id: user.id, post_id: post.id });
        await supabase.from('posts').update({ likes_count: newCount }).eq('id', post.id);
      }
      onUpdate?.();
    } catch (error: any) {
      console.error('Like error:', error);
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
        await supabase.from('reposts').insert({ user_id: user.id, post_id: post.id });
        await supabase.from('posts').update({ reposts_count: newCount }).eq('id', post.id);
        
        if (post.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            type: 'repost',
            from_user_id: user.id,
            post_id: post.id,
          });
        }
      } else {
        await supabase.from('reposts').delete().match({ user_id: user.id, post_id: post.id });
        await supabase.from('posts').update({ reposts_count: newCount }).eq('id', post.id);
      }
      onUpdate?.();
    } catch (error: any) {
      console.error('Repost error:', error);
      setIsReposted(!newIsReposted);
      setRepostsCount(repostsCount);
    }
  };

  return (
    <div className="border-b border-border p-4 hover:bg-muted/5 transition-colors cursor-pointer">
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
            <button 
              className="text-muted-foreground hover:text-primary p-2 -mr-2"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
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

          <div className="flex justify-between mt-3 max-w-md">
            <button 
              className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors group"
              onClick={(e) => e.stopPropagation()}
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
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                <Share className="w-5 h-5" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
