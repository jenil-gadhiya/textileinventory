---
description: How to deploy the textile inventory application to Vercel
---

# Deploying to Vercel

Follow these steps to deploy your full-stack application (Frontend + Backend) to Vercel.

## Prerequisites
- You have pushed your latest code to GitHub.
- You have your MongoDB connection string ready (from your `.env` file).

## Step 1: Create a Vercel Project
1.  Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** button and select **"Project"**.
3.  In the "Import Git Repository" section, find your repository `textileinventory` and click **"Import"**.

## Step 2: Configure Project
Vercel will detect that this is a Vite project. You need to configure a few settings:

1.  **Project Name**: You can keep `textileinventory` or change it.
2.  **Framework Preset**: It should be **Vite**. If not, select it.
3.  **Root Directory**: Leave this as `./` (the default). Do **NOT** change it to `frontend` or `backend`. The `vercel.json` file in your root handles the routing.

## Step 3: Environment Variables (Crucial!)
You must add your secret keys here. Expand the **"Environment Variables"** section.

Add the following variables (copy values from your local `backend/.env` file):

| Key | Value |
| :--- | :--- |
| `MONGO_URI` | Your full MongoDB connection string (e.g. `mongodb+srv://...`) |
| `MONGO_DB` | `textile_os` (or your database name) |
| `NODE_ENV` | `production` |

**Note:** If you have any other secrets in your `.env` file, add them here too.

## Step 4: Deploy
1.  Click the **"Deploy"** button.
2.  Wait for the build to complete. Vercel will install dependencies for both frontend and backend and build them.
3.  Once finished, you will see a "Congratulations!" screen with your live URL.

## Step 5: Verify
1.  Click on the preview image or the domain URL to open your app.
2.  Test the login (if applicable) and data fetching to ensure the backend is connected to MongoDB correctly.

---

**Troubleshooting:**
- **Uploads not working?** Vercel file system is read-only. The `/uploads` folder will not work for persisting images. You will need to switch to a cloud storage provider (like AWS S3, Cloudinary, or Firebase Storage) for handling file uploads in production.
- **CORS Errors?** If you see network errors, check the Console in Developer Tools. The `vercel.json` file should handle routing `/api` requests to the backend, bypassing CORS issues.
