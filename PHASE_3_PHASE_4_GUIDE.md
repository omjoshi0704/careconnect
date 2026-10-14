# CareConnect — Phase 3 & Phase 4

This package builds on the Phase 1/2 project. It preserves the existing page structure and adds focused improvements; it is still a student prototype, not a real emergency-dispatch system.

## Phase 3 — deployment readiness and security

### Included
- Server reads the host-provided `PORT` environment variable.
- SQLite location can be configured with `CARECONNECT_DB_PATH` for a persistent writable disk.
- Doctor directory API supports `q`, `specialty`, `hospital`, and `available=1` filters.
- Appointment booking rejects an already active (pending/confirmed) appointment for the same doctor/date/time.
- Health endpoint: `GET /api/health`.

### Important free-hosting limitation
A static host such as GitHub Pages cannot run this Node backend. A free Node host may also delete local SQLite data on restart/sleep unless persistent storage is available. Do not put real patient data into this prototype. Before public production deployment, migrate the database to a managed persistent database (for example PostgreSQL), configure HTTPS and secrets, add rate limiting and audit logging, and test backups/restore. This ZIP does not pretend those production controls are already complete.

### Local setup (Windows)
1. Install Node.js 22.5+ from https://nodejs.org/en/download.
2. Extract this ZIP.
3. Open the `CareConnect_Backend_Ready` folder.
4. Click the folder address bar, type `cmd`, and press Enter.
5. Run `node --version` and confirm v22.5+.
6. Run `npm start`.
7. Open `http://localhost:5000`.
8. Test `http://localhost:5000/api/health` — it should return JSON with `"ok":true`.

No `npm install` is needed for the current zero-dependency Node backend.

## Phase 4 — doctor appointments and location-assisted ambulance request

### Doctor directory
- Search by doctor name, specialty, hospital name, or hospital address.
- Optional “Show only available doctors” filter.
- Only registered database doctor accounts are displayed; do not treat demo records as verified providers.

### Appointments
- Booking uses the selected database doctor ID.
- Date cannot be in the past.
- Backend checks for an active appointment at the same doctor/date/time and rejects duplicates.
- Appointment status begins as `pending`; a doctor must review it.

### Ambulance request and maps
- Patient can type a pickup address or explicitly grant browser location permission.
- Coordinates can be opened in OpenStreetMap for the user to verify the pickup point.
- Location permission is optional; the user can type an address manually.
- The backend records a request as `pending`; this does NOT notify or dispatch a verified ambulance and there is no reliable live ETA.
- For an actual emergency in India, call **112**. Do not rely on this student project for emergency response.

## Test checklist
- [ ] Register a patient account and sign in.
- [ ] Register a doctor account; set availability ON in the dashboard.
- [ ] Search doctor by name/specialty and test the available-only filter.
- [ ] Book one time slot; try the same doctor/date/time again and confirm it is rejected.
- [ ] Sign in as doctor and update appointment status.
- [ ] Open Emergency; test manual pickup location and (if desired) browser geolocation.
- [ ] Confirm the app describes the ambulance request as “pending” and does not claim that an ambulance was dispatched.
- [ ] Check the browser console and terminal for errors.

## Still required before real public use
- Verified doctor licences, hospitals and ambulance operators.
- Actual request notifications with delivery acknowledgements and escalation.
- Real dispatch workflow, provider acceptance, live location and ETA calculation.
- Production database, HTTPS, rate limits, backups, privacy/consent and security review.
- End-to-end testing on the final hosting provider.
