import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export default function StoryOverlay({ story, onContinue }) {
  if (!story) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-6"
    >
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900 border border-cyan-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-900/20"
        >
          {story.image && (
            <div className="h-48 w-full overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent z-10" />
              <img src={story.image} alt={story.title} className="w-full h-full object-cover opacity-80" />
            </div>
          )}
          
          <div className="p-8 relative z-20 -mt-12">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-6 tracking-wide uppercase">
              {story.title}
            </h2>
            
            <p className="text-gray-300 text-lg leading-relaxed mb-8 font-light border-l-2 border-cyan-500/50 pl-4">
              {story.text}
            </p>

            <div className="flex justify-end">
              <Button 
                onClick={onContinue}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-6 rounded-xl font-bold text-lg group transition-all"
              >
                CONTINUE MISSION
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}