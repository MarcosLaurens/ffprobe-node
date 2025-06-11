const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;

const app = express();
const port = process.env.PORT || 3000;

// Configurar fluent-ffmpeg para usar los binarios estáticos
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

app.get('/duration', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: 'Missing video URL' });

  try {
    const tmpPath = path.join(__dirname, 'temp.mp4');

    // Descargar video
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(tmpPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Obtener duración con ffprobe
    ffmpeg.ffprobe(tmpPath, (err, metadata) => {
      fs.unlinkSync(tmpPath); // Limpiar

      if (err) {
        return res.status(500).json({ error: 'ffprobe error', details: err.message });
      }

      const duration = metadata.format?.duration;
      if (!duration) {
        return res.status(500).json({ error: 'Could not get duration' });
      }

      res.json({ duration });
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process video', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
