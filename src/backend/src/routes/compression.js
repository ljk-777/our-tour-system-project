const express = require('express');
const router = express.Router();
const { benchmarkCompression, detailedAnalyze } = require('../algorithms/compression');
const diaryRepo = require('../repositories/diaryRepository');

// POST /api/compression/benchmark — compare all three algorithms on text or diary content
router.post('/benchmark', async (req, res) => {
  try {
    let text = req.body.text;

    // If no text provided, use a sample from diary content
    if (!text) {
      const diaries = await diaryRepo.getAll();
      // Find a diary with reasonable content length
      const sample = diaries.find(d => (d.content || '').length > 100);
      if (sample) {
        text = sample.content;
      } else {
        // Fallback sample
        text = '北京邮电大学沙河校区位于北京市昌平区，校园环境优美，建筑风格独特。这里有现代化的教学楼、图书馆和学生宿舍，还有丰富的校园生活。学生们在这里学习、生活、成长，度过了美好的大学时光。';
      }
    }

    if (!text || text.length < 10) {
      return res.status(400).json({ success: false, message: '文本太短（至少10个字符）' });
    }

    const result = benchmarkCompression(text);
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// POST /api/compression/analyze — detailed analysis with intermediate data
router.post('/analyze', async (req, res) => {
  try {
    let text = req.body.text;
    if (!text) {
      const diaries = await diaryRepo.getAll();
      const sample = diaries.find(d => (d.content || '').length > 100);
      text = sample?.content || '北京邮电大学沙河校区位于北京市昌平区，校园环境优美。';
    }
    if (!text) {
      return res.status(400).json({ success: false, message: '文本不能为空' });
    }
    const result = detailedAnalyze(text);
    res.json({ success: true, data: result });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;
