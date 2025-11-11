import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import AudioProcessor from '../services/audioProcessor.js';
import VideoProcessor from '../services/videoProcessor.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024
  }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

router.post('/upload-and-chunk', upload.single('file'), async (req, res) => {
  let tempFilePath = null;
  let chunkFiles = [];
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { chunkDurationMinutes = 5 } = req.body;

    console.log(`Processing file: ${req.file.originalname}`);
    console.log(`Size: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`);

    const tempDir = './temp';
    await fs.mkdir(tempDir, { recursive: true });
    const fileExt = path.extname(req.file.originalname);
    tempFilePath = path.join(tempDir, `upload_${Date.now()}${fileExt}`);
    await fs.writeFile(tempFilePath, req.file.buffer);

    const audioProcessor = new AudioProcessor();
    const videoProcessor = new VideoProcessor();

    let audioFilePath = tempFilePath;
    let segments = [];

    if (videoProcessor.isVideoFile(req.file.originalname)) {
      console.log('Extracting audio from video...');
      const videoInfo = await videoProcessor.getVideoInfo(tempFilePath);

      if (!videoInfo.hasAudio) {
        throw new Error('Video has no audio track');
      }

      const segmentResult = await videoProcessor.extractAudioWithSegmentation(
        tempFilePath,
        chunkDurationMinutes,
        24
      );

      segments = segmentResult.segments;
    } else {
      console.log('Processing audio file...');
      const audioInfo = await audioProcessor.getAudioInfo(tempFilePath);
      const audioStats = await fs.stat(tempFilePath);
      const fileSizeMB = audioStats.size / (1024 * 1024);

      if (fileSizeMB > 24) {
        const splitResult = await audioProcessor.splitAudio(
          tempFilePath,
          chunkDurationMinutes,
          24
        );
        segments = splitResult.segments;
      } else {
        segments = [{
          path: tempFilePath,
          filename: path.basename(tempFilePath),
          startTime: 0,
          endTime: audioInfo.duration,
          duration: audioInfo.duration,
          size: audioStats.size
        }];
      }
    }

    console.log(`Created ${segments.length} segments`);

    const chunkPaths = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const chunkBuffer = await fs.readFile(segment.path);
      const chunkFileName = `${jobId}/chunk-${i}.mp3`;

      console.log(`Uploading chunk ${i + 1}/${segments.length} to Supabase...`);

      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(chunkFileName, chunkBuffer, {
          contentType: 'audio/mpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload chunk ${i}: ${uploadError.message}`);
      }

      chunkPaths.push(chunkFileName);
      chunkFiles.push(segment.path);

      console.log(`Chunk ${i + 1} uploaded: ${chunkFileName}`);
    }

    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

    for (const chunkFile of chunkFiles) {
      if (chunkFile !== tempFilePath) {
        await fs.unlink(chunkFile).catch(() => {});
      }
    }

    console.log(`All chunks uploaded successfully`);

    res.json({
      success: true,
      jobId,
      chunks: chunkPaths,
      totalChunks: chunkPaths.length
    });

  } catch (error) {
    console.error('Error processing file:', error);

    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

    for (const chunkFile of chunkFiles) {
      await fs.unlink(chunkFile).catch(() => {});
    }

    const chunksToDelete = [];
    for (let i = 0; i < 100; i++) {
      chunksToDelete.push(`${jobId}/chunk-${i}.mp3`);
    }
    await supabase.storage.from('audio-files').remove(chunksToDelete).catch(() => {});

    res.status(500).json({
      error: 'Failed to process file',
      details: error.message
    });
  }
});

export default router;
