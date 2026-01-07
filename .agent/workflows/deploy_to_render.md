---
description: How to deploy the backend to Render.com
---

1. Create a `render.yaml` file in the root if you want Infrastructure-as-Code, or just use the dashboard.

**Dashboard Steps:**
1. Push your code to GitHub.
2. Sign up/Login to [Render.com](https://render.com).
3. Click "New +" -> "Web Service".
4. Connect your GitHub repository.
5. Settings:
   - **Name**: `textile-inventory-backend`
   - **Root Directory**: `backend` (Important: since your backend is in a subdir)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (Spins down) or Starter ($7/mo, Always on)
6. **Environment Variables**:
   Add headers from your `.env` file:
   - `MONGO_URI`: Your MongoDB Atlas content string.
   - `MONGO_DB`: `textile_os`
   - `JWT_SECRET`: Your secret.
   - `NODE_ENV`: `production`

**Handling the Spin-Down (Free Tier):**
- Render's free tier spins down after 15 minutes of inactivity.
- The first request after that will take nearly 1 minute to load.
- To fix this, upgrade to the "Starter" plan ($7/month).
