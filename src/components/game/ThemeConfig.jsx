export function getTheme(level, debugEffectIndex, boss) {
    if (debugEffectIndex === 2) { // Retro Grid Override
        return {
            bg: '#050011',
            road: '#0a0022',
            accent: '#ff00ff',
            grid: '#ff00ff',
            nebula: 280,
            horizon: '#ff00ff'
        };
    }

    const themeIndex = ((level - 1) % 5);
    const themes = [
        { // Level 1 (Cyber Cyan)
            bg: '#0a0a1a', road: '#1a1a2e', accent: '#00ffff', grid: 'rgba(0, 255, 255, 0.3)', nebula: 200, horizon: '#00ffff'
        },
        { // Level 2 (Neon Pink)
            bg: '#1a0a1a', road: '#2e1a2e', accent: '#ff00ff', grid: 'rgba(255, 0, 255, 0.3)', nebula: 280, horizon: '#ff00ff'
        },
        { // Level 3 (Solar Gold)
            bg: '#1a1a0a', road: '#2e2e1a', accent: '#ffff00', grid: 'rgba(255, 255, 0, 0.3)', nebula: 60, horizon: '#ffff00'
        },
        { // Level 4 (Crimson Red)
            bg: '#1a0a0a', road: '#2e1a1a', accent: '#ff0000', grid: 'rgba(255, 0, 0, 0.3)', nebula: 0, horizon: '#ff0000'
        },
        { // Level 5 (Void Purple)
            bg: '#050010', road: '#100020', accent: '#aa00ff', grid: 'rgba(170, 0, 255, 0.3)', nebula: 260, horizon: '#aa00ff'
        }
    ];

    let theme = themes[themeIndex] || themes[0];

    // Boss Arena & Phase Background Changes
    if (boss) {
        const bAccent = boss.data?.accent || '#ffffff';
        if (boss.phase >= 2) {
            // Darken and tint background for boss presence
            theme = {
                ...theme,
                bg: boss.phase === 3 ? '#1a0000' : '#0a050a',
                road: '#111111',
                grid: bAccent,
                accent: bAccent,
                horizon: bAccent
            };
        }
    }

    return theme;
}