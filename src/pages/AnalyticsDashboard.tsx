import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Eye,
  Heart,
  Repeat2,
  MessageCircle,
  Users,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { Post } from '@/types';

interface PostAnalytics {
  post: Post;
  views: number;
  unique_viewers: number;
  engagement_rate: number;
}

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState({
    total_posts: 0,
    total_views: 0,
    total_likes: 0,
    total_reposts: 0,
    total_replies: 0,
    followers: 0,
    following: 0,
  });
  const [topPosts, setTopPosts] = useState<PostAnalytics[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      // Get overview stats
      const { data: posts } = await supabase
        .from('posts')
        .select('*, user_profiles(*)')
        .eq('user_id', user.id);

      const total_posts = posts?.length || 0;
      const total_views = posts?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
      const total_likes = posts?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;
      const total_reposts = posts?.reduce((sum, p) => sum + (p.reposts_count || 0), 0) || 0;
      const total_replies = posts?.reduce((sum, p) => sum + (p.replies_count || 0), 0) || 0;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('followers_count, following_count')
        .eq('id', user.id)
        .single();

      setOverviewStats({
        total_posts,
        total_views,
        total_likes,
        total_reposts,
        total_replies,
        followers: profile?.followers_count || 0,
        following: profile?.following_count || 0,
      });

      // Get top performing posts
      const { data: analyticsData } = await supabase
        .from('post_analytics')
        .select(`
          *,
          posts (
            *,
            user_profiles (*)
          )
        `)
        .order('engagement_rate', { ascending: false })
        .limit(10);

      const topPostsData: PostAnalytics[] = (analyticsData || [])
        .filter((a: any) => a.posts?.user_id === user.id)
        .map((a: any) => ({
          post: a.posts,
          views: a.views || 0,
          unique_viewers: a.unique_viewers || 0,
          engagement_rate: a.engagement_rate || 0,
        }));

      setTopPosts(topPostsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Analytics" showBack />

      <div className="p-4 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-muted-foreground mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-sm">Total Views</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(overviewStats.total_views)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-pink-600 mb-2">
              <Heart className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Total Likes</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(overviewStats.total_likes)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-green-600 mb-2">
              <Repeat2 className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Total Reposts</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(overviewStats.total_reposts)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-primary mb-2">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Total Replies</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(overviewStats.total_replies)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-muted-foreground mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Total Posts</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(overviewStats.total_posts)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-muted-foreground mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Followers</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(overviewStats.followers)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-muted-foreground mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">Following</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(overviewStats.following)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Avg Engagement</span>
            </div>
            <p className="text-2xl font-bold">
              {overviewStats.total_views > 0
                ? `${((overviewStats.total_likes + overviewStats.total_reposts) / overviewStats.total_views * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </div>
        </div>

        {/* Top Performing Posts */}
        <div>
          <h2 className="text-xl font-bold mb-4">Top Performing Posts</h2>
          <div className="space-y-3">
            {topPosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No analytics data available yet</p>
                <p className="text-sm mt-1">Start posting to see your analytics</p>
              </div>
            ) : (
              topPosts.map(({ post, views, engagement_rate }) => (
                <div
                  key={post.id}
                  className="bg-muted/30 p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <p className="line-clamp-2 mb-3">{post.content}</p>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span>{formatNumber(views)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="w-4 h-4 text-pink-600" />
                        <span>{formatNumber(post.likes_count)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Repeat2 className="w-4 h-4 text-green-600" />
                        <span>{formatNumber(post.reposts_count)}</span>
                      </div>
                    </div>
                    <div className="text-primary font-semibold">
                      {engagement_rate.toFixed(1)}% engagement
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
