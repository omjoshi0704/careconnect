# Care Connect — Responsive Healthcare Front-End

Care Connect is a **static front-end healthcare dashboard prototype** built with HTML, CSS and JavaScript. It demonstrates a connected patient experience for doctors, hospitals, pharmacy, labs, medical records and emergency ambulance services.

> **Demo only:** all doctors, hospitals, ambulance records, availability, locations and health records are fictional. There is no backend, real authentication, payment system, medical advice or real ambulance dispatch.

## ✨ Included

- Login / Sign Up demo screen
- Responsive healthcare dashboard
- Doctor search and specialty filter
- Appointment booking demo
- Hospital directory with demo bed availability
- Emergency SOS / ambulance request flow
- Pharmacy medicine search demo
- Diagnostic/lab booking demo
- Digital health records page
- Patient profile page
- Patient reviews with star rating
- Mobile hamburger navigation
- Responsive layouts for desktop, tablet and phone
- Safer handling of user-entered review and medicine text
- GitHub Pages deployment workflow included

## 📁 Project structure

```text
CareConnect/
├── index.html
├── home.html
├── README.md
├── .gitignore
├── .nojekyll
├── .github/
│   └── workflows/
│       └── pages.yml
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── data.js
└── pages/
    ├── doctors.html
    ├── appointment.html
    ├── hospitals.html
    ├── ambulance.html
    ├── pharmacy.html
    ├── labs.html
    ├── reports.html
    └── profile.html
```

## ▶️ Run locally

No installation is required.

### Option 1 — Open directly

Open `index.html` in Chrome, Edge or Firefox.

### Option 2 — VS Code Live Server

1. Open the `CareConnect` folder in VS Code.
2. Install the **Live Server** extension if needed.
3. Right-click `index.html`.
4. Select **Open with Live Server**.

### Option 3 — Python server

From the project folder:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500/
```

## 🚀 Deploy to GitHub Pages

This project already contains `.github/workflows/pages.yml`, so it can be deployed through GitHub Actions.

1. Create a new GitHub repository, for example `CareConnect`.
2. Upload **the contents of this `CareConnect` folder** to the repository root.
3. Make sure `index.html` is directly in the repository root.
4. Commit and push to the `main` branch.
5. On GitHub, open **Settings → Pages**.
6. Under **Build and deployment**, select **GitHub Actions** if it is not already selected.
7. Open the repository's **Actions** tab and wait for the `Deploy Care Connect to GitHub Pages` workflow to finish.
8. GitHub will provide the live Pages URL.

The site uses relative paths, so it works correctly when hosted under a GitHub Pages repository URL.

## 🧪 Testing checklist

Before publishing, verify:

- Login button opens `home.html`.
- Sign Up tab switches correctly.
- Desktop navigation opens every linked page.
- Mobile hamburger menu opens and closes.
- Doctor search and specialty filter work.
- Doctor **Book** buttons open the appointment page with the selected doctor.
- Hospital, pharmacy, lab and ambulance demo actions show feedback.
- Review submission works.
- User-entered review/medicine text is safely escaped before being inserted into the page.
- All pages load without missing local CSS/JS files.

## 🎨 Design improvements made

- More consistent responsive spacing and card sizing
- Better small-screen typography
- Improved touch targets for mobile controls
- Improved mobile navigation accessibility with `aria-expanded` and labels
- More robust responsive service cards and forms
- Better toast positioning on phones
- Reduced horizontal overflow risk
- Consistent portfolio footer branding
- Added GitHub Pages deployment workflow

## 👤 Project

**Care Connect — Front-End Healthcare Project**

Built by **Om Joshi** as a college/portfolio project.
