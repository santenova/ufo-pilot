import React, { useRef, useEffect } from 'react';
import { drawShip, drawEngineGlow } from './ShipRenderer';



export default function ShipPreviewCanvas({ 
  model = 'basic', 
  colors = { primary: '#00f0ff', secondary: '#0088ff', accent: '#004488' }, 
  trail = 'none', 
  effect = 'standard',
  accessory = 'none',
  customShipImage = null,
  svgPath = null,
  size = 200,
  animated = true
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const loadedImageRef = useRef(null);

  // Handle image loading if string is passed
  useEffect(() => {
    if (typeof customShipImage === 'string') {
      const img = new Image();
      img.src = customShipImage;
      img.crossOrigin = "anonymous";
      img.onload = () => {
        loadedImageRef.current = img;
      };
      // Reset if URL changes
      if (loadedImageRef.current?.src !== customShipImage) {
        loadedImageRef.current = null;
      }
    } else if (customShipImage instanceof HTMLImageElement) {
      loadedImageRef.current = customShipImage;
    } else {
      loadedImageRef.current = null;
    }
  }, [customShipImage]);

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

    let time = 0;

    const draw = () => {
      if (!canvas) return;
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const shipSize = width * 0.2; // 20% of canvas width

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Animation state
      const hoverOffset = animated ? Math.sin(time * 0.05) * 5 : 0;
      const scale = animated ? 1 + Math.sin(time * 0.03) * 0.02 : 1;
      
      ctx.save();
      ctx.translate(centerX, centerY + hoverOffset);
      ctx.scale(scale, scale);

      // Draw Aura
      const auraRadius = Number.isFinite(shipSize) && shipSize > 0 ? shipSize * 1.5 : 1;
      const auraGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, auraRadius);
      
      // Handle aura color (hex or rgba)
      const primaryColor = colors?.primary || '#00f0ff';
      let auraColor = colors?.aura || primaryColor;
      
      if (auraColor && auraColor.startsWith('#') && auraColor.length === 7) {
        // Add opacity if hex
        auraColor += '40';
      } else if (!colors?.aura) {
        // Default based on primary
        auraColor = primaryColor + '40';
      }
      
      // Fallback if still invalid
      if (!auraColor) auraColor = 'rgba(0, 240, 255, 0.3)';
      
      auraGradient.addColorStop(0, auraColor);
      auraGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(0, 0, shipSize * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw Trail (if any)
      if (trail !== 'none' && animated) {
        for (let i = 0; i < 5; i++) {
          const trailY = shipSize * 0.8 + i * 5;
          const alpha = (5 - i) / 5 * 0.5;
          
          let trailColor;
          switch(trail) {
            case 'fire': trailColor = `rgba(255, 100, 0, ${alpha})`; break;
            case 'plasma': trailColor = `rgba(0, 255, 255, ${alpha})`; break;
            case 'rainbow': trailColor = `hsla(${(time * 5 + i * 30) % 360}, 100%, 60%, ${alpha})`; break;
            case 'cosmic': trailColor = `rgba(150, 0, 255, ${alpha})`; break;
            case 'lightning': trailColor = `rgba(200, 200, 255, ${alpha})`; break;
            default: trailColor = `rgba(255, 255, 255, ${alpha})`;
          }

          ctx.fillStyle = trailColor;
          ctx.beginPath();
          ctx.ellipse(0, trailY, shipSize * 0.15 * (1 - i*0.1), shipSize * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Engine Glow
      drawEngineGlow(ctx, 0, shipSize * 0.8, shipSize * 0.5);

      // Draw Ship
      if (loadedImageRef.current) {
        // Draw Custom Ship Image
        const imgSize = shipSize * 2.5;
        
        // Backing glow for semi-transparent custom/admin ships
        ctx.save();
        const backingGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shipSize * 1.0);
        const bColor = colors?.primary || '#ffffff';
        backingGrad.addColorStop(0, bColor);
        backingGrad.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = backingGrad;
        ctx.beginPath();
        ctx.arc(0, 0, shipSize * 1.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        try {
          ctx.drawImage(loadedImageRef.current, -imgSize/2, -imgSize/2, imgSize, imgSize);
        } catch (e) {
          // Fallback if image fails
          drawShip(ctx, model, shipSize, colors);
        }
      } else if (customShipImage && typeof customShipImage !== 'string') {
         // Fallback for object passed directly that might not be caught by effect yet or if pure render
         try {
          const imgSize = shipSize * 2.5;
          ctx.drawImage(customShipImage, -imgSize/2, -imgSize/2, imgSize, imgSize);
         } catch(e) { drawShip(ctx, model, shipSize, colors); }
      } else if (svgPath) {
        // Draw Custom SVG Path
        try {
          const path = new Path2D(svgPath);
          
          // Draw Body
          const safeColors = {
             primary: colors?.primary || '#00f0ff',
             secondary: colors?.secondary || '#0088ff',
             accent: colors?.accent || '#004488'
          };
          const grad = ctx.createLinearGradient(0, -shipSize, 0, shipSize);
          grad.addColorStop(0, safeColors.secondary);
          grad.addColorStop(0.5, safeColors.primary);
          grad.addColorStop(1, safeColors.secondary);
          ctx.fillStyle = grad;
          ctx.fill(path);
          
          // Draw Border
          ctx.strokeStyle = safeColors.accent;
          ctx.lineWidth = 2;
          ctx.stroke(path);
          
          // Cockpit (simulated)
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, -shipSize * 0.2, shipSize * 0.15, 0, Math.PI * 2);
          ctx.fill();
        } catch (e) {
          // Fallback for invalid path
          drawShip(ctx, model, shipSize, colors);
        }
      } else {
        drawShip(ctx, model, shipSize, colors);
      }

      // Draw Accessory
      if (accessory !== 'none') {
        drawAccessory(ctx, accessory, shipSize, colors, time);
      }

      // Draw Effect (Weapon/Aura effect preview)
      if (effect !== 'standard' && animated) {
        drawEffect(ctx, effect, shipSize, colors, time);
      }

      ctx.restore();

      if (animated) {
        time++;
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    // Imported from ShipRenderer
    const drawShipVector = (ctx, model, size, colors) => {
       // Using the imported function but wrapper for local use if needed, 
       // but actually we can just use the import directly in the main draw function.
       // However, to keep this file clean, let's just use the imported function in the useEffect.
    };

    const drawAccessory = (ctx, type, size, colors, time) => {
      const safeColors = {
         primary: colors?.primary || '#00f0ff',
         secondary: colors?.secondary || '#0088ff',
         accent: colors?.accent || '#004488'
      };
      ctx.strokeStyle = safeColors.accent;
      ctx.lineWidth = 2;
      
      switch(type) {
        case 'drones':
          const orbitSpeed = time * 0.05;
          for(let i=0; i<2; i++) {
            const angle = orbitSpeed + i * Math.PI;
            const dx = Math.cos(angle) * size * 1.2;
            const dy = Math.sin(angle) * size * 1.2;
            ctx.fillStyle = safeColors.primary;
            ctx.beginPath();
            ctx.arc(dx, dy, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case 'shield':
          ctx.strokeStyle = safeColors.primary;
          ctx.globalAlpha = 0.3 + Math.sin(time * 0.1) * 0.2;
          ctx.beginPath();
          ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        case 'wings':
          ctx.strokeStyle = safeColors.primary;
          ctx.beginPath();
          ctx.moveTo(-size * 1.2, 0);
          ctx.lineTo(-size * 0.5, 0);
          ctx.moveTo(size * 1.2, 0);
          ctx.lineTo(size * 0.5, 0);
          ctx.stroke();
          break;
      }
    };

    const drawEffect = (ctx, type, size, colors, time) => {
      switch(type) {
        case 'spark':
          if (Math.random() > 0.8) {
             ctx.strokeStyle = '#fff';
             ctx.beginPath();
             const angle = Math.random() * Math.PI * 2;
             const r = size * (0.8 + Math.random() * 0.5);
             ctx.moveTo(Math.cos(angle) * size, Math.sin(angle) * size);
             ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
             ctx.stroke();
          }
          break;
        case 'glow':
          const glowSize = size * (1.2 + Math.sin(time * 0.1) * 0.1);
          if (!Number.isFinite(glowSize) || glowSize <= 0) return;
          const grad = ctx.createRadialGradient(0, 0, size, 0, 0, glowSize);
          const prim = colors?.primary || '#00f0ff';
          grad.addColorStop(0, prim + '00');
          grad.addColorStop(1, prim + '66');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [model, colors, trail, effect, accessory, customShipImage, svgPath, size, animated]);

  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size} 
      className="block"
    />
  );
}