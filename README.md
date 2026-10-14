# CareConnect — Phase 3 & Phase 4 build

See **PHASE_3_PHASE_4_GUIDE.md** for the new features, setup steps, test checklist, and deployment limitations. Keep your previous project folder as a backup and test this ZIP in a separate folder first.

# Care Connect — Responsive Healthcare Front-End

## Updated local setup and login fixes

1. Install **Node.js 22.5 or newer**.
2. Open this folder in VS Code. Open Terminal in the project root (the folder containing `package.json`).
3. Run `npm start`.
4. Open **http://localhost:5000** in your browser. Do not open `index.html` directly or use GitHub Pages for backend testing.
5. Register a test account, then login. Successful login saves the token/user in `localStorage` and redirects to `home.html`; dashboard validates the session with `/api/auth/me`.
6. Profile details, appointment bookings, and submitted reviews are stored in SQLite through authenticated API routes. Appointment booking requires a doctor account present in the database.\n7. Forgot Password is **local development only**: the code appears in the backend terminal and expires after 10 minutes. It is not sent by SMS. Do not deploy this reset flow publicly until a real SMS provider, rate limiting, and secure reset handling are configured.

The backend uses Node's built-in `node:sqlite`, so Node.js 22.5+ is required. No `npm install` is required for the built-in backend dependencies.


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


## 🔐 Backend + Database

This version includes a working **Node.js + SQLite backend**. It uses only Node's built-in modules, so there is no Express, MongoDB, MySQL or other package to install.

### Requirements

- Node.js **22.5 or newer** (the database uses Node's built-in `node:sqlite` module)
- VS Code or another code editor

Check your Node version:

```bash
node -v
```

### Start Care Connect

Open the terminal **inside the CareConnect folder** and run:

```bash
npm install
npm start
```

Then open:

```text
http://localhost:5000/
```

Do **not** use Live Server or a PHP server for the backend-connected version. The Node server serves both the frontend and `/api/*` endpoints.

### Demo patient login

```text
Phone: 9000000001
Password: demo1234
```

The database also contains demo doctor, ambulance-driver, pharmacy and blood-bank accounts. All seeded demo accounts use:

```text
demo1234
```

### Main API modules

- `/api/auth/*` — registration, login, logout, current user
- `/api/hospitals` — hospital directory
- `/api/doctors` — doctors and availability
- `/api/appointments` — patient bookings and doctor status updates
- `/api/ambulance/*` — driver availability and ambulance requests
- `/api/pharmacy/*` — medicine search and pharmacy stock
- `/api/bloodbank/*` — blood stock
- `/api/reviews` — patient reviews
- `/api/health` — server health check

### Database

The SQLite database is:

```text
backend/careconnect.db
```

The backend automatically creates the required tables. A new database is seeded with demo accounts and the configured Nanded hospital directory.

> Portfolio/demo note: hospital, doctor, ambulance and stock information in this project should not be treated as real-time medical or emergency data. For a production healthcare system, use verified providers, real-time integrations, proper consent/privacy controls, HTTPS, secure secrets, audit logs and professional medical/legal review.

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

## SMS OTP password reset

Forgot Password uses Twilio Verify SMS once configured. See [`SMS_OTP_SETUP.md`](SMS_OTP_SETUP.md) for setup, Windows PowerShell commands, hosting environment variables, rate limits, and testing. Without valid `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID`, SMS reset intentionally returns a configuration error; it does not fake an OTP send.


## Email + phone account fields and password reset
The current build supports registration with email and phone, login using either email or phone, and an email field in the profile. Forgot Password lets users choose Twilio Verify Email or SMS. Read `SMS_OTP_SETUP.md` for Windows setup and Twilio email-channel configuration. Email OTP requires the Email channel to be configured in your Twilio Verify service.

### Start on Windows
Run PowerShell from the folder containing `package.json`:
```powershell
cd "$HOME\Downloads\CareConnect_Phase3_Phase4_SMS_OTP\CareConnect_Backend_Ready"
node -v
npm start
```
Use Node.js 22.5.0 or newer. `npm install` is optional because this project has no external npm dependencies. Open `http://localhost:5000`.
