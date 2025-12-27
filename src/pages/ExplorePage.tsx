import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TrendingTopic } from '@/types';

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('For You');
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const navigate = useNavigate();

  const tabs = ['For You', 'Trending', 'News', 'Sports', 'Entertainment'];

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      const { data, error } = await supabase
        .from('trending_topics')
        .select('*')
        .order('posts_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTrending(data || []);
    } catch (error) {
      console.error('Error fetching trending:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const filteredTrending = activeTab === 'For You' 
    ? trending 
    : trending.filter((t) => t.category.toLowerCase().includes(activeTab.toLowerCase()));

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Explore" showProfile={false} />

      <div className="sticky top-14 z-30 bg-background border-b border-border">
        <form onSubmit={handleSearch} className="p-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search X"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-11 rounded-full bg-muted border-0 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </form>

        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-4 font-semibold transition-colors border-b-2 whitespace-nowrap ${
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

      <div className="divide-y divide-border">
        {filteredTrending.length > 0 ? (
          filteredTrending.map((topic, index) => (
            <div key={topic.id} className="p-4 hover:bg-muted/5 cursor-pointer transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                    <span className="font-semibold">{index + 1}</span>
                    <span>·</span>
                    <span>{topic.category}</span>
                    <span>·</span>
                    <span>Trending</span>
                  </div>
                  <h3 className="font-bold text-foreground mt-1 text-lg">{topic.topic}</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {topic.posts_count.toLocaleString()} posts
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-semibold text-lg mb-2">No trending topics</p>
            <p className="text-sm">Check back later for what's trending</p>
          </div>
        )}
      </div>
    </div>
  );
}
