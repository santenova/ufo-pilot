import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Trophy, Coins, Crosshair, Search, Medal, Star, Baby } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '../../apis/client';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ACHIEVEMENTS } from './AchievementsData';

export default function HallOfFameScreen({ onClose, currentUserEmail }) {
  const [activeTab, setActiveTab] = useState('leaderboard'); // leaderboard, achievements
  const [leaderboardType, setLeaderboardType] = useState('distance');
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [userRank, setUserRank] = useState(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboard();
    } else {
      loadAchievements();
    }
  }, [activeTab, leaderboardType]);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      // Find player rank record for current user
      if (currentUserEmail) {
        const ranks = await apiClient.entities.PlayerRank.list(null, 500); // Filter not supported directly on list for generic fields efficiently without setup
        const myRank = ranks.find(r => r.created_by === currentUserEmail);
        if (myRank) {
          setUnlockedAchievements(myRank.achievements || []);
        }
      }
    } catch (e) {
      console.error('Failed to load achievements', e);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const sortField = leaderboardType === 'rank' ? '-rank_points'
        : leaderboardType === 'distance' ? '-distance' 
        : leaderboardType === 'coins' ? '-coins_collected' 
        : leaderboardType === 'rescues' ? '-babies_rescued'
        : '-enemies_destroyed';
      
      const entityType = leaderboardType === 'rank' ? 'PlayerRank' : 'Leaderboard';
      const allScores = await apiClient.entities[entityType].list(sortField, 200);
      
      // Filter for unique players (best score per user)
      const uniqueScores = [];
      const seenUsers = new Set();
      
      for (const score of allScores) {
        // Use created_by (email) as unique identifier
        if (!seenUsers.has(score.created_by)) {
          seenUsers.add(score.created_by);
          uniqueScores.push(score);
        }
      }
      
      setScores(uniqueScores.slice(0, 50));
      
      // Find current user's rank
      if (currentUserEmail) {
        const userScores = allScores.filter(s => s.created_by === currentUserEmail);
        if (userScores.length > 0) {
          const bestUserScore = userScores[0];
          const rank = allScores.findIndex(s => s.id === bestUserScore.id) + 1;
          setUserRank({ rank, score: bestUserScore });
        }
      }
    } catch (e) {
      console.error('Failed to load leaderboard', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    
    setLoading(true);
    try {
      const sortField = leaderboardType === 'distance' ? '-distance' 
        : leaderboardType === 'coins' ? '-coins_collected' 
        : leaderboardType === 'rescues' ? '-babies_rescued'
        : '-enemies_destroyed';
      
      const allScores = await apiClient.entities.Leaderboard.list(sortField, 500);
      const userScores = allScores.filter(s => s.created_by.toLowerCase().includes(searchEmail.toLowerCase()));
      
      if (userScores.length > 0) {
        const bestScore = userScores[0];
        const rank = allScores.findIndex(s => s.id === bestScore.id) + 1;
        setUserRank({ rank, score: bestScore });
      } else {
        setUserRank(null);
      }
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatValue = (score) => {
    switch(leaderboardType) {
      case 'rank': return `${score.rank_points?.toLocaleString() || '0'} pts (${score.rank_tier || 'Bronze'})`;
      case 'distance': return `${Math.floor(score.distance).toLocaleString()}m`;
      case 'coins': return score.coins_collected?.toLocaleString() || '0';
      case 'enemies': return score.enemies_destroyed?.toLocaleString() || '0';
      case 'rescues': return score.babies_rescued?.toLocaleString() || '0';
    }
  };

  const getStatIcon = () => {
    switch(leaderboardType) {
      case 'rank': return Trophy;
      case 'distance': return Trophy;
      case 'coins': return Coins;
      case 'enemies': return Crosshair;
      case 'rescues': return Baby;
    }
  };

  const StatIcon = getStatIcon();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        className="bg-gradient-to-b from-gray-900 to-black border border-cyan-500/30 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-black text-white mb-1">HALL OF FAME</h2>
            <p className="text-gray-400 text-sm">Legends & Achievements</p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2 mb-6">
          <Button 
            variant={activeTab === 'leaderboard' ? 'default' : 'outline'}
            className={`flex-1 ${activeTab === 'leaderboard' ? 'bg-cyan-600 hover:bg-cyan-500' : 'border-gray-700 text-gray-400'}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <Trophy className="w-4 h-4 mr-2" />
            Global Leaderboard
          </Button>
          <Button 
            variant={activeTab === 'achievements' ? 'default' : 'outline'}
            className={`flex-1 ${activeTab === 'achievements' ? 'bg-purple-600 hover:bg-purple-500' : 'border-gray-700 text-gray-400'}`}
            onClick={() => setActiveTab('achievements')}
          >
            <Medal className="w-4 h-4 mr-2" />
            Achievements
          </Button>
        </div>

        {activeTab === 'leaderboard' && (
          <>
            {/* Search Bar */}
            <div className="mb-4 flex gap-2">
              <Input
                placeholder="Search by email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-black/30 border-gray-700 text-white"
              />
              <Button onClick={handleSearch} className="bg-cyan-600 hover:bg-cyan-700">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Current User Rank */}
            {userRank && (
              <Card className="mb-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-black text-yellow-400">#{userRank.rank}</div>
                      <div>
                        <div className="text-white font-bold">Your Best</div>
                        <div className="text-gray-400 text-sm">{userRank.score.player_name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white">{getStatValue(userRank.score)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sub Tabs */}
            <Tabs value={leaderboardType} onValueChange={setLeaderboardType} className="mb-4">
              <TabsList className="grid grid-cols-5 bg-black/30">
                <TabsTrigger value="rank" className="data-[state=active]:bg-purple-600 px-2">
                  <Trophy className="w-3 h-3 mr-1" />
                  <span className="text-xs">Rank</span>
                </TabsTrigger>
                <TabsTrigger value="distance" className="data-[state=active]:bg-cyan-600 px-2">
                  <Trophy className="w-3 h-3 mr-1" />
                  <span className="text-xs">Dist</span>
                </TabsTrigger>
                <TabsTrigger value="coins" className="data-[state=active]:bg-yellow-600 px-2">
                  <Coins className="w-3 h-3 mr-1" />
                  <span className="text-xs">Coins</span>
                </TabsTrigger>
                <TabsTrigger value="enemies" className="data-[state=active]:bg-red-600 px-2">
                  <Crosshair className="w-3 h-3 mr-1" />
                  <span className="text-xs">Kills</span>
                </TabsTrigger>
                <TabsTrigger value="rescues" className="data-[state=active]:bg-green-600 px-2">
                  <Baby className="w-3 h-3 mr-1" />
                  <span className="text-xs">Saved</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Leaderboard List */}
            <div className="space-y-2">
              {loading ? (
                <div className="text-center text-gray-400 py-8">Loading...</div>
              ) : scores.length === 0 ? (
                <div className="text-center text-gray-400 py-8">No scores yet. Be the first!</div>
              ) : (
                scores.map((score, index) => {
              const isCurrentUser = score.created_by === currentUserEmail;
              const rankColors = index === 0 ? 'from-yellow-500/30 to-amber-500/30 border-yellow-500/50' 
                : index === 1 ? 'from-gray-400/30 to-gray-500/30 border-gray-400/50'
                : index === 2 ? 'from-orange-500/30 to-orange-600/30 border-orange-500/50'
                : isCurrentUser ? 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30'
                : 'from-gray-800/30 to-gray-900/30 border-gray-700/30';

              return (
                <motion.div
                  key={score.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card className={`bg-gradient-to-r ${rankColors} border hover:scale-[1.01] transition-transform`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl ${
                            index === 0 ? 'bg-yellow-500 text-yellow-900'
                            : index === 1 ? 'bg-gray-400 text-gray-900'
                            : index === 2 ? 'bg-orange-500 text-orange-900'
                            : 'bg-gray-700 text-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-white font-bold">{score.player_name}</div>
                            <div className="text-gray-400 text-xs">{score.created_by}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-white font-black text-xl">
                            <StatIcon className="w-5 h-5" />
                            {getStatValue(score)}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {new Date(score.created_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
        </>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-3">
          {!currentUserEmail && (
            <div className="text-center text-gray-400 py-4 bg-black/30 rounded-xl border border-gray-700 mb-4">
              Login to track your achievements
            </div>
          )}
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading achievements...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {ACHIEVEMENTS.map((achievement) => {
                const isUnlocked = unlockedAchievements.includes(achievement.id);
                const Icon = achievement.icon;
                
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className={`border ${isUnlocked ? 'bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-purple-500/50' : 'bg-black/40 border-gray-800'}`}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                          isUnlocked ? 'bg-purple-500/20 border-purple-400 text-purple-400' : 'bg-gray-800/50 border-gray-700 text-gray-700'
                        }`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-bold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                            {achievement.name}
                          </h3>
                          <p className="text-xs text-gray-400">{achievement.description}</p>
                        </div>
                        {isUnlocked ? (
                          <div className="text-purple-400">
                            <Star className="w-5 h-5 fill-current" />
                          </div>
                        ) : (
                          <div className="text-gray-700">
                            <Star className="w-5 h-5" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      </motion.div>
    </motion.div>
  );
}
