import React from 'react';
import { Sparkles, Search } from 'lucide-react';
import { AppMode } from '../types';

interface ModeToggleProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm w-full">
      <button
        onClick={() => onModeChange(AppMode.UPGRADE)}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
          currentMode === AppMode.UPGRADE
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-gray-500 hover:bg-gray-50'
        }`}
      >
        <Sparkles size={16} />
        <span>Nonsense Upgrade</span>
      </button>
      <button
        onClick={() => onModeChange(AppMode.LOOKUP)}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
          currentMode === AppMode.LOOKUP
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-gray-500 hover:bg-gray-50'
        }`}
      >
        <Search size={16} />
        <span>Lookup Card</span>
      </button>
    </div>
  );
};

export default ModeToggle;