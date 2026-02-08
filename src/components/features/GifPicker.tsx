import { useState, useEffect } from 'react';
import { Search, Loader2, X, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

// Using Tenor API - you'll need to get a free API key from https://tenor.com/developer/dashboard
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRje-Yic'; // Public demo key
const TENOR_API_URL = 'https://tenor.googleapis.com/v2';

interface TenorGif {
  id: string;
  media_formats: {
    gif: { url: string };
    tinygif: { url: string };
  };
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('trending');

  const categories = [
    { id: 'trending', label: 'Trending', query: '' },
    { id: 'happy', label: 'Happy', query: 'happy' },
    { id: 'love', label: 'Love', query: 'love' },
    { id: 'sad', label: 'Sad', query: 'sad' },
    { id: 'excited', label: 'Excited', query: 'excited' },
    { id: 'agree', label: 'Agree', query: 'agree' },
    { id: 'dance', label: 'Dance', query: 'dance' },
    { id: 'wow', label: 'Wow', query: 'wow' },
  ];

  useEffect(() => {
    fetchGifs();
  }, [selectedCategory]);

  const fetchGifs = async (query?: string) => {
    setLoading(true);
    try {
      const searchTerm = query || (selectedCategory === 'trending' ? '' : categories.find(c => c.id === selectedCategory)?.query || '');
      const endpoint = searchTerm 
        ? `${TENOR_API_URL}/search?q=${encodeURIComponent(searchTerm)}&key=${TENOR_API_KEY}&client_key=t_social&limit=20`
        : `${TENOR_API_URL}/featured?key=${TENOR_API_KEY}&client_key=t_social&limit=20`;

      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.results) {
        setGifs(data.results);
      }
    } catch (error) {
      console.error('Error fetching GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchGifs(searchQuery.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <div className="bg-background w-full md:max-w-2xl md:rounded-xl max-h-[85vh] md:max-h-[70vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold">Choose a GIF</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for GIFs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full"
            />
          </form>
        </div>

        <div className="px-4 py-3 border-b border-border overflow-x-auto">
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No GIFs found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => {
                    onSelect(gif.media_formats.gif.url);
                    onClose();
                  }}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group"
                >
                  <img
                    src={gif.media_formats.tinygif.url}
                    alt="GIF"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold">Tenor</span>
          </p>
        </div>
      </div>
    </div>
  );
}
