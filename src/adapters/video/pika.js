/**
 * Pika Labs Adapter for Video Generation
 */

const axios = require('axios');

class PikaAdapter {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'pika-1.0';
    this.baseURL = config.baseURL || 'https://api.pika.art/v1';
  }

  async generate({ prompt, model = null, duration = 10 }) {
    try {
      // Create generation
      const createResponse = await axios.post(
        `${this.baseURL}/generations`,
        {
          promptText: prompt,
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

      const generationId = createResponse.data.id;
      
      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusResponse = await axios.get(
          `${this.baseURL}/generations/${generationId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );
        
        const generation = statusResponse.data;
        
        if (generation.status === 'completed') {
          return generation.videoUrl;
        } else if (generation.status === 'failed') {
          throw new Error(`Pika generation failed: ${generation.error}`);
        }
        
        attempts++;
      }
      
      throw new Error('Pika generation timeout');
      
    } catch (error) {
      throw new Error(`Pika API error: ${error.message}`);
    }
  }
}

module.exports = PikaAdapter;