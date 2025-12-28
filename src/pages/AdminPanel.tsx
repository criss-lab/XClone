import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  Users,
  TrendingUp,
  DollarSign,
  Settings,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';

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
    active_users_today: 0,
    flagged_content: 0,
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

      const { data: viewsData } = await supabase
        .from('posts')
        .select('views_count');

      const total_views = viewsData?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;

      setStats({
        total_users: users || 0,
        total_posts: posts || 0,
        total_views,
        active_users_today: 0, // Would need session tracking
        flagged_content: 0, // Would need content moderation system
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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
      <TopBar title="Admin Panel" showBack />

      <div className="p-4 space-y-6">
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-xl">
          <div className="flex items-center space-x-3">
            <Shield className="w-10 h-10 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Admin Dashboard</h2>
              <p className="text-muted-foreground">Platform management and analytics</p>
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
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Total Views</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.total_views)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-green-600 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Active Today</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.active_users_today)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-yellow-600 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Flagged Content</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(stats.flagged_content)}</p>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl">
            <div className="flex items-center space-x-2 text-primary mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Revenue (MTD)</span>
            </div>
            <p className="text-2xl font-bold">$0</p>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Quick Actions</h3>

          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => {
              toast({ title: 'Feature coming soon' });
            }}
          >
            <Users className="w-5 h-5 mr-3" />
            <div className="text-left">
              <p className="font-semibold">User Management</p>
              <p className="text-sm text-muted-foreground">Manage users, roles, and permissions</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => {
              toast({ title: 'Feature coming soon' });
            }}
          >
            <AlertTriangle className="w-5 h-5 mr-3" />
            <div className="text-left">
              <p className="font-semibold">Content Moderation</p>
              <p className="text-sm text-muted-foreground">Review flagged content and reports</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => {
              toast({ title: 'Feature coming soon' });
            }}
          >
            <DollarSign className="w-5 h-5 mr-3" />
            <div className="text-left">
              <p className="font-semibold">Monetization Settings</p>
              <p className="text-sm text-muted-foreground">Configure ads, subscriptions, and payouts</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => {
              toast({ title: 'Feature coming soon' });
            }}
          >
            <Settings className="w-5 h-5 mr-3" />
            <div className="text-left">
              <p className="font-semibold">Platform Settings</p>
              <p className="text-sm text-muted-foreground">Configure global platform settings</p>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
