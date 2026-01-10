import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, Lock, Eye, Shield, HelpCircle, FileText, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { authService } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleLogout = async () => {
    await authService.signOut();
    logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast({
        title: 'Invalid confirmation',
        description: 'Please type DELETE to confirm',
        variant: 'destructive',
      });
      return;
    }

    setDeleting(true);

    try {
      // Delete user data (RLS policies will cascade delete related records)
      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', user?.id);

      if (deleteError) throw deleteError;

      // Sign out
      await authService.signOut();
      logout();
      
      toast({
        title: 'Account deleted',
        description: 'Your account and all data have been permanently deleted',
      });

      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
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
            <button 
              onClick={() => window.open('/privacy-policy', '_blank')}
              className="flex items-center gap-3 w-full p-3 hover:bg-muted rounded-lg text-left"
            >
              <Shield className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Privacy Policy</p>
                <p className="text-sm text-muted-foreground">Learn how we protect your data</p>
              </div>
            </button>
            <button 
              onClick={() => window.open('/terms-of-service', '_blank')}
              className="flex items-center gap-3 w-full p-3 hover:bg-muted rounded-lg text-left"
            >
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">Terms of Service</p>
                <p className="text-sm text-muted-foreground">Read our terms and conditions</p>
              </div>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-4">
          <h2 className="text-lg font-bold mb-4 text-destructive">Danger Zone</h2>
          <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">Delete Account</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
            </div>
            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete My Account
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Type <span className="text-destructive font-mono">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    placeholder="DELETE"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    variant="destructive"
                    className="flex-1"
                    disabled={deleteConfirmText !== 'DELETE' || deleting}
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </Button>
                </div>
              </div>
            )}
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
