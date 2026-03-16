// /api/war-room.js — ConnektMe War Room data endpoint
// Uses GHL API v2 with Private Integration Token (pit- prefix)

const LOC = process.env.GHL_LOCATION_ID;
const KEY = process.env.GHL_API_KEY;

const headers = {
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  'Version': '2021-07-28'
};

async function ghl(path) {
  const url = `https://services.leadconnectorhq.com${path}`;
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0,300)}`);
  return JSON.parse(text);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const results = {};

  // Test each endpoint individually so we can see which ones work
  const tests = [
    ['contacts', `/contacts/?locationId=${LOC}&limit=1`],
    ['pipelines', `/opportunities/pipelines?locationId=${LOC}`],
    ['opportunities', `/opportunities/search?location_id=${LOC}&limit=100`],
    ['conversations', `/conversations/search?locationId=${LOC}&limit=1`],
    ['workflows', `/workflows/?locationId=${LOC}`],
  ];

  for (const [key, path] of tests) {
    try {
      results[key] = await ghl(path);
    } catch(e) {
      results[key] = { error: e.message };
    }
  }

  const opps = results.opportunities?.opportunities || [];
  const totalLeads = results.opportunities?.meta?.total || opps.length;
  const won  = opps.filter(o => o.status === 'won').length;
  const lost = opps.filter(o => o.status === 'lost').length;
  const open = opps.filter(o => o.status === 'open').length;
  const pipelineValue = opps.filter(o => o.status === 'open')
    .reduce((s, o) => s + (parseFloat(o.monetaryValue) || 0), 0);

  const stageCounts = {};
  const stageNames = {};
  opps.forEach(o => {
    const sid = o.pipelineStageId || 'unknown';
    const sname = o.pipelineStage?.name || o.stage?.name || 'Unknown';
    stageCounts[sid] = (stageCounts[sid] || 0) + 1;
    stageNames[sid] = sname;
  });
  const stages = Object.entries(stageCounts)
    .map(([id, count]) => ({ id, name: stageNames[id], count, pct: Math.round((count/(totalLeads||1))*100) }))
    .sort((a, b) => b.count - a.count);

  res.status(200).json({
    ok: true,
    errors: Object.fromEntries(Object.entries(results).filter(([,v]) => v.error).map(([k,v]) => [k, v.error])),
    stats: {
      totalContacts: results.contacts?.meta?.total || 0,
      pipelineCount: results.pipelines?.pipelines?.length || 0,
      totalLeads, won, lost, open,
      pipelineValue: Math.round(pipelineValue),
    },
    stages: stages.slice(0, 10),
    pipelines: results.pipelines?.pipelines?.map(p => ({ id: p.id, name: p.name })) || []
  });
}
