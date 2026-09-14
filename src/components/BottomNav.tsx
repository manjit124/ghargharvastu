import React from 'react';
import { Home, Search, Camera, MessageSquare, User } from 'lucide-react';

interface BottomNavProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onOpenProfile: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onNavigate,
  onOpenProfile,
}) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-2 py-1.5 shadow-lg safe-area-bottom w-full max-w-full overflow-hidden">
      <div className="grid grid-cols-5 items-center justify-items-center max-w-md mx-auto w-full">
        {/* Home */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeView === 'home' ? 'text-amber-700 font-bold' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </button>

        {/* Explore / Search */}
        <button
          type="button"
          onClick={() => onNavigate('explore')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeView === 'explore' ? 'text-amber-700 font-bold' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Explore</span>
        </button>

        {/* Big Center Action: Upload Photo / Analyze */}
        <button
          type="button"
          onClick={() => onNavigate('photo-analysis')}
          className="flex flex-col items-center justify-center -mt-4 relative group"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-600/30 group-active:scale-95 transition-transform">
            <Camera className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-amber-900 mt-1">Analyze</span>
        </button>

        {/* AI Chat */}
        <button
          type="button"
          onClick={() => onNavigate('chat')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors ${
            activeView === 'chat' ? 'text-amber-700 font-bold' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Ask AI</span>
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-stone-500 hover:text-stone-800 transition-colors"
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Profile</span>
        </button>
      </div>
    </nav>
  );
};
