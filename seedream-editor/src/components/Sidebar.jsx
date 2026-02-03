import { Button } from './ui/button';
import { logout } from '../services/authService';

export default function Sidebar({ activeView, setActiveView, currentUser, isOpen, onClose }) {
  const menuItems = [
    { id: 'generate', label: 'Generate', icon: '✨' },
    { id: 'girls', label: 'Girls', icon: '👤' },
    { id: 'json-prompter', label: 'JSON Prompter', icon: '🧩' },
    { id: 'history', label: 'History', icon: '📜' },
  ];

  const handleNavigate = (id) => {
    setActiveView(id);
    if (onClose) onClose();
  };

  return (
    <div
      className={[
        'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border p-4 flex flex-col',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:static lg:translate-x-0 lg:min-h-screen',
      ].join(' ')}
    >
      {/* Close button — mobile only */}
      <div className="flex items-center justify-between mb-6 lg:hidden">
        <h2 className="text-lg font-bold">AI Image Editor</h2>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div>
        <div className="mb-8 hidden lg:block">
          <h2 className="text-xl font-bold mb-1">AI Image Editor</h2>
          <p className="text-sm text-muted-foreground">Powered by fal.ai</p>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeView === item.id ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => handleNavigate(item.id)}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Button>
          ))}
        </nav>
      </div>

      <div className="mt-auto pt-4 space-y-2">
        {currentUser && (
          <div className="px-3 py-2 text-sm text-muted-foreground border-t border-border">
            <div className="font-medium text-foreground">Logged in as</div>
            <div>{currentUser.username}</div>
          </div>
        )}
        <Button
          variant={activeView === 'settings' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => handleNavigate('settings')}
        >
          <span className="mr-2">⚙️</span>
          Settings
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={logout}
        >
          <span className="mr-2">🚪</span>
          Logout
        </Button>
      </div>
    </div>
  );
}
