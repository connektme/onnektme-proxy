// /api/inbox.js
// Returns conversation data for the Inbox page

const API = 'https://services.leadconnectorhq.com';
const LOC = process.env.GHL_LOCATION_ID;
const KEY = process.env.GHL_API_KEY;

const headers = {
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Version': '2021-07-28'
};

async function ghl(path) {
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(`GHL ${path} → ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const [allConvs, unread] = await Promise.all([
      ghl(`/conversations/search?locationId=${LOC}&limit=20&sortBy=last_message_date&sortOrder=desc`),
      ghl(`/conversations/search?locationId=${LOC}&limit=1&unreadOnly=true`)
    ]);

    const convs = allConvs?.conversations || [];
    const total = allConvs?.meta?.total || 0;
    const unreadCount = unread?.meta?.total || 0;

    // Channel breakdown
    const channels = { SMS: 0, Email: 0, FB_Messenger: 0, Live_Chat: 0, Other: 0 };
    convs.forEach(c => {
      const type = c.type || c.lastMessageType || '';
      if (type.includes('SMS') || type.includes('sms')) channels.SMS++;
      else if (type.includes('Email') || type.includes('email')) channels.Email++;
      else if (type.includes('FB') || type.includes('facebook')) channels.FB_Messenger++;
      else if (type.includes('Chat') || type.includes('chat')) channels.Live_Chat++;
      else channels.Other++;
    });

    // Recent conversations for display
    const recent = convs.slice(0, 8).map(c => ({
      id: c.id,
      contactName: c.contactName || c.fullName || 'Unknown',
      lastMessage: c.lastMessageBody || c.snippet || '...',
      type: c.type || 'SMS',
      unread: c.unreadCount > 0,
      starred: c.starred || false,
      lastActivity: c.dateUpdated || c.lastMessageDate
    }));

    // Status counts
    const awaiting = convs.filter(c => c.unreadCount === 0 && c.status === 'open').length;
    const resolved = convs.filter(c => c.status === 'resolved' || c.status === 'completed').length;

    res.status(200).json({
      ok: true,
      stats: { total, unread: unreadCount, awaiting, resolved },
      channels,
      recent
    });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
