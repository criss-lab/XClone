import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { TopBar } from '@/components/layout/TopBar';
import { PostCard } from '@/components/features/PostCard';
import { EditProfileDialog } from '@/components/features/EditProfileDialog';
import { Calendar, MapPin, Link as LinkIcon, Mail, BadgeCheck, Loader2, ExternalLink, Twitter, Instagram, Linkedin, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatNumber } from '@/lib/utils';
import { Post } from '@/types';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const tabs = ['Posts', 'Threads', 'Replies', 'Media', 'Likes'];

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  useEffect(() => {
    if (profile && currentUser && profile.id !== currentUser.id) {
      checkFollowStatus();
    }
  }, [profile, currentUser]);

  const fetchProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      await Promise.all([
        fetchPosts(profileData.id),
        fetchThreads(profileData.id)
      ]);
    } catch (error) {
      console.error('Error fetching profile:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (userId: string) => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user_profiles (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }
    setPosts(data || []);
  };

  const fetchThreads = async (userId: string) => {
    const { data, error } = await supabase
      .from('threads')
      .select('*')
      .eq('user_id', userId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching threads:', error);
      return;
    }
    setThreads(data || []);
  };

  const checkFollowStatus = async () => {
    if (!currentUser || !profile) return;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', profile.id)
      .single();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id);
      } else {
        await supabase.from('follows').insert({
          follower_id: currentUser.id,
          following_id: profile.id,
        });

        await supabase.from('notifications').insert({
          user_id: profile.id,
          type: 'follow',
          from_user_id: currentUser.id,
        });
      }
      setIsFollowing(!isFollowing);
      fetchProfile();
    } catch (error: any) {
      console.error('Follow error:', error);
    }
  };

  const handleMessage = () => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }
    navigate(`/messages?to=${profile.username}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title={profile.username} showBack />

      {/* Profile Header */}
      <div className="border-b border-border">
        {profile.cover_image && (
          <div className="h-48 bg-muted overflow-hidden">
            <img
              src={profile.cover_image}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>
        )}

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

            <div className="flex gap-2 mt-2">
              {isOwnProfile ? (
                <button
                  onClick={() => setShowEditDialog(true)}
                  className="px-4 py-2 border border-border rounded-full font-semibold hover:bg-muted transition-colors"
                >
                  Edit profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleMessage}
                    className="px-4 py-2 border border-border rounded-full font-semibold hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                  <button
                    onClick={handleFollow}
                    className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                      isFollowing
                        ? 'border border-border hover:bg-muted'
                        : 'bg-foreground text-background hover:opacity-90'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{profile.username}</h2>
              {profile.verified && (
                <BadgeCheck className="w-5 h-5 text-primary" fill="currentColor" />
              )}
            </div>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>

          {profile.bio && <p className="mb-3 break-words">{profile.bio}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mb-3">
            {profile.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <LinkIcon className="w-4 h-4" />
                <span>{profile.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}</span>
            </div>
          </div>

          {/* Social Links */}
          {(profile.twitter_handle || profile.instagram_handle || profile.linkedin_url) && (
            <div className="flex gap-3 mb-3">
              {profile.twitter_handle && (
                <a
                  href={`https://twitter.com/${profile.twitter_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Twitter/X"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {profile.instagram_handle && (
                <a
                  href={`https://instagram.com/${profile.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <button className="hover:underline">
              <span className="font-bold">{formatNumber(profile.following_count)}</span>{' '}
              <span className="text-muted-foreground">Following</span>
            </button>
            <button className="hover:underline">
              <span className="font-bold">{formatNumber(profile.followers_count)}</span>{' '}
              <span className="text-muted-foreground">Followers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-14 z-30 bg-background border-b border-border">
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

      {/* Content */}
      <div>
        {activeTab === 'Posts' && (
          posts.length > 0 ? (
            posts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={fetchProfile} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No posts yet</p>
            </div>
          )
        )}

        {activeTab === 'Threads' && (
          threads.length > 0 ? (
            threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => navigate(`/thread/${thread.id}`)}
                className="border-b border-border p-4 hover:bg-muted/5 cursor-pointer"
              >
                <h3 className="font-bold text-lg mb-2">{thread.title}</h3>
                <p className="text-muted-foreground line-clamp-3 mb-2">{thread.content.substring(0, 200)}...</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatNumber(thread.views_count)} views</span>
                  <span>{formatNumber(thread.likes_count)} likes</span>
                  <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No threads yet</p>
            </div>
          )
        )}

        {activeTab !== 'Posts' && activeTab !== 'Threads' && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Coming soon</p>
          </div>
        )}
      </div>

      {isOwnProfile && (
        <EditProfileDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          profile={profile}
          onSuccess={fetchProfile}
        />
      )}
    </div>
  );
}
