import React, { useState, useEffect } from 'react';
import { apiClient } from '../apis/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Lock, Star, Trophy, Zap, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import QuickShipSelector from '@/components/game/QuickShipSelector';
import AIStoryCreator from '@/components/game/AIStoryCreator';

// Fallback levels if DB is empty
const DEFAULT_LEVELS = [
  {
    id: 'default_1',
    name: 'First Contact',
    description: 'Survive for 2 minutes',
    objective: { type: 'survive', target: 120 },
    reward: 50,
    starsRequired: 0,
    level_order: 1,
    starThresholds: { bronze: 90, silver: 110, gold: 120 }
  }
];

export default function Campaign() {
  const [loading, setLoading] = useState(true);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [progress, setProgress] = useState({ level_completed: 0, tokens_earned: 0, level_stars: {} });
  const [campaignLevels, setCampaignLevels] = useState([]);
  const [customization, setCustomization] = useState({
    unlocked: { models: ['basic'], trails: ['none'], effects: ['standard'], colors: ['cyan'], accessories: ['none'] },
    equipped: { models: 'basic', trails: 'none', effects: 'standard', colors: 'cyan', accessories: 'none' }
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [user, levels] = await Promise.all([
          apiClient.auth.me(),
          apiClient.entities.LevelConfig.list('level_order', 100)
        ]);

        setProgress(user.campaign_progress || { level_completed: 0, tokens_earned: 0, level_stars: {} });
        
        const loadedCustomization = user.game_customization || {};
        setCustomization({
          unlocked: loadedCustomization.unlocked || { models: ['basic'], trails: ['none'], effects: ['standard'], colors: ['cyan'], accessories: ['none'] },
          equipped: loadedCustomization.equipped || { models: 'basic', trails: 'none', effects: 'standard', colors: 'cyan', accessories: 'none' }
        });

        const fetchedLevels = levels.items || levels || [];
        // Map to format if needed, ensuring required fields
        const mappedLevels = fetchedLevels.length > 0 ? fetchedLevels.map(l => ({
          ...l,
          starsRequired: (l.level_order - 1) * 2, // Auto-calculate stars requirement: 0, 2, 4...
          reward: l.resources?.credits || 50,
          starThresholds: l.starThresholds || { bronze: 1, silver: 2, gold: 3 } // Default if missing
        })) : DEFAULT_LEVELS;

        setCampaignLevels(mappedLevels);

      } catch (e) {
        console.log('Failed to load data', e);
        setCampaignLevels(DEFAULT_LEVELS);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleStartLevel = (levelId) => {
    const level = campaignLevels.find(l => l.id === levelId);
    // Store level in session storage and navigate to game
    sessionStorage.setItem('campaignLevel', JSON.stringify(level));
    window.location.href = createPageUrl('Game') + '?mode=campaign&level=' + levelId;
  };

  const getTotalStars = () => {
    return Object.values(progress.level_stars || {}).reduce((sum, stars) => sum + stars, 0);
  };

  const isLevelUnlocked = (level) => {
    const totalStars = getTotalStars();
    return totalStars >= level.starsRequired;
  };

  const getLevelStars = (levelId) => {
    return progress.level_stars?.[levelId] || 0;
  };

  const calculateStars = (level, performance) => {
    const { objective, starThresholds } = level;
    let value = performance;

    // Time-based objectives: less is better
    if (objective.type === 'speedrun' || objective.type === 'escort') {
      if (value <= starThresholds.gold) return 3;
      if (value <= starThresholds.silver) return 2;
      if (value <= starThresholds.bronze) return 1;
      return 0;
    }

    // Count-based objectives: more is better
    if (value >= starThresholds.gold) return 3;
    if (value >= starThresholds.silver) return 2;
    if (value >= starThresholds.bronze) return 1;
    return 0;
  };

  const handleEquipCustomization = async (category, item) => {
    const newCustomization = {
      ...customization,
      equipped: {
        ...customization.equipped,
        [category]: item
      }
    };
    setCustomization(newCustomization);
    try {
      await apiClient.auth.updateMe({ game_customization: newCustomization });
    } catch (e) {
      console.log('Failed to save customization');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e] flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] to-[#1a1a2e] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Game')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-black text-white">CAMPAIGN</h1>
              <p className="text-gray-400">Complete missions to earn tokens</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={() => setShowStoryCreator(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white border border-purple-400/30"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Mission
            </Button>
            <QuickShipSelector 
              customization={customization}
              onEquip={handleEquipCustomization}
            />
            <div className="bg-black/40 border border-cyan-500/30 rounded-xl px-6 py-3">
              <div className="text-cyan-400 text-sm">Total Stars</div>
              <div className="text-3xl font-black text-white flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                {getTotalStars()}
              </div>
            </div>
            <div className="bg-black/40 border border-yellow-500/30 rounded-xl px-6 py-3">
              <div className="text-yellow-400 text-sm">Tokens</div>
              <div className="text-3xl font-black text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                {progress.tokens_earned}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaignLevels.map((level, index) => {
            const unlocked = isLevelUnlocked(level);
            const stars = getLevelStars(level.id);
            const completed = stars > 0;

            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`bg-gradient-to-br ${
                  completed && stars === 3 ? 'from-yellow-900/30 to-amber-900/30 border-yellow-500/50' :
                  completed ? 'from-green-900/30 to-emerald-900/30 border-green-500/30' :
                  unlocked ? 'from-cyan-900/30 to-blue-900/30 border-cyan-500/30' :
                  'from-gray-900/30 to-gray-800/30 border-gray-700/30 opacity-60'
                } hover:scale-105 transition-transform`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${
                          completed && stars === 3 ? 'bg-gradient-to-br from-yellow-500 to-amber-600' :
                          completed ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                          'bg-gradient-to-br from-cyan-500 to-blue-600'
                        }`}>
                          {level.level_order}
                        </div>
                        <div>
                          <div className="text-lg text-white">{level.name}</div>
                          {!unlocked && (
                            <div className="text-xs text-gray-500">Requires {level.starsRequired} ⭐</div>
                          )}
                        </div>
                      </div>
                      {!unlocked && <Lock className="w-5 h-5 text-gray-500" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 mb-4">{level.description}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`w-5 h-5 ${s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Trophy className="w-4 h-4" />
                        <span className="font-bold">{level.reward}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleStartLevel(level.id)}
                      disabled={!unlocked}
                      className={`w-full ${
                        completed && stars === 3 
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500'
                      }`}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {completed ? (stars === 3 ? 'Perfect! Replay?' : 'Replay for 3★') : unlocked ? 'Start Mission' : `Locked (${level.starsRequired}★)`}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {showStoryCreator && (
        <AIStoryCreator
          onClose={() => setShowStoryCreator(false)}
          onStoryCreated={(story) => {
            // Launch the first level of the generated story
            // We need to pass the story structure to the Game
            // For now, we'll use a special mode parameter
            const encodedStory = encodeURIComponent(JSON.stringify(story));
            // In a real app, save to DB and pass ID. For now, we might hit URL limits if too long.
            // Better: Save to sessionStorage
            sessionStorage.setItem('customStory', JSON.stringify(story));
            window.location.href = createPageUrl('Game') + '?mode=story_replay&storyId=custom';
          }}
        />
      )}
    </div>
  );
}
