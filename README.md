<div align="center">
  
  # 🚀 GitEase
  
  **Deploy projects and manage GitHub repositories in seconds—without touching a terminal.**

  [![Live Demo](https://img.shields.io/badge/Live_Demo-View_Site-f78166?style=for-the-badge&logo=vercel)](https://gitease-olive.vercel.app/)
  [![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
  [![GitHub API](https://img.shields.io/badge/GitHub_API-181717?style=for-the-badge&logo=github)](https://docs.github.com/en/rest)

</div>

---

## 🌟 Overview

**GitEase** is a modern, browser-based web application designed to dramatically simplify your GitHub workflow. Whether you're rapidly deploying side projects, managing files, or editing your `README.md`, GitEase brings the power of Git to a sleek, visual interface. 

Forget `git init`, `git add .`, and `git commit`—just drag, drop, and push.

## ✨ Features

- **🌩️ Drag & Drop Push**: Drop a folder or a `.zip` file directly into your browser. GitEase automatically filters out junk (like `node_modules` or `.DS_Store`), stages the files, and pushes them to a new or existing repository in one click.
- **📁 Built-in File Explorer**: Browse your repositories exactly like you would in a native file manager. 
- **💻 Full-Screen Web IDE**: Edit your code files directly in the browser with our custom-built, dark-themed code editor that syncs perfectly with GitHub.
- **📝 Visual README Editor**: Write and edit your `README.md` files visually using a rich-text WYSIWYG editor (powered by Tiptap) with instant Markdown sync.
- **🗑️ Advanced Repo Management**: Delete files or entire directories atomically using the GitHub Git Trees API. 
- **🔒 Secure Authentication**: Seamlessly log in with your GitHub account (via Auth.js) to securely manage your own repositories.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Authentication:** [Auth.js (NextAuth)](https://authjs.dev/)
- **API Integration:** [Octokit](https://github.com/octokit/octokit.js) (GitHub REST API)
- **Rich Text Editing:** [Tiptap](https://tiptap.dev/)
- **Icons:** [Lucide React](https://lucide.dev/)

## 🚀 Getting Started Locally

Want to run GitEase on your own machine? Follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/your-username/gitease.git
cd gitease
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root of the project and add the following keys. You will need to create a **GitHub OAuth App** to get your Client ID and Secret.

```env
GITHUB_ID=your_github_oauth_client_id
GITHUB_SECRET=your_github_oauth_client_secret
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=your_generated_random_secret_string
```
*(Tip: You can generate a secure `AUTH_SECRET` by running `npx auth secret`)*

### 4. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

## 🔗 Live Deployment

Check out the live production build here: **[GitEase Live](https://gitease-olive.vercel.app/)**

---

<div align="center">
  <i>Built with ❤️ to make deploying side-projects easier.</i>
</div>
