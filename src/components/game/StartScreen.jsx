import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, ChevronLeft, ChevronRight, Crosshair, ShoppingCart, Coins, Trophy, Zap, Rocket, Users, Skull, Clock, Book, Edit2, Check, X, LogIn, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { apiClient } from '../../apis/client';
import QuickShipSelector from './QuickShipSelector';
import MainMenuShipSelector from './MainMenuShipSelector';
import { GAME_MODES, CHALLENGES } from './GameModes';
import VolumeControl from './VolumeControl';

export default function StartScreen({ 
  onStart, 
  onContinue,
  hasSaveGame,
  onOpenShop, 
  onOpenLeaderboard, 
  totalCoins, 
  customization, 
  onEquipCustomization, 
  gameMode, 
  setGameMode, 
  difficulty,
  setDifficulty,
  activeChallenge, 
  setActiveChallenge,
  playerName,
  onUpdateName,
  isLoggedIn,
  volume,
  onVolumeChange
}) {
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(playerName);
  const [nameError, setNameError] = useState(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const handleSaveName = async () => {
    if (tempName.trim()) {
      setIsSavingName(true);
      setNameError(null);
      try {
        await onUpdateName(tempName);
        setIsEditingName(false);
      } catch (error) {
        setNameError(error.message || "Name unavailable");
      } finally {
        setIsSavingName(false);
      }
    }
  };

  const ModeIcon = {
    survival: Zap,
    boss_rush: Skull,
    coop: Users,
    challenge: Trophy,
    campaign: Trophy,
    training: Crosshair
  }[gameMode] || Zap;

  // Daily Challenge Logic
  const getDailyChallenge = () => {
    const date = new Date();
    const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    // Simple pseudo-random using seed
    const typeIndex = seed % 3; 
    const types = ['survival', 'time_attack', 'boss_rush'];
    const type = types[typeIndex];
    
    return {
      id: `daily_${seed}`,
      name: 'DAILY MISSION',
      description: type === 'time_attack' ? 'Survive and score high in 3 mins' : type === 'boss_rush' ? 'Defeat as many bosses as possible' : 'Survive with increased difficulty',
      type: type,
      // Daily modifiers
      modifiers: {
        damageMult: 1 + (seed % 5) * 0.1, // 1.0 - 1.4
        speedMult: 1 + (seed % 3) * 0.1
      },
      reward: 500
    };
  };

  const dailyChallenge = getDailyChallenge();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#0f0f2a] to-[#0a0a1a] z-30 flex flex-col items-center justify-center px-4"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-8 bg-gradient-to-b from-cyan-500/50 to-transparent"
            style={{ left: `${Math.random() * 100}%` }}
            animate={{
              y: ['100vh', '-10vh'],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>





      {/* Top Bar: Login */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute top-4 left-4 right-4 z-50 flex justify-end items-start pointer-events-none"
      >
        <div className="pointer-events-auto">
          {!isLoggedIn && (
            <Button
              onClick={() => apiClient.auth.redirectToLogin()}
              variant="outline"
              className="bg-black/60 border-cyan-500/50 text-cyan-400 hover:bg-cyan-900/50 hover:text-cyan-300 backdrop-blur-md rounded-full skew-x-[-10deg]"
            >
              <div className="flex items-center gap-2 skew-x-[10deg]">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-mono uppercase tracking-widest">Login</span>
              </div>
            </Button>
          )}
        </div>
      </motion.div>

      {/* Bottom Bar: Volume & Controls Info */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-4 left-4 right-4 z-50 flex justify-between items-end pointer-events-none"
      >
        <div className="pointer-events-auto">
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
        </div>
        
        {/* Controls info - Minimal */}
        {customization?.equipped?.hud !== 'minimal' && (
          <div className="pointer-events-auto">
            <div className="hidden sm:flex gap-6 text-xs text-gray-500 font-mono bg-black/30 px-4 py-2 rounded-full border border-white/5">
              {gameMode === 'training' && (
                <>
                  <span className="flex items-center gap-1"><span className="bg-gray-700 px-1 rounded text-gray-300">W</span> CYCLE</span>
                  <span className="w-px h-4 bg-gray-700"></span>
                </>
              )}
              <span className="flex items-center gap-1"><span className="bg-gray-700 px-1 rounded text-gray-300">A</span> / <span className="bg-gray-700 px-1 rounded text-gray-300">D</span> MOVE</span>
              <span className="w-px h-4 bg-gray-700"></span>
              <span className="flex items-center gap-1"><span className="bg-gray-700 px-1.5 rounded text-gray-300">SPACE</span> SHOOT</span>
            </div>
            
            <div className="flex sm:hidden gap-2 text-[10px] text-gray-500 font-mono bg-black/30 px-3 py-1.5 rounded-full border border-white/5">
              <span className="flex items-center gap-1">DRAG TO MOVE</span>
              <span className="w-px h-3 bg-gray-700"></span>
              <span className="flex items-center gap-1">AUTO SHOOT</span>
            </div>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-1 flex flex-col gap-1 items-center w-full max-w-3xl"
      >
        {/* Cockpit HUD Frame */}
        <div className="relative w-full p-2 sm:p-6 border-2 border-cyan-500/30 bg-black/80 backdrop-blur-md clip-path-polygon-[20px_0,100%_0,100%_calc(100%-20px),calc(100%-20px)_100%,0_100%,0_20px]">
        {/* Decorative HUD Elements */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>

        {/* Scanning Line Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,255,255,0.02)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
          
          <div className="flex flex-col items-center gap-2">
            
            <div className="text-center -mt-1">
              <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 tracking-tight mb-0 animate-pulse">
                UFO PILOT
              </h1>
              <p className="text-gray-500 text-[10px] tracking-widest">ENDLESS ARCADE SHOOTER</p>
            </div>

            {/* Player Name and Threat Level */}
            <div className="flex flex-col items-center justify-center gap-1 z-10 -mt-1">
              <div className="flex flex-col items-center justify-center gap-2">
                {isEditingName ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-cyan-500/30">
                      <Input 
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className={`h-8 w-48 bg-transparent border-gray-700 text-white text-center ${nameError ? 'border-red-500' : ''}`}
                        placeholder="Enter Pilot Name"
                        autoFocus
                        disabled={isSavingName}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                      />
                      <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={isSavingName} className="h-8 w-8 text-green-400 hover:text-green-300">
                        {isSavingName ? <Clock className="w-3 h-3 animate-spin" /> : <Check className="w-4 h-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setIsEditingName(false); setNameError(null); }} className="h-8 w-8 text-red-400 hover:text-red-300">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {nameError && <span className="text-xs text-red-400 text-center">{nameError}</span>}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <div 
                      onClick={() => {
                        if (isLoggedIn) {
                          setTempName(playerName);
                          setIsEditingName(true);
                        }
                      }}
                      className={`group flex items-center gap-2 ${isLoggedIn ? 'cursor-pointer hover:bg-black/40 hover:border-cyan-500/30' : 'cursor-default'} bg-black/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-transparent transition-all`}
                    >
                      {customization?.equipped?.hud !== 'minimal' && <span className="text-gray-400 text-xs sm:text-sm uppercase tracking-widest">Pilot:</span>}
                      <span className="text-cyan-400 font-bold text-sm sm:text-lg group-hover:text-cyan-300">{(playerName || 'Guest').split(' ')[0]}</span>
                      {isLoggedIn && <Edit2 className="w-3 h-3 text-gray-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all" />}
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-yellow-500/30">
                      <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-bold text-sm sm:text-base">{totalCoins}</span>
                    </div>
                  </div>
                )}

                {/* Difficulty Selector - Compacted next to name */}
                <div className="flex items-center gap-2 bg-black/60 p-1 rounded-full border border-gray-700 relative overflow-hidden scale-90">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,255,255,0.05)_50%,transparent_75%)] bg-[length:10px_10px]" />
                  {customization?.equipped?.hud !== 'minimal' && <span className="text-cyan-500 font-mono text-[10px] font-bold pl-2 uppercase tracking-widest">Threat:</span>}
                  <div className="flex gap-1 relative z-10">
                    {['easy', 'rookie', 'ufo_pilot'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`px-3 py-1 text-[10px] font-mono font-bold uppercase transition-all skew-x-[-10deg] border ${
                          difficulty === d 
                            ? d === 'ufo_pilot' ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(255,0,0,0.4)]' : 
                              d === 'rookie' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.4)]' : 
                              'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(0,255,0,0.4)]'
                            : 'bg-transparent border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400'
                        }`}
                      >
                        <span className="skew-x-[10deg] inline-block">{d.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {isLoggedIn && (
            <div className="flex items-center justify-center w-full">
              {/* Ship Selector */}
              <div className="w-full">
                <MainMenuShipSelector 
                  customization={customization}
                  onEquip={onEquipCustomization}
                />
              </div>
            </div>
            )}

            <div className="flex flex-col gap-2 w-full items-center mt-1">
            {/* Main Engagement Controls */}
            <div className="flex flex-col gap-2 w-full max-w-sm shrink-0 mb-2">
              {isLoggedIn && hasSaveGame && (
                <Button 
                  onClick={onContinue}
                  variant="display"
                  className="w-full h-12 sm:h-16 group border-green-500 mb-2"
                >
                  <div className="absolute inset-[4px] bg-[#080815] rounded-[6px] flex flex-col items-center justify-center border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-green-500 blur-xl group-hover:opacity-20 transition-opacity" />
                    <div className="flex flex-col items-center z-10">
                      {customization?.equipped?.hud !== 'minimal' && <span className="text-[10px] text-green-500/60 tracking-[0.4em] font-mono mb-1">RESUME MISSION</span>}
                      <div className="flex items-center gap-3">
                        <Play className={`w-6 h-6 fill-green-400 text-green-400 drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] ${customization?.equipped?.hud === 'minimal' ? 'scale-150' : ''}`} />
                        {customization?.equipped?.hud !== 'minimal' && (
                          <span className="text-xl font-black tracking-widest text-green-400 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">
                            CONTINUE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>
              )}
              <div className="flex gap-2 w-full h-14 sm:h-20">
                <Button
                  onClick={() => {
                    const themes = ['cyber', 'minimal', 'retro'];
                    const current = customization?.equipped?.hud || 'cyber';
                    const nextIndex = (themes.indexOf(current) + 1) % themes.length;
                    onEquipCustomization('hud', themes[nextIndex]);
                  }}
                  variant="display"
                  className="h-14 sm:h-full w-14 sm:w-24 flex-none group"
                  title="Toggle HUD Style"
                >
                  <div className="absolute inset-[4px] bg-[#080815] rounded-[6px] flex flex-col items-center justify-center border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden">
                    <div className={`absolute inset-0 opacity-10 blur-xl group-hover:opacity-20 transition-opacity ${(customization?.equipped?.hud || 'cyber') === 'retro' ? 'bg-green-500' : (customization?.equipped?.hud || 'cyber') === 'minimal' ? 'bg-white' : 'bg-cyan-500'}`} />
                    {customization?.equipped?.hud !== 'minimal' && <span className={`hidden sm:block text-[8px] tracking-widest mb-1 ${(customization?.equipped?.hud || 'cyber') === 'retro' ? 'text-green-500' : (customization?.equipped?.hud || 'cyber') === 'minimal' ? 'text-gray-400' : 'text-cyan-500'}`}>HUD</span>}
                    <Monitor className={`w-6 h-6 sm:w-8 sm:h-8 transition-colors drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] ${(customization?.equipped?.hud || 'cyber') === 'retro' ? 'text-green-400 group-hover:text-green-300' : (customization?.equipped?.hud || 'cyber') === 'minimal' ? 'text-gray-300 group-hover:text-white' : 'text-cyan-400 group-hover:text-cyan-300'} ${customization?.equipped?.hud === 'minimal' ? 'scale-125' : ''}`} />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
                  </div>
                </Button>

                <Button 
                  onClick={onStart}
                  variant="display"
                  className="flex-1 h-14 sm:h-full group"
                >
                  <div className="absolute inset-[4px] bg-[#080815] rounded-[6px] flex flex-col items-center justify-center border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-cyan-500 blur-xl group-hover:opacity-20 transition-opacity" />
                    <div className="flex flex-col items-center z-10">
                      {customization?.equipped?.hud !== 'minimal' && <span className="hidden sm:block text-[10px] text-cyan-500/60 tracking-[0.4em] font-mono mb-1">SYSTEM READY</span>}
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Play className={`w-5 h-5 sm:w-6 sm:h-6 fill-cyan-400 text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(0,255,255,0.8)] ${customization?.equipped?.hud === 'minimal' ? 'scale-150' : ''}`} />
                        {customization?.equipped?.hud !== 'minimal' && (
                          <span className="text-lg sm:text-xl font-black tracking-widest text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">
                            {gameMode === 'campaign' ? 'LAUNCH' : 'ENGAGE'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
                  </div>
                </Button>
                
                {isLoggedIn && (
                <Button
                  onClick={() => setShowModeSelect(true)}
                  variant="display"
                  className="h-14 sm:h-full w-14 sm:w-24 flex-none group"
                  title="Select Game Mode"
                >
                  <div className="absolute inset-[4px] bg-[#080815] rounded-[6px] flex flex-col items-center justify-center border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-gray-500 blur-xl group-hover:opacity-20 transition-opacity" />
                    {customization?.equipped?.hud !== 'minimal' && <span className="hidden sm:block text-[8px] text-gray-500 tracking-widest mb-1">MODE</span>}
                    <ModeIcon className={`w-6 h-6 sm:w-8 sm:h-8 text-gray-400 group-hover:text-cyan-400 transition-colors drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] ${customization?.equipped?.hud === 'minimal' ? 'scale-125' : ''}`} />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
                  </div>
                </Button>
                )}
              </div>
              
              {activeChallenge && (gameMode === 'challenge' || gameMode === 'campaign') && (
                <motion.div 
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  className="relative bg-cyan-950/40 border-x-2 border-cyan-500/50 px-4 py-1 self-center w-[90%] text-center my-1"
                >
                   <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase shadow-[0_0_10px_rgba(0,255,255,0.2)]">
                    {gameMode === 'campaign' ? `Target: ${activeChallenge.name}` : `Directive: ${activeChallenge.name}`}
                   </span>
                   <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                   <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                </motion.div>
              )}

              {isLoggedIn && (
              <div className="grid grid-cols-2 gap-2 mt-0 h-10 sm:h-14">
                <Button
                  onClick={() => window.location.href = createPageUrl('Campaign')}
                  variant="display"
                  className="h-full w-full group"
                >
                  <div className="absolute inset-[4px] bg-[#080815] rounded-[6px] flex flex-row items-center justify-center gap-2 border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-red-500 blur-xl group-hover:opacity-20 transition-opacity" />
                    <Zap className={`w-5 h-5 text-red-400 fill-red-400/20 drop-shadow-[0_0_5px_rgba(255,0,0,0.5)] ${customization?.equipped?.hud === 'minimal' ? 'scale-150' : ''}`} />
                    {customization?.equipped?.hud !== 'minimal' && <span className="text-[10px] tracking-widest font-bold text-red-400 group-hover:text-red-300">CAMPAIGN</span>}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
                  </div>
                </Button>

                <Button
                  onClick={() => {
                    setGameMode('challenge');
                    setActiveChallenge(dailyChallenge);
                    onStart();
                  }}
                  variant="display"
                  className="h-full w-full group"
                >
                  <div className="absolute inset-[4px] bg-[#080815] rounded-[6px] flex flex-row items-center justify-center gap-2 border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-yellow-500 blur-xl group-hover:opacity-20 transition-opacity" />
                    <Clock className={`w-5 h-5 text-yellow-400 drop-shadow-[0_0_5px_rgba(255,255,0,0.5)] ${customization?.equipped?.hud === 'minimal' ? 'scale-150' : ''}`} />
                    {customization?.equipped?.hud !== 'minimal' && <span className="text-[10px] tracking-widest font-bold text-yellow-400 group-hover:text-yellow-300">DAILY OP</span>}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
                  </div>
                </Button>
              </div>
              )}
            </div>

            {/* System Access Controls (Secondary) */}
            {isLoggedIn && (
            <div className="flex flex-wrap justify-center sm:grid sm:grid-cols-5 gap-2 w-full shrink-0 sm:h-32 mt-2">
              {[
                { label: 'SHOP', icon: ShoppingCart, action: onOpenShop, color: 'text-yellow-400' },
                { label: 'RANKS', icon: Trophy, action: onOpenLeaderboard, color: 'text-purple-400' },
                { label: 'GALLERY', icon: Rocket, action: () => window.location.href = createPageUrl('Gallery'), color: 'text-blue-400' },
                { label: 'CODEX', icon: Book, action: () => window.location.href = createPageUrl('Codex'), color: 'text-cyan-400' },
                { label: 'ARENA', icon: Crosshair, action: () => window.location.href = createPageUrl('Arena'), color: 'text-red-400' },
                ].map((btn, i) => (
                <Button
                  key={btn.label}
                  onClick={btn.action}
                  variant="display"
                  className={`h-12 w-12 sm:h-full sm:w-full group`}
                >
                  <div className="absolute inset-[2px] sm:inset-[4px] bg-[#080815] rounded-[4px] sm:rounded-[6px] flex flex-col items-center justify-center sm:gap-2 border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,1)] overflow-hidden">
                    <div className={`absolute inset-0 opacity-10 ${btn.color.replace('text-', 'bg-')} blur-xl group-hover:opacity-20 transition-opacity`} />
                    <btn.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${btn.color} drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] ${customization?.equipped?.hud === 'minimal' ? 'sm:scale-150 scale-125' : ''}`} />
                    {customization?.equipped?.hud !== 'minimal' && (
                      <div className="hidden sm:flex flex-col items-center">
                        <span className={`text-[9px] tracking-[0.1em] font-black ${btn.color} opacity-80`}>{btn.label}</span>
                        <div className="h-[1px] w-6 bg-current opacity-30 mt-1" />
                      </div>
                    )}
                    {/* Scanline overlay for screen area */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none opacity-40" />
                  </div>
                </Button>
              ))}
            </div>
            )}
            </div>
          </div>
        </div>

          </motion.div>



      {/* Mode Selection Modal */}
      <AnimatePresence>
        {showModeSelect && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-3xl font-black text-white mb-6 text-center">SELECT MODE</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {Object.values(GAME_MODES).map(mode => {
                  const Icon = {
                    survival: Zap,
                    boss_rush: Skull,
                    coop: Users,
                    challenge: Trophy,
                    campaign: Trophy,
                    training: Crosshair
                  }[mode.id] || Zap;
                  
                  return (
                    <div 
                      key={mode.id}
                      onClick={() => {
                        setGameMode(mode.id);
                        if (mode.id !== 'challenge') setShowModeSelect(false);
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        gameMode === mode.id 
                          ? 'border-cyan-500 bg-cyan-900/30' 
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${gameMode === mode.id ? 'bg-cyan-500 text-black' : 'bg-gray-700 text-gray-300'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-white text-lg">{mode.name}</span>
                      </div>
                      <p className="text-gray-400 text-sm">{mode.description}</p>
                    </div>
                  );
                })}
              </div>

              {gameMode === 'challenge' && (
                <div className="mb-6">
                  <h3 className="text-white font-bold mb-3">Select Challenge</h3>
                  <div className="space-y-2">
                    {CHALLENGES.map(challenge => (
                      <div
                        key={challenge.id}
                        onClick={() => {
                          setActiveChallenge(challenge);
                          setShowModeSelect(false);
                        }}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-cyan-500 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <div>
                            <div className="text-white font-bold text-sm">{challenge.name}</div>
                            <div className="text-gray-400 text-xs">{challenge.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={() => setShowModeSelect(false)}
                className="w-full bg-gray-700 hover:bg-gray-600"
              >
                Close
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
