import { useState, useEffect } from 'react';
import { Search, Loader2, X, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

// Tenor API v2 - free key
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRje-Yic';
const TENOR_API_URL = 'https://tenor.googleapis.com/v2';

// Static fallback GIFs (popular animated GIFs from Giphy CDN — always work)
const FALLBACK_GIFS: Record<string, { id: string; url: string; preview: string }[]> = {
  trending: [
    { id: 'f1', url: 'https://media.giphy.com/media/3o7buirYcmV5nSwIRW/giphy.gif', preview: 'https://media.giphy.com/media/3o7buirYcmV5nSwIRW/giphy-downsized-small.gif' },
    { id: 'f2', url: 'https://media.giphy.com/media/l4FGuhL4U2WyjdkaY/giphy.gif', preview: 'https://media.giphy.com/media/l4FGuhL4U2WyjdkaY/giphy-downsized-small.gif' },
    { id: 'f3', url: 'https://media.giphy.com/media/xT9IgG50Lg7russbDa/giphy.gif', preview: 'https://media.giphy.com/media/xT9IgG50Lg7russbDa/giphy-downsized-small.gif' },
    { id: 'f4', url: 'https://media.giphy.com/media/1xVbRS6j52YSzp9P7N/giphy.gif', preview: 'https://media.giphy.com/media/1xVbRS6j52YSzp9P7N/giphy-downsized-small.gif' },
    { id: 'f5', url: 'https://media.giphy.com/media/3oEjHFOscgNwdSIIIW/giphy.gif', preview: 'https://media.giphy.com/media/3oEjHFOscgNwdSIIIW/giphy-downsized-small.gif' },
    { id: 'f6', url: 'https://media.giphy.com/media/l3vR85wkY0bOLgEZW/giphy.gif', preview: 'https://media.giphy.com/media/l3vR85wkY0bOLgEZW/giphy-downsized-small.gif' },
  ],
  happy: [
    { id: 'h1', url: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif', preview: 'https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy-downsized-small.gif' },
    { id: 'h2', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', preview: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy-downsized-small.gif' },
    { id: 'h3', url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', preview: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy-downsized-small.gif' },
    { id: 'h4', url: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif', preview: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy-downsized-small.gif' },
  ],
  love: [
    { id: 'l1', url: 'https://media.giphy.com/media/3oEdvaQMNAZFcGnRFS/giphy.gif', preview: 'https://media.giphy.com/media/3oEdvaQMNAZFcGnRFS/giphy-downsized-small.gif' },
    { id: 'l2', url: 'https://media.giphy.com/media/d86kftzaeizO8/giphy.gif', preview: 'https://media.giphy.com/media/d86kftzaeizO8/giphy-downsized-small.gif' },
    { id: 'l3', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', preview: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy-downsized-small.gif' },
  ],
  sad: [
    { id: 's1', url: 'https://media.giphy.com/media/9Y5BbDSkSTiY8/giphy.gif', preview: 'https://media.giphy.com/media/9Y5BbDSkSTiY8/giphy-downsized-small.gif' },
    { id: 's2', url: 'https://media.giphy.com/media/eveLqe2MKqVQfCGzl7/giphy.gif', preview: 'https://media.giphy.com/media/eveLqe2MKqVQfCGzl7/giphy-downsized-small.gif' },
  ],
  excited: [
    { id: 'e1', url: 'https://media.giphy.com/media/5xaOcLGvzHxDKjufnLW/giphy.gif', preview: 'https://media.giphy.com/media/5xaOcLGvzHxDKjufnLW/giphy-downsized-small.gif' },
    { id: 'e2', url: 'https://media.giphy.com/media/Is1O1TWV0LEJi/giphy.gif', preview: 'https://media.giphy.com/media/Is1O1TWV0LEJi/giphy-downsized-small.gif' },
  ],
  dance: [
    { id: 'd1', url: 'https://media.giphy.com/media/l0Iy2MnL9ejDrf73i/giphy.gif', preview: 'https://media.giphy.com/media/l0Iy2MnL9ejDrf73i/giphy-downsized-small.gif' },
    { id: 'd2', url: 'https://media.giphy.com/media/3oEjHSGBxEBBMSoaSQ/giphy.gif', preview: 'https://media.giphy.com/media/3oEjHSGBxEBBMSoaSQ/giphy-downsized-small.gif' },
  ],
};

interface GifItem {
  id: string;
  url: string;
  preview: string;
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('trending');
  const [usingFallback, setUsingFallback] = useState(false);

  const categories = [
    { id: 'trending', label: 'Trending', query: '' },
    { id: 'happy', label: 'Happy', query: 'happy' },
    { id: 'love', label: 'Love', query: 'love' },
    { id: 'sad', label: 'Sad', query: 'sad' },
    { id: 'excited', label: 'Excited', query: 'excited' },
    { id: 'dance', label: 'Dance', query: 'dance' },
    { id: 'wow', label: 'Wow', query: 'wow' },
    { id: 'fire', label: 'Fire', query: 'fire' },
  ];

  useEffect(() => {
    fetchGifs();
  }, [selectedCategory]);

  const loadFallback = (category: string) => {
    const key = category in FALLBACK_GIFS ? category : 'trending';
    setGifs(FALLBACK_GIFS[key] || FALLBACK_GIFS.trending);
    setUsingFallback(true);
  };

  const fetchGifs = async (query?: string) => {
    setLoading(true);
    setUsingFallback(false);
    try {
      const cat = categories.find(c => c.id === selectedCategory);
      const searchTerm = query || (selectedCategory === 'trending' ? '' : cat?.query || '');
      const endpoint = searchTerm
        ? `${TENOR_API_URL}/search?q=${encodeURIComponent(searchTerm)}&key=${TENOR_API_KEY}&client_key=t_social&limit=20`
        : `${TENOR_API_URL}/featured?key=${TENOR_API_KEY}&client_key=t_social&limit=20`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const mapped: GifItem[] = data.results.map((gif: any) => ({
          id: gif.id,
          url: gif.media_formats?.gif?.url || gif.media_formats?.tinygif?.url || '',
          preview: gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url || '',
        })).filter((g: GifItem) => g.url);
        setGifs(mapped);
      } else {
        loadFallback(query ? 'trending' : selectedCategory);
      }
    } catch (error) {
      console.warn('[GifPicker] Tenor failed, using fallback:', error);
      loadFallback(query ? 'trending' : selectedCategory);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchGifs(searchQuery.trim());
    } else {
      fetchGifs();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <div className="bg-background w-full md:max-w-2xl md:rounded-xl max-h-[85vh] md:max-h-[70vh] flex flex-col overflow-hidden rounded-t-xl">
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold">Choose a GIF</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border shrink-0">
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

        <div className="px-4 py-3 border-b border-border overflow-x-auto shrink-0">
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

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No GIFs found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              {usingFallback && (
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Showing popular GIFs
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => {
                      onSelect(gif.url);
                      onClose();
                    }}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group"
                  >
                    <img
                      src={gif.preview}
                      alt="GIF"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // fallback to url if preview fails
                        (e.target as HTMLImageElement).src = gif.url;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-3 border-t border-border text-center shrink-0">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold">Tenor</span>
          </p>
        </div>
      </div>
    </div>
  );
}
