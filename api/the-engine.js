// /api/the-engine.js
// Returns automation/workflow data for The Engine page

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
    const workflows = await ghl(`/workflows/?locationId=${LOC}`);

    const wfs = workflows?.workflows || [];
    const active = wfs.filter(w => w.status === 'published' || w.status === 'active');
    const paused = wfs.filter(w => w.status === 'draft' || w.status === 'paused');

    const formatted = wfs.slice(0, 8).map(w => ({
      id: w.id,
      name: w.name,
      status: w.status === 'published' || w.status === 'active' ? 'live' : 'paused',
      enrolledCount: w.enrolledCount || 0,
      completedCount: w.completedCount || 0,
      updatedAt: w.updatedAt || w.dateUpdated
    }));

    res.status(200).json({
      ok: true,
      stats: {
        total: wfs.length,
        active: active.length,
        paused: paused.length
      },
      workflows: formatted
    });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
