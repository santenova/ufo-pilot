import React from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Coins, RotateCcw, Home, ShoppingCart, Crosshair } from 'lucide-react';
import { motion } from 'framer-motion';

import { HeartPulse } from 'lucide-react';

import { Baby } from 'lucide-react';

export default function GameOverScreen({ distance, coins, enemiesDestroyed, totalCoins, babiesRescued, onRestart, onHome, onOpenShop, onOpenLeaderboard, onRevive, volume, onVolumeChange, isLoggedIn }) {
  const REVIVE_COST = 1000000;
  const canRevive = totalCoins >= REVIVE_COST;
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-black/90 backdrop-blur-md z-30 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="relative w-full max-w-md p-8 border-x-2 border-red-500/20 bg-black/40 backdrop-blur-md rounded-3xl"
      >
        {/* Decorative HUD Lines - Danger Style */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-500"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500"></div>

        <div className="flex flex-col items-center text-center">
          <div className="flex flex-row items-center justify-center gap-3 mb-2 w-full">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-900/20 border-2 border-red-500/50 flex flex-shrink-0 items-center justify-center shadow-[0_0_15px_rgba(255,0,0,0.3)] relative skew-x-[-10deg]"
            >
              <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-20"></div>
              <span className="text-xl md:text-2xl drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] skew-x-[10deg]">💥</span>
            </motion.div>

            <h2 className="text-[1.3rem] sm:text-2xl md:text-4xl font-black text-red-500 tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,0,0,0.5)] skew-x-[-10deg] whitespace-nowrap">
              CRITICAL FAILURE
            </h2>
          </div>
          <p className="text-red-400/70 font-mono tracking-widest text-[9px] sm:text-xs md:text-sm mb-8 uppercase whitespace-nowrap">Signal Lost // Connection Terminated</p>

          {/* HUD Stats Grid */}
          <div className={`grid ${babiesRescued > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-1 md:gap-2 mb-6 md:mb-8 w-full`}>
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-cyan-900/20 border border-cyan-500/30 p-2 md:p-3 skew-x-[-10deg]"
            >
              <div className="skew-x-[10deg] flex flex-col items-center">
                <Trophy className="w-4 h-4 text-cyan-400 mb-1" />
                <div className="text-cyan-400/60 text-[9px] md:text-[10px] font-bold tracking-wider">DIST</div>
                <div className="text-sm md:text-lg font-mono font-bold text-white">{Math.floor(distance).toLocaleString()}m</div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-yellow-900/20 border border-yellow-500/30 p-2 md:p-3 skew-x-[-10deg]"
            >
              <div className="skew-x-[10deg] flex flex-col items-center">
                <Coins className="w-4 h-4 text-yellow-400 mb-1" />
                <div className="text-yellow-400/60 text-[9px] md:text-[10px] font-bold tracking-wider">LOOT</div>
                <div className="text-sm md:text-lg font-mono font-bold text-white">{coins}</div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-red-900/20 border border-red-500/30 p-2 md:p-3 skew-x-[-10deg]"
            >
              <div className="skew-x-[10deg] flex flex-col items-center">
                <Crosshair className="w-4 h-4 text-red-400 mb-1" />
                <div className="text-red-400/60 text-[9px] md:text-[10px] font-bold tracking-wider">KILLS</div>
                <div className="text-sm md:text-lg font-mono font-bold text-white">{enemiesDestroyed || 0}</div>
              </div>
            </motion.div>
            
            {babiesRescued > 0 && (
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-green-900/20 border border-green-500/30 p-2 md:p-3 skew-x-[-10deg]"
              >
                <div className="skew-x-[10deg] flex flex-col items-center">
                  <Baby className="w-4 h-4 text-green-400 mb-1" />
                  <div className="text-green-400/60 text-[9px] md:text-[10px] font-bold tracking-wider">HYBRIDS</div>
                  <div className="text-sm md:text-lg font-mono font-bold text-white">{babiesRescued}</div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="mb-8 w-full bg-black/40 border border-yellow-500/30 p-2 rounded-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,0,0.05)_50%,transparent_75%)] bg-[length:10px_10px]" />
            <div className="flex justify-between items-center px-4 relative z-10">
              <span className="text-yellow-500/70 text-xs font-mono uppercase tracking-widest">Total Credits</span>
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-xl font-mono font-bold text-yellow-400">{totalCoins}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full">
            {onRevive && (
                <Button 
                  onClick={onRevive}
                  disabled={!canRevive}
                  variant="cockpit_action"
                  className={`h-16 w-full group border-2 ${canRevive ? 'from-green-900/80 to-emerald-900/80 border-green-400 hover:from-green-600 hover:to-emerald-600' : 'from-gray-900 to-gray-800 border-gray-700 opacity-50 grayscale'}`}
                >
                  <div className="flex items-center justify-center gap-3 skew-x-[5deg]">
                    <HeartPulse className={`w-6 h-6 ${canRevive ? 'text-green-400 animate-pulse' : 'text-gray-500'}`} />
                    <div className="flex flex-col items-start">
                        <span className={`tracking-widest font-black ${canRevive ? 'text-white' : 'text-gray-400'}`}>REVIVE SYSTEM</span>
                        <span className={`text-xs font-mono ${canRevive ? 'text-green-300' : 'text-gray-500'}`}>{REVIVE_COST.toLocaleString()} CR REQUIRED</span>
                    </div>
                  </div>
                </Button>
            )}

            <Button 
              onClick={onRestart}
              variant="cockpit_action"
              className="h-16 w-full group"
            >
              <div className="flex items-center justify-center gap-3 skew-x-[5deg]">
                <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                <span className="tracking-widest">RE-ENGAGE</span>
              </div>
            </Button>
            
            {isLoggedIn && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={onOpenShop}
                variant="cockpit"
                className="h-12 border-yellow-500/30 text-yellow-400 hover:text-yellow-200"
              >
                <div className="flex items-center gap-2 skew-x-[10deg]">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="text-xs">ARMORY</span>
                </div>
              </Button>
              
              <Button
                onClick={onOpenLeaderboard}
                variant="cockpit"
                className="h-12 border-purple-500/30 text-purple-400 hover:text-purple-200"
              >
                <div className="flex items-center gap-2 skew-x-[10deg]">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs">ELITES</span>
                </div>
              </Button>
            </div>
            )}
            
            <Button 
              onClick={onHome}
              variant="cockpit"
              className="h-12 mt-2 border-gray-600 text-gray-400 hover:text-white"
            >
              <div className="flex items-center gap-2 skew-x-[10deg]">
                <Home className="w-4 h-4" />
                <span className="text-xs">ABORT TO BASE</span>
              </div>
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}