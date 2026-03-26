export enum AppMode {
  UPGRADE = 'UPGRADE', // "废话升级" - Nonsense Upgrade
  LOOKUP = 'LOOKUP',   // "查词" - Word Lookup
}

export enum TargetLanguage {
  ENGLISH = 'ENGLISH',
  JAPANESE = 'JAPANESE',
  CANTONESE = 'CANTONESE',
}

export interface ExamplePair {
  en: string; // "Target Language"
  cn: string; // "Chinese Explanation"
}

/** Token counts from a single Gemini generateContent call (when API returns usage). */
export interface GeminiTokenUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface GeneratedCardData {
  id: string;
  type: AppMode;
  language: TargetLanguage; // Track which language this card is for
  userInput: string;
  
  // Core Content (Renamed from englishPhrase to be generic)
  targetPhrase: string; 
  targetPhraseTranslation?: string; 
  
  // Context/Explanation
  wittyComment?: string; 
  explanation: string;   
  scenario: string;         // The context/situation description (Chinese)
  scenarioExample?: string; // The sample sentence in Target Language
  scenarioExampleTranslation?: string; // Chinese translation of the sample sentence
  
  // For Lookup Mode
  definitionTarget?: string; // The definition in the Target Language (New field)
  examples?: ExamplePair[];   
  
  // Metadata
  timestamp: number;
  isBookmarked?: boolean;
  /** Present when the generating API response included usage metadata. */
  geminiUsage?: GeminiTokenUsage;
}