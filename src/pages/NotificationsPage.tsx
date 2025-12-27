import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { Notification as NotificationType } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Heart, Repeat2, UserPlus, MessageCircle, AtSign, BadgeCheck, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'mentions'>('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      markAsRead();
    } else {
      navigate('/auth');
    }
  }, [user, activeTab]);

  const fetchNotifications = async (pageNum = 0) => {
    if (!user) return;

    try {
      let query = supabase
        .from('notifications')
        .select(`
          *,
          from_user:user_profiles!notifications_from_user_id_fkey(*),
          post:posts(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (activeTab === 'verified') {
        // This would need a join to filter by verified users
        query = query.eq('from_user.verified', true);
      } else if (activeTab === 'mentions') {
        query = query.eq('type', 'mention');
      }

      const { data, error } = await query;

      if (error) throw error;

      if (pageNum === 0) {
        setNotifications(data || []);
      } else {
        setNotifications(prev => [...prev, ...(data || [])]);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const loadMore = async (): Promise<boolean> => {
    const nextPage = page + 1;
    await fetchNotifications(nextPage);
    return notifications.length % PAGE_SIZE === 0;
  };

  const { lastElementRef, loading: loadingMore } = useInfiniteScroll(loadMore);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-8 h-8 text-pink-600" fill="currentColor" />;
      case 'repost':
        return <Repeat2 className="w-8 h-8 text-green-500" />;
      case 'follow':
        return <UserPlus className="w-8 h-8 text-primary" />;
      case 'reply':
        return <MessageCircle className="w-8 h-8 text-primary" />;
      case 'mention':
        return <AtSign className="w-8 h-8 text-primary" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification: NotificationType) => {
    const username = notification.from_user?.username || 'Someone';
    switch (notification.type) {
      case 'like':
        return `${username} liked your post`;
      case 'repost':
        return `${username} reposted your post`;
      case 'follow':
        return `${username} followed you`;
      case 'reply':
        return `${username} replied to your post`;
      case 'mention':
        return `${username} mentioned you`;
      default:
        return 'New notification';
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
      <TopBar title="Notifications" />

      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 ${
              activeTab === 'all'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('verified')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 ${
              activeTab === 'verified'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/50'
            }`}
          >
            Verified
          </button>
          <button
            onClick={() => setActiveTab('mentions')}
            className={`flex-1 py-4 font-semibold transition-colors border-b-2 ${
              activeTab === 'mentions'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-muted/50'
            }`}
          >
            Mentions
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No notifications yet</p>
          <p className="text-sm">When you get notifications, they'll show up here</p>
        </div>
      ) : (
        <div>
          {notifications.map((notification, index) => (
            <div
              key={notification.id}
              ref={index === notifications.length - 1 ? lastElementRef : null}
              onClick={() => {
                if (notification.post_id) {
                  // Navigate to post (you can implement this)
                } else if (notification.from_user_id) {
                  navigate(`/profile/${notification.from_user?.username}`);
                }
              }}
              className="border-b border-border p-4 hover:bg-muted/5 cursor-pointer transition-colors"
            >
              <div className="flex space-x-3">
                <div className="flex-shrink-0 pt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start space-x-2">
                    {notification.from_user?.avatar_url ? (
                      <img
                        src={notification.from_user.avatar_url}
                        alt={notification.from_user.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {notification.from_user?.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-1">
                        <span className="font-bold">{notification.from_user?.username}</span>
                        {notification.from_user?.verified && (
                          <BadgeCheck className="w-4 h-4 text-primary" fill="currentColor" />
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {getNotificationText(notification)}
                      </p>
                      {notification.post?.content && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.post.content}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {loadingMore && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
