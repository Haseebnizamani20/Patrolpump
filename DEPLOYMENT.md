# Web deployment: Vercel + Render + MongoDB Atlas

The hosted version uses Vercel for the React frontend, Render for the Express API,
and MongoDB Atlas for the database. Electron and the local MongoDB server are not
used by this web deployment.

## 1. Deploy the API on Render

Create a new **Blueprint** service from this repository; Render will detect
`render.yaml`. Alternatively configure a Web Service manually:

- **Root directory:** `server`
- **Build command:** `npm ci`
- **Start command:** `npm start`
- **Health check path:** `/api/health`
- **Node version:** `20`

Set these Render environment variables:

| Name | Value |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string for the application database |
| `JWT_SECRET` | A long, random secret |
| `CORS_ORIGINS` | `https://patrolpump-9cfwzf03u-haseebs-projects-afd78c25.vercel.app` |

After deployment, confirm `<Render service URL>/api/health` responds with JSON.

## 2. Configure MongoDB Atlas

Create a database user with access only to the application database. Add Render's
outbound IP addresses to the Atlas IP access list, or use the appropriate Atlas
network policy for the Render service. Copy the Atlas driver connection string into
Render as `MONGODB_URI`.

## 3. Redeploy the Vercel frontend

In the existing Vercel project, add this production environment variable, then
redeploy:

| Name | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<your-render-service>.onrender.com/api` |

Vite substitutes this value at build time, so an existing deployment must be
redeployed after changing it.

## 4. Verify

1. Open the Vercel URL and log in.
2. Confirm the browser has no CORS errors.
3. Create a non-production test record and confirm it appears in Atlas.
4. Verify the Render health endpoint reports the database as `connected`.

## Notes

- The browser application requires internet access. It does not replace the
  offline Electron deployment.
- The existing local `mongodump` backup screen is not a cloud backup solution.
  Use MongoDB Atlas backup/restore procedures for hosted production data.
