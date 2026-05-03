# GradeVault

**Track your grades, know where you stand.**

[![Live Site](https://img.shields.io/badge/Live_Site-grade--vault--sigma.vercel.app-10b981?style=for-the-badge)](https://grade-vault-sigma.vercel.app)
[![Hosted on Vercel](https://img.shields.io/badge/Hosted_on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Powered by Supabase](https://img.shields.io/badge/Powered_by-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](https://opensource.org/licenses/MIT)

## What is GradeVault?

GradeVault is a free grade tracker for college students. Add assessments, see your score vs class average, deviation, % lost/gained, per-course grade standing, semester stats, and CGPA prediction. Works on any device. Built specifically with IIIT Hyderabad students in mind but usable by anyone.

## Features

* Add assessments with marks, max marks, weightage, and optional class average
* Deviation from class average per assessment
* % lost and % gained per course
* Per-course grade standing
* Semester-wise performance summary
* Live CGPA prediction including predicted grades for ongoing courses
* One-click branch templates for IIIT Hyderabad — loads all semesters and courses with correct credits automatically
* Custom JSON template import for any other college or branch
* Works on phone, laptop, tablet
* Each user's data is fully private and isolated

## How to Use

1. Go to the live site and sign up — just a username and password, no email needed.
2. Go to Import Template → pick your branch (IIIT Hyderabad students) OR import your own JSON file (anyone else).
3. All semesters and courses load automatically with correct credit values.
4. Navigate to a course and add your assessments — name, category, marks obtained, max marks, weightage, and optionally the class average.
5. Set your grade (confirmed or predicted) for each course.
6. View per-course stats, semester summary, and overall CGPA on the dashboard.

## Custom Template Import

Anyone from any college can use GradeVault. You can import your own course structure using a simple JSON format:

```json
{
  "template_name": "My College — Branch Name",
  "semesters": [
    {
      "name": "Semester 1",
      "courses": [
        { "course_name": "Course Name", "course_code": "CODE101", "credits": 4 }
      ]
    }
  ]
}
```

The IIIT Hyderabad templates for all branches are in the `/templates` folder (or `/JSON` in the repository) and can be used as a reference.

## Tech Stack

| Technology | Role |
| :--- | :--- |
| HTML + Vanilla JavaScript | Entire frontend — no framework, no build step |
| JSX via Babel Standalone (CDN) | In-browser JSX compilation |
| Tailwind CSS (CDN) | Styling and dark theme |
| React Router DOM 6 (CDN) | Client-side routing |
| Supabase | PostgreSQL database, authentication, row-level security |
| Vercel | Static file hosting and global deployment |
| Chart.js (CDN) | Data visualisation |
| Lucide Icons (CDN) | Icon set |

**Note:** There is no npm, no `node_modules`, no build step, and no bundler. Every dependency is included via a CDN script tag.

## How It's Deployed

The frontend is just static files — `index.html` and JS files — pushed to GitHub. Vercel watches the repo and auto-deploys on every push within seconds. A `vercel.json` file handles SPA routing so page reloads don't 404. Supabase provides the database and auth — no server to manage or pay for.

## Data Model

* **profiles** — stores each user's username, linked to their Supabase auth account
* **semesters** — belong to a user, have a name
* **courses** — belong to a semester, store name, code, credits, and grade
* **assessments** — belong to a course, store marks, max marks, weightage, category, and class average

## Security & Privacy

* Passwords are hashed by Supabase Auth using bcrypt — nobody including the developer can read them.
* Row Level Security (RLS) is enabled on every table — users can only ever read and write their own data, enforced at the database level not just the app.
* No email address is collected — signup requires only a username and password.
* The Supabase anon key in the code is safe to be public because RLS enforces all access server-side regardless of who has the key.
* Assessment data is not directly linked to usernames in the database schema — only the username chosen at signup is visible to the developer.

## Contributing

PRs are welcome! Feel free to contribute bug fixes, new branch templates for other colleges, mobile improvements, or new features. Open an issue for suggestions or feedback.

## Made by

Amey Patel — IIIT Hyderabad
