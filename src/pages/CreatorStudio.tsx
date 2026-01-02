import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { TopBar } from '@/components/layout/TopBar';
import { 
  TrendingUp, 
  DollarSign, 
  Eye, 
  Heart, 
  MessageCircle, 
  Users,
  Video,
  FileText,
  BarChart3,
  Calendar,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { toast } from 'sonner';

export default function CreatorStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_followers: 0,
    total_posts: 0,
    total_views: 0,
    total_likes: 0,
    total_earnings: 0,
    engagement_rate: 0,
    video_views: 0,
    article_views: 0
  });
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchCreatorStats();
    fetchRecentPosts();
  }, [user]);

  const fetchCreatorStats = async () => {
    if (!user) return;

    try {
      // Get user profile data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Get post statistics
      const { data: posts } = await supabase
        .from('posts')
        .select('views_count, likes_count, is_video')
        .eq('user_id', user.id);

      const totalViews = posts?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
      const totalLikes = posts?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;
      const videoViews = posts?.filter(p => p.is_video).reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;

      // Get earnings
      const { data: earnings } = await supabase
        .from('creator_earnings')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'paid');

      const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      // Get analytics
      const { data: analytics } = await supabase
        .from('user_analytics')
        .select('engagement_rate')
        .eq('user_id', user.id)
        .single();

      setStats({
        total_followers: profile?.followers_count || 0,
        total_posts: posts?.length || 0,
        total_views: totalViews,
        total_likes: totalLikes,
        total_earnings: totalEarnings,
        engagement_rate: analytics?.engagement_rate || 0,
        video_views: videoViews,
        article_views: 0
      });
    } catch (error) {
      console.error('Error fetching creator stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPosts = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('posts')
        .select(`
          *,
          post_analytics(views, engagement_rate)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentPosts(data || []);
    } catch (error) {
      console.error('Error fetching recent posts:', error);
    }
  };

  const enableCreatorMode = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          is_creator: true,
          can_monetize: true
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Creator mode enabled! You can now monetize your content.');
      fetchCreatorStats();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopBar title="Creator Studio" showBack />

      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-purple-500" />
            <div>
              <h1 className="text-2xl font-bold">Creator Studio</h1>
              <p className="text-sm text-muted-foreground">Manage your content and earnings</p>
            </div>
          </div>
          
          {!user?.is_creator && (
            <button
              onClick={enableCreatorMode}
              className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Enable Creator Mode
            </button>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-xs text-muted-foreground">Total Views</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.total_views)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-pink-600 mb-2">
              <Heart className="w-4 h-4" />
              <span className="text-xs text-muted-foreground">Total Likes</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.total_likes)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs text-muted-foreground">Followers</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.total_followers)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs text-muted-foreground">Earnings</span>
            </div>
            <p className="text-2xl font-bold">${stats.total_earnings.toFixed(2)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs text-muted-foreground">Total Posts</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.total_posts)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-teal-600 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs text-muted-foreground">Engagement</span>
            </div>
            <p className="text-2xl font-bold">{stats.engagement_rate.toFixed(1)}%</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <Video className="w-4 h-4" />
              <span className="text-xs text-muted-foreground">Video Views</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.video_views)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs text-muted-foreground">Analytics</span>
            </div>
            <button 
              onClick={() => navigate('/analytics')}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View Details
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/scheduled')}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Calendar className="w-6 h-6 text-blue-600 mb-2" />
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Scheduled</p>
          </button>

          <button
            onClick={() => navigate('/products')}
            className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <ShoppingBag className="w-6 h-6 text-green-600 mb-2" />
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">Products</p>
          </button>

          <button
            onClick={() => navigate('/monetization')}
            className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <DollarSign className="w-6 h-6 text-purple-600 mb-2" />
            <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">Earnings</p>
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
          >
            <BarChart3 className="w-6 h-6 text-orange-600 mb-2" />
            <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">Analytics</p>
          </button>
        </div>

        {/* Recent Posts Performance */}
        <div>
          <h2 className="text-lg font-bold mb-3">Recent Posts Performance</h2>
          <div className="space-y-3">
            {recentPosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No posts yet</p>
              </div>
            ) : (
              recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-muted/30 p-4 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm line-clamp-2 mb-2">{post.content}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatNumber(post.views_count || 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {formatNumber(post.likes_count || 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {formatNumber(post.replies_count || 0)}
                        </span>
                        {post.is_video && (
                          <span className="flex items-center gap-1 text-red-600">
                            <Video className="w-3 h-3" />
                            Video
                          </span>
                        )}
                      </div>
                    </div>
                    {post.image_url && !post.is_video && (
                      <img
                        src={post.image_url}
                        alt="Post"
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tips & Best Practices */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-2">💡 Creator Tips</h3>
          <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
            <li>• Post consistently to build your audience</li>
            <li>• Use hashtags to increase discoverability</li>
            <li>• Engage with your followers through replies</li>
            <li>• Create high-quality video content for better engagement</li>
            <li>• Tag products in your posts to drive sales</li>
            <li>• Schedule posts during peak hours for maximum reach</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
