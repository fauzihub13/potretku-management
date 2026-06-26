const router = require('express').Router();
const { google } = require('googleapis');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/google-calendar/callback'
  );
}

router.get('/auth-url', auth, async (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: req.userId
    });
    res.json({ url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    console.log('[GC] Callback received, code:', code ? 'present' : 'missing', 'state:', state);
    
    if (!code) {
      console.log('[GC] No code in callback');
      return res.redirect((process.env.FRONTEND_URL || 'http://localhost:3000') + '/settings?google=error&reason=no_code');
    }
    
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    console.log('[GC] Token received, access:', tokens.access_token ? 'present' : 'missing', 'refresh:', tokens.refresh_token ? 'present' : 'missing');
    
    oauth2Client.setCredentials(tokens);

    await prisma.setting.update({
      where: { userId: state },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      }
    });

    console.log('[GC] Tokens saved for user:', state);
    res.redirect((process.env.FRONTEND_URL || 'http://localhost:3000') + '/settings?google=connected');
  } catch (err) {
    console.error('[GC] Callback error:', err.message, err.response?.data);
    res.redirect((process.env.FRONTEND_URL || 'http://localhost:3000') + '/settings?google=error&reason=' + encodeURIComponent(err.message));
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const settings = await prisma.setting.findUnique({ where: { userId: req.userId } });
    const connected = !!(settings && settings.googleAccessToken);
    res.json({ connected });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/disconnect', auth, async (req, res) => {
  try {
    await prisma.setting.update({
      where: { userId: req.userId },
      data: { googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null, googleCalendarId: null }
    });
    res.json({ message: 'Google Calendar diputuskan' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function getAuthenticatedClient(userId) {
  const settings = await prisma.setting.findUnique({ where: { userId } });
  if (!settings || !settings.googleAccessToken) return null;

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: settings.googleAccessToken,
    refresh_token: settings.googleRefreshToken,
    expiry_date: settings.googleTokenExpiry ? settings.googleTokenExpiry.getTime() : undefined
  });

  // Refresh token if expired
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await prisma.setting.update({
        where: { userId },
        data: {
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
          googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
        }
      });
    } else if (tokens.access_token) {
      await prisma.setting.update({
        where: { userId },
        data: {
          googleAccessToken: tokens.access_token,
          googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
        }
      });
    }
  });

  return oauth2Client;
}

