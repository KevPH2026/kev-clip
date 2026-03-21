/**
 * DeepSeek Adapter for Text Generation
 * Supports: DeepSeek-V2, V3, R1
 */

const axios = require('axios');

class DeepSeekAdapter {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'deepseek-chat';
    this.baseURL = config.baseURL || 'https://api.deepseek.com/v1';
  }

  async generate({ prompt, system = null }) {
    const messages = [];
    
    if (system) {
      messages.push({ role: 'system', content: system });
    }
    
    messages.push({
      role: 'user',
      content: `根据以下描述生成视频剧本：\n\n${prompt}\n\n格式要求：\n※ 场景 - 时间\n$ 角色\n【BGM】\n△ 镜头描述\n角色名：对白\n\n请生成至少5个分镜，包含详细描述。`
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
      throw new Error(`DeepSeek API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async generateOutline({ novelContent, episodeCount = 5 }) {
    const messages = [{
      role: 'user',
      content: `分析以下小说内容，生成${episodeCount}集短剧大纲：\n\n${novelContent.slice(0, 3000)}\n\n请按JSON格式返回：\n{\n  "episodes": [\n    {\n      "episode": 1,\n      "title": "第一集标题",\n      "conflict": "核心冲突",\n      "scenes": ["场景1", "场景2"],\n      "characters": ["角色1", "角色2"]\n    }\n  ]\n}`
    }];

    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        messages,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Parse JSON from response
    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse outline JSON');
  }
}

module.exports = DeepSeekAdapter;
