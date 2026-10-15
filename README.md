# Qywam — AI-Native Creative Landing Page

This repository contains the landing page for **Qywam**, an AI-native advertising and creative company.

---

## 🚀 Deploying to Vercel

This project is fully configured for seamless zero-config deployment on **[Vercel](https://vercel.com)**.

### Method 1: Deploy with GitHub & Vercel Dashboard (Recommended)

1. Create a new repository on your GitHub account (e.g. `qywam-landing`).
2. Push your project to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
3. Log in to [Vercel](https://vercel.com).
4. Click **"Add New..."** > **"Project"**.
5. Select your GitHub repository and click **Deploy**.
   - **Framework Preset**: `Other`
   - **Root Directory**: `./` (default)
6. Vercel will deploy your site in seconds and provide a live URL (`https://your-project.vercel.app`).

---

### Method 2: Deploy directly from Terminal (Vercel CLI)

In your project directory, simply run:

```bash
npx vercel
```

- Follow the interactive prompts (select default settings by pressing Enter).
- When prompted `Set up and deploy? [Y/n]`, press `Y`.
- When ready for production, deploy with:
  ```bash
  npx vercel --prod
  ```

---

## 📁 Project Structure

- `index.html` — The primary entry point for Vercel, including Three.js 3D animations, SEO, OpenGraph tags, and favicon link.
- `favicon.svg` — Custom liquid gradient SVG favicon matching the brand logo.
- `vercel.json` — Edge routing rules, clean URLs, redirects, and security headers.
- `.gitignore` — Ignores local system files and Vercel artifacts.
- `Qywam Landing (4).html` — Original source file backup.
