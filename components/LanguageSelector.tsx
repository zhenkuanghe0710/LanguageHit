import React from 'react';
import { TargetLanguage } from '../types';
import { Languages, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  currentLang: TargetLanguage;
  onSelect: (lang: TargetLanguage) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLang, onSelect }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const options = [
    { value: TargetLanguage.ENGLISH, label: '🇺🇸 English' },
    { value: TargetLanguage.JAPANESE, label: '🇯🇵 Japanese' },
    { value: TargetLanguage.CANTONESE, label: '🇭🇰 Cantonese' },
  ];

  const currentLabel = options.find(o => o.value === currentLang)?.label;

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
      >
        <Languages size={14} className="text-indigo-500" />
        <span>{currentLabel}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 overflow-hidden animate-fade-in">
            {options.map((opt) => (
                <button
                key={opt.value}
                onClick={() => {
                    onSelect(opt.value);
                    setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                    currentLang === opt.value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                }`}
                >
                {opt.label}
                </button>
            ))}
            </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;