const express = require('express');
const { validate, schemas } = require('../validation');
const { sendContactEmail } = require('../email');
const logger = require('../logger');

const router = express.Router();

router.post('/', validate(schemas.contact), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    await sendContactEmail({ name, email, message });
    res.json({ message: 'Message sent successfully' });
  } catch (err) {
    logger.error(err, 'Failed to send contact email');
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

module.exports = router;
