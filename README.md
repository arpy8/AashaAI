<center>
    <img src="./public/logo-full.png" width="200">
    <p style="font-size:20px;color:gray;font-weight:1">AI-Powered Job Platform</p>
</center>


[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://hirelink.arpy8.com/)

## Overview

HireLink is a modern job platform designed for students and early-career professionals to discover, track, and apply for internships and jobs. Leveraging AI and a sleek UI, HireLink streamlines the job search process, provides personalized recommendations, and helps users manage their applications efficiently.

## Features

- **Job Discovery:** Browse curated internships and job listings with detailed descriptions.
- **Application Tracker:** Kanban-style board to track application statuses (Applied, In Review, Accepted, Rejected).
- **Profile Management:** Showcase education, experience, and projects in a professional profile.
- **Job Details Modal:** View comprehensive job information and apply or save jobs.
- **Responsive Design:** Optimized for desktop and mobile devices.
- **Dark Mode:** Modern dark theme for comfortable viewing.
- **AI Recommendations:** (Planned) Personalized job suggestions based on profile and activity.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **UI:** Tailwind CSS, Radix UI, Lucide Icons
- **State Management:** React Hooks
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Installation

```bash
git clone https://github.com/arpy8/HireLink.git
cd HireLink
pnpm install
```

### Running Locally

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
├── app/                # Next.js app directory (pages, layouts)
├── components/         # Reusable React components
├── public/             # Static assets (images, logos)
├── styles/             # Global and component styles
├── README.md           # Project documentation
```

## Usage

- **Browse Jobs:** Explore listings on the homepage.
- **Track Applications:** Use the tracker to manage your job applications.
- **Edit Profile:** Update your personal, education, experience, and project details.
- **Apply/Save Jobs:** Use modal actions to apply or bookmark jobs for later.

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements or new features.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a pull request

## License

This project is licensed under the MIT License.

## Live Demo

Your project is live at:  
**[hirelink.arpy8.com](https://hirelink.arpy8.com/)**