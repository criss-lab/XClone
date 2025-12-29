import { useState, useEffect, useRef } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { UserProfile } from '@/types';

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  other_user: UserProfile;
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
      markMessagesAsRead(activeConversation);
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Fetch other user profiles and last messages
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv) => {
          const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
          
          const { data: otherUser } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', otherUserId)
            .single();

          const { data: lastMsg } = await supabase
            .from('direct_messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conv,
            other_user: otherUser,
            last_message: lastMsg,
          };
        })
      );

      setConversations(conversationsWithDetails.filter((c) => c.other_user));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('direct_messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const searchUsers = async () => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .ilike('username', `%${searchQuery}%`)
        .limit(5);

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        setActiveConversation(existing.id);
        setSearchQuery('');
        setSearchResults([]);
        return;
      }

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_1: user.id,
          participant_2: otherUserId,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveConversation(data.id);
      setSearchQuery('');
      setSearchResults([]);
      fetchConversations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!user || !activeConversation || !messageContent.trim()) return;

    setSending(true);

    try {
      const { error } = await supabase.from('direct_messages').insert({
        conversation_id: activeConversation,
        sender_id: user.id,
        content: messageContent.trim(),
      });

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConversation);

      setMessageContent('');
      fetchMessages(activeConversation);
      fetchConversations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
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

  const activeConv = conversations.find((c) => c.id === activeConversation);

  return (
    <div className="h-screen bg-background flex flex-col">
      <TopBar title="Messages" />

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-full md:w-96 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 bg-background border border-border rounded-lg overflow-hidden">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => startConversation(user.id)}
                    className="flex items-center space-x-3 p-3 hover:bg-muted w-full text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold">
                          {user.username[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{user.username}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground px-4">
                <p className="font-semibold mb-2">No messages yet</p>
                <p className="text-sm">Search for a user to start a conversation</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={`flex items-center space-x-3 p-4 border-b border-border hover:bg-muted w-full text-left ${
                    activeConversation === conv.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                    {conv.other_user?.avatar_url ? (
                      <img
                        src={conv.other_user.avatar_url}
                        alt={conv.other_user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold">
                        {conv.other_user?.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{conv.other_user?.username}</p>
                    {conv.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message.sender_id === user.id && 'You: '}
                        {conv.last_message.content}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    {conv.last_message &&
                      formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true })}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="hidden md:flex flex-1 flex-col">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                  {activeConv.other_user?.avatar_url ? (
                    <img
                      src={activeConv.other_user.avatar_url}
                      alt={activeConv.other_user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold">
                      {activeConv.other_user?.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{activeConv.other_user?.username}</p>
                  <p className="text-sm text-muted-foreground">@{activeConv.other_user?.username}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        message.sender_id === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender_id === user.id
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    maxLength={1000}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !messageContent.trim()}
                    className="rounded-full"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
