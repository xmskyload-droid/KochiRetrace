# KochiRetrace Lost & Found Portal

A fully responsive, client-side prototype Lost & Found portal serving Ernakulam/Kochi, built with HTML, Tailwind CSS, Leaflet.js, and pure JavaScript.

## 🚀 How to Host This Site

Since KochiRetrace operates entirely in the frontend and leverages `localStorage` to manage database operations, user sessions, claiming workflows, and messaging queues, it can be hosted on **any free static web hosting service** without needing a backend server or database setup!

Below are the three simplest and most popular free static hosting options:

---

### Option 1: Netlify (Easiest - Drag & Drop)
1. Open your browser and navigate to [https://app.netlify.com/drop](https://app.netlify.com/drop).
2. Locate the `WEBSITE/` folder on your computer.
3. Drag the entire `WEBSITE/` folder and drop it into the Netlify box on the screen.
4. Netlify will instantly deploy your site and provide you with a shareable public URL (e.g. `https://random-name.netlify.app`).

---

### Option 2: GitHub Pages (Best for Version Control)
1. Create a new repository on GitHub (e.g., named `kochiretrace`).
2. Push the files inside the `WEBSITE/` directory to the repository (make sure `index.html` is at the root level of your repository, not nested inside a subfolder).
3. In your GitHub repository, go to **Settings** -> **Pages** (under the Code and automation section).
4. Set the **Source** to `Deploy from a branch`.
5. Under **Branch**, select `main` (or `master`) and folder `/ (root)`, then click **Save**.
6. Wait 1-2 minutes; GitHub will provide your live URL (e.g. `https://yourusername.github.io/kochiretrace/`).

---

### Option 3: Vercel (CLI Deploy)
1. Open your terminal in the `WEBSITE/` directory.
2. Run the command:
   ```bash
   npx vercel
   ```
3. Follow the quick login prompts. When asked `Set up and deploy?`, type `y` and hit Enter.
4. Vercel will instantly upload and build the site, giving you a custom live URL.
