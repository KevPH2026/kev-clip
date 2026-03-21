/**
 * Kling AI Adapter for Video Generation
 * Supports: Kling 1.0, 1.5
 */

const axios = require('axios');

class KlingAdapter {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'kling-v1';
    this.baseURL = config.baseURL || 'https://api.klingai.com/v1';
  }

  async generate({ prompt, model = null, duration = 10 }) {
    try {
      // Create generation task
      const createResponse = await axios.post(
        `${this.baseURL}/videos/text2video`,
        {
          prompt: prompt,
          model: model || this.model,
          duration: duration
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const taskId = createResponse.data.data.task_id;
      
      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await axios.get(
          `${this.baseURL}/videos/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );
        
        const task = statusResponse.data.data;
        
        if (task.status === 'succeed') {
          return task.video_url;
        } else if (task.status === 'failed') {
          throw new Error(`Kling generation failed: ${task.error_message}`);
        }
        
        attempts++;
      }
      
      throw new Error('Kling generation timeout');
      
    } catch (error) {
      throw new Error(`Kling API error: ${error.message}`);
    }
  }
}

module.exports = KlingAdapter;