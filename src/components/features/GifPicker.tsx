import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

interface GifItem {
  id: string;
  url: string;
  preview: string;
  width?: number;
  height?: number;
}

// Tenor v2 API — using a valid public key
const TENOR_KEY = 'AIzaSyC4Mj8ztaAXsKDmFHbQEWw0JWdwT7LVBLY';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';
const CLIENT_KEY = 'testagram_app';

// Categories shown as chips
const CATEGORIES = [
  { id: 'trending', label: '🔥 Trending', q: '' },
  { id: 'happy',    label: '😊 Happy',   q: 'happy' },
  { id: 'love',     label: '❤️ Love',    q: 'love' },
  { id: 'funny',    label: '😂 Funny',   q: 'funny' },
  { id: 'sad',      label: '😢 Sad',     q: 'sad' },
  { id: 'fire',     label: '🔥 Fire',    q: 'fire' },
  { id: 'clap',     label: '👏 Clap',    q: 'clap' },
  { id: 'dance',    label: '💃 Dance',   q: 'dance' },
];

// Guaranteed-working fallback GIFs from media.tenor.com
const FALLBACK_GIFS: GifItem[] = [
  { id: 'f1', url: 'https://media.tenor.com/eFPFHSN4rJ8AAAAC/cat-cute.gif',         preview: 'https://media.tenor.com/eFPFHSN4rJ8AAAAS/cat-cute.gif' },
  { id: 'f2', url: 'https://media.tenor.com/6uIbSsXqhLsAAAAC/happy-dog.gif',        preview: 'https://media.tenor.com/6uIbSsXqhLsAAAAS/happy-dog.gif' },
  { id: 'f3', url: 'https://media.tenor.com/tEosl9-PLPUAAAAC/thumbs-up.gif',        preview: 'https://media.tenor.com/tEosl9-PLPUAAAAS/thumbs-up.gif' },
  { id: 'f4', url: 'https://media.tenor.com/Zp4lDz2mIiMAAAAC/dance-happy.gif',      preview: 'https://media.tenor.com/Zp4lDz2mIiMAAAAS/dance-happy.gif' },
  { id: 'f5', url: 'https://media.tenor.com/SFBFxZfpVhUAAAAC/love-heart.gif',       preview: 'https://media.tenor.com/SFBFxZfpVhUAAAAS/love-heart.gif' },
  { id: 'f6', url: 'https://media.tenor.com/GXqFkFMX8DMAAAAC/wow-mind-blown.gif',   preview: 'https://media.tenor.com/GXqFkFMX8DMAAAAS/wow-mind-blown.gif' },
  { id: 'f7', url: 'https://media.tenor.com/AOLBQ01_4KAAAAAC/funny-haha.gif',       preview: 'https://media.tenor.com/AOLBQ01_4KAAAAAS/funny-haha.gif' },
  { id: 'f8', url: 'https://media.tenor.com/p8GDleFN6GQAAAAC/clapping-applause.gif', preview: 'https://media.tenor.com/p8GDleFN6GQAAAAS/clapping-applause.gif' },
  { id: 'f9', url: 'https://media.tenor.com/TDzRfkHHpJYAAAAC/crying-sad.gif',       preview: 'https://media.tenor.com/TDzRfkHHpJYAAAAS/crying-sad.gif' },
  { id: 'f10', url: 'https://media.tenor.com/X6dTDmQbpJ4AAAAC/fire-flames.gif',     preview: 'https://media.tenor.com/X6dTDmQbpJ4AAAAS/fire-flames.gif' },
  { id: 'f11', url: 'https://media.tenor.com/GBZs79dYFEQAAAAC/nod-yes.gif',         preview: 'https://media.tenor.com/GBZs79dYFEQAAAAS/nod-yes.gif' },
  { id: 'f12', url: 'https://media.tenor.com/Rs_tMBR59esAAAAC/roll-eyes.gif',        preview: 'https://media.tenor.com/Rs_tMBR59esAAAAS/roll-eyes.gif' },
];

function parseTenorGifs(data: any): GifItem[] {
  if (!data?.results?.length) return [];
  return data.results.flatMap((item: any) => {
    const fmts = item.media_formats || {};
    const gifUrl  = fmts.gif?.url || fmts.mediumgif?.url || fmts.tinygif?.url || '';
    const prevUrl = fmts.tinygif?.url || fmts.nanogif?.url || gifUrl;
    if (!gifUrl) return [];
    return [{ id: item.id, url: gifUrl, preview: prevUrl }];
  });
}

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery]       = useState('');
  const [category, setCategory] = useState('trending');
  const [gifs, setGifs]         = useState<GifItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    doSearch('', category);
  }, [category]);

  const doSearch = async (searchQuery: string, cat: string) => {
    // Cancel any previous in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setIsFallback(false);

    try {
      const catQ = CATEGORIES.find(c => c.id === cat)?.q || '';
      const term = searchQuery.trim() || catQ;

      let url: string;
      if (term) {
        url = `${TENOR_BASE}/search?q=${encodeURIComponent(term)}&key=${TENOR_KEY}&client_key=${CLIENT_KEY}&limit=30&media_filter=gif,tinygif,nanogif`;
      } else {
        url = `${TENOR_BASE}/featured?key=${TENOR_KEY}&client_key=${CLIENT_KEY}&limit=30&media_filter=gif,tinygif,nanogif`;
      }

      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const parsed = parseTenorGifs(data);

      if (parsed.length > 0) {
        setGifs(parsed);
      } else {
        setGifs(FALLBACK_GIFS);
        setIsFallback(true);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('[GifPicker] Tenor error, showing fallback:', err.message);
      setGifs(FALLBACK_GIFS);
      setIsFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query, category);
  };

  const handleCategoryClick = (id: string) => {
    setCategory(id);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <div className="bg-background w-full md:max-w-2xl md:rounded-xl rounded-t-2xl flex flex-col overflow-hidden"
           style={{ maxHeight: '88vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-lg font-bold">Choose a GIF</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-3 py-2 border-b border-border shrink-0">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search GIFs…"
              className="pl-9 h-9 rounded-full text-sm"
            />
          </form>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 px-3 py-2 overflow-x-auto shrink-0 scrollbar-hide border-b border-border">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => handleCategoryClick(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                category === c.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/70'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* GIF grid */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No GIFs found. Try a different search.
            </div>
          ) : (
            <>
              {isFallback && (
                <p className="text-xs text-center text-muted-foreground mb-2">Showing popular GIFs</p>
              )}
              <div className="columns-2 md:columns-3 gap-2 space-y-2">
                {gifs.map(gif => (
                  <button
                    key={gif.id}
                    onClick={() => { onSelect(gif.url); onClose(); }}
                    className="break-inside-avoid w-full rounded-xl overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all group block"
                  >
                    <img
                      src={gif.preview || gif.url}
                      alt="GIF"
                      className="w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src !== gif.url) img.src = gif.url;
                        else img.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 py-2 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">Powered by <strong>Tenor</strong></p>
        </div>
      </div>
    </div>
  );
}
