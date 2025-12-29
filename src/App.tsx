import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Toaster } from '@/components/ui/toaster';
import HomePage from '@/pages/HomePage';
import ExplorePage from '@/pages/ExplorePage';
import NotificationsPage from '@/pages/NotificationsPage';
import MessagesPage from '@/pages/MessagesPage';
import ProfilePage from '@/pages/ProfilePage';
import SearchPage from '@/pages/SearchPage';
import AuthPage from '@/pages/AuthPage';
import SpacesPage from '@/pages/SpacesPage';
import AIPage from '@/pages/AIPage';
import VideosPage from '@/pages/VideosPage';
import AnalyticsDashboard from '@/pages/AnalyticsDashboard';
import AdminPanel from '@/pages/AdminPanel';
import PostThreadPage from '@/pages/PostThreadPage';
import CommunitiesPage from '@/pages/CommunitiesPage';
import CommunityPage from '@/pages/CommunityPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <main className="flex-1 max-w-2xl mx-auto w-full border-x border-border">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/spaces" element={<SpacesPage />} />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/ai" element={<AIPage />} />
              <Route path="/videos" element={<VideosPage />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/post/:postId" element={<PostThreadPage />} />
              <Route path="/communities" element={<CommunitiesPage />} />
              <Route path="/c/:name" element={<CommunityPage />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
