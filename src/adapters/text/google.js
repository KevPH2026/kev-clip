/**
 * Google Gemini Adapter for Text Generation
 * Supports: Gemini Pro, Pro Vision
 */

const axios = require('axios');

class GeminiAdapter {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-pro';
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async generate({ prompt, system = null }) {
    const contents = [];
    
    if (system) {
      contents.push({
        role: 'user',
        parts: [{ text: system }]
      });
    }
    
    contents.push({
      role: 'user',
      parts: [{
        text: `Generate a video script based on this description:\n\n${prompt}\n\nFormat:\n※ Scene - Time\n$ Characters\n【BGM】\n△ Camera shot\nCharacter: Dialogue\n\nGenerate at least 5 shots with detailed descriptions.`
      }]
    });

    try {
      const response = await axios.post(
        `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2000
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        content: response.data.candidates[0].content.parts[0].text,
        usage: response.data.usageMetadata,
        model: this.model
      };
    } catch (error) {
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async generateOutline({ novelContent, episodeCount = 5 }) {
    const contents = [{
      role: 'user',
      parts: [{
        text: `Analyze this novel and create ${episodeCount} episode outlines:\n\n${novelContent.slice(0, 3000)}\n\nReturn JSON format:\n{\n  "episodes": [\n    {\n      "episode": 1,\n      "title": "Episode Title",\n      "conflict": "Core conflict",\n      "scenes": ["Scene 1", "Scene 2"],\n      "characters": ["Character 1", "Character 2"]\n    }\n  ]\n}`
      }]
    }];

    const response = await axios.post(
      `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse outline JSON');
  }
}

module.exports = GeminiAdapter;