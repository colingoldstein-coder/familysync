const express = require('express');
const db = require('../db');

const router = express.Router();

// Public endpoint — no auth required
router.get('/site-images', async (req, res) => {
  try {
    const images = await db('site_images').select('key', 'image_url', 'alt_text', 'label');
    const byKey = {};
    images.forEach(img => {
      byKey[img.key] = { url: img.image_url, alt: img.alt_text, label: img.label };
    });
    res.json({ images: byKey });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
