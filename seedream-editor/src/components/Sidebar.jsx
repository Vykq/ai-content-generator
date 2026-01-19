import { Button } from './ui/button';

export default function Sidebar({ activeView, setActiveView }) {
  const menuItems = [
    { id: 'generate', label: 'Generate', icon: '✨' },
    { id: 'girls', label: 'Girls', icon: '👤' },
  ];

  return (
    <div className="w-64 bg-card border-r border-border min-h-screen p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-1">AI Image Editor</h2>
        <p className="text-sm text-muted-foreground">Powered by fal.ai</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeView === item.id ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveView(item.id)}
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
          </Button>
        ))}
      </nav>
    </div>
  );
}
