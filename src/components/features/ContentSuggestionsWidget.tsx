import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Loader2, BadgeCheck } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function ContentSuggestionsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, [user]);

  const fetchSuggestions = async () => {
    try {
      // Get trending posts and posts from popular users
      const { data: trendingPosts } = await supabase
        .from('posts')
        .select(`
          *,
          user_profiles (*)
        `)
        .order('likes_count', { ascending: false })
        .limit(5);

      setSuggestions(trendingPosts || []);
    } catch (error) {
      console.error('Error fetching content suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-muted/30 rounded-xl p-4">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Suggested for you
      </h2>
      <div className="space-y-4">
        {suggestions.map((post) => (
          <div
            key={post.id}
            onClick={() => navigate(`/post/${post.id}`)}
            className="cursor-pointer hover:bg-muted/50 -mx-2 p-2 rounded-lg transition-colors"
          >
            <div className="flex items-start space-x-2 mb-2">
              <div
                className="w-6 h-6 rounded-full bg-muted overflow-hidden flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${post.user_profiles.username}`);
                }}
              >
                {post.user_profiles.avatar_url ? (
                  <img
                    src={post.user_profiles.avatar_url}
                    alt={post.user_profiles.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                    {post.user_profiles.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <span className="font-semibold text-sm truncate">
                    {post.user_profiles.username}
                  </span>
                  {post.user_profiles.verified && (
                    <BadgeCheck className="w-3 h-3 text-primary flex-shrink-0" fill="currentColor" />
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm line-clamp-2 mb-2">{post.content}</p>
            {post.image_url && (
              <img
                src={post.image_url}
                alt="Post"
                className="w-full rounded-lg max-h-32 object-cover"
              />
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{formatNumber(post.likes_count)} likes</span>
              <span>{formatNumber(post.reposts_count)} reposts</span>
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
