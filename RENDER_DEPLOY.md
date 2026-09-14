# Deploying Quorum to Render

This project is built with **TanStack Start**, **React 19**, **Vite**, and **Nitro**. It has been prepared for hosting on [Render](https://render.com) as a high-performance Node.js Web Service.

---

## Option 1: Automatic 1-Click Deployment (Recommended)

Render can automatically configure your service using the included [`render.yaml`](file:///render.yaml) blueprint file.

1. Push your repository to **GitHub** or **GitLab**.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** in the top right, then select **Blueprint**.
4. Connect your repository.
5. Render will detect `render.yaml` and configure:
   - **Service Name**: `quorum-field-manual`
   - **Environment**: `Node`
   - **Plan**: `Free`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Node Version**: `22`
   - **Health Check**: `/`
6. Click **Apply**. Render will install dependencies, build the application, and deploy it to a public URL (e.g. `https://quorum-field-manual.onrender.com`).

---

## Option 2: Manual Web Service Setup on Render

If you prefer to configure the Web Service manually via the Render web console:

1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your Git repository.
3. Configure the following service settings:
   - **Name**: `quorum` (or your preferred name)
   - **Region**: Choose the region closest to you (e.g., Oregon, Ohio, Frankfurt, Singapore)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start` (or `node .output/server/index.mjs`)
   - **Instance Type**: `Free`
4. Expand **Advanced** and add the following **Environment Variables**:
   - `NODE_VERSION` = `22`
   - `NITRO_PRESET` = `node-server`
5. Click **Create Web Service**.

---

## Option 3: Deploy with Docker on Render

If you prefer a fully containerized deployment:

1. In Render Dashboard, click **New +** > **Web Service**.
2. Select your repository.
3. Set **Runtime** to **Docker**. Render will detect the included [`Dockerfile`](file:///Dockerfile).
4. Click **Create Web Service**.

---

## Technical Details

- **Nitro Node Server**: In production, `npm run build` compiles the application using Nitro's `node-server` preset into `.output/server/index.mjs` and static assets into `.output/public/`.
- **Port Binding**: Render automatically injects a `PORT` environment variable (e.g. `10000`). The server automatically binds to `0.0.0.0` on this port.
- **Database (Optional)**: If you later configure a PostgreSQL database on Render, set the `DATABASE_URL` environment variable. The build step (`npm run build`) will automatically run any pending database migrations via `scripts/migrate.mjs`.
- **Render Free Tier**: On Render's Free tier, services spin down after 15 minutes of inactivity. When a new request arrives, Render spins the service back up in a few seconds. Custom domains and automatic SSL/TLS certificates are fully supported on the Free tier.
