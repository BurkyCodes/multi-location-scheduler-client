# Multi-Location Scheduler (Client)

Frontend app for scheduling, shift assignment, staffing visibility, and staff shift actions.

## Run

```bash
npm install
npm run dev
```

## Required Environment Variables

Create `.env` in `client/`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Optional (only for web push notifications/Firebase messaging):

```env
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_web_app_id
VITE_FIREBASE_VAPID_KEY=your_web_push_certificate_key_pair
```

If Firebase envs are not provided, the app still runs without push registration.

Build:

```bash
npm run build
```

## Display Rules

- Shift dates/times are rendered in the shift's timezone (`location_timezone`/`timezone`), not browser local time.
- In the manager `Shifts` table, the location row subtitle uses `Week starts: <date>` (schedule week start date).
- Staff shift cards are ordered with active/upcoming shifts first, then past shifts below.
- Assignment violations are presented in the constraint modal for manager assignment flows.

## Availability Rules

- Recurring availability is stored per weekday window (`weekday`, `start_time_local`, `end_time_local`, `timezone`).
- If all 7 weekdays are selected, the saved payload contains 7 recurring availability records.
- Availability is timezone-based in the client form.

## Edge-Case Coverage

The current client implementation includes handling for:
- Same-timezone and cross-timezone shift rendering consistency.
- Availability timezone mismatch hints before assignment submit.
- Shift status labeling (`ongoing`, `assigned`, `shift past`) based on assignment/work status + time.
- Manager assignment override UX for 7th consecutive day with required reason capture.
