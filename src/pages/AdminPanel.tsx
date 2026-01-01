import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Shield,
  Users,
  TrendingUp,
  DollarSign,
  Settings,
  AlertTriangle,
  Loader2,
  Plus,
  Eye,
  MousePointer,
  BarChart3,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface SponsoredContent {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  advertiser_name: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  is_active: boolean;
}

interface AdPlacement {
  id: string;
  network: string;
  placement_type: string;
  code: string;
  location: string;
  is_active: boolean;
  impressions: number;
  revenue: number;
}

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    total_users: 0,
    total_posts: 0,
    total_views: 0,
    total_communities: 0,
    active_users_today: 0,
    total_revenue: 0,
  });
  const [sponsoredContent, setSponsoredContent] = useState<SponsoredContent[]>([]);
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([]);
  const [createSponsoredOpen, setCreateSponsoredOpen] = useState(false);
  const [createAdOpen, setCreateAdOpen] = useState(false);
  const [sponsoredForm, setSponsoredForm] = useState({
    title: '',
    content: '',
    advertiser_name: '',
    budget: '',
  });
  const [adForm, setAdForm] = useState({
    network: 'adsense',
    placement_type: 'banner',
    code: '',
    location: 'feed',
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!data) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin access',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await fetchStats();
      await fetchSponsoredContent();
      await fetchAdPlacements();
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: users } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      const { count: posts } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      const { count: communities } = await supabase
        .from('communities')
        .select('*', { count: 'exact', head: true });

      const { data: viewsData } = await supabase
        .from('posts')
        .select('views_count');

      const total_views = viewsData?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;

      const { data: adData } = await supabase
        .from('ad_placements')
        .select('revenue');

      const total_revenue = adData?.reduce((sum, a) => sum + (Number(a.revenue) || 0), 0) || 0;

      setStats({
        total_users: users || 0,
        total_posts: posts || 0,
        total_views,
        total_communities: communities || 0,
        active_users_today: 0,
        total_revenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSponsoredContent = async () => {
    try {
      const { data } = await supabase
        .from('sponsored_content')
        .select('*')
        .order('created_at', { ascending: false });

      setSponsoredContent(data || []);
    } catch (error) {
      console.error('Error fetching sponsored content:', error);
    }
  };

  const fetchAdPlacements = async () => {
    try {
      const { data } = await supabase
        .from('ad_placements')
        .select('*')
        .order('created_at', { ascending: false });

      setAdPlacements(data || []);
    } catch (error) {
      console.error('Error fetching ad placements:', error);
    }
  };

  const handleCreateSponsored = async () => {
    if (!sponsoredForm.title || !sponsoredForm.content || !sponsoredForm.advertiser_name || !sponsoredForm.budget) {
      toast({
        title: 'Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('sponsored_content').insert({
        title: sponsoredForm.title,
        content: sponsoredForm.content,
        advertiser_name: sponsoredForm.advertiser_name,
        budget: Number(sponsoredForm.budget),
      });

      if (error) throw error;

      toast({ title: 'Sponsored content created successfully' });
      setCreateSponsoredOpen(false);
      setSponsoredForm({ title: '', content: '', advertiser_name: '', budget: '' });
      fetchSponsoredContent();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCreateAdPlacement = async () => {
    if (!adForm.code) {
      toast({
        title: 'Error',
        description: 'Ad code is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('ad_placements').insert(adForm);

      if (error) throw error;

      toast({ title: 'Ad placement created successfully' });
      setCreateAdOpen(false);
      setAdForm({ network: 'adsense', placement_type: 'banner', code: '', location: 'feed' });
      fetchAdPlacements();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleSponsoredActive = async (id: string, is_active: boolean) => {
    try {
      const { error } = await supabase
        .from('sponsored_content')
        .update({ is_active: !is_active })
        .eq('id', id);

      if (error) throw error;

      fetchSponsoredContent();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleAdActive = async (id: string, is_active: boolean) => {
    try {
      const { error } = await supabase
        .from('ad_placements')
        .update({ is_active: !is_active })
        .eq('id', id);

      if (error) throw error;

      fetchAdPlacements();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!user || !isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Admin Dashboard" showBack />

      <div className="p-4 space-y-6">
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-xl">
          <div className="flex items-center space-x-3">
            <Shield className="w-10 h-10 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Admin Dashboard</h2>
              <p className="text-muted-foreground">Platform management, monetization & analytics</p>
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-primary mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Total Users</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.total_users)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Total Posts</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.total_posts)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-muted-foreground mb-2">
              <Eye className="w-4 h-4" />
              <span className="text-sm">Total Views</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.total_views)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-purple-600 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Communities</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.total_communities)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-green-600 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold">${stats.total_revenue.toFixed(2)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-green-600 mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Active Today</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.active_users_today)}</p>
          </div>
        </div>

        {/* Monetization Tabs */}
        <Tabs defaultValue="sponsored" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sponsored">Sponsored</TabsTrigger>
            <TabsTrigger value="ads">Ad Networks</TabsTrigger>
            <TabsTrigger value="monetize">Monetize Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="sponsored" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Sponsored Content Management</h3>
              <Dialog open={createSponsoredOpen} onOpenChange={setCreateSponsoredOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Sponsored Post
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Sponsored Content</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Title</label>
                      <Input
                        placeholder="Sponsored post title"
                        value={sponsoredForm.title}
                        onChange={(e) => setSponsoredForm({ ...sponsoredForm, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Content</label>
                      <Textarea
                        placeholder="Sponsored content..."
                        value={sponsoredForm.content}
                        onChange={(e) => setSponsoredForm({ ...sponsoredForm, content: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Advertiser Name</label>
                      <Input
                        placeholder="Company Name"
                        value={sponsoredForm.advertiser_name}
                        onChange={(e) => setSponsoredForm({ ...sponsoredForm, advertiser_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Budget ($)</label>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={sponsoredForm.budget}
                        onChange={(e) => setSponsoredForm({ ...sponsoredForm, budget: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateSponsored} className="w-full">
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {sponsoredContent.map((item) => (
                <div key={item.id} className="bg-muted/30 p-4 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.advertiser_name}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={item.is_active ? 'default' : 'outline'}
                      onClick={() => toggleSponsoredActive(item.id, item.is_active)}
                    >
                      {item.is_active ? 'Active' : 'Paused'}
                    </Button>
                  </div>
                  <p className="text-sm mb-3">{item.content}</p>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-semibold">${item.budget}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Spent</p>
                      <p className="font-semibold">${item.spent}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Impressions</p>
                      <p className="font-semibold">{formatNumber(item.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Clicks</p>
                      <p className="font-semibold">{formatNumber(item.clicks)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {sponsoredContent.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No sponsored content yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ads" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Ad Network Integration</h3>
              <Dialog open={createAdOpen} onOpenChange={setCreateAdOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ad Placement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Ad Placement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Ad Network</label>
                      <select
                        className="w-full p-2 border border-border rounded-lg bg-background"
                        value={adForm.network}
                        onChange={(e) => setAdForm({ ...adForm, network: e.target.value })}
                      >
                        <option value="adsense">Google AdSense</option>
                        <option value="adsterra">Adsterra</option>
                        <option value="propeller">Propeller Ads</option>
                        <option value="exoclick">ExoClick</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Placement Type</label>
                      <select
                        className="w-full p-2 border border-border rounded-lg bg-background"
                        value={adForm.placement_type}
                        onChange={(e) => setAdForm({ ...adForm, placement_type: e.target.value })}
                      >
                        <option value="banner">Banner</option>
                        <option value="video">Video</option>
                        <option value="native">Native</option>
                        <option value="interstitial">Interstitial</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Location</label>
                      <select
                        className="w-full p-2 border border-border rounded-lg bg-background"
                        value={adForm.location}
                        onChange={(e) => setAdForm({ ...adForm, location: e.target.value })}
                      >
                        <option value="feed">Feed</option>
                        <option value="sidebar">Sidebar</option>
                        <option value="video_player">Video Player</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Ad Code</label>
                      <Textarea
                        placeholder="Paste your ad network code here..."
                        value={adForm.code}
                        onChange={(e) => setAdForm({ ...adForm, code: e.target.value })}
                        rows={6}
                      />
                    </div>
                    <Button onClick={handleCreateAdPlacement} className="w-full">
                      Create Ad Placement
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {adPlacements.map((ad) => (
                <div key={ad.id} className="bg-muted/30 p-4 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold capitalize">{ad.network}</h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {ad.placement_type} - {ad.location}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={ad.is_active ? 'default' : 'outline'}
                      onClick={() => toggleAdActive(ad.id, ad.is_active)}
                    >
                      {ad.is_active ? 'Active' : 'Paused'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    <div>
                      <p className="text-muted-foreground">Impressions</p>
                      <p className="font-semibold">{formatNumber(ad.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-semibold">${ad.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {adPlacements.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No ad placements configured</p>
                  <p className="text-sm mt-1">Add your first ad network integration</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="monetize" className="space-y-4">
            <MonetizePostsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MonetizePostsTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data } = await supabase
        .from('posts')
        .select(`
          *,
          user:user_profiles(*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMonetization = async (postId: string, currentStatus: boolean, price: number) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          is_monetized: !currentStatus,
          price: !currentStatus ? price : 0
        })
        .eq('id', postId);

      if (error) throw error;

      toast({ 
        title: !currentStatus ? 'Post monetized' : 'Monetization removed',
        description: !currentStatus ? `Set at $${price}` : 'Post is now free'
      });
      fetchPosts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Content Monetization</h4>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Enable monetization for user posts. Users must pay to access monetized content.
        </p>
      </div>

      {posts.map((post) => (
        <div key={post.id} className="bg-muted/30 p-4 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">@{post.user?.username}</span>
                {post.is_monetized && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded text-xs font-medium">
                    ${post.price}
                  </span>
                )}
              </div>
              <p className="text-sm line-clamp-2">{post.content}</p>
              {post.video_url && (
                <p className="text-xs text-muted-foreground mt-1">📹 Video content</p>
              )}
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  {post.is_monetized ? 'Update' : 'Monetize'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Monetize Post</DialogTitle>
                </DialogHeader>
                <MonetizeForm
                  post={post}
                  onSubmit={(price) => {
                    toggleMonetization(post.id, post.is_monetized, price);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ))}
    </div>
  );
}

function MonetizeForm({ post, onSubmit }: { post: any; onSubmit: (price: number) => void }) {
  const [price, setPrice] = useState(post.price?.toString() || '');

  return (
    <div className="space-y-4 pt-4">
      <div>
        <label className="block text-sm font-medium mb-2">Price ($)</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="9.99"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Users will pay this amount to access the content
        </p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <p className="font-medium mb-1">Post Preview:</p>
        <p className="text-muted-foreground line-clamp-3">{post.content}</p>
      </div>
      <Button
        onClick={() => onSubmit(parseFloat(price) || 0)}
        className="w-full"
        disabled={!price || parseFloat(price) <= 0}
      >
        {post.is_monetized ? 'Update Price' : 'Enable Monetization'}
      </Button>
      {post.is_monetized && (
        <Button
          onClick={() => onSubmit(0)}
          variant="outline"
          className="w-full"
        >
          Remove Monetization
        </Button>
      )}
    </div>
  );
}
