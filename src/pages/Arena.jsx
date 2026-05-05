import React, { useState, useEffect } from 'react';
import { apiClient } from '../apis/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Swords, Trophy, Users, Globe, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Arena() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [queueStatus, setQueueStatus] = useState('idle'); // idle, searching, matched
  const [matchId, setMatchId] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await apiClient.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error("Auth error", e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleJoinQueue = async () => {
    // Placeholder for queue logic
    setQueueStatus('searching');
    // In a real implementation, we would create an ArenaQueue record here
    // and subscribe to changes until we are matched.
  };

  const handleCancelQueue = async () => {
    setQueueStatus('idle');
    // Remove from queue
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] p-6 flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-12">
        <Link to={createPageUrl('Game')}>
          <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Base
          </Button>
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 tracking-wider">
            ARENA COMBAT
          </h1>
          <p className="text-gray-400 text-sm tracking-widest uppercase">Ranked Season 1</p>
        </div>
        <div className="w-[100px]" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Ranked Matchmaking */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-black/40 border-red-500/30 h-full hover:border-red-500/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-red-400">
                <Swords className="w-6 h-6" />
                RANKED DUEL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-400">
                Competetive 1v1 battles. Earn Rank Points (RP) to climb the ladder.
                <br/>
                <span className="text-xs text-gray-500 italic">Recommended for competitive players.</span>
              </p>

              <div className="bg-black/60 p-4 rounded-lg border border-gray-800 flex justify-between items-center">
                <span className="text-gray-400">Your Rank</span>
                <span className="text-xl font-bold text-white">Bronze III</span>
              </div>

              {queueStatus === 'idle' ? (
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleJoinQueue}
                    className="w-full h-16 text-lg font-bold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 border-none skew-x-[-5deg]"
                  >
                    <span className="skew-x-[5deg] flex items-center gap-2">
                      FIND MATCH
                    </span>
                  </Button>
                  <Button 
                    onClick={() => window.location.href = createPageUrl('Game') + '?mode=arena_bot'}
                    variant="outline"
                    className="w-full border-red-500/30 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                  >
                    PRACTICE VS BOT
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="h-16 flex items-center justify-center bg-red-900/20 border border-red-500/50 rounded animate-pulse">
                    <Search className="w-5 h-5 mr-3 text-red-400 animate-spin" />
                    <span className="text-red-400 font-mono tracking-widest">SEARCHING FOR OPPONENT...</span>
                  </div>
                  <Button variant="outline" onClick={handleCancelQueue} className="border-gray-700 text-gray-400 hover:text-white">
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Leaderboard & Stats */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Top Players */}
          <Card className="bg-black/40 border-yellow-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-yellow-400">
                <Trophy className="w-5 h-5" />
                TOP ACES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-bold ${i===1 ? 'text-yellow-400' : i===2 ? 'text-gray-300' : 'text-orange-400'}`}>#{i}</span>
                      <span className="text-white">Pilot_{9000+i}</span>
                    </div>
                    <span className="text-yellow-500 font-bold">{3000 - i * 150} RP</span>
                  </div>
                ))}
              </div>
              <Button variant="link" className="w-full mt-2 text-yellow-500/80">View Full Leaderboard</Button>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="bg-blue-900/10 border-blue-500/30">
            <CardContent className="p-4 flex items-start gap-3">
              <Globe className="w-5 h-5 text-blue-400 mt-1" />
              <div className="text-sm text-blue-200">
                <span className="font-bold text-blue-300">Matchmaking Info:</span>
                <p className="mt-1 opacity-80">
                  Matches are real-time. Please ensure you have a stable connection. 
                  Lag may occur due to quantum interference (internet latency).
                </p>
              </div>
            </CardContent>
          </Card>

        </motion.div>
      </div>
    </div>
  );
}
