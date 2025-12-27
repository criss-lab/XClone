import { Home, Search, Bell, Mail, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Explore', path: '/explore' },
    { icon: Sparkles, label: 'AI', path: '/ai' },
    { icon: Bell, label: 'Notifications', path: '/notifications', requireAuth: true },
    { icon: Mail, label: 'Messages', path: '/messages', requireAuth: true },
  ];

  const handleNavClick = (path: string, requireAuth?: boolean) => {
    if (requireAuth && !user) {
      navigate('/auth');
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border lg:hidden z-50">
      <div className="max-w-2xl mx-auto flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path, item.requireAuth)}
              className={`flex flex-col items-center justify-center py-3 px-4 flex-1 transition-colors ${
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-6 h-6" fill={isActive ? 'currentColor' : 'none'} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
