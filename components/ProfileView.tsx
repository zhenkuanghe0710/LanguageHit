import React, { useState } from 'react';
import { AppMode, GeneratedCardData } from '../types';
import { ArrowLeft, Sparkles, Search, Heart, Crown } from 'lucide-react';
import Flashcard from './Flashcard';
import { RubyRenderer } from './RubyRenderer';

interface ProfileViewProps {
  savedCards: GeneratedCardData[];
  onBack: () => void;
  onRemove: (id: string) => void;
  totalUsageTime: number;
}

const ProfileView: React.FC<ProfileViewProps> = ({ savedCards, onBack, onRemove, totalUsageTime }) => {
  const [activeTab, setActiveTab] = useState<AppMode>(AppMode.UPGRADE);
  const [selectedCard, setSelectedCard] = useState<GeneratedCardData | null>(null);

  const filteredCards = savedCards.filter(c => c.type === activeTab);

  const getTooltipText = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    return `已陪伴您: ${hours}小时 ${minutes}分钟 ${seconds}秒`;
  };

  if (selectedCard) {
    return (
      <div className="w-full flex flex-col h-full animate-fade-in">
        <button 
          onClick={() => setSelectedCard(null)}
          className="flex items-center gap-2 text-gray-500 mb-4 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Collection</span>
        </button>
        <div className="w-full flex-1 flex items-center justify-center">
             <Flashcard 
                data={selectedCard} 
                onBookmark={(id) => {
                    onRemove(id);
                    setSelectedCard(null); // Close if removed
                }} 
             />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2 relative">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">My Collection</h2>

        {/* Crown Icon with Tooltip */}
        <div className="relative group cursor-help ml-1">
          <Crown size={20} className="text-yellow-500 fill-yellow-100" />
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-1.5 rounded-md shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-1 duration-200">
             {getTooltipText(totalUsageTime)}
             {/* Arrow */}
             <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
          </div>
        </div>

        <span className="ml-auto bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-bold">
            {savedCards.length}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm w-full">
        <button
          onClick={() => setActiveTab(AppMode.UPGRADE)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeTab === AppMode.UPGRADE
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Sparkles size={16} />
          <span>Language Hit</span>
        </button>
        <button
          onClick={() => setActiveTab(AppMode.LOOKUP)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeTab === AppMode.LOOKUP
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Search size={16} />
          <span>Dictionary</span>
        </button>
      </div>

      {/* Card Grid */}
      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 pb-20">
          {filteredCards.map(card => (
            <div 
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-indigo-100 transition-all flex flex-col gap-2 group relative"
            >
                <div className="flex justify-between items-start">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                        card.type === AppMode.UPGRADE ? 'text-indigo-400' : 'text-emerald-400'
                    }`}>
                        {new Date(card.timestamp).toLocaleDateString()}
                    </span>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(card.id);
                        }}
                        className="text-gray-300 hover:text-rose-500 p-1"
                    >
                        <Heart size={16} fill="currentColor" className="text-rose-500" />
                    </button>
                </div>
                
                <h3 className="text-xl font-serif font-bold text-gray-900 leading-tight">
                    <RubyRenderer text={card.targetPhrase} />
                </h3>
                
                <p className="text-sm text-gray-500 line-clamp-2">
                    {card.userInput}
                </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <div className="bg-gray-200 p-4 rounded-full mb-4">
                <Heart size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No saved cards yet</p>
            <p className="text-xs text-gray-400 mt-2">
                Click the heart icon on any card to save it here.
            </p>
        </div>
      )}
    </div>
  );
};

export default ProfileView;