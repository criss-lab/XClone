import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { UserSuggestion as UserSuggestionType } from '@/types';
import { Button } from '@/components/ui/button';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function UserSuggestions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<UserSuggestionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user]);

  const fetchSuggestions = async () => {
    if (!user) return;

    try {
      // Generate suggestions
      await supabase.rpc('generate_user_suggestions', { target_user_id: user.id });

      // Fetch suggestions with user data
      const { data, error } = await supabase
        .from('user_suggestions')
        .select(`
          *,
          suggested_user:user_profiles!user_suggestions_suggested_user_id_fkey(*)
        `)
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) return;

    try {
      await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: userId,
      });

      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'follow',
        from_user_id: user.id,
      });

      setFollowingIds((prev) => new Set(prev).add(userId));
      setSuggestions((prev) => prev.filter((s) => s.suggested_user_id !== userId));
    } catch (error) {
      console.error('Error following user:', error);
      toast({
        title: 'Error',
        description: 'Failed to follow user',
        variant: 'destructive',
      });
    }
  };

  if (!user || loading || suggestions.length === 0) return null;

  return (
    <div className="bg-muted/30 rounded-2xl p-4">
      <h2 className="text-xl font-bold mb-4">Who to follow</h2>
      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="flex items-start justify-between">
            <div
              className="flex items-start space-x-3 flex-1 cursor-pointer"
              onClick={() => navigate(`/profile/${suggestion.suggested_user?.username}`)}
            >
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                {suggestion.suggested_user?.avatar_url ? (
                  <img
                    src={suggestion.suggested_user.avatar_url}
                    alt={suggestion.suggested_user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold">
                    {suggestion.suggested_user?.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <p className="font-semibold truncate">{suggestion.suggested_user?.username}</p>
                  {suggestion.suggested_user?.verified && (
                    <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  @{suggestion.suggested_user?.username}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
              </div>
            </div>
            <Button
              onClick={() => handleFollow(suggestion.suggested_user_id)}
              size="sm"
              className="rounded-full px-4"
            >
              Follow
            </Button>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate('/explore')}
        className="text-primary hover:underline mt-4 text-sm"
      >
        Show more
      </button>
    </div>
  );
}
