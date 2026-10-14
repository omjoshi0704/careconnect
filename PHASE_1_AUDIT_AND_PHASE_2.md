# CareConnect — Phase 1 audit and Phase 2 integration

## Phase 1: audit of the uploaded ZIP
- Node.js built-in `node:sqlite`; Node.js >= 22.5 required.
- Backend serves both API and static frontend on one origin, default port 5000.
- Authentication routes exist: register/login/logout/current session, profile, password-reset development flow.
- Database tables include users, sessions, doctors, drivers, appointments, ambulance_requests, profiles, reviews, hospitals, pharmacy and blood bank inventory.
- Existing `js/data.js`, doctors page and ambulance page contained fictional demo data; those items must not be presented as live providers.
- Appointment form had a backend call, but the doctor selection was by display name and included a patient-name field that backend ignored.
- Ambulance form and SOS were demo-only; now the request form writes a pending request to the API and reports the returned status honestly. Requests are deliberately not auto-assigned because verified providers and delivery acknowledgements are not implemented.
- Uploaded ZIP did not include `backend/careconnect.db`. If a DB exists on your computer, back it up before replacing project files.

## Phase 2: implemented in this package
- Registration form now asks for specialty for doctor accounts and vehicle/service area for drivers, and sends pharmacy/blood-bank names for those roles.
- Successful login/registration opens the role dashboard.
- New `pages/dashboard.html` shows patient appointments/ambulance requests, lets doctors manage availability and appointment statuses, and lets drivers manage availability and view/complete assigned requests.
- Doctors list now loads registered doctor records from `/api/doctors` instead of presenting fictional demo doctors.
- Appointment booking sends the selected database doctor ID to `/api/appointments` and displays the database booking ID/status.
- Ambulance form sends requests to `/api/ambulance/request`; fake ETA and fake SOS success messaging are removed. The UI warns that real dispatch/notifications are not yet available.

## Not yet complete / do not rely on for real emergencies
- Real identity, medical licence, vehicle and provider verification.
- Reliable SMS/push/call notifications and escalation/acknowledgement.
- Robust live GPS dispatch, distance-based matching, concurrency-safe assignment, monitoring and end-to-end production testing.
- The current backend's ambulance matching is not a verified real dispatch system. This package does not claim to provide one.
- Password reset codes are printed to the backend terminal in local development; no SMS/email provider is configured.

## Run locally
1. Install Node.js 22.5 or newer.
2. Extract this folder and open a terminal in `CareConnect_Backend_Ready`.
3. Run `node --version` and confirm it is v22.5 or newer.
4. Run `npm start` (no npm packages required for the current backend).
5. Open `http://localhost:5000` in the browser. Do not open `index.html` directly with `file://`.
6. Create a test patient account, then test a separate doctor and driver account. Availability defaults to OFF. Use test data only.
