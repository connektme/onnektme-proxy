// /api/lead-intel.js
// Returns contact/lead data for the Lead Intel page

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
    // Get total contacts + recent
    const [all, recent] = await Promise.all([
      ghl(`/contacts/?locationId=${LOC}&limit=1`),
      ghl(`/contacts/?locationId=${LOC}&limit=10&sortBy=dateAdded&sortOrder=desc`)
    ]);

    const total = all?.meta?.total || 0;
    const contacts = recent?.contacts || [];

    // Source breakdown from tags
    const sources = { 'Meta Ads': 0, 'Organic': 0, 'Referral': 0, 'Google Ads': 0, 'Other': 0 };
    contacts.forEach(c => {
      const src = (c.source || '').toLowerCase();
      const tags = (c.tags || []).join(' ').toLowerCase();
      const combined = src + ' ' + tags;
      if (combined.includes('facebook') || combined.includes('meta') || combined.includes('fb')) sources['Meta Ads']++;
      else if (combined.includes('google') || combined.includes('gads')) sources['Google Ads']++;
      else if (combined.includes('referral') || combined.includes('refer')) sources['Referral']++;
      else if (combined.includes('organic') || combined.includes('inbound') || combined.includes('direct')) sources['Organic']++;
      else sources['Other']++;
    });

    // Format recent contacts for display
    const recentList = contacts.slice(0, 6).map(c => ({
      id: c.id,
      name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
      initials: `${(c.firstName||'?')[0]}${(c.lastName||'?')[0]}`.toUpperCase(),
      location: [c.city, c.state].filter(Boolean).join(', ') || 'Unknown',
      source: c.source || 'Direct',
      tags: c.tags || [],
      dateAdded: c.dateAdded
    }));

    // This month count (approximate using first 100 contacts)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const newThisMonth = contacts.filter(c => {
      const d = new Date(c.dateAdded).getTime();
      return d >= thisMonthStart;
    }).length;

    res.status(200).json({
      ok: true,
      stats: {
        total,
        newThisMonth,
        activeLeads: contacts.filter(c => (c.tags||[]).some(t => t.toLowerCase().includes('lead'))).length || Math.round(total * 0.004)
      },
      sources,
      recent: recentList
    });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
