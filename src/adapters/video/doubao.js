/**
 * Doubao (ByteDance) Video Adapter
 * Supports: Seedance-1.5
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DoubaoAdapter {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'doubao-seedance-1-5-pro';
    this.baseURL = config.baseURL || 'https://ark.cn-beijing.volces.com/api/v3';
  }

  async generate({ prompt, duration = 10 }) {
    try {
      // Submit generation task
      const submitRes = await axios.post(
        `${this.baseURL}/videos/generations`,
        {
          model: this.model,
          prompt: prompt,
          size: '1080x1920',  // 9:16 vertical
          duration: duration,
          watermark: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const taskId = submitRes.data.id;

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const statusRes = await axios.get(
          `${this.baseURL}/videos/generations/${taskId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );

        const status = statusRes.data.status;

        if (status === 'succeeded') {
          // Download video
          const videoUrl = statusRes.data.video_url;
          const videoPath = await this.downloadVideo(videoUrl);
          return videoPath;
        }

        if (status === 'failed') {
          throw new Error(`Video generation failed: ${statusRes.data.error_msg}`);
        }

        attempts++;
      }

      throw new Error('Video generation timeout');
    } catch (error) {
      throw new Error(`Doubao API error: ${error.message}`);
    }
  }

  async downloadVideo(url) {
    const outputDir = path.join('uploads', 'videos');
    await fs.ensureDir(outputDir);
    
    const filename = `${uuidv4()}.mp4`;
    const filepath = path.join(outputDir, filename);

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filepath));
      writer.on('error', reject);
    });
  }
}

module.exports = DoubaoAdapter;
