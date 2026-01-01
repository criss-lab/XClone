import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Home, Search, Bell, Mail, User, Hash, Radio, LogOut, Plus, Users, TrendingUp, Sparkles, Bookmark, List, DollarSign, BarChart3 } from 'lucide-react';
import { authService } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Community {
  id: string;
  name: string;
  display_name: string;
  icon_url?: string;
  member_count: number;
}

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [trendingCommunities, setTrendingCommunities] = useState<Community[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserCommunities();
    }
    fetchTrendingCommunities();
  }, [user]);

  const fetchUserCommunities = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('community_members')
      .select(`
        communities (*)
      `)
      .eq('user_id', user.id)
      .limit(5);

    if (data) {
      setCommunities(data.map((d: any) => d.communities));
    }
  };

  const fetchTrendingCommunities = async () => {
    const { data } = await supabase
      .from('communities')
      .select('*')
      .order('member_count', { ascending: false })
      .limit(5);

    if (data) {
      setTrendingCommunities(data);
    }
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/', requireAuth: false },
    { icon: Hash, label: 'Explore', path: '/explore', requireAuth: false },
    { icon: Bell, label: 'Notifications', path: '/notifications', requireAuth: true },
    { icon: Mail, label: 'Messages', path: '/messages', requireAuth: true },
    { icon: Radio, label: 'Spaces', path: '/spaces', requireAuth: false },
    { icon: Sparkles, label: 'AI', path: '/ai', requireAuth: false },
    { icon: Users, label: 'Communities', path: '/communities', requireAuth: false },
    { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks', requireAuth: true },
    { icon: List, label: 'Lists', path: '/lists', requireAuth: true },
    { icon: BarChart3, label: 'Analytics', path: '/analytics', requireAuth: true },
    { icon: DollarSign, label: 'Monetize', path: '/monetization', requireAuth: true },
    { icon: User, label: 'Profile', path: user ? `/profile/${user.username}` : '/auth', requireAuth: true },
  ];

  const handleNavClick = (path: string, requireAuth?: boolean) => {
    if (requireAuth && !user) {
      navigate('/auth');
    } else {
      navigate(path);
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    logout();
    navigate('/');
  };

  return (
    <aside className="hidden lg:flex lg:flex-col w-72 h-screen sticky top-0 border-r border-border p-4 overflow-y-auto">
      <div className="flex items-center space-x-2 mb-8 px-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <span className="text-2xl font-bold text-primary-foreground">T</span>
        </div>
        <span className="text-2xl font-bold">T</span>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path, item.requireAuth)}
              className={`flex items-center space-x-4 px-4 py-3 rounded-full transition-colors w-full text-left ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <Icon className="w-6 h-6" fill={isActive ? 'currentColor' : 'none'} />
              <span className="text-xl">{item.label}</span>
            </button>
          );
        })}

        {/* Your Communities */}
        {user && communities.length > 0 && (
          <div className="pt-4 border-t border-border mt-4">
            <h3 className="px-4 text-sm font-semibold text-muted-foreground mb-2">Your Communities</h3>
            {communities.map((community) => (
              <button
                key={community.id}
                onClick={() => navigate(`/c/${community.name}`)}
                className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-muted w-full text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {community.icon_url ? (
                    <img src={community.icon_url} alt={community.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold">{community.display_name[0]}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{community.display_name}</p>
                  <p className="text-xs text-muted-foreground">{community.member_count} members</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Trending Communities */}
        <div className="pt-4 border-t border-border mt-4">
          <h3 className="px-4 text-sm font-semibold text-muted-foreground mb-2 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trending Communities
          </h3>
          {trendingCommunities.map((community) => (
            <button
              key={community.id}
              onClick={() => navigate(`/c/${community.name}`)}
              className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-muted w-full text-left"
            >
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {community.icon_url ? (
                  <img src={community.icon_url} alt={community.display_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{community.display_name[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{community.display_name}</p>
                <p className="text-xs text-muted-foreground">{community.member_count} members</p>
              </div>
            </button>
          ))}
        </div>
      </nav>

      {user && (
        <>
          <Button
            onClick={() => navigate('/?compose=true')}
            size="lg"
            className="w-full rounded-full mb-4 text-lg font-semibold h-12"
          >
            <Plus className="w-5 h-5 mr-2" />
            Post
          </Button>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between p-3 hover:bg-muted rounded-full cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{user.username}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-destructive/10 rounded-full text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}

      {!user && (
        <Button
          onClick={() => navigate('/auth')}
          size="lg"
          className="w-full rounded-full text-lg font-semibold h-12"
        >
          Sign in
        </Button>
      )}
    </aside>
  );
}
