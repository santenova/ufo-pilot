import React, { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../apis/client';
import GameCanvas from '@/components/game/GameCanvas';
import GameHUD from '@/components/game/GameHUD';
import GameOverScreen from '@/components/game/GameOverScreen';
import StartScreen from '@/components/game/StartScreen';
import UpgradeShop from '@/components/game/UpgradeShop';
import LeaderboardScreen from '@/components/game/LeaderboardScreen';
import TestFlightCanvas from '@/components/game/TestFlightCanvas';
import InGameStore from '@/components/game/InGameStore';
import QuickShipSelector from '@/components/game/QuickShipSelector';
import QuickLoadoutOverlay from '@/components/game/QuickLoadoutOverlay';
import { AnimatePresence } from 'framer-motion';
import { ACHIEVEMENTS } from '@/components/game/AchievementsData';
import { GAME_MODES, CHALLENGES } from '@/components/game/GameModes';
import { STORY_DATA } from '@/components/game/StoryData';
import DialogueBox from '@/components/game/DialogueBox';
import { Button } from '@/components/ui/button';
import VolumeControl from '@/components/game/VolumeControl';
import ArenaCanvas from '@/components/game/ArenaCanvas';
import { Toaster, toast } from 'sonner';

export default function Game() {
  const [gameScreen, setGameScreen] = useState('start'); // 'start', 'playing', 'gameover', 'shop', 'leaderboard'
  const [gameMode, setGameMode] = useState(GAME_MODES.TRAINING?.id || 'training');
  const [difficulty, setDifficulty] = useState('ufo_pilot'); // 'easy', 'rookie', 'ufo_pilot'
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showInGameStore, setShowInGameStore] = useState(false);
  const [purchaseCooldowns, setPurchaseCooldowns] = useState({});
  const [gameState, setGameState] = useState({
    distance: 0,
    coins: 0,
    coinsSaved: 0, // Track coins already added to total to avoid double counting
    health: 100,
    powerLevel: 100,
    currentWeapon: 'blaster',
    weaponLevel: 1,
    weaponXP: 0,
    enemiesDestroyed: 0,
    babiesRescued: 0, // Track rescued babies
    isMutated: false,
    activePowerups: [],
    autoFire: true
  });
  const [totalCoins, setTotalCoins] = useState(0);
  const [upgrades, setUpgrades] = useState({
    health: 0,
    damage: 0,
    speed: 0,
    powerDuration: 0,
    shipSkin: 0,
    startingLevel: 0,
    luck: 0
  });
  const [skillPoints, setSkillPoints] = useState(0);
  const [unlockedSkills, setUnlockedSkills] = useState(['core_mastery']);
  const [customization, setCustomization] = useState({
    unlocked: { 
      models: ['black_triangle', 'basic'], 
      trails: ['none'], 
      effects: ['standard'], 
      colors: ['cyan'], 
      accessories: ['none'],
      drones: ['none'],
      hud: ['cyber']
    },
    equipped: { 
      models: 'black_triangle', 
      trails: 'none', 
      effects: 'standard', 
      colors: 'cyan', 
      accessories: 'none',
      drone: 'none',
      hud: 'cyber'
    }
  });
  const [loadouts, setLoadouts] = useState([]);
  const [currentLoadout, setCurrentLoadout] = useState(null);
  const [maxLoadoutSlots, setMaxLoadoutSlots] = useState(3);
  const [testFlightMode, setTestFlightMode] = useState(false);
  const [testFlightCustomization, setTestFlightCustomization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [campaignLevel, setCampaignLevel] = useState(null);
  const [currentStory, setCurrentStory] = useState(null);
  const [showQuickLoadout, setShowQuickLoadout] = useState(false);
  const [shouldAutoStart, setShouldAutoStart] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasSaveGame, setHasSaveGame] = useState(() => {
    try {
      return !!localStorage.getItem('ufo_pilot_save_state');
    } catch(e) { return false; }
  });
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [volume, setVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('game_volume');
      return saved !== null ? parseFloat(saved) : 0.5;
    } catch (e) { return 0.5; }
  });

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    try {
      localStorage.setItem('game_volume', newVolume.toString());
    } catch (e) { console.error(e); }
  };

  // Parse URL params for Campaign/Story Modes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const storyId = params.get('storyId');

    if (mode === 'campaign') {
      const levelData = sessionStorage.getItem('campaignLevel');
      if (levelData) {
        const level = JSON.parse(levelData);
        setGameMode('campaign');
        setCampaignLevel(level);
        setShouldAutoStart(true);
      }
    } else if (mode === 'story_replay' && storyId) {
      const story = STORY_DATA[storyId];
      if (story && story.challengeConfig) {
        setGameMode('challenge'); // Treat as challenge
        setActiveChallenge({
          id: `story_replay_${storyId}`,
          name: `Replay: ${story.title}`,
          description: `Relive the memory of ${story.title}`,
          ...story.challengeConfig,
          isStoryReplay: true
        });
        setShouldAutoStart(true);
      }
    } else if (mode === 'arena_bot') {
      setGameMode('arena_bot');
      setShouldAutoStart(true);
    }
  }, []);

  // Load persistent data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await apiClient.auth.me();
        setTotalCoins(user.game_coins || 0);
        setUpgrades(user.game_upgrades || {
          health: 0,
          damage: 0,
          speed: 0,
          powerDuration: 0,
          shipSkin: 0
        });
        setSkillPoints(user.game_skill_points || 0);
        setUnlockedSkills(user.game_unlocked_skills || ['core_mastery']);
        const loadedCustomization = user.game_customization || {};
        const baseCustomization = {
          unlocked: loadedCustomization.unlocked || { models: ['black_triangle', 'basic'], trails: ['none'], effects: ['standard'], colors: ['cyan'], accessories: ['none'] },
          equipped: loadedCustomization.equipped || { models: 'black_triangle', trails: 'none', effects: 'standard', colors: 'cyan', accessories: 'none' }
        };

        // If equipped model is a custom ship, fetch its image URL
        const equippedModel = baseCustomization.equipped.models;
        const STANDARD_MODELS = ['basic', 'delta', 'arrow', 'falcon', 'viper', 'guardian', 'stealth'];
        
        if (equippedModel && !STANDARD_MODELS.includes(equippedModel)) {
          try {
            // Fetch ships with proper limit and sorting to ensure we find the custom one
            const ships = await apiClient.entities.Ship.list('-created_date', 100);
            
            let shipList = [];
            if (Array.isArray(ships)) {
              shipList = ships;
            } else if (ships && Array.isArray(ships.items)) {
              shipList = ships.items;
            }

            const ship = shipList.find(s => s.model_type === equippedModel);
            if (ship && ship.image_url) {
              baseCustomization.customShipImageUrl = ship.image_url;
            }
          } catch (e) {
            console.error('Failed to load custom ship image', e);
          }
        }

        setCustomization(baseCustomization);
        setLoadouts(user.game_loadouts || []);
        setMaxLoadoutSlots(user.game_max_loadout_slots || 3);
        setPlayerName(user.full_name || user.email.split('@')[0]);
        setCurrentUserEmail(user.email);
        setIsLoggedIn(true);

        // Fix negative coins if present
        if ((user.game_coins || 0) < 0) {
           setTotalCoins(0);
           saveData(0, user.game_upgrades || {}, user.game_customization || {});
        }
        } catch (e) {
        console.log('User not logged in, checking local storage');
        setPlayerName('Guest');
        setIsLoggedIn(false);
        
        try {
          const localStr = localStorage.getItem('ufo_pilot_guest_data');
          if (localStr) {
            const localData = JSON.parse(localStr);
            setTotalCoins(localData.game_coins || 0);
            setUpgrades(localData.game_upgrades || { health: 0, damage: 0, speed: 0, powerDuration: 0, shipSkin: 0 });
            setSkillPoints(localData.game_skill_points || 0);
            setUnlockedSkills(localData.game_unlocked_skills || ['core_mastery']);
            
            const loadedCustomization = localData.game_customization || {};
            const baseCustomization = {
              unlocked: loadedCustomization.unlocked || { models: ['black_triangle', 'basic'], trails: ['none'], effects: ['standard'], colors: ['cyan'], accessories: ['none'], drones: ['none'], hud: ['cyber'] },
              equipped: loadedCustomization.equipped || { models: 'black_triangle', trails: 'none', effects: 'standard', colors: 'cyan', accessories: 'none', drone: 'none', hud: 'cyber' }
            };

            const equippedModel = baseCustomization.equipped.models;
            const STANDARD_MODELS = ['basic', 'delta', 'arrow', 'falcon', 'viper', 'guardian', 'stealth'];
            
            if (equippedModel && !STANDARD_MODELS.includes(equippedModel)) {
               try {
                 const ships = await apiClient.entities.Ship.list('-created_date', 100);
                 const shipList = Array.isArray(ships) ? ships : (ships.items || []);
                 const ship = shipList.find(s => s.model_type === equippedModel);
                 if (ship && ship.image_url) {
                   baseCustomization.customShipImageUrl = ship.image_url;
                 }
               } catch (err) { console.error('Failed to load guest ship image', err); }
            }
            
            setCustomization(baseCustomization);
            setLoadouts(localData.game_loadouts || []);
            setMaxLoadoutSlots(localData.game_max_loadout_slots || 3);
          }
        } catch (err) {
          console.error("Error loading local guest data", err);
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Save data whenever coins or upgrades change
  const saveData = useCallback(async (newCoins, newUpgrades, newCustomization, newLoadouts = null, newMaxSlots = null, newSkills = null, newPoints = null) => {
    const updateData = {
      game_coins: newCoins,
      game_upgrades: newUpgrades,
      game_customization: newCustomization
    };
    if (newLoadouts !== null) updateData.game_loadouts = newLoadouts;
    if (newMaxSlots !== null) updateData.game_max_loadout_slots = newMaxSlots;
    if (newSkills !== null) updateData.game_unlocked_skills = newSkills;
    if (newPoints !== null) updateData.game_skill_points = newPoints;

    if (isLoggedIn) {
      try {
        await apiClient.auth.updateMe(updateData);
      } catch (e) {
        console.log('Could not save data');
      }
    } else {
      try {
        const current = JSON.parse(localStorage.getItem('ufo_pilot_guest_data') || '{}');
        const merged = { ...current, ...updateData };
        localStorage.setItem('ufo_pilot_guest_data', JSON.stringify(merged));
      } catch (e) {
        console.log('Could not save local data');
      }
    }
  }, [isLoggedIn]);

  const startGame = useCallback(() => {
    try {
      localStorage.removeItem('ufo_pilot_save_state');
      setHasSaveGame(false);
    } catch(e) {}

    let baseHealth = 100 + (upgrades.health * 25);
    let startLevel = 1 + (upgrades.startingLevel || 0);
    let startWeapon = 'blaster';
    let challengeData = null;

    // Weapons Run (Training) defaults to Hybrid cycle
    if (gameMode === 'training') {
      startWeapon = 'hybrid';
    }

    // Boost weapons for Boss Rush mode
    if (gameMode === 'boss_rush') {
      startLevel += 9; // Start at Level 10 for Boss Rush
      baseHealth += 100; // Extra health for boss fights
    }

    // Alien Black Triangle Buff
    if (customization?.equipped?.models === 'black_triangle') {
      baseHealth += 50; // Extra base health for Alien Tech
    }

    if (gameMode === 'challenge' && activeChallenge) {
      challengeData = activeChallenge;
      if (activeChallenge.health) baseHealth = activeChallenge.health;
      if (activeChallenge.weapon) startWeapon = activeChallenge.weapon;
    } else if (gameMode === 'campaign' && campaignLevel) {
      // Campaign level can act like a challenge config
      challengeData = campaignLevel; // Re-use challenge config logic for time limits etc if compatible
      // Some campaign levels might have modifiers
      if (campaignLevel.objective?.timeLimit) challengeData = { ...challengeData, timeLimit: campaignLevel.objective.timeLimit };
    }

    setGameState({
    distance: 0,
    coins: 0,
    coinsSaved: 0,
    health: baseHealth,
    maxHealth: baseHealth, // Add maxHealth to state for tracking
    powerLevel: 100,
    currentWeapon: startWeapon,
    weaponLevel: startLevel,
    weaponXP: (startLevel - 1) * 10,
    enemiesDestroyed: 0,
    babiesRescued: 0, // Reset babies count
    isMutated: false,
    activePowerups: [],
    autoFire: true,
    timeRemaining: challengeData?.timeLimit ? challengeData.timeLimit : null,
    bossDefeated: false,
    latestBossMilestone: 0,
    level: 1
    });
      setIsPaused(false);
      setCurrentStory(null);
      setGameScreen('playing');
      }, [upgrades, gameMode, activeChallenge, campaignLevel]);

      // Auto-start when ready
      useEffect(() => {
        if (shouldAutoStart && !loading) {
          startGame();
          setShouldAutoStart(false);
        }
      }, [shouldAutoStart, loading, startGame]);

      const handleStateUpdate = useCallback((updater) => {
      setGameState(prev => {
        return typeof updater === 'function' ? updater(prev) : updater;
      });
      }, []);

      const handleLevelComplete = useCallback(() => {
       // Find story for this level
       const story = STORY_DATA[gameState.level];

       if (story) {
          setCurrentStory(story);
          // Save unlocked story...
          const saveUnlock = async () => {
              if (!isLoggedIn) return;
              try {
                const user = await apiClient.auth.me();
                const currentUnlocks = user.game_state?.unlocked_stories || [];

                if (!currentUnlocks.includes(story.id)) {
                  const newUnlocks = [...currentUnlocks, story.id];

                  let updatePayload = {
                    game_state: {
                      ...(user.game_state || {}),
                      unlocked_stories: newUnlocks
                    }
                  };

                  if (story.reward) {
                     const category = story.reward.type;
                     const itemId = story.reward.id;
                     const currentUnlocked = user.game_customization?.unlocked || customization.unlocked;
                     const currentCategoryItems = currentUnlocked[category] || [];

                     if (!currentCategoryItems.includes(itemId)) {
                        const newCustomization = {
                          ...(user.game_customization || customization),
                          unlocked: {
                            ...currentUnlocked,
                            [category]: [...currentCategoryItems, itemId]
                          }
                        };
                        updatePayload.game_customization = newCustomization;
                        setCustomization(newCustomization);
                     }
                  }
                  await apiClient.auth.updateMe(updatePayload);
                }
              } catch (e) { console.error(e); }
          };
          saveUnlock();
       } else {
          // No story, just generic level complete? Or default story?
          // For now show a generic "Level Complete" message via story overlay structure
          setCurrentStory({
             title: `LEVEL ${gameState.level} CLEARED`,
             text: "Sector secured. Proceeding to next sector...",
             image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop"
          });
       }

       setGameScreen('story'); // Switch to story screen (Safe Room)
      }, [gameState.level, customization]);

      const handleContinueStory = useCallback(() => {
      setCurrentStory(null);
      setGameState(prev => ({
         ...prev,
         level: prev.level + 1,
         distance: 0, // Reset distance for new level
         bossDefeated: false
      }));
      setGameScreen('playing');
      }, []);

  // Check for game over and update total coins + save score
  useEffect(() => {
    if (gameScreen === 'playing' && gameState.health <= 0) {
      // Play boss taunt on death
      try {
        if (volume > 0) {
          const audio = new Audio('/public/wav/fool.wav');
          audio.volume = volume;
          audio.play().catch(e => console.log("Death sound play failed", e));
        }
      } catch (e) {
        console.error("Failed to play death sound", e);
      }

      let earnedSkillPoints = 0;
      if (gameState.level > 1 || gameState.distance > 1000) earnedSkillPoints = 1;
      if (gameState.level > 5 || gameState.distance > 5000) earnedSkillPoints = 2;

      // Calculate only new coins to add (subtract what we already saved)
      const coinsToAdd = gameState.coins - (gameState.coinsSaved || 0);
      const newTotal = totalCoins + coinsToAdd;

      // Mark these coins as saved
      setGameState(prev => ({ ...prev, coinsSaved: prev.coins }));

      const newSkillPointsTotal = skillPoints + earnedSkillPoints;
      setSkillPoints(newSkillPointsTotal);

      // Handle Achievements
      const checkAchievements = async () => {
        if (!isLoggedIn) return;
        try {
          const user = await apiClient.auth.me();
          // Use filter to efficiently find the user's rank record
          const ranks = await apiClient.entities.PlayerRank.filter({ created_by: user.email });
          let myRank = ranks[0];

          const unlocked = myRank?.achievements || [];
          const stats = {
            enemiesDestroyed: gameState.enemiesDestroyed,
            bossesDefeated: gameState.bossDefeated ? 1 : 0, // Need tracking for total bosses in run
            distance: gameState.distance,
            coins: gameState.coins,
            weaponLevel: gameState.weaponLevel,
            damageTaken: gameState.health < 100 // Approximation if max health is 100 base
          };
          
          // Better damage tracking needed for "Untouchable" achievement really, 
          // but assuming health < max is damage taken. 
          // Note: max health varies with upgrades. 
          
          const newUnlocked = [];
          
          ACHIEVEMENTS.forEach(ach => {
            if (!unlocked.includes(ach.id)) {
              if (ach.condition(stats, myRank || {})) {
                newUnlocked.push(ach.id);
              }
            }
          });
          
          if (newUnlocked.length > 0) {
            const updatedAchievements = [...unlocked, ...newUnlocked];
            if (myRank) {
              await apiClient.entities.PlayerRank.update(myRank.id, { achievements: updatedAchievements });
            } else {
              await apiClient.entities.PlayerRank.create({
                total_score: gameState.coins, // Init
                achievements: updatedAchievements,
                rank_points: gameState.distance // Simple init
              });
            }
            
            // Show notifications
            newUnlocked.forEach(achId => {
              const ach = ACHIEVEMENTS.find(a => a.id === achId);
              if (ach) {
                toast.success(`Achievement Unlocked: ${ach.name}!`, {
                  description: ach.description,
                  style: { background: '#0a0a1a', color: '#00ffff', border: '1px solid #00ffff' }
                });
              }
            });
          }

          // Save total babies rescued
          if (gameState.babiesRescued > 0) {
             if (myRank) {
                await apiClient.entities.PlayerRank.update(myRank.id, { 
                   total_babies_rescued: (myRank.total_babies_rescued || 0) + gameState.babiesRescued
                });
             } else {
                await apiClient.entities.PlayerRank.create({
                   total_babies_rescued: gameState.babiesRescued
                });
             }
          }

        } catch (e) {
          console.error("Achievement check failed", e);
        }
      };
      
      checkAchievements();

      // Handle boss customization drops
      let newCustomization = customization;
      if (gameState.customizationDrop && customization?.unlocked && customization?.equipped) {
        const milestone = gameState.customizationDrop;
        const unlockedItems = [
          ...(customization.unlocked.models || []),
          ...(customization.unlocked.trails || []),
          ...(customization.unlocked.effects || [])
        ];
        const allItems = ['delta', 'arrow', 'falcon', 'fire', 'plasma', 'rainbow', 'glow', 'spark', 'neon'];
        const lockedItems = allItems.filter(item => !unlockedItems.includes(item));
        
        if (lockedItems.length > 0) {
          const randomDrop = lockedItems[Math.floor(Math.random() * lockedItems.length)];
          const category = ['delta', 'arrow', 'falcon'].includes(randomDrop) ? 'models' :
                          ['fire', 'plasma', 'rainbow'].includes(randomDrop) ? 'trails' : 'effects';
          
          newCustomization = {
            ...customization,
            unlocked: {
              ...customization.unlocked,
              [category]: [...(customization.unlocked[category] || []), randomDrop]
            }
          };
          setCustomization(newCustomization);
        }
      }
      
      setTotalCoins(newTotal);
      saveData(newTotal, upgrades, newCustomization, null, null, unlockedSkills, newSkillPointsTotal);
      
      // Save to leaderboard
      if (gameState.distance > 0 && isLoggedIn) {
        apiClient.entities.Leaderboard.create({
          player_name: playerName,
          distance: gameState.distance,
          coins_collected: gameState.coins,
          enemies_destroyed: gameState.enemiesDestroyed,
          babies_rescued: gameState.babiesRescued || 0
        }).catch(e => console.log('Failed to save score'));
      }
      
      setGameScreen('gameover');
    }
  }, [gameState.health, gameState.coins, gameState.distance, gameState.enemiesDestroyed, gameState.customizationDrop, gameScreen, totalCoins, upgrades, customization, saveData, playerName]);

  const handleRestart = useCallback(() => {
    startGame();
  }, [startGame]);

  const handleTogglePause = useCallback(() => {
    if (gameScreen === 'playing') {
      setIsPaused(prev => {
        if (prev) setShowQuitConfirm(false);
        return !prev;
      });
    }
  }, [gameScreen]);

  const handleSaveAndQuit = useCallback(() => {
    const saveData = {
        gameState,
        gameMode,
        difficulty,
        activeChallenge,
        timestamp: Date.now()
    };
    try {
      localStorage.setItem('ufo_pilot_save_state', JSON.stringify(saveData));
      setHasSaveGame(true);
    } catch(e) {}
    setIsPaused(false);
    setGameScreen('start');
  }, [gameState, gameMode, difficulty, activeChallenge]);

  const handleQuit = useCallback(() => {
    try {
       localStorage.removeItem('ufo_pilot_save_state');
       setHasSaveGame(false);
    } catch(e) {}
    setIsPaused(false);
    setGameScreen('start');
  }, []);

  const handleContinueGame = useCallback(() => {
    try {
      const saveStr = localStorage.getItem('ufo_pilot_save_state');
      if (saveStr) {
         const saveData = JSON.parse(saveStr);
         setGameState(saveData.gameState);
         setGameMode(saveData.gameMode);
         setDifficulty(saveData.difficulty);
         if (saveData.activeChallenge) setActiveChallenge(saveData.activeChallenge);
         
         setIsPaused(false);
         setCurrentStory(null);
         setGameScreen('playing');
         
         localStorage.removeItem('ufo_pilot_save_state');
         setHasSaveGame(false);
      }
    } catch(e) {}
  }, []);

  const handleToggleAutoFire = useCallback(() => {
    setGameState(prev => ({ ...prev, autoFire: !prev.autoFire }));
  }, []);

  const handleOpenInGameStore = useCallback(() => {
    if (gameScreen === 'playing') {
      setShowInGameStore(true);
    }
  }, [gameScreen]);

  const handleCloseInGameStore = useCallback(() => {
    setShowInGameStore(false);
  }, []);

  const handlePurchasePowerup = useCallback((type, cost, duration, cooldown) => {
    if (gameState.coins >= cost) {
      setGameState(prev => ({
        ...prev,
        coins: prev.coins - cost,
        activePowerups: [
          ...(prev.activePowerups || []),
          {
            type,
            duration,
            startTime: Date.now()
          }
        ]
      }));
      
      // Set cooldown
      setPurchaseCooldowns(prev => ({
        ...prev,
        [type]: Date.now() + cooldown
      }));
      
      setShowInGameStore(false);
    }
  }, [gameState.coins]);

  const handlePurchaseInGameUpgrade = useCallback((upgradeKey, cost) => {
    if (gameState.coins >= cost) {
      const newUpgrades = {
        ...upgrades,
        [upgradeKey]: (upgrades[upgradeKey] || 0) + 1
      };
      
      setGameState(prev => ({ ...prev, coins: prev.coins - cost }));
      setUpgrades(newUpgrades);
      saveData(totalCoins, newUpgrades, customization);
      
      // Apply health upgrade immediately if it's health
      if (upgradeKey === 'health') {
        setGameState(prev => {
          const newMaxHealth = (prev.maxHealth || 100) + 25;
          return {
            ...prev,
            maxHealth: newMaxHealth,
            health: Math.min(prev.health + 25, newMaxHealth)
          };
        });
      }
      
      setShowInGameStore(false);
    }
  }, [gameState.coins, upgrades, totalCoins, customization, saveData]);

  const handleHome = useCallback(() => {
    setGameScreen('start');
  }, []);

  const handleOpenShop = useCallback(() => {
    setGameScreen('shop');
  }, []);

  const handleCloseShop = useCallback(() => {
    setGameScreen(gameState.health <= 0 && gameState.distance > 0 ? 'gameover' : 'start');
  }, [gameState.health, gameState.distance]);

  const handlePurchaseUpgrade = useCallback((upgradeKey, cost) => {
    const newCoins = totalCoins - cost;
    const newUpgrades = {
      ...upgrades,
      [upgradeKey]: (upgrades[upgradeKey] || 0) + 1
    };
    setTotalCoins(newCoins);
    setUpgrades(newUpgrades);
    saveData(newCoins, newUpgrades, customization);
  }, [totalCoins, upgrades, customization, saveData]);

  const handleUnlockSkill = useCallback((skillId, cost) => {
    if (skillPoints >= cost) {
        const newPoints = skillPoints - cost;
        const newSkills = [...unlockedSkills, skillId];
        setSkillPoints(newPoints);
        setUnlockedSkills(newSkills);
        saveData(totalCoins, upgrades, customization, null, null, newSkills, newPoints);
    }
  }, [skillPoints, unlockedSkills, totalCoins, upgrades, customization, saveData]);

  const handleBulkPurchase = useCallback((newUpgrades, totalCost) => {
    const newCoins = totalCoins - totalCost;
    setTotalCoins(newCoins);
    setUpgrades(newUpgrades);
    saveData(newCoins, newUpgrades, customization);
  }, [totalCoins, customization, saveData]);

  const handlePurchaseCustomization = useCallback((category, item, cost) => {
    const newCoins = totalCoins - cost;
    const newCustomization = {
      ...customization,
      unlocked: {
        ...customization.unlocked,
        [category]: [...(customization.unlocked[category] || []), item]
      }
    };
    setTotalCoins(newCoins);
    setCustomization(newCustomization);
    saveData(newCoins, upgrades, newCustomization);
  }, [totalCoins, customization, upgrades, saveData]);

  const handleDeductCoins = useCallback((amount) => {
    const newCoins = totalCoins - amount;
    setTotalCoins(newCoins);
    saveData(newCoins, upgrades, customization);
  }, [totalCoins, upgrades, customization, saveData]);

  const handleEquipCustomization = useCallback(async (category, item) => {
    // Preserve existing URL by default
    let customShipImageUrl = customization.customShipImageUrl;
    const STANDARD_MODELS = ['basic', 'delta', 'arrow', 'falcon', 'viper', 'guardian', 'stealth'];

    // Only update URL if we are changing the ship model
    if (category === 'models') {
      if (!STANDARD_MODELS.includes(item)) {
        // Switching to a custom ship - fetch new URL
        try {
          const ships = await apiClient.entities.Ship.list();
          const ship = ships.find(s => s.model_type === item);
          if (ship && ship.image_url) {
            customShipImageUrl = ship.image_url;
          } else {
            customShipImageUrl = null;
          }
        } catch (e) {
          console.error('Failed to load custom ship', e);
          customShipImageUrl = null;
        }
      } else {
        // Switching to a standard ship - clear URL
        customShipImageUrl = null;
      }
    }

    const newCustomization = {
      ...customization,
      equipped: {
        ...customization.equipped,
        [category]: item
      },
      customShipImageUrl
    };
    setCustomization(newCustomization);
    setCurrentLoadout(null); // Clear current loadout when manually changing
    saveData(totalCoins, upgrades, newCustomization);
  }, [customization, totalCoins, upgrades, saveData]);

  const handleSaveLoadout = useCallback((name, customizationData, id = null) => {
    const newLoadouts = [...loadouts];
    if (id) {
      const index = newLoadouts.findIndex(l => l.id === id);
      if (index >= 0) {
        newLoadouts[index] = { ...newLoadouts[index], name, customization: customizationData };
      }
    } else {
      const newId = Date.now().toString();
      newLoadouts.push({ id: newId, name, customization: customizationData });
    }
    setLoadouts(newLoadouts);
    saveData(totalCoins, upgrades, customization, newLoadouts);
  }, [loadouts, totalCoins, upgrades, customization, saveData]);

  const handleLoadLoadout = useCallback((loadoutId) => {
    const loadout = loadouts.find(l => l.id === loadoutId);
    if (loadout) {
      setCustomization(loadout.customization);
      setCurrentLoadout(loadoutId);
      saveData(totalCoins, upgrades, loadout.customization, loadouts);
    }
  }, [loadouts, totalCoins, upgrades, saveData]);

  const handleDeleteLoadout = useCallback((loadoutId) => {
    const newLoadouts = loadouts.filter(l => l.id !== loadoutId);
    setLoadouts(newLoadouts);
    if (currentLoadout === loadoutId) setCurrentLoadout(null);
    saveData(totalCoins, upgrades, customization, newLoadouts);
  }, [loadouts, currentLoadout, totalCoins, upgrades, customization, saveData]);

  const handleTestFlight = useCallback((customizationData) => {
    setTestFlightCustomization(customizationData);
    setTestFlightMode(true);
  }, []);

  const handlePurchaseLoadoutSlot = useCallback(() => {
    const SLOT_COST = 300;
    if (totalCoins >= SLOT_COST) {
      const newCoins = totalCoins - SLOT_COST;
      const newMaxSlots = maxLoadoutSlots + 1;
      setTotalCoins(newCoins);
      setMaxLoadoutSlots(newMaxSlots);
      saveData(newCoins, upgrades, customization, loadouts, newMaxSlots);
    }
  }, [totalCoins, maxLoadoutSlots, upgrades, customization, loadouts, saveData]);

  // Dev tool to restore lost coins
  const handleAddDevCoins = useCallback(() => {
    const newCoins = totalCoins + 10000;
    setTotalCoins(newCoins);
    saveData(newCoins, upgrades, customization);
  }, [totalCoins, upgrades, customization, saveData]);

  const handleOpenLeaderboard = useCallback(() => {
    setGameScreen('leaderboard');
  }, []);

  const handleCloseLeaderboard = useCallback(() => {
    setGameScreen(gameState.health <= 0 && gameState.distance > 0 ? 'gameover' : 'start');
  }, [gameState.health, gameState.distance]);

  const handleRevive = useCallback(() => {
    const REVIVE_COST = 1000000;
    if (totalCoins >= REVIVE_COST) {
        // Just deduct the cost. 
        // We don't need to subtract gameState.coins because we use coinsSaved logic now.
        const newTotal = totalCoins - REVIVE_COST;
        setTotalCoins(newTotal);

        // Reset health and add protection
        setGameState(prev => ({
            ...prev,
            health: prev.maxHealth || 100,
            activePowerups: [
                ...(prev.activePowerups || []),
                { type: 'invincibility', duration: 3000, startTime: Date.now() },
                { type: 'shield_overcharge', duration: 5000, startTime: Date.now() }
            ]
        }));
        
        saveData(newTotal, upgrades, customization);
        setGameScreen('playing');
    }
  }, [totalCoins, gameState.coins, upgrades, customization, saveData]);



  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'p' || e.key === 'Escape') {
        handleTogglePause();
      } else if (e.key.toLowerCase() === 'f' && gameScreen === 'playing') {
        handleToggleAutoFire();
      } else if (e.key.toLowerCase() === 'i' && gameScreen === 'playing') {
        setShowInGameStore(prev => !prev);
      } else if (e.key.toLowerCase() === 'l' && gameScreen === 'playing') { // L for Loadout
        setShowQuickLoadout(prev => !prev);
        // Auto-pause when opening, unpause when closing (optional, but good for UX)
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameScreen, handleTogglePause, handleQuit, handleToggleAutoFire]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a1a] overflow-hidden">
      <div className="relative w-full h-full">
        <Toaster theme="dark" position="top-center" />
        {/* Arena Canvas */}
        {gameMode === 'arena_bot' && gameScreen === 'playing' ? (
          <ArenaCanvas 
            customization={customization}
            onClose={handleQuit}
            onGameOver={(stats) => {
              if (stats) {
                setGameState(prev => ({ ...prev, ...stats }));
              }
              setGameScreen('gameover');
            }}
            currentUserEmail={currentUserEmail}
            playerName={playerName}
          />
        ) : (
        /* Game Canvas */
        customization && customization.equipped && (gameScreen === 'playing' || gameScreen === 'story') && (
          <GameCanvas 
            key={customization.equipped.models} // Maybe include level in key to force full reset? key={`${customization.equipped.models}-${gameState.level}`}
            gameState={gameState}
            gameMode={gameMode}
            difficulty={difficulty}
            level={gameState.level}
            challengeConfig={activeChallenge}
            onStateUpdate={handleStateUpdate}
            isPlaying={true}
            isPaused={isPaused || gameScreen === 'story'}
            upgrades={upgrades}
            customization={customization}
            unlockedSkills={unlockedSkills}
            onGameOver={() => setGameScreen('gameover')}
            volume={volume}
            onLevelComplete={handleLevelComplete}
            onVictory={async (stats) => {
              // Handle Campaign Victory
              if (gameMode === 'campaign' && campaignLevel) {
                try {
                  let currentProgress = { level_completed: 0, tokens_earned: 0, level_stars: {} };
                  if (isLoggedIn) {
                    const user = await apiClient.auth.me();
                    if (user.campaign_progress) currentProgress = user.campaign_progress;
                  } else {
                    const localData = JSON.parse(localStorage.getItem('ufo_pilot_guest_data') || '{}');
                    if (localData.campaign_progress) currentProgress = localData.campaign_progress;
                  }
                  
                  // Calculate stars
                  let stars = 0;
                  const { objective, starThresholds } = campaignLevel;
                  let performance = 0;
                  
                  if (objective.type === 'survive' || objective.type === 'speedrun' || objective.type === 'escort') {
                     performance = stats.timeSurvived || stats.enemiesDestroyed || stats.distance; // Fallback
                     if (objective.type === 'speedrun') performance = stats.timeTaken;
                     if (objective.type === 'kills') performance = stats.enemiesDestroyed;
                     if (objective.type === 'survive') performance = stats.timeSurvived; // seconds
                  } else {
                     performance = stats.enemiesDestroyed; 
                     if (objective.type === 'nodamage') performance = stats.distance;
                  }

                  if (objective.type === 'speedrun' || objective.type === 'escort') {
                    if (performance <= starThresholds.gold) stars = 3;
                    else if (performance <= starThresholds.silver) stars = 2;
                    else if (performance <= starThresholds.bronze) stars = 1;
                  } else {
                    if (performance >= starThresholds.gold) stars = 3;
                    else if (performance >= starThresholds.silver) stars = 2;
                    else if (performance >= starThresholds.bronze) stars = 1;
                  }
                  
                  // Update progress
                  const newStars = { ...currentProgress.level_stars };
                  if ((newStars[campaignLevel.id] || 0) < stars) {
                    newStars[campaignLevel.id] = stars;
                  }
                  
                  const newCompleted = Math.max(currentProgress.level_completed, campaignLevel.id);
                  const newTokens = currentProgress.tokens_earned + (campaignLevel.id > currentProgress.level_completed ? campaignLevel.reward : 0);
                  
                  const newProgress = {
                    level_completed: newCompleted,
                    tokens_earned: newTokens,
                    level_stars: newStars
                  };

                  if (isLoggedIn) {
                    await apiClient.auth.updateMe({ campaign_progress: newProgress });
                  } else {
                    const localData = JSON.parse(localStorage.getItem('ufo_pilot_guest_data') || '{}');
                    localData.campaign_progress = newProgress;
                    localStorage.setItem('ufo_pilot_guest_data', JSON.stringify(localData));
                  }
                } catch(e) {
                  console.error("Failed to save campaign progress", e);
                }
              }
              setGameScreen('gameover');
            }}
          />
        ))}
        
        {/* HUD Overlay - only show when playing */}
        {gameScreen === 'playing' && (
          <GameHUD 
            difficulty={difficulty}
            distance={gameState.distance}
            coins={gameState.coins}
            health={gameState.health}
            maxHealth={gameState.maxHealth || (100 + (upgrades?.health || 0) * 25)}
            powerLevel={gameState.powerLevel}
            currentWeapon={gameState.currentWeapon}
            weaponLevel={gameState.weaponLevel}
            weaponXP={gameState.weaponXP}
            isMutated={gameState.isMutated}
            activePowerups={gameState.activePowerups}
            activeEvent={gameState.activeEvent}
            autoFire={gameState.autoFire}
            timeRemaining={gameState.timeRemaining}
            onOpenStore={handleOpenInGameStore}
            upgrades={upgrades}
            theme={customization.equipped.hud || 'cyber'}
            level={gameState.level}
            customization={customization}
          />
          )}

        {/* Story / Dialogue Overlay */}
        <AnimatePresence>
          {gameScreen === 'story' && currentStory && (
              <DialogueBox 
                story={currentStory} 
                onContinue={handleContinueStory} 
              />
          )}
        </AnimatePresence>

        {/* Pause Overlay */}
        {gameScreen === 'playing' && isPaused && !currentStory && !showQuickLoadout && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center">
            <div className="bg-gradient-to-b from-gray-900 to-black border border-cyan-500/30 rounded-3xl p-8 text-center shadow-2xl shadow-cyan-500/20">
              <h2 className="text-5xl font-black text-white mb-4">PAUSED</h2>
              <p className="text-gray-400 mb-6">Press P or ESC to resume</p>

              <div className="mb-6 flex justify-center">
                <QuickShipSelector 
                  customization={customization}
                  onEquip={handleEquipCustomization}
                />
              </div>

              <div className="flex justify-center gap-4 mb-6">
                <Button 
                  onClick={handleSaveAndQuit}
                  variant="outline"
                  className="border-cyan-500 text-black hover:bg-cyan-500/20"
                >
                  Save & Quit
                </Button>
                {!showQuitConfirm ? (
                  <Button 
                    onClick={() => setShowQuitConfirm(true)}
                    variant="destructive"
                    className="bg-red-900/50 border border-red-500 hover:bg-red-800"
                  >
                    Abandon Run
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="text-red-400 text-sm mb-1">Are you sure?</div>
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={handleQuit}>Yes, Quit</Button>
                      <Button variant="outline" className="text-white" onClick={() => setShowQuitConfirm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center mb-6">
                <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
              </div>

              <div className="text-sm text-gray-500 space-y-1">
                <div>F - Toggle auto-fire</div>
                <div>I - Toggle in-game store</div>
                <div>L - Quick Ship Switch</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Loadout Overlay */}
        <AnimatePresence>
          {gameScreen === 'playing' && showQuickLoadout && (
            <QuickLoadoutOverlay 
              isOpen={showQuickLoadout}
              onClose={() => {
                setShowQuickLoadout(false);
                setIsPaused(false); // Unpause on close
              }}
              customization={customization}
              onEquip={handleEquipCustomization}
              upgrades={upgrades}
            />
          )}
        </AnimatePresence>

        {/* In-Game Store */}
        {gameScreen === 'playing' && showInGameStore && (
          <InGameStore
            isOpen={showInGameStore}
            onClose={handleCloseInGameStore}
            coins={gameState.coins}
            upgrades={upgrades}
            onPurchasePowerup={handlePurchasePowerup}
            onPurchaseUpgrade={handlePurchaseInGameUpgrade}
            cooldowns={purchaseCooldowns}
          />
        )}

        {/* Start Screen */}
        {gameScreen === 'start' && (
          <StartScreen 
            onStart={startGame} 
            onContinue={handleContinueGame}
            hasSaveGame={hasSaveGame}
            onOpenShop={handleOpenShop}
            onOpenLeaderboard={handleOpenLeaderboard}
            totalCoins={totalCoins}
            customization={customization}
            onEquipCustomization={handleEquipCustomization}
            gameMode={gameMode}
            setGameMode={setGameMode}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            activeChallenge={activeChallenge}
            setActiveChallenge={setActiveChallenge}
            playerName={playerName}
            isLoggedIn={isLoggedIn}
            onUpdateName={async (name) => {
              if (!isLoggedIn) {
                setPlayerName(name);
                return;
              }
              // Check for duplicate names on leaderboard
              try {
                const existing = await apiClient.entities.Leaderboard.filter({ player_name: name }, '-created_date', 10);
                // If name exists and belongs to someone else
                const isTaken = existing.some(entry => entry.created_by !== currentUserEmail);
                
                if (isTaken) {
                  throw new Error("Name already taken");
                }
                
                setPlayerName(name);
                await apiClient.auth.updateMe({ full_name: name });
              } catch (e) {
                console.error("Name update failed", e);
                throw e;
              }
            }}
            volume={volume}
            onVolumeChange={handleVolumeChange}
          />
        )}

        {/* Game Over Screen */}
        {gameScreen === 'gameover' && (
          <GameOverScreen 
            distance={gameState.distance}
            coins={gameState.coins}
            enemiesDestroyed={gameState.enemiesDestroyed}
            babiesRescued={gameState.babiesRescued}
            totalCoins={totalCoins}
            onRestart={handleRestart}
            onHome={handleHome}
            onOpenShop={handleOpenShop}
            onOpenLeaderboard={handleOpenLeaderboard}
            onRevive={handleRevive}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            isLoggedIn={isLoggedIn}
            />
            )}

        {/* Upgrade Shop */}
        {gameScreen === 'shop' && (
          <UpgradeShop
            totalCoins={totalCoins}
            upgrades={upgrades}
            customization={customization}
            loadouts={loadouts}
            maxLoadoutSlots={maxLoadoutSlots}
            currentLoadout={currentLoadout}
            onPurchase={handlePurchaseUpgrade}
            onBulkPurchase={handleBulkPurchase}
            onPurchaseCustomization={handlePurchaseCustomization}
            onEquipCustomization={handleEquipCustomization}
            onDeductCoins={handleDeductCoins}
            onSaveLoadout={handleSaveLoadout}
            onLoadLoadout={handleLoadLoadout}
            onDeleteLoadout={handleDeleteLoadout}
            onTestFlight={handleTestFlight}
            onPurchaseLoadoutSlot={handlePurchaseLoadoutSlot}
            onClose={handleCloseShop}
            skillPoints={skillPoints}
            unlockedSkills={unlockedSkills}
            onUnlockSkill={handleUnlockSkill}
            onAddDevCoins={handleAddDevCoins}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            />
            )}

        {/* Leaderboard */}
        {gameScreen === 'leaderboard' && (
          <LeaderboardScreen
            onClose={handleCloseLeaderboard}
            currentUserEmail={currentUserEmail}
          />
        )}

        {/* Test Flight Mode */}
        <AnimatePresence>
          {testFlightMode && (
            <TestFlightCanvas
              customization={testFlightCustomization}
              onClose={() => setTestFlightMode(false)}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
