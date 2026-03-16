// /api/scoreboard.js
// Returns reporting/analytics data for the Scoreboard page

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
    // Get opportunities for conversion funnel
    const [open, won, lost, contacts] = await Promise.all([
      ghl(`/opportunities/search?location_id=${LOC}&limit=1&status=open`),
      ghl(`/opportunities/search?location_id=${LOC}&limit=1&status=won`),
      ghl(`/opportunities/search?location_id=${LOC}&limit=1&status=lost`),
      ghl(`/contacts/?locationId=${LOC}&limit=1`)
    ]);

    const totalContacts = contacts?.meta?.total || 0;
    const openCount = open?.meta?.total || 0;
    const wonCount = won?.meta?.total || 0;
    const lostCount = lost?.meta?.total || 0;
    const totalOpps = openCount + wonCount + lostCount;

    // Conversion rates
    const contactToOpp = totalContacts > 0 ? Math.round((totalOpps / totalContacts) * 100) : 0;
    const oppToWon = totalOpps > 0 ? Math.round((wonCount / totalOpps) * 100) : 0;

    // Stage-level data for funnel
    const oppsDetail = await ghl(`/opportunities/search?location_id=${LOC}&limit=100&status=open`);
    const opps = oppsDetail?.opportunities || [];

    const stageCounts = {};
    const stageNames = {};
    opps.forEach(o => {
      const sid = o.pipelineStageId;
      const sname = o.pipelineStage?.name || o.stage?.name || 'Unknown';
      stageCounts[sid] = (stageCounts[sid] || 0) + 1;
      stageNames[sid] = sname;
    });

    const stages = Object.entries(stageCounts).map(([id, count]) => ({
      name: stageNames[id],
      count,
      pct: openCount > 0 ? Math.round((count / openCount) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    res.status(200).json({
      ok: true,
      stats: {
        totalContacts,
        openOpps: openCount,
        wonOpps: wonCount,
        lostOpps: lostCount,
        contactToOppRate: contactToOpp,
        closeRate: oppToWon
      },
      funnel: [
        { label: 'Total Contacts', count: totalContacts, pct: 100 },
        { label: 'Opportunities Created', count: totalOpps, pct: contactToOpp },
        { label: 'Open (Active)', count: openCount, pct: totalOpps > 0 ? Math.round((openCount/totalOpps)*100) : 0 },
        { label: 'Won', count: wonCount, pct: totalOpps > 0 ? Math.round((wonCount/totalOpps)*100) : 0 }
      ],
      stages: stages.slice(0, 8)
    });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
