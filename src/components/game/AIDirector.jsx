import { apiClient } from '../../apis/client';

export const AIDirector = {
  // Generate a complete sector/level plan based on player stats
  generateSectorPlan: async (playerStats, difficultyMultiplier) => {
    try {
      const prompt = `
        You are an AI Game Director for a vertical scrolling space shooter.
        Generate a JSON object for a game level (Sector) based on the following player stats:
        - Weapon Level: ${playerStats.weaponLevel}
        - Health: ${playerStats.health}
        - Play Style: Aggressive (High Kills)
        - Difficulty Multiplier: ${difficultyMultiplier}

        The JSON must adhere to this schema:
        {
          "theme": { "name": "String", "bg": "HexColor", "nebula": "Hue(0-360)" },
          "narrative_intro": "Short text intro",
          "waves": [
            {
              "time": 0, // spawn time in seconds from start
              "enemies": [
                { "type": "basic|fast|tank|elite_basic", "count": 1-5, "pattern": "formation_v|random|line" }
              ]
            }
          ],
          "boss": {
            "name": "Boss Name",
            "visual_style": "description",
            "mechanics": ["phase1_desc", "phase2_desc"],
            "stat_modifiers": { "health": 1.0, "speed": 1.0 }
          }
        }
        
        Make it challenging but fair. 
        Create 5 distinct waves leading to a boss.
        Output ONLY valid JSON.
      `;

      const response = await apiClient.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            theme: { type: "object", properties: { name: {type: "string"}, bg: {type: "string"}, nebula: {type: "number"} } },
            narrative_intro: { type: "string" },
            waves: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  time: { type: "number" },
                  enemies: { type: "array", items: { type: "object", properties: { type: {type: "string"}, count: {type: "number"}, pattern: {type: "string"} } } }
                }
              }
            },
            boss: {
              type: "object",
              properties: {
                name: { type: "string" },
                visual_style: { type: "string" },
                mechanics: { type: "array", items: { type: "string" } },
                stat_modifiers: { type: "object", properties: { health: {type: "number"}, speed: {type: "number"} } }
              }
            }
          }
        }
      });

      return response;
    } catch (error) {
      console.error("AI Director Error:", error);
      // Fallback plan
      return {
        theme: { name: "Default Sector", bg: "#000000", nebula: 180 },
        narrative_intro: "Communication link established. AI Director offline. Engaging manual overrides.",
        waves: [],
        boss: null
      };
    }
  }
};
