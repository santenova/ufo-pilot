import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, SkipForward } from 'lucide-react';

export default function DialogueBox({ story, onContinue }) {
  const [displayedText, setDisplayedText] = useState('');
  const [fullText, setFullText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (story) {
      setFullText(story.text || '');
      setDisplayedText('');
      setCurrentIndex(0);
      setIsTyping(true);
    }
  }, [story]);

  useEffect(() => {
    if (isTyping && currentIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + fullText[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 30); // Typing speed
      return () => clearTimeout(timeout);
    } else if (currentIndex >= fullText.length) {
      setIsTyping(false);
    }
  }, [currentIndex, isTyping, fullText]);

  const handleSkip = () => {
    if (isTyping) {
      setDisplayedText(fullText);
      setCurrentIndex(fullText.length);
      setIsTyping(false);
    } else {
      onContinue();
    }
  };

  // Keyboard support for skipping/continuing
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (['Enter', ' ', 'ArrowRight'].includes(e.key)) {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isTyping, fullText, displayedText]); // Deps important for handleSkip closure

  if (!story) return null;

  return (
    <div className="absolute inset-x-0 bottom-8 z-50 flex justify-center px-4 pointer-events-none">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="w-full max-w-4xl pointer-events-auto"
      >
        <div className="bg-black/90 border-2 border-cyan-500/50 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.2)] flex flex-col md:flex-row">
          
          {/* Portrait Section */}
          <div className="hidden md:block w-48 bg-gray-900 border-r border-cyan-500/30 relative overflow-hidden shrink-0">
            {story.image ? (
              <img src={story.image} alt="Character" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <span className="text-4xl">🤖</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="text-cyan-400 font-bold text-sm tracking-wider uppercase drop-shadow-md">
                {story.sender || "SYSTEM"}
              </span>
            </div>
          </div>

          {/* Text Section */}
          <div className="flex-1 p-6 relative min-h-[160px] flex flex-col">
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 uppercase tracking-wide">
              {story.title}
            </h3>
            
            <p className="text-gray-200 text-lg leading-relaxed font-mono tracking-wide mb-4 grow">
              {displayedText}
              {isTyping && <span className="animate-pulse text-cyan-500">_</span>}
            </p>

            <div className="flex justify-end items-center gap-2 mt-auto">
              <Button 
                onClick={handleSkip}
                variant="ghost"
                className="text-cyan-400 hover:text-white hover:bg-cyan-950/50 group"
              >
                {isTyping ? (
                  <>SKIP <SkipForward className="w-4 h-4 ml-2" /></>
                ) : (
                  <span className="animate-bounce flex items-center">
                    NEXT <ChevronRight className="w-4 h-4 ml-2" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}