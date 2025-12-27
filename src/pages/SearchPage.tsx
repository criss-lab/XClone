import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { Search, BadgeCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(query);
  const [activeTab, setActiveTab] = useState('People');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const tabs = ['Top', 'Latest', 'People', 'Media', 'Lists'];

  useEffect(() => {
    if (searchQuery && activeTab === 'People') {
      searchUsers();
    }
  }, [searchQuery, activeTab]);

  useEffect(() => {
    if (user) {
      fetchFollowing();
    }
  }, [user]);

  const fetchFollowing = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    setFollowingIds(new Set(data?.map((f) => f.following_id) || []));
  };

  const searchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const isFollowing = followingIds.has(userId);

      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
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
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Error',
        description: 'Failed to update follow status',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Search" showBack />

      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <form onSubmit={handleSearch} className="p-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-11 rounded-full bg-muted border-0"
            />
          </div>
        </form>

        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-4 font-semibold transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activeTab === 'People' && users.length > 0 ? (
        <div className="divide-y divide-border">
          {users.map((profile) => (
            <div key={profile.id} className="p-4 hover:bg-muted/5 transition-colors">
              <div className="flex items-start justify-between">
                <div
                  className="flex space-x-3 flex-1 cursor-pointer"
                  onClick={() => navigate(`/profile/${profile.username}`)}
                >
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-semibold">
                        {profile.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-1">
                      <h3 className="font-bold">{profile.username}</h3>
                      {profile.verified && (
                        <BadgeCheck className="w-4 h-4 text-primary" fill="currentColor" />
                      )}
                    </div>
                    <p className="text-muted-foreground">@{profile.username}</p>
                    {profile.bio && (
                      <p className="mt-1 text-foreground line-clamp-2">{profile.bio}</p>
                    )}
                  </div>
                </div>
                {user && user.id !== profile.id && (
                  <Button
                    onClick={() => handleFollow(profile.id)}
                    variant={followingIds.has(profile.id) ? 'outline' : 'default'}
                    className="rounded-full px-6"
                    size="sm"
                  >
                    {followingIds.has(profile.id) ? 'Following' : 'Follow'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>
            {searchQuery
              ? 'No results found'
              : 'Try searching for people, topics, or keywords'}
          </p>
        </div>
      )}
    </div>
  );
}
