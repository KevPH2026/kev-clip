/**
 * Anthropic Claude Adapter for Text Generation
 * Supports: Claude 3 Opus, Sonnet, Haiku
 */

const axios = require('axios');

class ClaudeAdapter {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-3-opus-20240229';
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
  }

  async generate({ prompt, system = null }) {
    const messages = [];
    
    if (system) {
      messages.push({ role: 'system', content: system });
    }
    
    messages.push({
      role: 'user',
      content: `Generate a video script based on this description:\n\n${prompt}\n\nFormat:\n※ Scene - Time\n$ Characters\n【BGM】\n△ Camera shot\nCharacter: Dialogue\n\nGenerate at least 5 shots with detailed descriptions.`
    });

    try {
      const response = await axios.post(
        `${this.baseURL}/messages`,
        {
          model: this.model,
          messages,
          max_tokens: 2000,
          temperature: 0.8
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        }
      );

      return {
        content: response.data.content[0].text,
        usage: response.data.usage,
        model: this.model
      };
    } catch (error) {
      throw new Error(`Claude API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async generateOutline({ novelContent, episodeCount = 5 }) {
    const messages = [{
      role: 'user',
      content: `Analyze this novel and create ${episodeCount} episode outlines:\n\n${novelContent.slice(0, 3000)}\n\nReturn JSON format:\n{\n  "episodes": [\n    {\n      "episode": 1,\n      "title": "Episode Title",\n      "conflict": "Core conflict",\n      "scenes": ["Scene 1", "Scene 2"],\n      "characters": ["Character 1", "Character 2"]\n    }\n  ]\n}`
    }];

    const response = await axios.post(
      `${this.baseURL}/messages`,
      {
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    );

    const content = response.data.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse outline JSON');
  }
}

module.exports = ClaudeAdapter;