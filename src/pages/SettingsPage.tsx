import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, Lock, Eye, Shield, HelpCircle, FileText, LogOut } from 'lucide-react';
import { authService } from '@/lib/auth';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleLogout = async () => {
    await authService.signOut();
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Settings" showBack />

      <div className="divide-y divide-border">
        {/* Account Section */}
        <div className="p-4">
          <h2 className="text-lg font-bold mb-4">Account</h2>
          <div className="space-y-4">
            <button
              onClick={() => navigate(`/profile/${user.username}`)}
              className="flex items-center justify-between w-full p-3 hover:bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-semibold">View Profile</p>
                  <p className="text-sm text-muted-foreground">See your public profile</p>
                </div>
              </div>
            </button>

            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Private Account</p>
                  <p className="text-sm text-muted-foreground">Only followers can see your posts</p>
                </div>
              </div>
              <Switch checked={privateAccount} onCheckedChange={setPrivateAccount} />
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="p-4">
          <h2 className="text-lg font-bold mb-4">Notifications</h2>
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified about new activity</p>
              </div>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="p-4">
          <h2 className="text-lg font-bold mb-4">Privacy & Security</h2>
          <div className="space-y-2">
            <button className="flex items-center gap-3 w-full p-3 hover:bg-muted rounded-lg text-left">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Privacy Policy</p>
                <p className="text-sm text-muted-foreground">Learn how we protect your data</p>
              </div>
            </button>
            <button className="flex items-center gap-3 w-full p-3 hover:bg-muted rounded-lg text-left">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Terms of Service</p>
                <p className="text-sm text-muted-foreground">Read our terms and conditions</p>
              </div>
            </button>
          </div>
        </div>

        {/* Help & Support */}
        <div className="p-4">
          <h2 className="text-lg font-bold mb-4">Help & Support</h2>
          <button className="flex items-center gap-3 w-full p-3 hover:bg-muted rounded-lg text-left">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-semibold">Help Center</p>
              <p className="text-sm text-muted-foreground">Get help with T Social</p>
            </div>
          </button>
        </div>

        {/* App Info */}
        <div className="p-4">
          <h2 className="text-lg font-bold mb-4">About</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>T Social v1.0.0</p>
            <p>© 2025 T Social. All rights reserved.</p>
            <p className="text-xs">Made with ❤️ for the community</p>
          </div>
        </div>

        {/* Logout */}
        <div className="p-4">
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}
