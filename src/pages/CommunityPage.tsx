import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { PostCard } from '@/components/features/PostCard';
import { ComposePost } from '@/components/features/ComposePost';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Users, TrendingUp } from 'lucide-react';
import { Post } from '@/types';
import { formatNumber } from '@/lib/utils';

interface Community {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon_url?: string;
  banner_url?: string;
  member_count: number;
  post_count: number;
  created_by: string;
}

export default function CommunityPage() {
  const { name } = useParams<{ name: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    if (name) {
      fetchCommunity();
      fetchPosts();
    }
  }, [name]);

  const fetchCommunity = async () => {
    if (!name) return;

    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('name', name)
        .single();

      if (error) throw error;
      setCommunity(data);

      // Check if user is a member
      if (user) {
        const { data: memberData } = await supabase
          .from('community_members')
          .select('id')
          .eq('community_id', data.id)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsMember(!!memberData);
      }
    } catch (error) {
      console.error('Error fetching community:', error);
      toast({
        title: 'Error',
        description: 'Community not found',
        variant: 'destructive',
      });
      navigate('/communities');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!name) return;

    try {
      const { data: communityData } = await supabase
        .from('communities')
        .select('id')
        .eq('name', name)
        .single();

      if (!communityData) return;

      const { data } = await supabase
        .from('posts')
        .select(`
          *,
          user_profiles (*)
        `)
        .eq('community_id', communityData.id)
        .order('created_at', { ascending: false });

      if (data) {
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleJoinToggle = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!community) return;

    try {
      if (isMember) {
        const { error } = await supabase
          .from('community_members')
          .delete()
          .match({ community_id: community.id, user_id: user.id });

        if (error) throw error;
        setIsMember(false);
        toast({ title: 'Left community' });
      } else {
        const { error } = await supabase
          .from('community_members')
          .insert({
            community_id: community.id,
            user_id: user.id,
          });

        if (error) throw error;
        setIsMember(true);
        toast({ title: 'Joined community!' });
      }
      fetchCommunity();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!community) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title={`c/${community.name}`} showBack />

      {/* Community Header */}
      <div className="border-b border-border">
        {community.banner_url && (
          <div className="h-32 bg-muted overflow-hidden">
            <img src={community.banner_url} alt={community.display_name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center -mt-8 border-4 border-background overflow-hidden">
                {community.icon_url ? (
                  <img src={community.icon_url} alt={community.display_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold">{community.display_name[0]}</span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{community.display_name}</h1>
                <p className="text-muted-foreground">c/{community.name}</p>
              </div>
            </div>
            {user && (
              <Button
                onClick={handleJoinToggle}
                variant={isMember ? 'outline' : 'default'}
                className="rounded-full"
              >
                {isMember ? 'Joined' : 'Join'}
              </Button>
            )}
          </div>
          {community.description && (
            <p className="mt-3 text-muted-foreground">{community.description}</p>
          )}
          <div className="flex items-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{formatNumber(community.member_count)}</span>
              <span className="text-muted-foreground">members</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{formatNumber(community.post_count)}</span>
              <span className="text-muted-foreground">posts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      {isMember && <ComposePost onSuccess={fetchPosts} communityId={community.id} />}

      <div>
        {posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-semibold mb-2">No posts yet</p>
            <p className="text-sm">
              {isMember ? 'Be the first to post in this community!' : 'Join to start posting!'}
            </p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} onUpdate={fetchPosts} />)
        )}
      </div>
    </div>
  );
}
