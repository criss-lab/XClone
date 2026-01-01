import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { FloatingActionButton } from '@/components/layout/FloatingActionButton';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from 'sonner';
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
import HashtagPage from '@/pages/HashtagPage';
import AIBotSetup from '@/pages/AIBotSetup';
import { BookmarksPage } from '@/pages/BookmarksPage';
import { ListsPage } from '@/pages/ListsPage';
import { MonetizationDashboard } from '@/pages/MonetizationDashboard';
import { ProductsPage } from '@/pages/ProductsPage';
import { ScheduledPostsPage } from '@/pages/ScheduledPostsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <main className="flex-1 max-w-2xl w-full border-x border-border">
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
              <Route path="/hashtag/:tag" element={<HashtagPage />} />
              <Route path="/ai-bot-setup" element={<AIBotSetup />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/lists" element={<ListsPage />} />
              <Route path="/monetization" element={<MonetizationDashboard />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/scheduled" element={<ScheduledPostsPage />} />
            </Routes>
          </main>
          <RightSidebar />
          <BottomNav />
          <FloatingActionButton />
        </div>
        <Toaster />
        <Sonner position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
