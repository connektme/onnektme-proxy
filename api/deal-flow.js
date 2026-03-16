// /api/deal-flow.js
// Returns opportunity/pipeline data for the Deal Flow page

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
    const [oppsData, pipelines] = await Promise.all([
      ghl(`/opportunities/search?location_id=${LOC}&limit=100&status=open`),
      ghl(`/opportunities/pipelines?locationId=${LOC}`)
    ]);

    const opps = oppsData?.opportunities || [];
    const total = oppsData?.meta?.total || opps.length;

    // Won/lost this month
    const [wonData] = await Promise.all([
      ghl(`/opportunities/search?location_id=${LOC}&limit=100&status=won`)
    ]);
    const wonOpps = wonData?.opportunities || [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const wonThisMonth = wonOpps.filter(o => new Date(o.updatedAt || o.dateAdded).getTime() >= monthStart).length;

    // Pipeline value
    const pipelineValue = opps.reduce((sum, o) => sum + (parseFloat(o.monetaryValue) || 0), 0);

    // Stage breakdown
    const stageCounts = {};
    const stageNames = {};
    opps.forEach(o => {
      const sid = o.pipelineStageId;
      const sname = o.pipelineStage?.name || o.stage?.name || 'Stage';
      stageCounts[sid] = (stageCounts[sid] || 0) + 1;
      stageNames[sid] = sname;
    });

    const stages = Object.entries(stageCounts).map(([id, count]) => ({
      id,
      name: stageNames[id],
      count,
      pct: Math.round((count / (total || 1)) * 100)
    })).sort((a, b) => b.count - a.count);

    // Recent opportunities
    const recent = opps.slice(0, 6).map(o => ({
      id: o.id,
      name: o.contact?.name || o.name || 'Unknown',
      initials: (o.contact?.name || o.name || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      value: parseFloat(o.monetaryValue) || 0,
      stage: o.pipelineStage?.name || o.stage?.name || 'Unknown',
      status: o.status,
      pipelineName: pipelines?.pipelines?.[0]?.name || 'Pipeline'
    }));

    res.status(200).json({
      ok: true,
      stats: {
        open: total,
        wonThisMonth,
        pipelineValue: Math.round(pipelineValue),
        pipelineCount: pipelines?.pipelines?.length || 0
      },
      stages: stages.slice(0, 8),
      recent
    });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
