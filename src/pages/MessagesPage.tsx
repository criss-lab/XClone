import { TopBar } from '@/components/layout/TopBar';
import { Mail } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Messages" showSettings />
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Mail className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold mb-3">Welcome to your inbox!</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Drop a line, share posts and more with private conversations between you and others on X.
        </p>
      </div>
    </div>
  );
}
