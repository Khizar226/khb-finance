# Finance Fortress (PKR Personal Finance Dashboard)

This is a static `HTML + CSS + JS` personal finance tool with Firebase Auth + Firestore backend:
- Daily income/expense ledger
- Assets register
- Loan tracker (given + taken)
- Fund planning/budgeting
- Filters + export (CSV, PDF A4, PNG, JPG, print)
- Secure access with password + Finance PIN + authenticator-based 2FA + recovery codes

## 1. File Setup

Update `firebase-config.js` with your Firebase project credentials.

You can copy from:
- `firebase-config.example.js`

## 2. Firebase Console Setup

1. Create a Firebase project.
2. Add a **Web App** and copy config keys into `firebase-config.js`.
3. Enable **Authentication** providers:
   - Email/Password
   - Google (optional)
4. Create **Cloud Firestore** in production mode.
5. Publish rules from `firestore.rules`.

## 3. Firestore Rules Deployment

Install Firebase CLI:

```bash
npm i -g firebase-tools
firebase login
firebase init firestore
```

Use these files from this project:
- `firestore.rules`
- `firestore.indexes.json`

Deploy:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 4. DreamHost Deployment (Static Site)

1. In DreamHost panel, create a domain/subdomain for this app.
2. Enable SSL/HTTPS for the domain.
3. Upload all project files to the web root using FTP/SFTP (or Git deploy if configured).
4. Make sure these files are uploaded:
   - `index.html`
   - `auth.html`
   - `dashboard.html`
   - `styles.css`
   - `app.js`
   - `auth.js`
   - `dashboard.js`
   - `catalog.js`
   - `utils.js`
   - `firebase-config.js`
5. Open the domain and test full flow:
   - Sign up
   - 2FA setup with authenticator
   - Login + PIN + 2FA
   - Add transaction

## 5. Security Notes

- Firebase API keys are public by design for web apps. Security comes from Auth + Firestore Rules.
- This app enforces session unlock (`PIN + 2FA`) client-side before dashboard access.
- For stronger enterprise-grade security, add Cloud Functions for server-side 2FA verification and audit enforcement.

## 6. CSV Bulk Import Format

Header row (lowercase recommended):

```csv
detail,amount,flowType,account,head,date,time,notes
Fuel,2500,expense,Meezan Bank,Fuel & Transport,17-01-2026,14:30,Office visit
```

Accepted date formats:
- `DD-MM-YYYY`
- `YYYY-MM-DD`

Time format:
- `HH:mm`

If date/time is empty, current timestamp is used automatically.
