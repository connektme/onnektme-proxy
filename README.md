# ConnektMe GHL Proxy
Secure API proxy for the War Room dashboard suite.
Your GHL API key lives here — never in any HTML file.

## Deploy in 5 steps

### Step 1 — Get your GHL API key
1. In GHL, switch to your **Agency** view (top-left dropdown)
2. Go to **Settings → Privacy & Integrations → API Keys**
3. Click **+ Create New Key** → give it a name like "War Room"
4. Select permissions: Contacts (Read), Opportunities (Read), Conversations (Read), Workflows (Read)
5. Copy the key — save it somewhere safe

### Step 2 — Get your Location ID
Your location ID is in every GHL URL:
`crm.connektme.io/v2/location/rHbDD7XJ8qCPyWqFbgBX/dashboard`
                                          ↑ this part = your Location ID
Location ID: `rHbDD7XJ8qCPyWqFbgBX`

### Step 3 — Deploy to Vercel
1. Go to vercel.com → sign up free (use GitHub)
2. Click **Add New Project** → **Import from ZIP** (or drag this folder)
3. Deploy — takes ~30 seconds
4. Note your deployment URL: `https://connektme-proxy.vercel.app`

### Step 4 — Add environment variables
In Vercel: **Project → Settings → Environment Variables**
Add these two:
```
GHL_API_KEY      = your_api_key_from_step_1
GHL_LOCATION_ID  = rHbDD7XJ8qCPyWqFbgBX
```
Click Save → Redeploy

### Step 5 — Update your HTML pages
In each HTML page, find the line:
```
const PROXY = 'https://YOUR-PROXY-URL.vercel.app';
```
Replace with your actual Vercel URL.

## API Endpoints
| Endpoint | Page | Data |
|----------|------|------|
| GET /api/war-room | The War Room | Contacts, pipeline, opportunities overview |
| GET /api/inbox | Inbox | Conversations, channels, response stats |
| GET /api/lead-intel | Lead Intel | Contacts, sources, recent leads |
| GET /api/deal-flow | Deal Flow | Opportunities, stages, pipeline value |
| GET /api/scoreboard | Scoreboard | Conversion funnel, win rates |
| GET /api/the-engine | The Engine | Workflows, automation stats |

## Test your proxy
Once deployed, open in browser:
`https://your-proxy.vercel.app/api/war-room`
You should see JSON with your real GHL data.
