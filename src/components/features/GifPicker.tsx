import { useState, useEffect } from 'react';
import { Search, Loader2, X, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

interface GifItem {
  id: string;
  url: string;
  preview: string;
  title?: string;
}

// Tenor API v2
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRje-Yic';
const TENOR_API_URL = 'https://tenor.googleapis.com/v2';

// Reliable static GIF collection using direct media URLs (not Giphy CDN which blocks cross-origin)
const STATIC_GIFS: Record<string, GifItem[]> = {
  trending: [
    { id: 'st1', url: 'https://media.tenor.com/YUBpDMVYYJQAAAAC/cute-cat.gif', preview: 'https://media.tenor.com/YUBpDMVYYJQAAAAC/cute-cat.gif', title: 'Cute Cat' },
    { id: 'st2', url: 'https://media.tenor.com/g1wnWqFkOA8AAAAC/dog-funny.gif', preview: 'https://media.tenor.com/g1wnWqFkOA8AAAAC/dog-funny.gif', title: 'Funny Dog' },
    { id: 'st3', url: 'https://media.tenor.com/yPg-fzjnMF0AAAAC/thumbs-up-meme.gif', preview: 'https://media.tenor.com/yPg-fzjnMF0AAAAC/thumbs-up-meme.gif', title: 'Thumbs Up' },
    { id: 'st4', url: 'https://media.tenor.com/gEHGAn5XJZYAAAAC/happy-dance.gif', preview: 'https://media.tenor.com/gEHGAn5XJZYAAAAC/happy-dance.gif', title: 'Happy Dance' },
    { id: 'st5', url: 'https://media.tenor.com/FD9PbgJbFOEAAAAC/wow-really.gif', preview: 'https://media.tenor.com/FD9PbgJbFOEAAAAC/wow-really.gif', title: 'Wow' },
    { id: 'st6', url: 'https://media.tenor.com/eTBE3cXvhJsAAAAC/laughing-lol.gif', preview: 'https://media.tenor.com/eTBE3cXvhJsAAAAC/laughing-lol.gif', title: 'LOL' },
  ],
  happy: [
    { id: 'ha1', url: 'https://media.tenor.com/gEHGAn5XJZYAAAAC/happy-dance.gif', preview: 'https://media.tenor.com/gEHGAn5XJZYAAAAC/happy-dance.gif', title: 'Happy Dance' },
    { id: 'ha2', url: 'https://media.tenor.com/eTBE3cXvhJsAAAAC/laughing-lol.gif', preview: 'https://media.tenor.com/eTBE3cXvhJsAAAAC/laughing-lol.gif', title: 'Laughing' },
    { id: 'ha3', url: 'https://media.tenor.com/yPg-fzjnMF0AAAAC/thumbs-up-meme.gif', preview: 'https://media.tenor.com/yPg-fzjnMF0AAAAC/thumbs-up-meme.gif', title: 'Thumbs Up' },
    { id: 'ha4', url: 'https://media.tenor.com/g1wnWqFkOA8AAAAC/dog-funny.gif', preview: 'https://media.tenor.com/g1wnWqFkOA8AAAAC/dog-funny.gif', title: 'Funny' },
  ],
  love: [
    { id: 'lv1', url: 'https://media.tenor.com/YUBpDMVYYJQAAAAC/cute-cat.gif', preview: 'https://media.tenor.com/YUBpDMVYYJQAAAAC/cute-cat.gif', title: 'Cute' },
    { id: 'lv2', url: 'https://media.tenor.com/FD9PbgJbFOEAAAAC/wow-really.gif', preview: 'https://media.tenor.com/FD9PbgJbFOEAAAAC/wow-really.gif', title: 'Wow' },
  ],
  sad: [
    { id: 'sa1', url: 'https://media.tenor.com/eTBE3cXvhJsAAAAC/laughing-lol.gif', preview: 'https://media.tenor.com/eTBE3cXvhJsAAAAC/laughing-lol.gif', title: 'Sad' },
    { id: 'sa2', url: 'https://media.tenor.com/g1wnWqFkOA8AAAAC/dog-funny.gif', preview: 'https://media.tenor.com/g1wnWqFkOA8AAAAC/dog-funny.gif', title: 'Dog' },
  ],
  excited: [
    { id: 'ex1', url: 'https://media.tenor.com/gEHGAn5XJZYAAAAC/happy-dance.gif', preview: 'https://media.tenor.com/gEHGAn5XJZYAAAAC/happy-dance.gif', title: 'Dance' },
    { id: 'ex2', url: 'https://media.tenor.com/FD9PbgJbFOEAAAAC/wow-really.gif', preview: 'https://media.tenor.com/FD9PbgJbFOEAAAAC/wow-really.gif', title: 'Wow' },
  ],
  dance: [
    { id: 'da1', url: 'https://media.tenor.com/gEHGAn5XJZYAAAAC/happy-dance.gif', preview: 'https://media.tenor.com/gEHGAn5XJZYAAAAC/happy-dance.gif', title: 'Dance' },
    { id: 'da2', url: 'https://media.tenor.com/eTBE3cXvhJsAAAAC/laughing-lol.gif', preview: 'https://media.tenor.com/eTBE3cXvhJsAAAAC/laughing-lol.gif', title: 'Laugh' },
  ],
};

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
    const key = category in STATIC_GIFS ? category : 'trending';
    setGifs(STATIC_GIFS[key] || STATIC_GIFS.trending);
    setUsingFallback(true);
  };

  const parseTenorResponse = (data: any): GifItem[] => {
    if (!data.results || data.results.length === 0) return [];
    return data.results.map((gif: any) => {
      // Prefer tinygif for preview, gif for full URL
      const gifFmt = gif.media_formats?.gif;
      const tinyFmt = gif.media_formats?.tinygif;
      const nanogifFmt = gif.media_formats?.nanogif;

      const url = gifFmt?.url || tinyFmt?.url || '';
      const preview = tinyFmt?.url || nanogifFmt?.url || gifFmt?.url || '';

      return { id: gif.id, url, preview, title: gif.content_description || '' };
    }).filter((g: GifItem) => g.url);
  };

  const fetchGifs = async (query?: string) => {
    setLoading(true);
    setUsingFallback(false);

    try {
      const cat = categories.find(c => c.id === selectedCategory);
      const searchTerm = query !== undefined ? query : (selectedCategory === 'trending' ? '' : (cat?.query || ''));

      const endpoint = searchTerm
        ? `${TENOR_API_URL}/search?q=${encodeURIComponent(searchTerm)}&key=${TENOR_API_KEY}&client_key=testagram_social&limit=24&media_filter=gif,tinygif,nanogif`
        : `${TENOR_API_URL}/featured?key=${TENOR_API_KEY}&client_key=testagram_social&limit=24&media_filter=gif,tinygif,nanogif`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const mapped = parseTenorResponse(data);

      if (mapped.length > 0) {
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
    fetchGifs(searchQuery.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <div className="bg-background w-full md:max-w-2xl md:rounded-xl max-h-[88vh] md:max-h-[72vh] flex flex-col overflow-hidden rounded-t-2xl">

        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold">Choose a GIF</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border shrink-0">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for GIFs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full"
            />
          </form>
        </div>

        {/* Categories */}
        <div className="px-4 py-2 border-b border-border overflow-x-auto shrink-0 scrollbar-hide">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setSearchQuery(''); }}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* GIF Grid */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
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
                <p className="text-xs text-muted-foreground text-center mb-3">Showing popular GIFs</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => { onSelect(gif.url); onClose(); }}
                    className="relative aspect-square rounded-xl overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group"
                  >
                    <img
                      src={gif.preview || gif.url}
                      alt={gif.title || 'GIF'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (img.src !== gif.url) img.src = gif.url;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border text-center shrink-0">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold">Tenor</span>
          </p>
        </div>
      </div>
    </div>
  );
}
