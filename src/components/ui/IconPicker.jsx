import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

// Only icons that are verified to exist in current lucide-react
const VALID_ICON_NAMES = [
  'Blocks', 'Users', 'Settings', 'Briefcase', 'Folder', 'FileText', 'Calendar',
  'Truck', 'Heart', 'Building2', 'Activity', 'BarChart2', 'BarChart3', 'Bell',
  'BookOpen', 'Bookmark', 'Box', 'Camera', 'CheckCircle', 'Clipboard', 'Clock',
  'Cloud', 'Code2', 'Coffee', 'Compass', 'CreditCard', 'Database', 'DollarSign',
  'Pencil', 'Eye', 'Feather', 'Filter', 'Flag', 'Gift', 'Globe', 'Headphones',
  'Home', 'Image', 'Inbox', 'Info', 'Key', 'Layers', 'LayoutDashboard', 'Link',
  'List', 'Lock', 'Mail', 'Map', 'MessageCircle', 'MessageSquare', 'Monitor',
  'Package', 'Paperclip', 'Phone', 'PieChart', 'Printer', 'Radio', 'Save',
  'Search', 'Send', 'Server', 'Shield', 'ShoppingBag', 'ShoppingCart', 'Smartphone',
  'Smile', 'Star', 'Sun', 'Tablet', 'Tag', 'Target', 'Wrench', 'Trash2',
  'TrendingUp', 'Type', 'Umbrella', 'Unlock', 'Upload', 'User', 'UserCheck',
  'UserPlus', 'Video', 'Volume2', 'Watch', 'Wifi', 'Zap', 'Award', 'Truck',
  'Stethoscope', 'GraduationCap', 'HeartHandshake', 'FlaskConical', 'Pill', 'Bed',
  'Users2', 'Network', 'MapPin', 'Warehouse', 'Car', 'HandCoins', 'Banknote',
  'FileSearch', 'Receipt', 'Package2', 'LayoutGrid', 'Table2', 'Kanban',
  'ClipboardList', 'ClipboardCheck', 'CheckSquare', 'Scale', 'BookMarked',
  'Lightbulb', 'Rocket', 'Flame', 'Diamond', 'Hexagon', 'Triangle',
];

// Filter to only icons that actually exist in this version of lucide-react
const ICON_NAMES = VALID_ICON_NAMES.filter(name => {
  const icon = LucideIcons[name];
  return typeof icon === 'function' || (icon && typeof icon === 'object');
});

export function IconPicker({ value, onChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredIcons = ICON_NAMES.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const CurrentIcon = (value && LucideIcons[value] && (typeof LucideIcons[value] === 'function' || typeof LucideIcons[value] === 'object'))
    ? LucideIcons[value]
    : LucideIcons.Blocks;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full flex items-center justify-start gap-3 h-10 px-3 bg-background font-normal border-input text-foreground"
        >
          <CurrentIcon className="w-5 h-5 text-primary" />
          <span className="flex-1 text-left">{value || 'Select Icon'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="w-4 h-4 text-[#71717a] dark:text-gray-400 mr-2 shrink-0" />
          <input
            className="flex h-10 w-full rounded-lg bg-transparent py-3 text-sm outline-none placeholder:text-[#71717a] dark:text-gray-400"
            placeholder="Search icons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="h-[250px] overflow-y-auto p-2">
          <div className="grid grid-cols-5 gap-2">
            {filteredIcons.length > 0 ? (
              filteredIcons.map((name) => {
                const IconComp = LucideIcons[name];
                if (!IconComp || (typeof IconComp !== 'function' && typeof IconComp !== 'object')) return null;
                return (
                  <button
                    key={name}
                    title={name}
                    type="button"
                    className={`flex aspect-square items-center justify-center rounded-lg border-[0.5px] border-black/9 dark:border-white/8 transition-colors hover:bg-slate-100 dark:bg-secondary hover:text-primary ${
                      value === name
                        ? 'bg-primary/15 border-primary text-primary'
                        : 'bg-transparent border-transparent text-[#71717a] dark:text-gray-400'
                    }`}
                    onClick={() => {
                      onChange(name);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <IconComp className="w-5 h-5" />
                  </button>
                );
              })
            ) : (
              <div className="col-span-5 text-center text-sm text-[#71717a] dark:text-gray-400 py-4">
                No icons found.
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