router.post('/sync/:bookingId', auth, async (req, res) => {
  try {
    const oauth2Client = await getAuthenticatedClient(req.userId);
    if (!oauth2Client) return res.status(400).json({ error: 'Google Calendar belum terhubung' });

    const booking = await prisma.booking.findFirst({
      where: { id: req.params.bookingId, userId: req.userId },
      include: { freelancer: true }
    });
    if (!booking) return res.status(404).json({ error: 'Pemesanan tidak ditemukan' });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get or create calendar
    const settings = await prisma.setting.findUnique({ where: { userId: req.userId } });
    let calendarId = settings.googleCalendarId;

    if (!calendarId) {
      const cal = await calendar.calendars.insert({
        requestBody: { summary: 'VendorDesk Bookings', description: 'Pemesanan dari VendorDesk' }
      });
      calendarId = cal.data.id;
      await prisma.setting.update({ where: { userId: req.userId }, data: { googleCalendarId: calendarId } });
    }

    // Get service info for duration
    const services = await prisma.service.findMany({ where: { userId: req.userId } });
    const service = services.find(s => s.name === booking.packageName);
    const durationHours = service ? (service.durationHours || 1) : 1;
    const durationMinutes = service ? (service.durationMinutes || 0) : 0;
    const totalMinutes = durationHours * 60 + durationMinutes;

    // Parse session time
    let startTime = new Date(booking.sessionDate);
    if (booking.sessionTime) {
      const [h, m] = booking.sessionTime.split(':').map(Number);
      startTime.setHours(h, m, 0, 0);
    } else {
      startTime.setHours(9, 0, 0, 0);
    }
    const endTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);

    const eventData = {
      summary: `${booking.bookingCode} - ${booking.clientName} (${booking.eventType})`,
      description: `Paket: ${booking.packageName}\nTotal: Rp${booking.totalAmount.toLocaleString('id-ID')}\nStatus: ${booking.status}${booking.freelancer ? '\nFreelancer: ' + booking.freelancer.name : ''}`,
      start: { dateTime: startTime.toISOString(), timeZone: 'Asia/Jakarta' },
      end: { dateTime: endTime.toISOString(), timeZone: 'Asia/Jakarta' },
      location: booking.location || undefined,
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] }
    };

    let event;
    if (booking.googleEventId) {
      // Update existing event
      event = await calendar.events.update({
        calendarId,
        eventId: booking.googleEventId,
        requestBody: eventData
      });
    } else {
      // Create new event
      event = await calendar.events.insert({
        calendarId,
        requestBody: eventData
      });
    }

    // Save event ID to booking
    await prisma.booking.update({
      where: { id: booking.id },
      data: { googleEventId: event.data.id, calendarSynced: true }
    });

    res.json({ message: 'Tersinkronisasi ke Google Calendar', eventId: event.data.id, htmlLink: event.data.htmlLink });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/sync/:bookingId', auth, async (req, res) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.bookingId, userId: req.userId }
    });
    if (!booking) return res.status(404).json({ error: 'Pemesanan tidak ditemukan' });

    if (booking.googleEventId) {
      const oauth2Client = await getAuthenticatedClient(req.userId);
      if (oauth2Client) {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const settings = await prisma.setting.findUnique({ where: { userId: req.userId } });
        if (settings.googleCalendarId) {
          await calendar.events.delete({ calendarId: settings.googleCalendarId, eventId: booking.googleEventId }).catch(() => {});
        }
      }
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { googleEventId: null, calendarSynced: false }
    });

    res.json({ message: 'Dihapus dari Google Calendar' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sync-all', auth, async (req, res) => {
  try {
    const oauth2Client = await getAuthenticatedClient(req.userId);
    if (!oauth2Client) return res.status(400).json({ error: 'Google Calendar belum terhubung' });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const settings = await prisma.setting.findUnique({ where: { userId: req.userId } });
    let calendarId = settings.googleCalendarId;

    if (!calendarId) {
      const cal = await calendar.calendars.insert({
        requestBody: { summary: 'VendorDesk Bookings', description: 'Pemesanan dari VendorDesk' }
      });
      calendarId = cal.data.id;
      await prisma.setting.update({ where: { userId: req.userId }, data: { googleCalendarId: calendarId } });
    }

    const bookings = await prisma.booking.findMany({
      where: { userId: req.userId, status: { not: 'cancelled' } },
      include: { freelancer: true }
    });

    const services = await prisma.service.findMany({ where: { userId: req.userId } });

    let synced = 0, updated = 0, skipped = 0, errors = 0;

    for (const booking of bookings) {
      try {
        const service = services.find(s => s.name === booking.packageName);
        const durationHours = service ? (service.durationHours || 1) : 1;
        const durationMinutes = service ? (service.durationMinutes || 0) : 0;
        const totalMinutes = durationHours * 60 + durationMinutes;

        let startTime = new Date(booking.sessionDate);
        if (booking.sessionTime) {
          const [h, m] = booking.sessionTime.split(':').map(Number);
          startTime.setHours(h, m, 0, 0);
        } else {
          startTime.setHours(9, 0, 0, 0);
        }
        const endTime = new Date(startTime.getTime() + totalMinutes * 60 * 1000);

        const eventData = {
          summary: booking.bookingCode + ' - ' + booking.clientName + ' (' + booking.eventType + ')',
          description: 'Paket: ' + booking.packageName + '\nTotal: Rp' + booking.totalAmount.toLocaleString('id-ID') + '\nStatus: ' + booking.status + (booking.freelancer ? '\nFreelancer: ' + booking.freelancer.name : ''),
          start: { dateTime: startTime.toISOString(), timeZone: 'Asia/Jakarta' },
          end: { dateTime: endTime.toISOString(), timeZone: 'Asia/Jakarta' },
          location: booking.location || undefined,
          reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] }
        };

        if (booking.googleEventId) {
          await calendar.events.update({ calendarId, eventId: booking.googleEventId, requestBody: eventData });
          updated++;
        } else {
          const event = await calendar.events.insert({ calendarId, requestBody: eventData });
          await prisma.booking.update({ where: { id: booking.id }, data: { googleEventId: event.data.id, calendarSynced: true } });
          synced++;
        }
      } catch (err) {
        console.error('[GC] Sync error for', booking.bookingCode, err.message);
        errors++;
      }
    }

    res.json({ message: 'Sinkronisasi selesai', synced, updated, skipped, errors, total: bookings.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
