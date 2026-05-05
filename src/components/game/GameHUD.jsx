import React from 'react';
import { Heart, Zap, Coins, Crosshair, ShoppingCart, Activity, Gauge, AlertTriangle, Shield, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';


export default function GameHUD({ 
  distance, 
  coins, 
  health, 
  powerLevel, 
  currentWeapon, 
  weaponLevel, 
  weaponXP, 
  isMutated, 
  activePowerups = [], 
  activeEvent = null,
  autoFire = false, 
  timeRemaining = null,
  // message prop removed in favor of event bus
  maxHealth = 100, 
  maxPower = 100, 
  onOpenStore, 
  upgrades,
  theme = 'cyber',
  level = 1,
  customization
}) {

  const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const powerPercent = Math.max(0, Math.min(100, (powerLevel / maxPower) * 100));
  const hasShield = activePowerups?.some(p => ['shield_overcharge', 'invincibility', 'orbital_guard'].includes(p.type));
  const droneActive = customization?.equipped?.drone && customization?.equipped?.drone !== 'none';
  const hasRapidFire = activePowerups?.some(p => p.type === 'rapidfire');

  // Theme configurations
  const themeStyles = {
    cyber: {
      container: "font-mono",
      panel: "bg-black/70 backdrop-blur-md rounded-xl border border-cyan-500/30",
      textPrimary: "text-cyan-400",
      textSecondary: "text-cyan-200",
      accent: "text-yellow-400",
      barBg: "bg-gray-800",
      healthBar: (pct) => pct > 60 ? 'from-emerald-400 to-green-500' : pct > 30 ? 'from-yellow-400 to-orange-500' : 'from-red-500 to-rose-600',
      powerBar: 'from-cyan-400 to-blue-500'
    },
    retro: {
      container: "font-['Courier_New'] tracking-widest uppercase",
      panel: "bg-green-900/90 rounded-none border-2 border-green-500 shadow-[0_0_10px_rgba(0,255,0,0.3)]",
      textPrimary: "text-green-400",
      textSecondary: "text-green-600",
      accent: "text-green-300",
      barBg: "bg-green-950",
      healthBar: () => 'from-green-500 to-green-400',
      powerBar: 'from-green-400 to-green-300'
    },
    minimal: {
      container: "font-sans",
      panel: "bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20",
      textPrimary: "text-white",
      textSecondary: "text-gray-300",
      accent: "text-white font-bold",
      barBg: "bg-gray-700/50",
      healthBar: (pct) => pct > 60 ? 'from-white to-gray-200' : pct > 30 ? 'from-yellow-200 to-yellow-100' : 'from-red-300 to-red-100',
      powerBar: 'from-blue-200 to-blue-100'
    }
  };
  
  const currentTheme = themeStyles[theme] || themeStyles.cyber;
  
  const getHealthColor = () => {
    if (theme === 'cyber') {
        if (healthPercent > 60) return 'from-emerald-400 to-green-500';
        if (healthPercent > 30) return 'from-yellow-400 to-orange-500';
        return 'from-red-500 to-rose-600';
    }
    return currentTheme.healthBar(healthPercent);
  };

  const getWeaponInfo = () => {
    let baseInfo;
    
    // Mutated variants (rare power-up mutations)
    if (isMutated) {
      switch(currentWeapon) {
        case 'laser': return { name: 'QUAD LASER', color: 'text-cyan-300', icon: '⚡⚡⚡⚡', glow: true };
        case 'plasma': return { name: 'PLASMA BURST', color: 'text-pink-300', icon: '💥🔮', glow: true };
        case 'rocket': return { name: 'HOMING MISSILE', color: 'text-orange-300', icon: '🎯🚀', glow: true };
        case 'pulse': return { name: 'HYPER PULSE', color: 'text-blue-300', icon: '💠💠', glow: true };
        case 'spread': return { name: 'FLAK CANNON', color: 'text-red-300', icon: '🎇', glow: true };
        case 'wave': return { name: 'TSUNAMI BEAM', color: 'text-green-300', icon: '🌊', glow: true };
        case 'railgun': return { name: 'GAUSS RIFLE', color: 'text-white', icon: '⚡⚡', glow: true };
        case 'orb': return { name: 'SINGULARITY', color: 'text-purple-300', icon: '⚫', glow: true };
        case 'seeker': return { name: 'SWARM MISSILES', color: 'text-yellow-300', icon: '🐝', glow: true };
        
        // New Hypermode Weapons
        case 'beam': return { name: 'HYPER BEAM', color: 'text-cyan-200', icon: '⚡⚡', glow: true };
        case 'cannon': return { name: 'OMEGA CANNON', color: 'text-gray-300', icon: '💣💥', glow: true };
        case 'grenade': return { name: 'CLUSTER BOMB', color: 'text-green-300', icon: '🧨✨', glow: true };
        case 'missile': return { name: 'NUKE MISSILE', color: 'text-orange-300', icon: '☢️🚀', glow: true };
        case 'torpedo': return { name: 'VOID TORPEDO', color: 'text-blue-300', icon: '🌌🛥️', glow: true };
        case 'dart': return { name: 'NEEDLE STORM', color: 'text-yellow-200', icon: '📍🌪️', glow: true };
        case 'rail_pulse': return { name: 'HYPER RAIL', color: 'text-cyan-200', icon: '🚄💨', glow: true };
        case 'energy_ball': return { name: 'SUPER NOVA', color: 'text-pink-300', icon: '🌟', glow: true };
        case 'plasma_burst': return { name: 'PLASMA STORM', color: 'text-purple-300', icon: '🎆', glow: true };
        case 'ion_cannon': return { name: 'ION ORBITAL', color: 'text-blue-200', icon: '🛰️', glow: true };
        case 'shockwave': return { name: 'MEGA QUAKE', color: 'text-white', icon: '🌋', glow: true };
        case 'laser_turret': return { name: 'SENTRY GUN', color: 'text-red-300', icon: '🏯', glow: true };
        case 'rail_boomerang': return { name: 'THUNDER RANG', color: 'text-orange-200', icon: '🪃⚡', glow: true };
        case 'sonic_wave': return { name: 'BASS CANNON', color: 'text-green-200', icon: '🔊🎶', glow: true };
        case 'prism_beam': return { name: 'RAINBOW LASER', color: 'text-pink-200', icon: '🌈', glow: true };
        case 'swarm_drone': return { name: 'HIVE MIND', color: 'text-yellow-200', icon: '🐝🧠', glow: true };
        case 'vortex_trap': return { name: 'BLACK HOLE', color: 'text-purple-400', icon: '🕳️', glow: true };
        case 'neutron_pulse': return { name: 'GAMMA BURST', color: 'text-green-300', icon: '☢️🌊', glow: true };
        case 'helix_shot': return { name: 'DNA BREAKER', color: 'text-pink-400', icon: '🧬💔', glow: true };
        case 'starfall_missile': return { name: 'METEOR SHOWER', color: 'text-yellow-100', icon: '☄️', glow: true };
          case 'void': return { name: 'VOID CONSUMER', color: 'text-gray-900', icon: '⚫', glow: true };
          case 'cluster': return { name: 'CLUSTER STORM', color: 'text-red-500', icon: '🧨', glow: true };

          default: return { name: 'MUTATED BLASTER', color: 'text-blue-300', icon: '💠✨', glow: true };
        }
        }

        switch(currentWeapon) {
      case 'laser': baseInfo = { name: 'LASER', color: 'text-cyan-400', icon: '⚡' }; break;
      case 'plasma': baseInfo = { name: 'PLASMA', color: 'text-pink-400', icon: '🔮' }; break;
      case 'rocket': baseInfo = { name: 'ROCKET', color: 'text-orange-400', icon: '🚀' }; break;
      case 'pulse': baseInfo = { name: 'PULSE', color: 'text-blue-400', icon: '💠' }; break;
      case 'spread': baseInfo = { name: 'SPREAD', color: 'text-red-400', icon: '✨' }; break;
      case 'wave': baseInfo = { name: 'WAVE', color: 'text-green-400', icon: '〰️' }; break;
      case 'railgun': baseInfo = { name: 'RAILGUN', color: 'text-white', icon: '⚡' }; break;
      case 'orb': baseInfo = { name: 'ORB', color: 'text-purple-400', icon: '🟣' }; break;
      case 'seeker': baseInfo = { name: 'SEEKER', color: 'text-yellow-400', icon: '🎯' }; break;
      
      // New Weapons
      case 'beam': baseInfo = { name: 'BEAM', color: 'text-cyan-400', icon: '⚡' }; break;
      case 'cannon': baseInfo = { name: 'CANNON', color: 'text-gray-400', icon: '💣' }; break;
      case 'grenade': baseInfo = { name: 'GRENADE', color: 'text-green-400', icon: '🥚' }; break;
      case 'missile': baseInfo = { name: 'MISSILE', color: 'text-orange-400', icon: '🚀' }; break;
      case 'torpedo': baseInfo = { name: 'TORPEDO', color: 'text-blue-600', icon: '🛥️' }; break;
      case 'dart': baseInfo = { name: 'DART', color: 'text-yellow-200', icon: '📌' }; break;
      case 'rail_pulse': baseInfo = { name: 'RAIL PULSE', color: 'text-cyan-300', icon: '🚄' }; break;
      case 'energy_ball': baseInfo = { name: 'ENERGY BALL', color: 'text-pink-400', icon: '🔮' }; break;
      case 'plasma_burst': baseInfo = { name: 'PLASMA BURST', color: 'text-purple-400', icon: '🎆' }; break;
      case 'ion_cannon': baseInfo = { name: 'ION CANNON', color: 'text-blue-400', icon: '💠' }; break;
      case 'shockwave': baseInfo = { name: 'SHOCKWAVE', color: 'text-white', icon: '🌊' }; break;
      case 'laser_turret': baseInfo = { name: 'LASER TURRET', color: 'text-red-400', icon: '🗼' }; break;
      case 'rail_boomerang': baseInfo = { name: 'RAIL RANG', color: 'text-orange-300', icon: '🪃' }; break;
      case 'sonic_wave': baseInfo = { name: 'SONIC', color: 'text-green-300', icon: '🔊' }; break;
      case 'prism_beam': baseInfo = { name: 'PRISM', color: 'text-pink-200', icon: '💎' }; break;
      case 'swarm_drone': baseInfo = { name: 'SWARM', color: 'text-yellow-300', icon: '🐝' }; break;
      case 'vortex_trap': baseInfo = { name: 'VORTEX', color: 'text-purple-600', icon: '🌀' }; break;
      case 'neutron_pulse': baseInfo = { name: 'NEUTRON', color: 'text-green-400', icon: '☢️' }; break;
      case 'helix_shot': baseInfo = { name: 'HELIX', color: 'text-pink-500', icon: '🧬' }; break;
      case 'starfall_missile': baseInfo = { name: 'STARFALL', color: 'text-yellow-100', icon: '🌠' }; break;

      case 'void': baseInfo = { name: 'VOID', color: 'text-gray-400', icon: '⚫' }; break;
      case 'cluster': baseInfo = { name: 'CLUSTER', color: 'text-red-400', icon: '🧨' }; break;

      case 'hybrid': baseInfo = { name: 'HYBRID', color: 'text-indigo-400', icon: '🧬' }; break;

      default: baseInfo = { name: 'BLASTER', color: 'text-blue-400', icon: '💠' };
    }
    
    // Weapon mutations at higher levels
    if (weaponLevel >= 10) {
      return { ...baseInfo, name: `ULTRA ${baseInfo.name}`, icon: '⭐' + baseInfo.icon };
    } else if (weaponLevel >= 7) {
      return { ...baseInfo, name: `MEGA ${baseInfo.name}`, icon: '✨' + baseInfo.icon };
    } else if (weaponLevel >= 4) {
      return { ...baseInfo, name: `SUPER ${baseInfo.name}`, icon: '🔥' + baseInfo.icon };
    }
    
    return baseInfo;
  };

  const weaponInfo = getWeaponInfo();

  const getPowerupInfo = (type) => {
    switch(type) {
      case 'multiplier':
        return { name: '2X COINS', icon: '💰', color: 'from-yellow-400 to-amber-500', border: 'border-yellow-500' };
      case 'invincibility':
        return { name: 'SHIELD', icon: '🛡️', color: 'from-cyan-400 to-blue-500', border: 'border-cyan-500' };
      case 'rapidfire':
        return { name: 'RAPID FIRE', icon: '⚡', color: 'from-pink-400 to-purple-500', border: 'border-pink-500' };
      case 'shield_overcharge':
        return { name: 'SHIELD OVERCHARGE', icon: '🔰', color: 'from-cyan-300 to-cyan-600', border: 'border-cyan-400' };
      case 'weapon_overdrive':
        return { name: 'WEAPON OVERDRIVE', icon: '💥', color: 'from-pink-500 to-purple-600', border: 'border-pink-600' };
      case 'coin_magnet':
        return { name: 'COIN MAGNET', icon: '🧲', color: 'from-yellow-500 to-orange-500', border: 'border-yellow-600' };
      case 'ghost_mode':
        return { name: 'GHOST MODE', icon: '👻', color: 'from-purple-400 to-indigo-500', border: 'border-purple-500' };
      case 'time_slow':
        return { name: 'TIME SLOW', icon: '⏱️', color: 'from-green-400 to-emerald-500', border: 'border-green-500' };
      default:
        return { name: 'POWER', icon: '✨', color: 'from-gray-400 to-gray-500', border: 'border-gray-500' };
    }
  };

  return (
    <>
    <div className={`absolute inset-x-0 top-0 p-2 z-20 pointer-events-none flex flex-col gap-2 ${currentTheme.container}`}>
      {/* Main Single Row HUD */}
      <div className="flex flex-wrap items-start justify-between gap-2 w-full px-2">
        
        {/* Left Side: Distance & Coins */}
        <div className="flex items-center gap-2">
          {/* Level Indicator */}
          <div className={`${currentTheme.panel} p-1.5 px-2 ${theme === 'minimal' ? 'w-auto justify-center' : 'w-[85px] justify-between'} h-[38px] flex flex-col border-l-4 border-l-cyan-500`}>
            {theme !== 'minimal' && <div className={`${currentTheme.textSecondary} text-[9px] font-medium tracking-wider leading-none`}>LEVEL</div>}
            <div className={`text-sm font-black ${currentTheme.textPrimary} tracking-tight leading-none tabular-nums ${theme === 'minimal' ? 'text-center' : ''}`}>
              {theme === 'minimal' ? `L${level}` : level}
            </div>
          </div>

          {timeRemaining !== null && (
            <div className={`${currentTheme.panel} p-1.5 px-2 ${theme === 'minimal' ? 'w-auto justify-center' : 'w-[85px] justify-between'} h-[38px] flex flex-col border-red-500/50`}>
              {theme !== 'minimal' && <div className={`${currentTheme.textSecondary} text-[9px] font-medium tracking-wider leading-none text-red-400`}>TIME</div>}
              <div className={`text-sm font-black ${currentTheme.textPrimary} tracking-tight leading-none tabular-nums text-red-100 ${theme === 'minimal' ? 'text-center' : ''}`}>
                {Math.floor(timeRemaining)}s
              </div>
            </div>
          )}
          
          {/* Compact Distance */}
          <div className={`${currentTheme.panel} p-1.5 px-2 ${theme === 'minimal' ? 'w-auto justify-center' : 'w-[85px] justify-between'} h-[38px] flex flex-col`}>
            {theme !== 'minimal' && <div className={`${currentTheme.textSecondary} text-[9px] font-medium tracking-wider leading-none`}>DIST</div>}
            <div className={`text-sm font-black ${currentTheme.textPrimary} tracking-tight leading-none tabular-nums ${theme === 'minimal' ? 'text-center' : ''}`}>
              {Math.floor(distance).toLocaleString()}m
            </div>
          </div>

          {/* Compact Coins */}
          <div className={`${currentTheme.panel} p-1.5 px-2 ${theme === 'minimal' ? 'w-auto justify-center' : 'w-[85px] justify-between'} h-[38px] flex flex-col`}>
            <div className={`flex items-center gap-1 ${theme === 'minimal' ? 'justify-center' : ''}`}>
              <Coins className="w-2.5 h-2.5 text-yellow-400" />
              {theme !== 'minimal' && <span className={`${theme === 'retro' ? 'text-yellow-400/70' : currentTheme.textSecondary} text-[9px] font-medium tracking-wider leading-none`}>COINS</span>}
            </div>
            <div className={`text-sm font-black ${currentTheme.textPrimary} tracking-tight leading-none tabular-nums ${theme === 'minimal' ? 'text-center' : ''}`}>
              {coins}
            </div>
          </div>

          {/* Power (Overdrive) */}
          <div className={`${currentTheme.panel} p-1.5 px-2 ${theme === 'minimal' ? 'w-[50px] justify-center' : 'w-[85px] justify-between'} h-[38px] flex flex-col`}>
            <div className="flex items-center gap-1">
              <Zap className={`w-3 h-3 ${powerPercent < 20 ? 'text-gray-500' : currentTheme.textPrimary}`} />
              {theme !== 'minimal' && <span className={`${currentTheme.textSecondary} text-[9px] font-medium tracking-wider leading-none`}>OVD</span>}
              {theme !== 'minimal' && <span className={`ml-auto ${currentTheme.textPrimary} font-bold text-[10px] leading-none`}>{Math.floor(powerPercent)}%</span>}
            </div>
            <div className={`h-1.5 ${currentTheme.barBg} rounded-full overflow-hidden ${theme === 'minimal' ? 'mt-1' : ''}`}>
              <div 
                className={`h-full bg-gradient-to-r ${currentTheme.powerBar} transition-all duration-300 rounded-full relative`}
                style={{ width: `${powerPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/30" 
                  style={{ 
                    background: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 8px)' 
                  }} 
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Stats & Store */}
        <div className="flex items-center gap-2">
          {/* Shield Status */}
          {hasShield && (
          <div className={`${currentTheme.panel} p-1.5 px-2 ${theme === 'minimal' ? 'w-[50px] justify-center' : 'w-[85px] justify-between'} h-[38px] flex flex-col`}>
            <div className="flex items-center gap-1">
              <Shield className={`w-3 h-3 text-cyan-400`} />
              {theme !== 'minimal' && <span className={`${currentTheme.textSecondary} text-[9px] font-medium tracking-wider leading-none`}>SHIELD</span>}
              {theme !== 'minimal' && <span className={`ml-auto ${currentTheme.textPrimary} font-bold text-[10px] leading-none`}>ON</span>}
            </div>
            <div className={`h-1.5 ${currentTheme.barBg} rounded-full overflow-hidden ${theme === 'minimal' ? 'mt-1' : ''}`}>
              <div 
                className={`h-full bg-cyan-400 animate-pulse transition-all duration-300 rounded-full`}
                style={{ width: `100%` }}
              />
            </div>
          </div>
          )}

          {/* Drone Status */}
          {droneActive && (
          <div className={`${currentTheme.panel} p-1.5 px-2 ${theme === 'minimal' ? 'w-[50px] justify-center' : 'w-[85px] justify-between'} h-[38px] flex flex-col`}>
            <div className="flex items-center gap-1">
              <Bot className={`w-3 h-3 text-purple-400`} />
              {theme !== 'minimal' && <span className={`${currentTheme.textSecondary} text-[9px] font-medium tracking-wider leading-none`}>DRONE</span>}
              {theme !== 'minimal' && <span className={`ml-auto text-purple-400 font-bold text-[10px] leading-none`}>ON</span>}
            </div>
            <div className={`h-1.5 ${currentTheme.barBg} rounded-full overflow-hidden ${theme === 'minimal' ? 'mt-1' : ''}`}>
              <div 
                className={`h-full bg-purple-400 transition-all duration-300 rounded-full`}
                style={{ width: `100%` }}
              />
            </div>
          </div>
          )}

          {/* Rapid Fire Status */}
          {hasRapidFire && (
          <div className={`${currentTheme.panel} p-1.5 px-2 ${theme === 'minimal' ? 'w-[50px] justify-center' : 'w-[85px] justify-between'} h-[38px] flex flex-col`}>
            <div className="flex items-center gap-1">
              <Crosshair className={`w-3 h-3 text-pink-400`} />
              {theme !== 'minimal' && <span className={`${currentTheme.textSecondary} text-[9px] font-medium tracking-wider leading-none`}>RAPID</span>}
              {theme !== 'minimal' && <span className={`ml-auto text-pink-400 font-bold text-[10px] leading-none`}>ON</span>}
            </div>
            <div className={`h-1.5 ${currentTheme.barBg} rounded-full overflow-hidden ${theme === 'minimal' ? 'mt-1' : ''}`}>
              <div 
                className={`h-full bg-pink-400 animate-pulse transition-all duration-300 rounded-full`}
                style={{ width: `100%` }}
              />
            </div>
          </div>
          )}
          {/* Health */}
          <div className={`${currentTheme.panel} p-1.5 px-2 ${theme === 'minimal' ? 'w-[50px] justify-center' : 'w-[85px] justify-between'} h-[38px] flex flex-col`}>
            <div className="flex items-center gap-1">
              <Heart className={`w-3 h-3 ${healthPercent < 30 ? 'text-red-500 animate-pulse' : currentTheme.textPrimary}`} />
              {theme !== 'minimal' && <span className={`${currentTheme.textSecondary} text-[9px] font-medium tracking-wider leading-none`}>HP</span>}
              {theme !== 'minimal' && <span className={`ml-auto ${currentTheme.textPrimary} font-bold text-[10px] leading-none`}>{Math.floor(healthPercent)}%</span>}
            </div>
            <div className={`h-1.5 ${currentTheme.barBg} rounded-full overflow-hidden ${theme === 'minimal' ? 'mt-1' : ''}`}>
              <div 
                className={`h-full bg-gradient-to-r ${getHealthColor()} transition-all duration-300 rounded-full relative`}
                style={{ width: `${healthPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Weapon */}
          <div className={`bg-black/70 backdrop-blur-md rounded-xl p-1.5 px-3 border ${theme === 'minimal' ? 'min-w-[40px]' : 'min-w-[100px]'} text-center transition-all relative ${
            weaponInfo.glow 
              ? 'border-yellow-400/60 shadow-lg shadow-yellow-400/40 animate-pulse' 
              : 'border-purple-500/30'
          }`}>
            {autoFire && (
              <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                AUTO
              </div>
            )}
            <div className="flex items-center justify-center gap-1.5 w-full">
              <span className={`text-base shrink-0 ${weaponInfo.glow ? 'animate-pulse' : ''}`}>{weaponInfo.icon}</span>
              {theme !== 'minimal' && (
                <div className="flex flex-col items-start min-w-[60px] flex-1 overflow-hidden">
                  <div className={`text-[10px] font-black ${weaponInfo.color} leading-none truncate w-full`} title={weaponInfo.name}>{weaponInfo.name}</div>
                  {!weaponInfo.glow && (
                    <div className="flex items-center gap-1 w-full mt-0.5">
                      <span className="text-[8px] text-gray-400 shrink-0">LV.{weaponLevel}</span>
                      <div className="flex-1 h-0.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${weaponInfo.color.replace('text-', 'bg-')} transition-all`}
                          style={{ width: `${(weaponXP % 10) * 10}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>



      {/* Active Powerups removed from center display to prevent clutter */}
    </div>

    {/* Key Explanations for New Gamers */}
    {theme !== 'minimal' && (
      <div className={`absolute bottom-4 left-4 z-20 pointer-events-none flex flex-wrap items-center gap-3 ${currentTheme.container}`}>
        <div className={`${currentTheme.panel} px-3 py-1.5 flex items-center gap-2`}>
          <div className="flex gap-1 items-center">
            <span className={`${currentTheme.textPrimary} font-bold text-xs bg-black/50 px-1.5 rounded border border-white/10`}>A</span>
            <span className={`${currentTheme.textSecondary} text-[10px] mx-0.5`}>/</span>
            <span className={`${currentTheme.textPrimary} font-bold text-xs bg-black/50 px-1.5 rounded border border-white/10`}>D</span>
            <span className={`${currentTheme.textSecondary} text-[10px] mx-0.5`}>or</span>
            <span className={`${currentTheme.textPrimary} font-bold text-xs bg-black/50 px-1.5 rounded border border-white/10`}>ARROWS</span>
          </div>
          <span className={`${currentTheme.textSecondary} text-[10px] tracking-wider uppercase`}>Move</span>
        </div>
        <div className={`${currentTheme.panel} px-3 py-1.5 flex items-center gap-2`}>
          <span className={`${currentTheme.textPrimary} font-bold text-xs bg-black/50 px-1.5 rounded border border-white/10`}>W</span>
          <span className={`${currentTheme.textSecondary} text-[10px] tracking-wider uppercase`}>Weapon Cycle</span>
        </div>
        <div className={`${currentTheme.panel} px-3 py-1.5 flex items-center gap-2`}>
          <span className={`${currentTheme.textPrimary} font-bold text-xs bg-black/50 px-1.5 rounded border border-white/10`}>E</span>
          <span className={`${currentTheme.textSecondary} text-[10px] tracking-wider uppercase`}>Theme Cycle</span>
        </div>
        <div className={`${currentTheme.panel} px-3 py-1.5 flex items-center gap-2`}>
          <span className={`${currentTheme.textPrimary} font-bold text-xs bg-black/50 px-1.5 rounded border border-white/10`}>P</span>
          <span className={`${currentTheme.textSecondary} text-[10px] tracking-wider uppercase`}>Pause</span>
        </div>
      </div>
    )}
    </>
  );
}