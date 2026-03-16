// /api/war-room.js
// Returns all data needed for The War Room dashboard
// GHL API v2 — requires GHL_API_KEY and GHL_LOCATION_ID env vars

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
    // Fetch in parallel for speed
    const [contacts, pipelines, opportunities] = await Promise.all([
      ghl(`/contacts/?locationId=${LOC}&limit=1`),
      ghl(`/opportunities/pipelines?locationId=${LOC}`),
      ghl(`/opportunities/search?location_id=${LOC}&limit=100`)
    ]);

    // Total contacts
    const totalContacts = contacts?.meta?.total || 0;

    // Pipeline count
    const pipelineCount = pipelines?.pipelines?.length || 0;

    // Opportunity stats
    const opps = opportunities?.opportunities || [];
    const totalLeads = opportunities?.meta?.total || opps.length;

    // Stage breakdown
    const stageCounts = {};
    const stageNames = {};
    opps.forEach(o => {
      const sid = o.pipelineStageId;
      const sname = o.pipelineStage?.name || o.stage?.name || 'Unknown';
      stageCounts[sid] = (stageCounts[sid] || 0) + 1;
      stageNames[sid] = sname;
    });

    const stages = Object.entries(stageCounts).map(([id, count]) => ({
      id,
      name: stageNames[id],
      count,
      pct: Math.round((count / (totalLeads || 1)) * 100)
    })).sort((a, b) => b.count - a.count);

    // Status breakdown (won/lost/open)
    const won  = opps.filter(o => o.status === 'won').length;
    const lost = opps.filter(o => o.status === 'lost').length;
    const open = opps.filter(o => o.status === 'open').length;

    // Pipeline value
    const pipelineValue = opps
      .filter(o => o.status === 'open')
      .reduce((sum, o) => sum + (parseFloat(o.monetaryValue) || 0), 0);

    // Appointment outcome counts (custom fields or tag-based)
    const needResched = opps.filter(o =>
      o.pipelineStage?.name?.toLowerCase().includes('reschedule') ||
      o.stage?.name?.toLowerCase().includes('reschedule')
    ).length;

    res.status(200).json({
      ok: true,
      stats: {
        totalContacts,
        pipelineCount,
        totalLeads,
        won,
        lost,
        open,
        needResched,
        pipelineValue: Math.round(pipelineValue)
      },
      stages: stages.slice(0, 10),
      pipelines: pipelines?.pipelines?.map(p => ({ id: p.id, name: p.name })) || []
    });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
