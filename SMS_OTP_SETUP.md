# CareConnect — Email + Phone Login and OTP Setup

## What's included
- New registrations require name, email, 10-digit phone number, role, and password.
- Login accepts either registered email address OR 10-digit phone number with the password.
- Profile displays and saves the account email address. Email is stored on the `users` database table.
- Forgot Password lets the user choose Email OTP (recommended) or SMS OTP.
- Both OTP channels use Twilio Verify. OTP values are not stored by the app.
- Password reset revokes existing sessions; OTP request/verification endpoints have rate limits.
- Existing page styling is preserved as much as possible.

## Important: Twilio Email channel
The backend sends `Channel=email` to the configured Twilio Verify Service. Email delivery must be enabled/configured for that Verify Service in Twilio Console, including the required email integration/provider setup for your account. If Email is not configured, Twilio may reject the request. Check Twilio Verify logs if delivery fails. The app does not switch to Gmail SMTP.

## Windows setup (PowerShell)
1. Extract the ZIP.
2. Open PowerShell and go to the folder that directly contains `package.json`:

```powershell
cd "$HOME\Downloads\CareConnect_Phase3_Phase4_SMS_OTP\CareConnect_Backend_Ready"
dir package.json
```

If `dir package.json` shows the file, you are in the correct folder. Do not run `npm start` from the parent folder.

3. Check Node.js:

```powershell
node -v
```

This project uses Node's built-in `node:sqlite` and requires Node.js **22.5.0 or newer**. If the command prints an older version, update Node.js first.

4. `package.json` currently has no external npm dependencies, so `npm install` is not required for the current project. You can still run it if you want; the key command is:

```powershell
npm start
```

Keep that terminal open. The API should be available at `http://localhost:5000`; check `http://localhost:5000/api/health`.

## Set Twilio credentials
Use your own rotated/current credentials in the same PowerShell terminal before `npm start`:

```powershell
$env:TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$env:TWILIO_AUTH_TOKEN="YOUR_NEW_AUTH_TOKEN"
$env:TWILIO_VERIFY_SERVICE_SID="VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
npm start
```

Never paste credentials into chat, HTML, JavaScript, ZIP readme files, or GitHub. An Auth Token previously shared in a chat should be rotated in Twilio Console.

## Database
SQLite is created automatically by `backend/db.js`. New databases include the `users.email` column and a unique index. Existing databases are migrated on startup to add the email column without deleting existing user records. New accounts require a valid email address; existing accounts created before this update may have an empty email and should sign in with their phone number. Update their email in the Profile page before using Email OTP.

## Quick testing
1. Start the backend with `npm start`.
2. Open `http://localhost:5000`.
3. Create a test account using a valid email, 10-digit Indian mobile number, and password of at least 8 characters containing a number.
4. Sign out/return to login and verify that both the email and phone number work as the login identifier.
5. Open Profile and check the email is shown and can be saved.
6. Forgot Password: select Email OTP first, request a code, then enter the code and a new password. This requires Twilio Email channel to be configured.
7. For SMS testing, select Phone SMS OTP. This uses SMS verification quota.
8. Verify the new password works and old sessions are revoked.

If `npm start` reports `EADDRINUSE` for port 5000, another backend instance is already using the port. Stop that old terminal with Ctrl+C or close it, then start the server once.
