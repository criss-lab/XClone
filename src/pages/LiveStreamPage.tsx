import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Loader2,
  Send,
  Users
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { toast } from 'sonner';

interface StreamMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_profiles?: {
    username: string;
    avatar_url?: string;
  };
}

export default function LiveStreamPage() {
  const { streamId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<any>(null);

  useEffect(() => {
    if (streamId) {
      fetchStream();
      joinStream();
      fetchMessages();
      
      // Poll for new messages
      pollInterval.current = setInterval(() => {
        fetchMessages();
      }, 3000);

      return () => {
        leaveStream();
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
        }
      };
    }
  }, [streamId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchStream = async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select(`
          *,
          user:user_profiles(*)
        `)
        .eq('id', streamId)
        .single();

      if (error) throw error;
      setStream(data);
    } catch (error) {
      console.error('Error fetching stream:', error);
      toast.error('Failed to load stream');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const joinStream = async () => {
    try {
      await supabase.from('stream_viewers').insert({
        stream_id: streamId,
        user_id: user?.id || null
      });
    } catch (error) {
      console.error('Error joining stream:', error);
    }
  };

  const leaveStream = async () => {
    try {
      await supabase
        .from('stream_viewers')
        .delete()
        .eq('stream_id', streamId)
        .eq('user_id', user?.id);
    } catch (error) {
      console.error('Error leaving stream:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await supabase
        .from('stream_chat')
        .select(`
          *,
          user_profiles(username, avatar_url)
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!newMessage.trim()) return;

    try {
      await supabase.from('stream_chat').insert({
        stream_id: streamId,
        user_id: user.id,
        message: newMessage.trim()
      });

      setNewMessage('');
      fetchMessages();
    } catch (error: any) {
      toast.error('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Stream not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <TopBar title="Live Stream" showBack />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Video Player */}
        <div className="flex-1 flex items-center justify-center bg-black relative">
          <div className="w-full h-full flex items-center justify-center">
            {stream.stream_url ? (
              <video
                src={stream.stream_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-red-600 rounded-full mb-4 animate-pulse">
                  <Eye className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold mb-2">Live Stream</h3>
                <p className="text-gray-400">
                  {stream.is_live ? 'Stream is live' : 'Stream has ended'}
                </p>
              </div>
            )}
          </div>

          {/* Stream Info Overlay */}
          <div className="absolute top-4 left-4 right-4">
            <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden">
                    {stream.user?.avatar_url ? (
                      <img
                        src={stream.user.avatar_url}
                        alt={stream.user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold">
                        {stream.user?.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold">{stream.user?.username}</p>
                    <p className="text-sm text-gray-400">{stream.title}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {stream.is_live && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-sm font-bold">LIVE</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-bold">
                      {formatNumber(stream.viewer_count)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-4 left-4 flex space-x-2">
            <button className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <button className="p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Live Chat */}
        <div className="w-full md:w-96 bg-background text-foreground flex flex-col border-l border-border h-[400px] md:h-auto">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Live Chat
            </h3>
          </div>

          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Be the first to comment!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex items-start space-x-2">
                  <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                    {msg.user_profiles?.avatar_url ? (
                      <img
                        src={msg.user_profiles.avatar_url}
                        alt={msg.user_profiles.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                        {msg.user_profiles?.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold text-primary">
                        {msg.user_profiles?.username}
                      </span>
                      {' '}
                      <span className="text-foreground break-words">
                        {msg.message}
                      </span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={sendMessage} className="p-4 border-t border-border">
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={user ? 'Send a message...' : 'Sign in to chat'}
                disabled={!user}
                maxLength={200}
                className="flex-1"
              />
              <Button type="submit" disabled={!user || !newMessage.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
