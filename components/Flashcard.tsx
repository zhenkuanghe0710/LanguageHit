import React, { useState } from 'react';
import { Volume2, RotateCcw, MapPin, Sparkles, User, BookOpen, Heart, ArrowLeft, Quote } from 'lucide-react';
import { GeneratedCardData, AppMode, TargetLanguage } from '../types';
import { RubyRenderer, cleanTextFromTags, cleanTextForAudio, cleanTextForDisplay } from './RubyRenderer';

interface FlashcardProps {
  data: GeneratedCardData;
  onBookmark?: (id: string) => void;
  onWordClick?: (word: string) => void;
  onBack?: () => void;
  canGoBack?: boolean;
}

const Flashcard: React.FC<FlashcardProps> = ({ data, onBookmark, onWordClick, onBack, canGoBack }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const geminiTotalTokens =
    data.geminiUsage?.totalTokenCount ??
    (data.geminiUsage?.promptTokenCount != null && data.geminiUsage?.candidatesTokenCount != null
      ? data.geminiUsage.promptTokenCount + data.geminiUsage.candidatesTokenCount
      : undefined);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBookmark) {
      onBookmark(data.id);
    }
  };
  
  const getVoiceLang = (lang: TargetLanguage) => {
    switch (lang) {
      case TargetLanguage.JAPANESE: return 'ja-JP';
      case TargetLanguage.CANTONESE: return 'zh-HK';
      default: return 'en-US';
    }
  };

  const getLangLabel = (lang: TargetLanguage) => {
    switch (lang) {
        case TargetLanguage.JAPANESE: return 'Japanese';
        case TargetLanguage.CANTONESE: return 'Cantonese';
        default: return 'English';
      }
  };

  const getLocaleCode = (lang: TargetLanguage) => {
    switch (lang) {
      case TargetLanguage.JAPANESE: return 'ja';
      case TargetLanguage.CANTONESE: return 'zh-HK';
      default: return 'en';
    }
  };
  
  const playAudio = (e: React.MouseEvent, text: string) => {
    e.stopPropagation(); // Prevent card flip
    if (!text) return;
    
    // Use the audio-specific cleaner which handles Japanese readings and Cantonese brackets
    const cleanText = cleanTextForAudio(text, data.language || TargetLanguage.ENGLISH);
    const targetLang = getVoiceLang(data.language || TargetLanguage.ENGLISH);

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = targetLang;
    utterance.rate = 0.9;

    // Enhanced voice selection logic
    // Browsers often default zh-HK to Mandarin voices if a specific Cantonese voice isn't picked manually.
    if (targetLang === 'zh-HK') {
        const voices = window.speechSynthesis.getVoices();
        // Priorities: 
        // 1. Exact match for 'zh-HK'
        // 2. Name contains "Cantonese", "Hong Kong", "HK", or "Yue"
        const cantoneseVoice = voices.find(v => v.lang === 'zh-HK') || 
                               voices.find(v => 
                                 v.name.toLowerCase().includes('cantonese') || 
                                 v.name.toLowerCase().includes('hong kong') ||
                                 v.name.toLowerCase().includes('hk')
                               );
                               
        if (cantoneseVoice) {
            utterance.voice = cantoneseVoice;
        }
    }

    window.speechSynthesis.speak(utterance);
  };

  // Helper to render sentence with clickable words, handling [phrases] and CJK segmentation and Ruby tags
  const ClickableSentence = ({ text, lang }: { text: string, lang: TargetLanguage }) => {
    if (!onWordClick) return <RubyRenderer text={text.replace(/[\[\]]/g, '')} />;

    const locale = getLocaleCode(lang);
    
    // Step 1: Split by brackets [ ] first to preserve fixed phrases
    const chunks = text.split(/\[(.*?)\]/g);

    return (
      <>
        {chunks.map((chunk, idx) => {
          const isBracketed = idx % 2 === 1; // odd index = inside brackets [ ... ]

          // Logic to determine if we should treat this block as a single phrase or break it down.
          // Rule: If it's bracketed, but contains significant punctuation or is > 3 words, break it down (user preference).
          // Rule: If it's bracketed and short (e.g. "burst into"), keep it grouped.
          let shouldGroup = false;
          
          if (isBracketed) {
             const cleanChunk = cleanTextFromTags(chunk).trim();
             
             // Detect CJK (Chinese/Japanese/Korean) characters to switch logic
             const isCJK = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(cleanChunk);

             if (isCJK) {
                 // CJK Logic: 
                 // Since words don't have spaces, "wordCount" is unreliable (usually 1).
                 // We use character length and punctuation.
                 // Threshold 5 chars: 
                 // e.g. "気にする" (4) -> Grouped.
                 // e.g. "不相応" (3) -> Grouped.
                 // e.g. "不相応な態度" (6) -> Split.
                 const hasPunctuation = /[。！？!?、，]/.test(cleanChunk);
                 
                 if (cleanChunk.length <= 5 && !hasPunctuation) {
                     shouldGroup = true;
                 }
             } else {
                 // English/Latin Logic
                 const wordCount = cleanChunk.split(/\s+/).length;
                 const hasPunctuation = /[.!?;:]/.test(cleanChunk); 
                 if (wordCount <= 3 && !hasPunctuation) {
                     shouldGroup = true;
                 }
             }
          }

          if (shouldGroup) {
             // Treat the whole block as one clickable item.
             const lookupText = cleanTextFromTags(chunk);
             return (
               <span
                 key={`phrase-${idx}`}
                 onClick={(e) => {
                   e.stopPropagation();
                   onWordClick(lookupText);
                 }}
                 className="hover:text-indigo-600 hover:font-bold hover:underline decoration-dotted cursor-pointer transition-all mx-0.5 rounded px-0.5 hover:bg-indigo-50 inline-block"
                 title="Lookup phrase"
               >
                 <RubyRenderer text={chunk} />
               </span>
             );
          } else {
            // Normal text chunk OR a "broken" phrase. Segment it.
            // Note: If it was bracketed but we decided to split it, we render it just like normal text.
            if (!chunk) return null;

            const subParts = chunk.split(/(<ruby>.*?<\/ruby>)/g);
            
            return subParts.map((subPart, spIdx) => {
                 const rubyMatch = subPart.match(/<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/);
                 if (rubyMatch) {
                     // It is a ruby block <ruby>Kanji<rt>Kana</rt></ruby>
                     // Treat as a single word
                     const kanjiBase = rubyMatch[1];
                     const kana = rubyMatch[2];
                     return (
                        <span
                            key={`ruby-${idx}-${spIdx}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onWordClick(kanjiBase);
                            }}
                            className="hover:text-indigo-600 hover:font-bold hover:underline decoration-dotted cursor-pointer transition-all mx-0.5 inline-block"
                        >
                            <ruby>
                                {kanjiBase}
                                <rt className="text-[0.6em] select-none text-gray-400 font-normal">{kana}</rt>
                            </ruby>
                        </span>
                     );
                 } else {
                     // Plain text. Segment it.
                     if (!subPart) return null;
                     
                     let segments: { segment: string; isWordLike: boolean }[] = [];

                     if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
                        const segmenter = new (Intl as any).Segmenter(locale, { granularity: 'word' });
                        const iterator = segmenter.segment(subPart);
                        for (const seg of iterator) {
                            segments.push(seg);
                        }
                     } else {
                        // Fallback
                        if (lang === TargetLanguage.ENGLISH) {
                            subPart.split(/(\s+)/).forEach(s => {
                                segments.push({ segment: s, isWordLike: /\S/.test(s) });
                            });
                        } else {
                            subPart.split('').forEach(s => {
                                segments.push({ segment: s, isWordLike: /\S/.test(s) });
                            });
                        }
                     }

                     return segments.map((seg, sIdx) => {
                         if (seg.isWordLike) {
                             const cleanTerm = seg.segment.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'|]/g, "");
                             return (
                                 <span
                                     key={`seg-${idx}-${spIdx}-${sIdx}`}
                                     onClick={(e) => {
                                         e.stopPropagation();
                                         if (cleanTerm) onWordClick(cleanTerm);
                                     }}
                                     className="hover:text-indigo-600 hover:font-bold hover:underline decoration-dotted cursor-pointer transition-all"
                                 >
                                     {seg.segment}
                                 </span>
                             );
                         } else {
                             return <span key={`seg-${idx}-${spIdx}-${sIdx}`}>{seg.segment}</span>;
                         }
                     });
                 }
            });
          }
        })}
      </>
    );
  };

  const isUpgrade = data.type === AppMode.UPGRADE;

  return (
    <div 
      className="w-full cursor-pointer group perspective-1000"
      onClick={handleFlip}
    >
      <div className={`relative w-full transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* FRONT SIDE - Now determines the height via relative positioning */}
        <div 
            className={`relative w-full min-h-[480px] bg-white rounded-[2rem] shadow-xl border border-white/60 p-7 flex flex-col backface-hidden ring-1 ring-black/5 ${isFlipped ? 'pointer-events-none' : ''}`}
        >
          {/* Content Wrapper for Opacity Transition (Prevents Bleed-Through) */}
          <div className={`flex flex-col flex-1 h-full w-full transition-opacity duration-300 ${isFlipped ? 'opacity-0' : 'opacity-100 delay-100'}`}>
            
            {/* Header Tag */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                {canGoBack && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onBack && onBack();
                        }}
                        className="p-2 -ml-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title="Back to previous card"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}
                <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase shadow-sm ${
                    isUpgrade ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                    {isUpgrade ? 'Language Hit' : 'Dictionary'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium px-2.5 py-1.5 bg-slate-100/80 rounded-full">
                    {getLangLabel(data.language || TargetLanguage.ENGLISH)}
                </span>
                </div>
                
                <div className="flex items-center gap-1">
                    {geminiTotalTokens != null && (
                        <span
                            className="text-[10px] text-slate-400 font-medium tabular-nums px-1 max-w-[5.5rem] truncate sm:max-w-none"
                            title={
                                [
                                    data.geminiUsage?.promptTokenCount != null &&
                                        `输入 ${data.geminiUsage.promptTokenCount.toLocaleString()}`,
                                    data.geminiUsage?.candidatesTokenCount != null &&
                                        `输出 ${data.geminiUsage.candidatesTokenCount.toLocaleString()}`,
                                ]
                                    .filter(Boolean)
                                    .join(' · ') || undefined
                            }
                        >
                            {geminiTotalTokens.toLocaleString()} tokens
                        </span>
                    )}
                    <button 
                        onClick={handleBookmark}
                        className={`p-2 rounded-full transition-all duration-300 ${
                        data.isBookmarked 
                            ? 'bg-rose-50 text-rose-500 scale-110 shadow-sm' 
                            : 'text-slate-300 hover:text-rose-400 hover:bg-slate-50'
                        }`}
                        title={data.isBookmarked ? "Saved" : "Save to Collection"}
                    >
                        <Heart size={18} fill={data.isBookmarked ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>

            {/* UPGRADE MODE */}
            {isUpgrade ? (
                <div className="flex flex-col gap-6 pb-2">
                
                {/* 0. User Input */}
                <div className="flex flex-col gap-1 pl-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                        <User size={12} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Original</span>
                    </div>
                    <p className="text-slate-700 font-medium text-lg leading-snug break-words">
                    "{data.userInput}"
                    </p>
                </div>

                {/* 1. Witty Comment (Chat Bubble Style) */}
                {data.wittyComment && (
                    <div className="relative bg-gradient-to-br from-indigo-50/80 to-slate-50/50 p-4 rounded-2xl rounded-tl-sm text-indigo-900/80 shadow-sm border border-indigo-100/50">
                        <Quote size={14} className="absolute top-3 left-3 text-indigo-200" />
                    <p className="text-sm italic leading-relaxed whitespace-pre-line relative z-10 pl-4">
                        <RubyRenderer text={data.wittyComment} />
                    </p>
                    </div>
                )}

                {/* 2. Target Phrase (Hero Style) */}
                <div className="py-2">
                    <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-2xl font-serif font-bold text-slate-900 leading-snug">
                        <RubyRenderer 
                            text={data.targetPhrase} 
                            rtClassName="!text-sm !font-medium !text-slate-500 !font-sans" 
                        />
                        </h2>
                        {data.targetPhraseTranslation && (
                        <p className="text-slate-500 text-sm font-medium">
                            {data.targetPhraseTranslation}
                        </p>
                        )}
                    </div>
                    <button 
                        onClick={(e) => playAudio(e, data.targetPhrase)}
                        className="flex-shrink-0 p-3 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors bg-white shadow-sm border border-indigo-50"
                    >
                        <Volume2 size={20} />
                    </button>
                    </div>
                </div>

                {/* 3. Explanation & Scene (Card Style) */}
                <div className="flex flex-col gap-3">
                    {/* Explanation */}
                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            <Sparkles size={12} /> The Vibe
                        </h4>
                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                            <RubyRenderer text={data.explanation} />
                        </p>
                    </div>

                    {/* Scenario */}
                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            <MapPin size={12} /> Usage
                        </h4>
                        <p className="text-slate-600 text-sm italic whitespace-pre-line mb-3">
                        <RubyRenderer text={data.scenario} />
                        </p>
                        
                        {/* Example Sentence */}
                        {data.scenarioExample && (
                            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100/50">
                                <div className="flex items-start gap-3">
                                    <button 
                                        onClick={(e) => playAudio(e, data.scenarioExample!)}
                                        className="mt-0.5 text-indigo-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                                    >
                                        <Volume2 size={16} />
                                    </button>
                                    <div>
                                        <p className="text-sm font-semibold text-indigo-900 leading-snug">
                                            <ClickableSentence text={data.scenarioExample} lang={data.language} />
                                        </p>
                                        {data.scenarioExampleTranslation && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                {data.scenarioExampleTranslation}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            ) : (
                /* LOOKUP MODE */
                <div className="flex flex-col gap-6 flex-grow pb-2">
                
                {/* 1. Target Phrase */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h2 className="text-4xl font-serif font-bold text-emerald-800 leading-none tracking-tight">
                    <RubyRenderer text={data.targetPhrase} />
                    </h2>
                    <button 
                    onClick={(e) => playAudio(e, data.targetPhrase)}
                    className="p-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors bg-emerald-50/50"
                    >
                    <Volume2 size={24} />
                    </button>
                </div>

                {/* 2. Definition & Explanation */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    {data.definitionTarget ? (
                    <>
                    {/* Target Definition */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <BookOpen size={12} /> Definition ({getLangLabel(data.language)})
                            </h4>
                            <button 
                                onClick={(e) => playAudio(e, data.definitionTarget!)}
                                className="text-emerald-400 hover:text-emerald-600 transition-colors"
                            >
                                <Volume2 size={14} />
                            </button>
                        </div>
                        <div className="text-slate-800 text-sm font-medium leading-relaxed pl-1">
                            <ClickableSentence text={data.definitionTarget} lang={data.language} />
                        </div>
                    </div>
                    
                    {/* Chinese Explanation */}
                    <div className="pt-3 border-t border-slate-200/60">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        <Sparkles size={12} /> Nuance
                        </h4>
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line pl-1">
                        <RubyRenderer text={data.explanation} />
                        </p>
                    </div>
                    </>
                    ) : (
                        /* Fallback */
                        <div>
                            <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            <BookOpen size={12} /> Definition
                            </h4>
                            <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line pl-1">
                            <RubyRenderer text={data.explanation} />
                            </p>
                        </div>
                    )}
                </div>

                {/* 3. Context */}
                <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">
                        <MapPin size={12} /> Context
                    </h4>
                    <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100/50">
                        <p className="text-emerald-900 text-sm italic">
                            <RubyRenderer text={data.scenario} />
                        </p>
                    </div>
                </div>

                {/* 4. Examples */}
                {data.examples && data.examples.length > 0 && (
                    <div className="flex-grow">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1">Examples</h4>
                    <div className="flex flex-col gap-3">
                        {data.examples.map((ex, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 flex flex-col gap-1">
                            <div className="flex items-start gap-2">
                            <button 
                                onClick={(e) => playAudio(e, ex.en)}
                                className="mt-0.5 text-emerald-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                                >
                                <Volume2 size={14} />
                                </button>
                                <p className="text-sm font-semibold text-slate-900 leading-snug">
                                    <ClickableSentence text={ex.en} lang={data.language} />
                                </p>
                            </div>
                            <p className="text-xs text-slate-500 pl-6">{ex.cn}</p>
                        </div>
                        ))}
                    </div>
                    </div>
                )}
                </div>
            )}
          </div>
        </div>

        {/* BACK SIDE - Matches Front height */}
        <div 
            className={`absolute inset-0 w-full h-full rounded-[2rem] shadow-xl p-8 flex flex-col items-center justify-between text-center backface-hidden rotate-y-180 ${
            isUpgrade ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white' : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
            } ${isFlipped ? '' : 'pointer-events-none'}`}
        >
          {/* Content Wrapper for Opacity Transition */}
          <div className={`w-full h-full flex flex-col items-center justify-between transition-opacity duration-300 ${isFlipped ? 'opacity-100 delay-100' : 'opacity-0'}`}>
            
            <div className="absolute top-8 right-8 opacity-50">
                <RotateCcw size={20} />
            </div>

            <div className="w-full h-full flex flex-col items-center justify-between py-6 z-10">
                
                {/* Top Label */}
                <div className="mt-8">
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] opacity-60 ${
                    isUpgrade ? 'text-slate-300' : 'text-emerald-100'
                    }`}>
                    FOCUS MODE
                    </p>
                </div>
                
                {/* Middle: Target Phrase (Hero) & Audio */}
                <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full px-2">
                    <h2 className="text-3xl md:text-4xl font-serif font-bold leading-tight break-words w-full px-4 drop-shadow-lg">
                    <RubyRenderer text={cleanTextForDisplay(data.targetPhrase, data.language)} className="text-white" />
                    </h2>

                    {/* Play Button */}
                    <button 
                    onClick={(e) => playAudio(e, data.targetPhrase)}
                    className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-md transition-all transform hover:scale-110 active:scale-95 border border-white/20 shadow-xl"
                    >
                    <Volume2 size={28} className="text-white" />
                    </button>
                </div>

                {/* Bottom: User Input (Origin) */}
                <div className="mb-6 flex flex-col items-center gap-1 max-w-[85%]">
                    <p className={`text-[10px] uppercase tracking-wider opacity-50 mb-1 ${isUpgrade ? 'text-slate-400' : 'text-emerald-100'}`}>
                    Origin
                    </p>
                    <p className={`text-lg font-medium text-center leading-snug ${isUpgrade ? 'text-slate-200' : 'text-white'}`}>
                    "{data.userInput}"
                    </p>
                </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Flashcard;