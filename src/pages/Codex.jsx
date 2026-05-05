import React, { useState, useEffect } from 'react';
import { apiClient } from '../apis/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Book, Lock, Unlock, Zap, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { STORY_DATA } from '@/components/game/StoryData';

export default function Codex() {
  const [loading, setLoading] = useState(true);
  const [unlockedStories, setUnlockedStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await apiClient.auth.me();
        // Assuming we store unlocked story IDs in user.game_state.unlocked_stories
        const unlocks = user.game_state?.unlocked_stories || [];
        setUnlockedStories(unlocks);
        
        // Default to first story if unlocked, or nothing
        if (unlocks.includes(1)) {
          setSelectedStory(STORY_DATA[1]);
        }
      } catch (e) {
        console.error("Failed to load codex data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-cyan-400 text-xl animate-pulse">Accessing Data Archives...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0f0f2a] to-[#0a0a1a] p-6 text-white overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Game')}>
              <Button variant="outline" size="icon" className="border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider">
                SYSTEM CODEX
              </h1>
              <p className="text-gray-400 text-sm font-mono tracking-widest">LORE ARCHIVES & DATA LOGS</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-lg border border-cyan-500/30">
            <Book className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-bold">{unlockedStories.length} / {Object.keys(STORY_DATA).length}</span>
            <span className="text-gray-500 text-sm uppercase">Entries Unlocked</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)]">
          {/* Story List */}
          <div className="lg:col-span-1 space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">
            {Object.entries(STORY_DATA).map(([id, story]) => {
              const isUnlocked = unlockedStories.includes(parseInt(id));
              const isSelected = selectedStory === story;

              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: parseInt(id) * 0.05 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all border-l-4 ${
                      isSelected 
                        ? 'bg-cyan-950/50 border-l-cyan-400 border-y-cyan-900/50 border-r-cyan-900/50' 
                        : 'bg-gray-900/40 border-l-gray-700 border-y-transparent border-r-transparent hover:bg-gray-800/60'
                    }`}
                    onClick={() => isUnlocked && setSelectedStory(story)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className={`font-bold text-sm mb-1 ${isUnlocked ? 'text-white' : 'text-gray-600'}`}>
                          ENTRY {id.padStart(3, '0')}
                        </div>
                        <div className={`font-mono text-xs ${isUnlocked ? 'text-cyan-400' : 'text-gray-600'}`}>
                          {isUnlocked ? story.title : 'ENCRYPTED DATA'}
                        </div>
                      </div>
                      {isUnlocked ? (
                        <Unlock className="w-4 h-4 text-cyan-500 opacity-50" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-700" />
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Story Content View */}
          <div className="lg:col-span-2 bg-black/40 border border-cyan-500/20 rounded-2xl p-8 relative overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              {selectedStory ? (
                <motion.div
                  key={selectedStory.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full flex flex-col"
                >
                  <div className="relative h-64 w-full rounded-xl overflow-hidden mb-8 shrink-0 group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                    <motion.img 
                      src={selectedStory.image} 
                      alt={selectedStory.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                    />
                    <div className="absolute bottom-4 left-4 z-20">
                      <h2 className="text-3xl font-black text-white tracking-wide uppercase drop-shadow-lg">
                        {selectedStory.title}
                      </h2>
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-cyan-900 mb-6">
                    <div className="flex items-center gap-2 text-cyan-500 mb-4 font-mono text-xs border-b border-cyan-900/50 pb-2">
                      <span>// DECRYPTED SEGMENT</span>
                      <span className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse" />
                      <span>CLEARANCE: ALPHA</span>
                    </div>
                    <p className="text-gray-300 text-lg leading-relaxed font-light whitespace-pre-line mb-6">
                      {selectedStory.text}
                    </p>
                    
                    {selectedStory.reward && (
                      <div className="bg-gradient-to-r from-yellow-900/20 to-transparent p-4 rounded-lg border-l-2 border-yellow-500 mb-6">
                        <div className="text-yellow-500 text-xs font-bold uppercase tracking-wider mb-1">Mission Reward</div>
                        <div className="text-white font-bold flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-400" />
                          {selectedStory.reward.name}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-6 border-t border-cyan-500/20 flex gap-4">
                    <Button 
                      onClick={() => window.location.href = createPageUrl('Game') + `?mode=story_replay&storyId=${selectedStory.id}`}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-6 rounded-xl group"
                    >
                      <Crosshair className="w-5 h-5 mr-2 group-hover:rotate-45 transition-transform" />
                      REPLAY MEMORY
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center animate-spin-slow">
                    <Lock className="w-8 h-8" />
                  </div>
                  <p className="font-mono text-sm">SELECT AN ARCHIVE ENTRY TO DECRYPT</p>
                </div>
              )}
            </AnimatePresence>
            
            {/* Decorative tech lines */}
            <div className="absolute top-4 right-4 w-24 h-24 border-t-2 border-r-2 border-cyan-500/20 rounded-tr-3xl pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-24 h-24 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-3xl pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
