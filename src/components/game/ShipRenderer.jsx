export const drawShip = (ctx, model, size, colors, decals = []) => {
  ctx.save();
  
  const safeColors = {
    primary: colors?.primary || '#00f0ff',
    secondary: colors?.secondary || '#0088ff',
    accent: colors?.accent || '#004488'
  };
  
  // Ship Body Gradient
  const gradient = ctx.createLinearGradient(0, -size, 0, size);
  gradient.addColorStop(0, safeColors.primary);
  gradient.addColorStop(0.5, safeColors.secondary);
  gradient.addColorStop(1, safeColors.accent);
  ctx.fillStyle = gradient;

  ctx.beginPath();
  switch(model) {
    case 'black_triangle':
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.9, size * 0.8);
      ctx.lineTo(-size * 0.9, size * 0.8);
      break;
    case 'delta':
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.8, size * 0.8);
      ctx.lineTo(0, size * 0.5);
      ctx.lineTo(-size * 0.8, size * 0.8);
      break;
    case 'arrow':
      ctx.moveTo(0, -size * 1.2);
      ctx.lineTo(size * 0.6, size);
      ctx.lineTo(0, size * 0.7);
      ctx.lineTo(-size * 0.6, size);
      break;
    case 'falcon':
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.4, -size * 0.2);
      ctx.lineTo(size, size * 0.5);
      ctx.lineTo(0, size * 0.8);
      ctx.lineTo(-size, size * 0.5);
      ctx.lineTo(-size * 0.4, -size * 0.2);
      break;
    case 'viper':
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.3, -size * 0.4);
      ctx.lineTo(size * 0.7, size * 0.8);
      ctx.lineTo(0, size * 0.4);
      ctx.lineTo(-size * 0.7, size * 0.8);
      ctx.lineTo(-size * 0.3, -size * 0.4);
      break;
    case 'guardian':
      ctx.moveTo(-size * 0.5, -size * 0.8);
      ctx.lineTo(size * 0.5, -size * 0.8);
      ctx.lineTo(size * 0.8, size * 0.5);
      ctx.lineTo(0, size * 0.8);
      ctx.lineTo(-size * 0.8, size * 0.5);
      break;
    case 'stealth':
      ctx.moveTo(0, -size * 1.1);
      ctx.lineTo(size * 0.5, size * 0.9);
      ctx.lineTo(0, size * 0.6);
      ctx.lineTo(-size * 0.5, size * 0.9);
      break;
    default: // basic (Phoenix)
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.8, size);
      ctx.lineTo(0, size * 0.6);
      ctx.lineTo(-size * 0.8, size);
  }
  ctx.closePath();
  ctx.fill();

  // Draw Decals
  if (decals && decals.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    decals.forEach(decal => {
       const scale = size / 100 * 2.0; 
       // VinylEditor canvas is 400x200. Ship is centered at 200, 100 approx.
       // Ship size in VinylEditor is roughly 100px height.
       // Current size param is ~40px.
       const dx = (decal.x - 200) * scale;
       const dy = (decal.y - 100) * scale;
       const dSize = decal.size * scale;
       
       ctx.fillStyle = decal.color;
       ctx.beginPath();
       if (decal.type === 'circle') ctx.arc(dx, dy, dSize, 0, Math.PI*2);
       else if (decal.type === 'square') ctx.rect(dx - dSize, dy - dSize, dSize*2, dSize*2);
       else if (decal.type === 'triangle') {
          ctx.moveTo(dx, dy - dSize);
          ctx.lineTo(dx + dSize, dy + dSize);
          ctx.lineTo(dx - dSize, dy + dSize);
       }
       ctx.closePath();
       ctx.fill();
    });
    ctx.restore();
  }

  // Mechanical Details / Highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = Math.max(1, size * 0.05);
  
  // Internal detail lines
  ctx.beginPath();
  switch(model) {
    case 'black_triangle':
      ctx.moveTo(0, -size * 0.6);
      ctx.lineTo(0, size * 0.4);
      ctx.moveTo(-size * 0.3, size * 0.4);
      ctx.lineTo(size * 0.3, size * 0.4);
      break;
    case 'delta':
      ctx.moveTo(0, -size * 0.5);
      ctx.lineTo(0, size * 0.5);
      ctx.moveTo(-size * 0.4, size * 0.2);
      ctx.lineTo(size * 0.4, size * 0.2);
      break;
    case 'arrow':
      ctx.moveTo(0, -size * 0.8);
      ctx.lineTo(0, size * 0.7);
      break;
    case 'falcon':
      ctx.moveTo(-size * 0.4, -size * 0.2);
      ctx.lineTo(size * 0.4, -size * 0.2);
      ctx.moveTo(0, -size);
      ctx.lineTo(0, size * 0.8);
      break;
    case 'viper':
      ctx.moveTo(-size * 0.3, -size * 0.4);
      ctx.lineTo(0, 0);
      ctx.lineTo(size * 0.3, -size * 0.4);
      break;
    case 'guardian':
      ctx.rect(-size * 0.3, -size * 0.5, size * 0.6, size * 0.8);
      break;
    case 'stealth':
      ctx.moveTo(0, -size * 1.1);
      ctx.lineTo(0, size * 0.6);
      ctx.moveTo(-size * 0.2, 0);
      ctx.lineTo(size * 0.2, 0);
      break;
    default:
      ctx.moveTo(0, -size * 0.5);
      ctx.lineTo(0, size * 0.6);
  }
  ctx.stroke();

  // Cockpit
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.2, size * 0.15, size * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Cockpit Glint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.ellipse(size * 0.05, -size * 0.25, size * 0.05, size * 0.08, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

export const drawEngineGlow = (ctx, x, y, size, color = 'rgba(255, 150, 0, 0.8)') => {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size) || size <= 0) return;
  ctx.save();
  try {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size);
    glow.addColorStop(0, color);
    glow.addColorStop(0.5, color.replace('0.8', '0.4'));
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  } catch (e) {
    // Ignore gradient errors
  }
  ctx.restore();
};