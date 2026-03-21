/**
 * Runway ML Adapter for Video Generation
 * Supports: Gen-2, Gen-3 Alpha
 */

const axios = require('axios');

class RunwayAdapter {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gen-3-alpha';
    this.baseURL = config.baseURL || 'https://api.runwayml.com/v1';
  }

  async generate({ prompt, model = null, duration = 10 }) {
    try {
      // Create generation task
      const createResponse = await axios.post(
        `${this.baseURL}/tasks`,
        {
          taskType: 'textToVideo',
          textPrompt: prompt,
          model: model || this.model,
          duration: Math.min(duration, 16) // Runway max 16s
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const taskId = createResponse.data.id;
      
      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await axios.get(
          `${this.baseURL}/tasks/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );
        
        const task = statusResponse.data;
        
        if (task.status === 'SUCCEEDED') {
          return task.output[0]; // Video URL
        } else if (task.status === 'FAILED') {
          throw new Error(`Runway generation failed: ${task.failureReason}`);
        }
        
        attempts++;
      }
      
      throw new Error('Runway generation timeout');
      
    } catch (error) {
      throw new Error(`Runway API error: ${error.message}`);
    }
  }
}

module.exports = RunwayAdapter;