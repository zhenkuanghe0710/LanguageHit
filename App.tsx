import React, { useState, useEffect } from 'react';
import { History, BookOpen, Sparkles, AlertCircle, Trash2, UserCircle2, X } from 'lucide-react';
import { AppMode, GeneratedCardData, TargetLanguage } from './types';
import { generateCardContent } from './services/geminiService';
import InputArea from './components/InputArea';
import Flashcard from './components/Flashcard';
import ModeToggle from './components/ModeToggle';
import ProfileView from './components/ProfileView';
import LanguageSelector from './components/LanguageSelector';
import { cleanTextFromTags } from './components/RubyRenderer';

const STORAGE_KEY = 'language_hit_history_v1';
const USAGE_STORAGE_KEY = 'language_hit_usage_time_v1';

type ViewState = 'GENERATOR' | 'PROFILE';

// --- Helper Component for History Item ---
interface HistoryItemProps {
  item: GeneratedCardData;
  isActive: boolean;
  onSelect: (item: GeneratedCardData) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ 
  item, isActive, onSelect, onDelete 
}) => {
  const isUpgrade = item.type === AppMode.UPGRADE;
  const colorClass = isUpgrade 
    ? (isActive ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200' : 'bg-white border-indigo-100 hover:border-indigo-300') 
    : (isActive ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200' : 'bg-white border-emerald-100 hover:border-emerald-300');
  
  const textClass = isUpgrade ? 'text-indigo-600' : 'text-emerald-600';

  return (
    <div
      className={`relative group flex-shrink-0 w-16 h-12 p-1 rounded-md border text-left flex flex-col justify-between transition-all select-none cursor-pointer ${colorClass}`}
      onClick={() => onSelect(item)}
    >
      {/* Bookmark Indicator */}
      {item.isBookmarked && (
        <div className="absolute top-0.5 right-0.5">
            <div className="w-1 h-1 bg-rose-400 rounded-full"></div>
        </div>
      )}

      {/* Delete Badge - HOVER ONLY */}
      <button
        onClick={(e) => onDelete(e, item.id)}
        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 shadow-sm flex items-center justify-center border border-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
        title="Delete"
      >
        <X size={8} strokeWidth={3} />
      </button>

      <span className={`text-[8px] font-bold truncate w-full leading-none mt-0.5 ${textClass}`}>
        {cleanTextFromTags(item.targetPhrase)}
      </span>
      <span className="text-[7px] text-gray-400 line-clamp-2 leading-tight">
        {item.userInput}
      </span>
    </div>
  );
};
// -----------------------------------------

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('GENERATOR');
  const [mode, setMode] = useState<AppMode>(AppMode.UPGRADE);
  const [targetLang, setTargetLang] = useState<TargetLanguage>(TargetLanguage.ENGLISH);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation Stack for "Back" functionality during drill-down
  const [navStack, setNavStack] = useState<string[]>([]);

  // Usage Time Tracking
  const [totalUsageTime, setTotalUsageTime] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(USAGE_STORAGE_KEY);
        return saved ? parseInt(saved, 10) : 0;
      }
    } catch (e) {
      console.error(e);
    }
    return 0;
  });

  useEffect(() => {
    // Capture the start time of the current session
    const sessionStartTime = Date.now();
    // Capture the total time loaded from storage at mount
    const initialTotalTime = totalUsageTime;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const currentSessionDuration = now - sessionStartTime;
      const newTotal = initialTotalTime + currentSessionDuration;
      
      setTotalUsageTime(newTotal);
      localStorage.setItem(USAGE_STORAGE_KEY, newTotal.toString());
    }, 1000);

    return () => clearInterval(intervalId);
    // Dependencies are empty to ensure we base calculations on the mount time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Active cards
  const [activeCards, setActiveCards] = useState<Record<AppMode, GeneratedCardData | null>>({
    [AppMode.UPGRADE]: null,
    [AppMode.LOOKUP]: null,
  });

  // History with Backward Compatibility Migration
  const [history, setHistory] = useState<GeneratedCardData[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.map((item: any) => ({
            ...item,
            targetPhrase: item.targetPhrase || item.englishPhrase,
            targetPhraseTranslation: item.targetPhraseTranslation || item.englishPhraseTranslation,
            language: item.language || TargetLanguage.ENGLISH
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
    return [];
  });

  // Sync history to Local Storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  // Restore last active cards
  useEffect(() => {
    const lastUpgrade = history.find(h => h.type === AppMode.UPGRADE);
    const lastLookup = history.find(h => h.type === AppMode.LOOKUP);
    
    setActiveCards({
      [AppMode.UPGRADE]: lastUpgrade || null,
      [AppMode.LOOKUP]: lastLookup || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentCard = activeCards[mode];
  const savedCards = history.filter(h => h.isBookmarked);
  
  // Split History
  const upgradeHistory = history.filter(h => h.type === AppMode.UPGRADE);
  const lookupHistory = history.filter(h => h.type === AppMode.LOOKUP);

  const runGeneration = async (text: string, currentMode: AppMode) => {
    if (!text.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    setInputText(text);
    if (mode !== currentMode) setMode(currentMode);

    try {
      const result = await generateCardContent(text, currentMode, targetLang);
      
      const newCard = { ...result, isBookmarked: false };

      setActiveCards(prev => ({ ...prev, [currentMode]: newCard }));
      setHistory(prev => [newCard, ...prev]);
      
      setInputText('');

    } catch (err) {
      console.error(err);
      setError("AI is taking a nap. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = () => {
    setNavStack([]); 
    runGeneration(inputText, mode);
  };

  const handleWordLookup = (word: string) => {
    if (currentCard) {
      setNavStack(prev => [...prev, currentCard.id]);
    }
    setMode(AppMode.LOOKUP);
    runGeneration(word, AppMode.LOOKUP);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setNavStack(prev => {
      const newStack = [...prev];
      const prevId = newStack.pop();

      if (prevId) {
        const prevCard = history.find(h => h.id === prevId);
        if (prevCard) {
          setActiveCards(prevCards => ({ ...prevCards, [prevCard.type]: prevCard }));
          setMode(prevCard.type);
          setTargetLang(prevCard.language);
        }
      }
      return newStack;
    });
  };

  const toggleBookmark = (id: string) => {
    const toggler = (card: GeneratedCardData) => {
      if (card.id === id) {
        return { ...card, isBookmarked: !card.isBookmarked };
      }
      return card;
    };

    setHistory(prev => prev.map(toggler));

    setActiveCards(prev => {
        const next = { ...prev };
        if (next[AppMode.UPGRADE]?.id === id) {
            next[AppMode.UPGRADE] = toggler(next[AppMode.UPGRADE]!);
        }
        if (next[AppMode.LOOKUP]?.id === id) {
            next[AppMode.LOOKUP] = toggler(next[AppMode.LOOKUP]!);
        }
        return next;
    });
  };

  const handleHistorySelect = (card: GeneratedCardData) => {
    setNavStack([]);
    setActiveCards(prev => ({ ...prev, [card.type]: card }));
    if (card.type !== mode) setMode(card.type);
    if (card.language && card.language !== targetLang) {
        setTargetLang(card.language);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(h => h.id !== id));
    
    // Clear active card if we just deleted it
    if (activeCards[AppMode.UPGRADE]?.id === id) {
        setActiveCards(prev => ({ ...prev, [AppMode.UPGRADE]: null }));
    }
    if (activeCards[AppMode.LOOKUP]?.id === id) {
        setActiveCards(prev => ({ ...prev, [AppMode.LOOKUP]: null }));
    }
  };

  const clearHistory = () => {
    if (confirm('Clear all recent history? (Saved cards will be kept)')) {
      setHistory(prev => prev.filter(h => h.isBookmarked));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-6 px-4 max-w-lg mx-auto relative bg-[#f3f4f6]">
      
      {/* Header */}
      <header className="w-full flex justify-between items-center mb-6 z-20">
        <button 
          onClick={() => setView('GENERATOR')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-md">
            <BookOpen size={24} strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Language Hit</h1>
            <p className="text-xs text-gray-500 font-medium">Daily Upgrade</p>
          </div>
        </button>

        <div className="flex items-center gap-2">
            {view === 'GENERATOR' && (
                <LanguageSelector currentLang={targetLang} onSelect={setTargetLang} />
            )}
            
            <button 
            onClick={() => setView(view === 'GENERATOR' ? 'PROFILE' : 'GENERATOR')}
            className={`p-2 rounded-full transition-all ${
                view === 'PROFILE' 
                ? 'bg-indigo-100 text-indigo-600' 
                : 'bg-white text-gray-400 hover:text-indigo-600 shadow-sm'
            }`}
            >
                <UserCircle2 size={28} />
            </button>
        </div>
      </header>

      {/* VIEW: PROFILE */}
      {view === 'PROFILE' ? (
        <ProfileView 
            savedCards={savedCards} 
            onBack={() => setView('GENERATOR')}
            onRemove={toggleBookmark}
            totalUsageTime={totalUsageTime}
        />
      ) : (
        /* VIEW: GENERATOR */
        <>
            {/* Mode Switcher */}
            <div className="w-full mb-6 z-10">
                <ModeToggle currentMode={mode} onModeChange={setMode} />
            </div>

            {/* Main Content Area - Increased bottom padding to prevent fixed input overlap */}
            <main className="w-full flex-1 flex flex-col gap-2 pb-32">
                
                {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm animate-fade-in border border-red-100">
                    <AlertCircle size={18} />
                    {error}
                </div>
                )}

                {/* Card Display */}
                <div className="min-h-[480px] w-full flex justify-center perspective-1000 relative">
                {isLoading ? (
                    <div className="w-full h-[480px] bg-white rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center justify-center animate-pulse">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-200 blur-xl opacity-50 rounded-full animate-ping"></div>
                            <Sparkles className="text-indigo-500 relative z-10 animate-spin-slow" size={48} />
                        </div>
                        <p className="mt-6 text-gray-400 font-medium">Crafting your card...</p>
                        <p className="text-xs text-gray-300 mt-2">Connecting to Gemini...</p>
                    </div>
                ) : currentCard ? (
                    <Flashcard 
                        key={currentCard.id} 
                        data={currentCard} 
                        onBookmark={toggleBookmark}
                        onWordClick={handleWordLookup}
                        canGoBack={navStack.length > 0}
                        onBack={handleBack}
                    />
                ) : (
                    <div className="w-full h-[480px] bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-8">
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                        <Sparkles className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-gray-600 font-semibold mb-2">Ready to Upgrade?</h3>
                    <p className="text-gray-400 text-sm max-w-[200px]">
                        Select your language above, then type anything: a feeling, a bad sentence, or a random thought.
                    </p>
                    </div>
                )}
                </div>

                {/* Recent History Section */}
                {(upgradeHistory.length > 0 || lookupHistory.length > 0) && (
                    <div className="w-full mt-auto flex flex-col gap-1 pt-4">
                        
                        {/* Header with Clear All Button */}
                        <div className="flex items-center justify-between px-1 mb-0.5">
                            <div className="flex items-center gap-1.5 text-gray-400 opacity-70">
                                <History size={11} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Recent</span>
                            </div>
                            
                            <button 
                                onClick={clearHistory}
                                className="text-gray-300 hover:text-rose-500 transition-colors"
                                title="Clear All Recent"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>

                        {/* Row 1: Nonsense Upgrade (Blue) */}
                        {upgradeHistory.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto p-1.5 no-scrollbar">
                                {upgradeHistory.map((item) => (
                                    <HistoryItem
                                        key={item.id}
                                        item={item}
                                        isActive={currentCard?.id === item.id}
                                        onSelect={handleHistorySelect}
                                        onDelete={handleDeleteItem}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Row 2: Lookup Card (Green) */}
                        {lookupHistory.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto p-1.5 no-scrollbar">
                                {lookupHistory.map((item) => (
                                    <HistoryItem
                                        key={item.id}
                                        item={item}
                                        isActive={currentCard?.id === item.id}
                                        onSelect={handleHistorySelect}
                                        onDelete={handleDeleteItem}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Sticky Input Area */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent z-30">
                <div className="max-w-lg mx-auto">
                    <InputArea 
                        value={inputText} 
                        onChange={setInputText} 
                        onSubmit={handleManualSubmit} 
                        isLoading={isLoading}
                        mode={mode}
                    />
                </div>
            </div>
        </>
      )}

    </div>
  );
};

export default App;