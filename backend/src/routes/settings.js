const router = require('express').Router();
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const updatableFields = [
  'bookingFormGreeting', 'settlementGreeting', 'paymentMethods', 'bankAccounts',
  'qrisImage', 'customStatuses', 'eventTypes',
  'googleCalendarId', 'googleAccessToken', 'googleRefreshToken', 'googleTokenExpiry',
  'googleDriveFolderId', 'telegramChatId',
  'seoTitle', 'seoDescription', 'seoKeywords',
  'vendorSlug', 'vendorTagline', 'vendorDescription', 'vendorLogo', 'vendorBanner',
  'vendorPrimaryColor', 'vendorAccentColor', 'vendorCustomFields',
  'vendorLandingHtml', 'vendorTermsHtml',
  'vendorPhone', 'vendorEmail', 'vendorAddress',
  'vendorSocialInstagram', 'vendorSocialTiktok', 'vendorSocialFacebook'
];

router.get('/', auth, async (req, res) => {
  try {
    let settings = await prisma.setting.findUnique({ where: { userId: req.userId } });
    if (!settings) {
      settings = await prisma.setting.create({ data: {
        userId: req.userId,
        paymentMethods: '["bank","qris","cash"]',
        bankAccounts: '[]',
        customStatuses: '[]',
        eventTypes: '["Wedding","Pre-wedding","Portrait","Event","Commercial"]',
        vendorCustomFields: '[]'
      }});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const rawData = req.body;
    const data = {};
    for (const field of updatableFields) {
      if (rawData[field] !== undefined) data[field] = rawData[field];
    }
    // Handle nested studioName from user object
    if (rawData.user?.studioName !== undefined) {
      await prisma.user.update({ where: { id: req.userId }, data: { studioName: rawData.user.studioName } });
    }

    let settings = await prisma.setting.findUnique({ where: { userId: req.userId } });
    if (!settings) {
      settings = await prisma.setting.create({ data: { userId: req.userId, ...data } });
    } else {
      settings = await prisma.setting.update({ where: { userId: req.userId }, data });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
