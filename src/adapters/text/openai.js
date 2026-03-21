/**
 * OpenAI Adapter for Text Generation
 * Supports: GPT-4, GPT-4o, GPT-4o-mini
 */

const axios = require('axios');

class OpenAIAdapter {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o';
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
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
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: 0.8,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: this.model
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async generateOutline({ novelContent, episodeCount = 5 }) {
    const messages = [{
      role: 'user',
      content: `Analyze this novel and create ${episodeCount} episode outlines:\n\n${novelContent.slice(0, 3000)}\n\nReturn JSON format:\n{\n  "episodes": [\n    {\n      "episode": 1,\n      "title": "Episode Title",\n      "conflict": "Core conflict",\n      "scenes": ["Scene 1", "Scene 2"],\n      "characters": ["Character 1", "Character 2"]\n    }\n  ]\n}`
    }];

    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  }
}

module.exports = OpenAIAdapter;
