import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';



const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 40;

export default function TestFlightCanvas({ customization = { equipped: { models: 'basic', trails: 'none' } }, onClose }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const gameRef = useRef({
    player: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, vx: 0, vy: 0 },
    keys: {},
    stars: [],
    particles: [],
    time: 0
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      gameRef.current.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') e.preventDefault();
    };
    
    const handleKeyUp = (e) => {
      gameRef.current.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Safe Monkey-patch to prevent crashes
    if (!ctx.createRadialGradient.isSafePatched) {
      const original = ctx.createRadialGradient;
      const safeRadialGradient = function(x0, y0, r0, x1, y1, r1) {
        if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(r0) ||
            !Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(r1) || r0 < 0 || r1 < 0) {
          return original.call(this, 0, 0, 0, 0, 0, 1);
        }
        return original.call(this, x0, y0, r0, x1, y1, r1);
      };
      safeRadialGradient.isSafePatched = true;
      ctx.createRadialGradient = safeRadialGradient;
    }

    if (!ctx.createLinearGradient.isSafePatched) {
      const originalLinear = ctx.createLinearGradient;
      const safeLinearGradient = function(x0, y0, x1, y1) {
        if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) {
          return originalLinear.call(this, 0, 0, 0, 1);
        }
        return originalLinear.call(this, x0, y0, x1, y1);
      };
      safeLinearGradient.isSafePatched = true;
      ctx.createLinearGradient = safeLinearGradient;
    }

    const game = gameRef.current;
    
    // Initialize stars
    game.stars = Array.from({ length: 100 }, () => ({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 2 + 0.5
    }));

    const gameLoop = () => {
      game.time += 0.016;
      
      // Clear canvas
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      
      // Draw stars
      game.stars.forEach(star => {
        star.y += star.speed;
        if (star.y > GAME_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * GAME_WIDTH;
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Handle player movement with acceleration
      const accel = 0.5;
      const maxSpeed = 8;
      const friction = 0.92;
      
      if (game.keys['w'] || game.keys['arrowup']) game.player.vy -= accel;
      if (game.keys['s'] || game.keys['arrowdown']) game.player.vy += accel;
      if (game.keys['a'] || game.keys['arrowleft']) game.player.vx -= accel;
      if (game.keys['d'] || game.keys['arrowright']) game.player.vx += accel;
      
      // Clamp velocity
      game.player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, game.player.vx));
      game.player.vy = Math.max(-maxSpeed, Math.min(maxSpeed, game.player.vy));
      
      // Apply friction
      game.player.vx *= friction;
      game.player.vy *= friction;
      
      // Update position
      game.player.x += game.player.vx;
      game.player.y += game.player.vy;
      
      // Boundaries
      game.player.x = Math.max(50, Math.min(GAME_WIDTH - 50, game.player.x));
      game.player.y = Math.max(50, Math.min(GAME_HEIGHT - 50, game.player.y));
      
      // Draw ship trail
      const trailType = customization.equipped?.trails || 'none';
      if (trailType !== 'none' && (Math.abs(game.player.vx) > 1 || Math.abs(game.player.vy) > 1)) {
        const trailLength = 6;
        for (let i = 0; i < trailLength; i++) {
          const alpha = (trailLength - i) / trailLength * 0.4;
          const yOffset = i * 6;

          let trailColor;
          switch(trailType) {
            case 'fire':
              trailColor = i % 2 === 0 ? `rgba(255, 102, 0, ${alpha})` : `rgba(255, 204, 0, ${alpha})`;
              break;
            case 'plasma':
              trailColor = `rgba(0, 255, 255, ${alpha})`;
              break;
            case 'rainbow':
              const hue = (game.time * 100 + i * 30) % 360;
              trailColor = `hsla(${hue}, 100%, 60%, ${alpha})`;
              break;
          }

          ctx.fillStyle = trailColor;
          ctx.beginPath();
          ctx.ellipse(game.player.x, game.player.y + yOffset, 6 - i * 0.5, 12 - i, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Draw player ship
      ctx.save();
      
      // Ship glow
      const auraGradient = ctx.createRadialGradient(
        game.player.x, game.player.y, 0,
        game.player.x, game.player.y, PLAYER_SIZE * 1.5
      );
      auraGradient.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
      auraGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(game.player.x, game.player.y, PLAYER_SIZE * 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      const playerGradient = ctx.createRadialGradient(
        game.player.x, game.player.y, 0,
        game.player.x, game.player.y, PLAYER_SIZE
      );
      playerGradient.addColorStop(0, '#00f0ff');
      playerGradient.addColorStop(0.5, '#0088ff');
      playerGradient.addColorStop(1, '#004488');

      ctx.fillStyle = playerGradient;
      ctx.beginPath();
      
      const shipModel = customization.equipped?.models || 'basic';
      switch(shipModel) {
        case 'delta':
          ctx.moveTo(game.player.x, game.player.y - PLAYER_SIZE);
          ctx.lineTo(game.player.x + PLAYER_SIZE / 2, game.player.y + PLAYER_SIZE / 3);
          ctx.lineTo(game.player.x + PLAYER_SIZE / 3, game.player.y + PLAYER_SIZE / 2);
          ctx.lineTo(game.player.x - PLAYER_SIZE / 3, game.player.y + PLAYER_SIZE / 2);
          ctx.lineTo(game.player.x - PLAYER_SIZE / 2, game.player.y + PLAYER_SIZE / 3);
          break;
        case 'arrow':
          ctx.moveTo(game.player.x, game.player.y - PLAYER_SIZE);
          ctx.lineTo(game.player.x + PLAYER_SIZE / 3, game.player.y - PLAYER_SIZE / 4);
          ctx.lineTo(game.player.x + PLAYER_SIZE / 2, game.player.y + PLAYER_SIZE / 2);
          ctx.lineTo(game.player.x, game.player.y + PLAYER_SIZE / 3);
          ctx.lineTo(game.player.x - PLAYER_SIZE / 2, game.player.y + PLAYER_SIZE / 2);
          ctx.lineTo(game.player.x - PLAYER_SIZE / 3, game.player.y - PLAYER_SIZE / 4);
          break;
        case 'falcon':
          ctx.moveTo(game.player.x, game.player.y - PLAYER_SIZE - 2);
          ctx.lineTo(game.player.x + PLAYER_SIZE / 4, game.player.y - PLAYER_SIZE / 2.5);
          ctx.lineTo(game.player.x + PLAYER_SIZE / 2, game.player.y);
          ctx.lineTo(game.player.x + PLAYER_SIZE / 3, game.player.y + PLAYER_SIZE / 2);
          ctx.lineTo(game.player.x, game.player.y + PLAYER_SIZE / 2.5);
          ctx.lineTo(game.player.x - PLAYER_SIZE / 3, game.player.y + PLAYER_SIZE / 2);
          ctx.lineTo(game.player.x - PLAYER_SIZE / 2, game.player.y);
          ctx.lineTo(game.player.x - PLAYER_SIZE / 4, game.player.y - PLAYER_SIZE / 2.5);
          break;
        case 'stealth':
          ctx.moveTo(game.player.x, game.player.y - PLAYER_SIZE * 0.8);
          ctx.lineTo(game.player.x + PLAYER_SIZE * 0.6, game.player.y);
          ctx.lineTo(game.player.x + PLAYER_SIZE * 0.3, game.player.y + PLAYER_SIZE * 0.5);
          ctx.lineTo(game.player.x, game.player.y + PLAYER_SIZE * 0.3);
          ctx.lineTo(game.player.x - PLAYER_SIZE * 0.3, game.player.y + PLAYER_SIZE * 0.5);
          ctx.lineTo(game.player.x - PLAYER_SIZE * 0.6, game.player.y);
          break;
        case 'viper':
          ctx.moveTo(game.player.x, game.player.y - PLAYER_SIZE);
          ctx.lineTo(game.player.x + PLAYER_SIZE * 0.4, game.player.y - PLAYER_SIZE * 0.3);
          ctx.lineTo(game.player.x + PLAYER_SIZE * 0.5, game.player.y + PLAYER_SIZE * 0.2);
          ctx.lineTo(game.player.x + PLAYER_SIZE * 0.25, game.player.y + PLAYER_SIZE * 0.5);
          ctx.lineTo(game.player.x, game.player.y + PLAYER_SIZE * 0.3);
          ctx.lineTo(game.player.x - PLAYER_SIZE * 0.25, game.player.y + PLAYER_SIZE * 0.5);
          ctx.lineTo(game.player.x - PLAYER_SIZE * 0.5, game.player.y + PLAYER_SIZE * 0.2);
          ctx.lineTo(game.player.x - PLAYER_SIZE * 0.4, game.player.y - PLAYER_SIZE * 0.3);
          break;
        default: // basic
          ctx.moveTo(game.player.x, game.player.y - PLAYER_SIZE);
          ctx.lineTo(game.player.x + PLAYER_SIZE / 2, game.player.y + PLAYER_SIZE / 2);
          ctx.lineTo(game.player.x - PLAYER_SIZE / 2, game.player.y + PLAYER_SIZE / 2);
      }
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
      
      // Instructions
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Use WASD or Arrow Keys to fly around', GAME_WIDTH / 2, 30);
      ctx.fillText('Test your ship\'s appearance and trail effects', GAME_WIDTH / 2, 55);
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [customization]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <div className="relative">
        <Button
          onClick={onClose}
          size="icon"
          className="absolute -top-12 right-0 bg-red-600 hover:bg-red-700"
        >
          <X className="w-5 h-5" />
        </Button>
        
        <div className="bg-gradient-to-b from-gray-900 to-black border border-cyan-500/30 rounded-2xl p-4 shadow-2xl">
          <div className="text-center mb-3">
            <h3 className="text-xl font-black text-white">TEST FLIGHT MODE</h3>
            <p className="text-sm text-gray-400">Non-combat environment - Fly freely!</p>
          </div>
          
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="rounded-xl"
            style={{ imageRendering: 'auto' }}
          />
        </div>
      </div>
    </motion.div>
  );
}