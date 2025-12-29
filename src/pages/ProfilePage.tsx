import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { PostCard } from '@/components/features/PostCard';
import { EditProfileDialog } from '@/components/features/EditProfileDialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { UserProfile, Post } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { BadgeCheck, Calendar, Loader2, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { formatNumber } from '@/lib/utils';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const PAGE_SIZE = 10;

type ProfileTab = 'posts' | 'media' | 'likes' | 'reposts';

export default function ProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  useEffect(() => {
    if (profile) {
      setPage(0);
      loadTabContent(0);
    }
  }, [activeTab, profile]);

  const fetchProfile = async () => {
    try {
      // Clean the username - remove @ if present
      const cleanUsername = username?.replace('@', '').toLowerCase();
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profileData) {
        setProfile(null);
        setLoading(false);
        return;
      }
      
      setProfile(profileData);

      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .single();

        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTabContent = async (pageNum: number) => {
    if (!profile) return;

    try {
      let data: Post[] = [];

      switch (activeTab) {
        case 'posts':
          data = await fetchPosts(pageNum, profile.id);
          break;
        case 'media':
          data = await fetchMedia(pageNum, profile.id);
          break;
        case 'likes':
          data = await fetchLikes(pageNum, profile.id);
          break;
        case 'reposts':
          data = await fetchReposts(pageNum, profile.id);
          break;
      }

      if (pageNum === 0) {
        setPosts(data);
      } else {
        setPosts((prev) => [...prev, ...data]);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading tab content:', error);
    }
  };

  const fetchPosts = async (pageNum: number, userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user_profiles (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    return data || [];
  };

  const fetchMedia = async (pageNum: number, userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user_profiles (*)
      `)
      .eq('user_id', userId)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    return data || [];
  };

  const fetchLikes = async (pageNum: number, userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from('likes')
      .select(`
        post_id,
        posts (
          *,
          user_profiles (*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    return (data || []).map((like: any) => like.posts).filter(Boolean);
  };

  const fetchReposts = async (pageNum: number, userId: string): Promise<Post[]> => {
    const { data, error} = await supabase
      .from('reposts')
      .select(`
        post_id,
        posts (
          *,
          user_profiles (*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    return (data || []).map((repost: any) => repost.posts).filter(Boolean);
  };

  const loadMore = async (): Promise<boolean> => {
    if (!profile) return false;
    
    const nextPage = page + 1;
    await loadTabContent(nextPage);
    return posts.length % PAGE_SIZE === 0;
  };

  const { lastElementRef, loading: loadingMore } = useInfiniteScroll(loadMore);

  const handleFollow = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setFollowLoading(true);

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile!.id);

        setIsFollowing(false);
      } else {
        await supabase.from('follows').insert({
          follower_id: user.id,
          following_id: profile!.id,
        });

        await supabase.from('notifications').insert({
          user_id: profile!.id,
          type: 'follow',
          from_user_id: user.id,
        });

        setIsFollowing(true);
      }
      
      fetchProfile();
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Error',
        description: 'Failed to update follow status',
        variant: 'destructive',
      });
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="Profile" showBack />
        <div className="text-center py-12 text-muted-foreground">
          <p>Profile not found</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title={profile.username} showBack />

      <div className="border-b border-border">
        <div className="h-48 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10" />
        <div className="px-4 pb-4">
          <div className="flex justify-between items-start -mt-16 mb-4">
            <div className="w-32 h-32 rounded-full border-4 border-background bg-muted overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold">
                  {profile.username[0].toUpperCase()}
                </div>
              )}
            </div>
            {isOwnProfile ? (
              <Button
                onClick={() => setEditDialogOpen(true)}
                variant="outline"
                className="mt-3 rounded-full px-6"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit profile
              </Button>
            ) : (
              <Button
                onClick={handleFollow}
                variant={isFollowing ? 'outline' : 'default'}
                className="mt-3 rounded-full px-6"
                disabled={followLoading}
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  'Following'
                ) : (
                  'Follow'
                )}
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold">{profile.username}</h1>
              {profile.verified && (
                <BadgeCheck className="w-5 h-5 text-primary" fill="currentColor" />
              )}
            </div>

            <p className="text-muted-foreground">@{profile.username}</p>

            {profile.bio && <p className="text-foreground">{profile.bio}</p>}

            <div className="flex items-center space-x-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
              </span>
            </div>

            <div className="flex space-x-4">
              <div>
                <span className="font-bold text-foreground">{formatNumber(profile.following_count)}</span>{' '}
                <span className="text-muted-foreground">Following</span>
              </div>
              <div>
                <span className="font-bold text-foreground">{formatNumber(profile.followers_count)}</span>{' '}
                <span className="text-muted-foreground">Followers</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border sticky top-14 z-30 bg-background">
        <div className="flex">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 ${
              activeTab === 'posts'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/5'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('reposts')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 ${
              activeTab === 'reposts'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/5'
            }`}
          >
            Reposts
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 ${
              activeTab === 'media'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/5'
            }`}
          >
            Media
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 ${
              activeTab === 'likes'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/5'
            }`}
          >
            Likes
          </button>
        </div>
      </div>

      <div>
        {posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No {activeTab} yet</p>
          </div>
        ) : (
          <>
            {posts.map((post, index) => (
              <div
                key={post.id}
                ref={index === posts.length - 1 ? lastElementRef : null}
              >
                <PostCard post={post} onUpdate={() => loadTabContent(0)} />
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

      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchProfile}
      />
    </div>
  );
}
