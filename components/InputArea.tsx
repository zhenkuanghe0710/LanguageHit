import React from 'react';
import { Send, Loader2, Lightbulb } from 'lucide-react';
import { AppMode } from '../types';

interface InputAreaProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  mode: AppMode;
}

const INSPIRATIONS = [
  // Work/Life Struggle
  "不想上班", "老板脑子瓦特了", "Monday again...", "I need a raise", 
  "精神离职", "被迫营业", "薪水小偷", "摸鱼中，勿扰", 
  "Meeting could have been an email", "加班到头秃", "不想努力了，想被包养",
  
  // Physical/Mental State
  "饿到模糊", "累丑了", "困成狗", "Brain is 404", 
  "Social battery 0%", "Emo时刻", "只想躺平", "Feeling like a potato", 
  "I am dead inside", "急需奶茶续命", "手机电量焦虑", "间歇性踌躇满志",

  // Sarcastic/Toxic/Witty
  "人类的参差", "智商是硬伤", "Why are people so...", 
  "My patience is 1%", "Don't talk to me", "呵呵", 
  "我就静静看着你表演", "Not my monkey, not my circus",
  "听君一席话，浪费十分钟", "专治各种不服", "虽然但是",
  
  // Social/Relationships
  "社恐爆发", "Awkward silence", "Friendzone level 99", 
  "被鸽了", "塑料姐妹花", "妈宝男退散", "单身狗的咆哮", "下头男/女",
  
  // Random/Creative
  "如果猫统治世界", "想去火星种土豆", "暴富的100种方法",
  "减肥是明天的事", "发际线保卫战", "水逆退散", 
  "Zombie apocalypse plan", "I want to be a rich cat",
  "人生无常，大肠包小肠", "地球没我不转了"
];

const InputArea: React.FC<InputAreaProps> = ({ value, onChange, onSubmit, isLoading, mode }) => {
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleInspiration = () => {
    // Avoid repeating the same inspiration immediately if possible
    let random;
    do {
       random = INSPIRATIONS[Math.floor(Math.random() * INSPIRATIONS.length)];
    } while (random === value && INSPIRATIONS.length > 1);
    
    onChange(random);
  };

  const placeholder = mode === AppMode.UPGRADE 
    ? "Hit me with anything... (e.g. 'I'm tired', 'hungry', or nonsense)"
    : "Enter a word or phrase to look up...";

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
      <div className="relative flex items-center bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        
        {/* Inspiration Bulb - Only in Upgrade Mode */}
        {mode === AppMode.UPGRADE && (
          <button
            onClick={handleInspiration}
            disabled={isLoading}
            className="pl-4 pr-2 text-yellow-400 hover:text-yellow-500 transition-colors disabled:opacity-50"
            title="Get inspired!"
          >
            <Lightbulb size={20} fill="currentColor" className="opacity-80" />
          </button>
        )}

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className={`flex-1 py-4 text-gray-700 bg-transparent outline-none placeholder:text-gray-400 text-sm md:text-base ${
             mode === AppMode.UPGRADE ? 'pl-2 pr-5' : 'px-5'
          }`}
        />
        <button
          onClick={onSubmit}
          disabled={!value.trim() || isLoading}
          className={`px-5 py-3 m-1 rounded-xl transition-all duration-300 flex items-center justify-center ${
            value.trim() && !isLoading
              ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:scale-95'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Send size={20} className={value.trim() ? "ml-1" : ""} />
          )}
        </button>
      </div>
    </div>
  );
};

export default InputArea;