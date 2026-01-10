import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Eye, User, Hash, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface HistoryItem {
  id: string;
  view_type: string;
  created_at: string;
  post?: any;
  profile?: any;
  metadata?: any;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('browsing_history')
        .select(`
          *,
          post:posts(*, user_profiles(*)),
          profile:user_profiles(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    if (!window.confirm('Clear all browsing history? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('browsing_history')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setHistory([]);
      toast({ title: 'History cleared' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('browsing_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHistory((prev) => prev.filter((item) => item.id !== id));
      toast({ title: 'Item removed' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'post': return <Eye className="w-5 h-5" />;
      case 'profile': return <User className="w-5 h-5" />;
      case 'hashtag': return <Hash className="w-5 h-5" />;
      case 'community': return <Users className="w-5 h-5" />;
      default: return <Eye className="w-5 h-5" />;
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
      <TopBar title="History" showBack />

      <div className="p-4 border-b border-border flex justify-between items-center">
        <p className="text-muted-foreground">
          {history.length} {history.length === 1 ? 'item' : 'items'}
        </p>
        {history.length > 0 && (
          <Button
            onClick={clearHistory}
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-semibold mb-2">No browsing history</p>
          <p className="text-sm">Your viewed posts and profiles will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {history.map((item) => (
            <div key={item.id} className="p-4 hover:bg-muted/5 flex items-start gap-3">
              <div className="text-muted-foreground mt-1">{getIcon(item.view_type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground capitalize">{item.view_type}</span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {item.view_type === 'post' && item.post && (
                  <button
                    onClick={() => navigate(`/post/${item.post.id}`)}
                    className="text-left w-full"
                  >
                    <p className="font-semibold text-sm">
                      Post by @{item.post.user_profiles?.username}
                    </p>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {item.post.content}
                    </p>
                  </button>
                )}

                {item.view_type === 'profile' && item.profile && (
                  <button
                    onClick={() => navigate(`/profile/${item.profile.username}`)}
                    className="text-left w-full"
                  >
                    <p className="font-semibold text-sm">@{item.profile.username}</p>
                    {item.profile.bio && (
                      <p className="text-muted-foreground text-sm line-clamp-1">{item.profile.bio}</p>
                    )}
                  </button>
                )}

                {item.view_type === 'hashtag' && item.metadata?.tag && (
                  <button
                    onClick={() => navigate(`/hashtag/${item.metadata.tag}`)}
                    className="text-left w-full"
                  >
                    <p className="font-semibold text-sm">#{item.metadata.tag}</p>
                  </button>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
