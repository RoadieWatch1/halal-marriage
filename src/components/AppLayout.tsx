// C:\Users\vizir\halal-marriage\src\components\AppLayout.tsx
import React, { useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner'; // ✅ Mount Sonner here

const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  // Keeping these hooks in case you use the sidebar later
  const { sidebarOpen, toggleSidebar } = useAppContext();
  const isMobile = useIsMobile();

  // Show a header back button when user is in a sub-section (based on hash "s")
  const [showHeaderBack, setShowHeaderBack] = useState(false);

  useEffect(() => {
    const update = () => {
      if (typeof window === 'undefined') return;
      const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const s = p.get('s');
      setShowHeaderBack(!!s && s !== 'dashboard');
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  // Always navigate internally by adjusting hash to dashboard
  const goDashboard = () => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams();
    p.set('s', 'dashboard');
    // clear deep-link params if present
    p.delete('uid');
    p.delete('cid');
    window.location.hash = `#${p.toString()}`;
  };

  const handleBack = () => {
    // Force an internal route back to dashboard instead of history.back()
    goDashboard();
  };

  return (
    <div className="min-h-screen theme-bg">
      <header className="bg-card border-b border-border shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {showHeaderBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Go back"
                  onClick={handleBack}
                  className="text-white hover:bg-card/60"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <h1
                className="text-2xl font-bold text-white cursor-pointer"
                onClick={goDashboard}
              >
                AM4M - American Muslims for Marriage
              </h1>
            </div>

            <div className="text-sm">
              <span className="theme-button px-3 py-1 rounded-full text-white font-medium">
                Halal • Secure • Family-Oriented
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">{children}</main>

      <footer className="theme-card text-center p-6 mt-8 border-t border-border">
        <p className="theme-text-muted">
          May Allah bless all seeking righteous marriage • AM4M Platform
        </p>
      </footer>

      {/* ✅ Sonner Toaster mounted once at the app root */}
      <Toaster richColors position="top-center" />
    </div>
  );
};

export default AppLayout;
