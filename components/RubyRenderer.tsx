import React from 'react';
import { TargetLanguage } from '../types';

export const RubyRenderer = ({ text, className = "", rtClassName }: { text: string, className?: string, rtClassName?: string }) => {
  if (!text) return null;
  
  // Split by ruby tags OR square brackets OR parentheses
  // We use capturing group () to include the separator in the result array
  const parts = text.split(/(<ruby>.*?<\/ruby>|\[.*?\]|\(.*?\))/g);
  
  return (
    <span className={className}>
      {parts.map((part, idx) => {
          // Case 1: Ruby HTML (<ruby>Base<rt>Reading</rt></ruby>)
          const rubyMatch = part.match(/<ruby>(.*?)<rt>(.*?)<\/rt><\/ruby>/);
          if (rubyMatch) {
              return (
                  <ruby key={idx} className="mx-0.5">
                      {rubyMatch[1]}
                      <rt className={`select-none ${rtClassName || 'text-[0.6em] text-gray-400 font-normal'}`}>{rubyMatch[2]}</rt>
                  </ruby>
              );
          }

          // Case 2: Bracketed Text (e.g. Word [Pronunciation]) or Parenthesized Text
          // We render this side-by-side but styled like the annotation.
          // The regex matches both [content] and (content)
          const bracketMatch = part.match(/^\[(.*?)\]$/) || part.match(/^\((.*?)\)$/);
          if (bracketMatch) {
              // Ensure we use the passed rtClassName for styling, or default to a small gray style
              // Note: Flashcard passes !important classes for Upgrade mode to override H2 parent styles
              return (
                  <span key={idx} className={`ml-2 select-none ${rtClassName || 'text-sm text-gray-400 font-sans'}`}>
                      {bracketMatch[1]}
                  </span>
              );
          }

          // Case 3: Regular Text
          // Don't render empty strings from split artifacts
          if (!part) return null;
          return <span key={idx}>{part}</span>;
      })}
    </span>
  );
};

// Original cleaner for Visual UI (History bar etc) - strips readings to show Kanji/Base text only
export const cleanTextFromTags = (text: string) => {
    if (!text) return "";
    let clean = text;

    // 1. Remove Ruby Readings (<rt>...</rt>)
    clean = clean.replace(/<rt>.*?<\/rt>/g, '');
    
    // 2. Remove remaining html tags (<ruby>, </ruby>)
    clean = clean.replace(/<[^>]*>/g, '');

    // 3. Remove content inside brackets [ ] (often pronunciation)
    clean = clean.replace(/\[.*?\]/g, '');

    // 4. Cleanup extra whitespace left by removals
    return clean.trim();
};

// NEW cleaner for Audio/TTS - logic differs by language
export const cleanTextForAudio = (text: string, lang: TargetLanguage) => {
    if (!text) return "";
    let clean = text;

    // 1. Japanese: Prioritize Reading (<rt>) over Kanji for TTS accuracy
    // Because browsers often misread names or context-less Kanji (e.g. 翔 -> Kake instead of Shou).
    // If the AI provided ruby tags, we trust that reading.
    if (lang === TargetLanguage.JAPANESE) {
       // Pattern: <ruby>BASE<rt>READING</rt></ruby> -> READING
       clean = clean.replace(/<ruby>(?:.*?)<rt>(.*?)<\/rt><\/ruby>/g, '$1');
    } 
    // 2. Others: Discard Reading (<rt>), keep Base
    else {
       clean = clean.replace(/<rt>.*?<\/rt>/g, '');
    }

    // 3. Clean remaining HTML tags (like <ruby> nesting artifacts)
    clean = clean.replace(/<[^>]*>/g, '');

    // 4. Cantonese: Remove pronunciation guides in brackets (e.g. [je5 sik6])
    // We assume anything inside brackets that is primarily ASCII/Latin is a guide/Jyutping.
    // We want to KEEP bracketed Chinese characters (e.g. [中意]) as they are part of the sentence.
    if (lang === TargetLanguage.CANTONESE) {
       // Remove [...] if content is ASCII/Latin (Jyutping)
       clean = clean.replace(/\[[\x00-\x7F\s]+\]/g, ''); 
       // Remove (...) if content is ASCII/Latin
       clean = clean.replace(/\([\x00-\x7F\s]+\)/g, '');
    }

    // 5. Final cleanup: Remove any remaining brackets [ ] symbols (e.g. around Chinese terms)
    clean = clean.replace(/[\[\]]/g, '');

    return clean;
};

// NEW cleaner for Display (Back of card) - Removes pronunciation guides but keeps Kanji/Hanzi
export const cleanTextForDisplay = (text: string, lang?: TargetLanguage) => {
    if (!text) return "";
    let clean = text;

    // 1. Remove Ruby Readings (<rt>...</rt>) - We want the base text (Kanji)
    clean = clean.replace(/<rt>.*?<\/rt>/g, '');
    
    // 2. Remove tags
    clean = clean.replace(/<[^>]*>/g, '');

    // 3. Global: Remove bracketed/parenthesized ASCII (pronunciation guides like Jyutping)
    // Matches [text] or (text) where text is primarily ASCII.
    clean = clean.replace(/\[[\x00-\x7F\s]+\]/g, ''); 
    clean = clean.replace(/\([\x00-\x7F\s]+\)/g, '');

    // 4. Remove remaining brackets [ ] (keep content for other langs/cases if it wasn't stripped)
    clean = clean.replace(/[\[\]]/g, '');

    return clean.trim();
};