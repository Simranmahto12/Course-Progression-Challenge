# MSOT Course Progression Platform
### Mirai School of Technology — BTech CSE (AI/ML)

> A production-ready, deterministic academic course progression web platform. Built with **Standard HTML5, CSS3, and Vanilla JavaScript (ES6 Modules)** with **Zero Build Tools required**, paired with a self-contained **Node.js, Express, and pure SQLite (`better-sqlite3`)** backend.

---

## 🌟 Visual Branding & Design System
- **Official Mirai Brand Identity:**
  - **Design Mark:** The official connected neural network node emblem with cyan/royal blue gradient node (`assets/mirai-logo.png` / `assets/mirai-logo-icon.png`).
  - **Primary / Deep Navy:** `#000a28` (Headers, sidebars, primary text, brand emblems).
  - **Accent / Royal Blue:** `#4361ee` (Active buttons, CTAs, links, highlights).
  - **Backgrounds:** Clean white (`#ffffff`) and soft utility backgrounds (`#f8f9fb`).
- **Mobile-First Faculty Logging:** Touch-friendly session logging interface with 1-tap outcome chips, completion slider, and quick presets (<60s logging).

---

## 📁 Clean, No-Build Web Project Structure

```
Course-Progression-Challenge/
├── index.html             # Main web entry point with Mobile OTP Authentication card & role views
├── styles.css             # Consolidated Mirai branding, responsive mobile CSS layout
├── app.js                 # Core client JavaScript engine (state, Mobile OTP handling, DOM, Chart.js)
├── server.js              # Pure Node.js (Express) server with Mobile Number + Mock OTP endpoints
├── .env                   # Fresh environment configuration with Google Client ID, secret, and port
├── .env.example           # Environment template file
├── assets/                # Official brand design mark (mirai-logo.png, mirai-logo-icon.png)
├── backend/               # Self-contained SQLite Academic Engine (100% Pure JavaScript)
│   ├── src/
│   │   ├── db.js          # SQLite database connection & schema auto-creation
│   │   ├── seed.js        # Database seed script for campuses, timetables, and subjects
│   │   ├── routes/        # Auth (send-otp, verify-otp, google), Admin, Timetables, Logs, Dashboards
│   │   └── services/      # Core deterministic calculation engine (Buffer ratio, Worst subject roll-up)
│   └── tests/             # Automated test suite (Jest + Supertest in JavaScript)
└── README.md              # Documentation and usage guide
```

---

## 🚀 Quickstart Guide (Instant Run with `npm install` and `npm start`)

### Prerequisites
- **Node.js**: v18+ (tested on Node v20/v22/v26)
- **npm**: v9+

### Instant Pure Node.js Server (No TypeScript Required)
```bash
# 1. Install dependencies
npm install

# 2. Start the Express server
npm start
```

- **Live Web Portal:** [http://localhost:3000](http://localhost:3000) (or open `index.html` directly in any browser)
- **API Health Check:** [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 📱 Mobile Number + OTP Authentication Module

The MSOT platform includes a dedicated, hackathon-friendly 2-step mobile authentication flow:
- **No external SMS APIs** required (zero network latency or delivery failures).
- **Hardcoded Demo Passcode:** The OTP is hardcoded to `123456` across all numbers.
- **Auto-Fill Callout:** An on-screen banner displays `(Demo Mode: Your OTP is 123456)` with a 1-tap "Auto-Fill" button.
- **6-Digit Interactive OTP Grid:** Automatic focus advance, backspace navigation, and paste support.

### ⚡ 1-Tap Demo Test Phone Numbers:
| Role | Demo Phone Number | Demo OTP | Assigned Identity |
|---|---|---|---|
| **Admin / Program Manager** | `9876543210` | `123456` | Dr. Suresh Varma |
| **Campus Manager** | `9876543211` | `123456` | Priya Nair (HI-Tech) |
| **Faculty Member** | `9876543212` | `123456` | Prof. Rajesh Sharma |
| **Student** | `9876543213` | `123456` | Aarav Mehta (Batch A) |
| *Any 10-digit number* | `e.g. 9123456789` | `123456` | Auto-provisioned Faculty session |

Easily switch roles using the **"VIEW AS"** dropdown in the header bar:

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Admin / Program Manager** | `admin@mirai.edu` | `mirai123` | Program-wide governance across 4 campuses, calendar setup, worst-subject roll-up dashboards |
| **Campus Manager** | `manager.hitech@mirai.edu` | `mirai123` | Campus timetable slots, campus track health, 48-hour unlogged session escalation alerts |
| **Faculty** | `faculty.sharma@mirai.edu` | `mirai123` | Pre-filled today's timetable sessions, <60s session logging, exam scope mapping |
| **Student** | `student.aarav@mirai.edu` | `mirai123` | Read-only batch progress roadmap, exam dates, syllabus scopes (staff notes hidden) |

---

## 🗄️ Database Schema (SQLite)

Tables are created automatically on server startup:
- **`campuses`**: `id`, `name` ('HI-Tech', 'Ratnam', 'RGIB', 'JUJ')
- **`semesters`**: `id`, `campus_id`, `start_date`, `end_date`, `working_saturdays_rule` ('ALL_SATURDAYS', 'NO_SATURDAYS', 'SECOND_FOURTH_SATURDAY'), `holidays_json`
- **`timetables`**: `id`, `batch_id`, `subject_id`, `faculty_id`, `day_of_week`, `start_time`, `end_time`, `room`
- **`topics`**: `id`, `subject_id`, `unit_name`, `topic_name`, `planned_hours`, `exam_scope_flag`, `sequence`, `status`, `percentage_complete`
- **`daily_logs`**: `id`, `session_date`, `timetable_id`, `faculty_id`, `status` ('Completed', 'In Progress', 'Skipped', 'Merged', 'Cancelled'), `percentage_complete`, `topics_covered`, `leftovers`, `notes`, `created_at`
- **`users`**: `id`, `email`, `password_hash`, `name`, `role` ('admin', 'campus_manager', 'faculty', 'student'), `campus_id`, `batch_id`
- **`tracks`**: `id`, `name` ('Mirai Track', 'University Track'), `description`
- **`batches`**: `id`, `campus_id`, `track_id`, `name`
- **`subjects`**: `id`, `batch_id`, `faculty_id`, `code`, `name`, `target_finish_date`, `color`
- **`exams`**: `id`, `semester_id`, `name`, `display_name`, `start_date`, `end_date`
- **`alerts`**: `id`, `subject_id`, `recipient_user_id`, `type`, `title`, `message`, `status`, `scheduled_date`, `created_at`
- **`ai_draft_logs`**: `id`, `provider` ('whatsapp', 'telegram', 'voice_web', 'text_input'), `sender_phone_or_id`, `faculty_id`, `raw_message_text`, `parsed_payload_json`, `confidence_score`, `needs_clarification`, `clarification_prompt`, `status` ('PROPOSED', 'CONFIRMED', 'DISCARDED'), `created_at`
- **`campus_summaries`**: `id`, `campus_id`, `week_start_date`, `week_end_date`, `summary_text`, `slipping_subjects_json`, `recovery_actions_json`, `grounded_evidence_json`, `status`, `review_status`, `reviewed_by`, `reviewed_at`, `created_at`
- **`calendar_sync_accounts`**: `id`, `user_id`, `provider` ('google', 'outlook'), `external_account_id`, `calendar_id`, `sync_exam_dates`, `sync_extra_classes`, `status` ('CONNECTED', 'REVOKED', 'CONFIG_REQUIRED'), `created_at`, `last_synced_at`
- **`calendar_synced_events`**: `id`, `sync_account_id`, `event_type` ('EXAM', 'EXTRA_CLASS', 'REGULAR_CLASS'), `source_id`, `external_event_id`, `event_summary`, `start_time`, `end_time`, `last_pushed_hash`, `external_etag`, `conflict_status` ('IN_SYNC', 'CONFLICT_EXTERNAL_MODIFICATION'), `conflict_details`, `last_synced_at`
- **`visiting_faculty_policies`**: `id`, `campus_id`, `rate_per_lecture_hour`, `lab_multiplier`, `max_hours_per_month`, `conveyance_allowance`, `currency`, `effective_from`, `configured_by`, `updated_at`
- **`honorarium_reports`**: `id`, `campus_id`, `month_year`, `faculty_id`, `planned_sessions_count`, `planned_hours`, `delivered_sessions_count`, `delivered_hours`, `rate_applied`, `total_amount`, `source_log_ids_json`, `status` ('DRAFT', 'SUBMITTED', 'APPROVED_BY_ADMIN', 'PAID'), `approved_by`, `approved_at`, `notes`, `created_at`

---

## ⚡ Stretch-Goal Features Implemented

### 1. WhatsApp / Telegram Webhook Session Logging
- **Voice / Text Message Parsing:** Inbound webhook (`POST /api/webhooks/whatsapp` & `POST /api/webhooks/telegram`) and frontend quick-input endpoint (`POST /api/logs/parse-message`) parse faculty notes or audio transcripts into structured proposed draft logs.
- **Strict Safety Guarantee (Never Silently Committed):** Proposed entries are stored in `ai_draft_logs` with status `PROPOSED`. They are **never** silently written to `daily_logs`.
- **Explicit Faculty Confirmation:** Faculty must review and confirm or edit the draft via `POST /api/logs/drafts/:id/confirm` before the session is committed.
- **Faculty Subject Assignment Check:** Validates that the sender phone is registered to a faculty member assigned to the subject. Unassigned subjects or low confidence trigger an interactive clarification prompt.
- **HMAC SHA-256 Webhook Verification:** Verifies Meta WhatsApp webhook signatures with timing-safe comparison; requires secret tokens for Telegram.

### 2. AI Weekly Grounded Campus Progression Summary
- **Evidence-Grounded Synthesis:** Scans subjects with buffer ratio $< 1.15$ or `AT_RISK` / `BEHIND` status, and cross-references recorded notes from daily logs and missed alerts (`GET /api/campus-summaries` & `POST /api/campus-summaries/generate`).
- **Citation of Evidence:** Every recommendation cites specific dates, recorded faculty notes, and timetable slots.
- **Manager Review Suggestion Label:** Prominently tagged as `SUGGESTION_FOR_MANAGER_REVIEW`. Timetables and lesson plans are **never** auto-modified.
- **Manager Review Workflow:** Campus managers review, record notes, and acknowledge via `POST /api/campus-summaries/:id/review`.
- **Zero Student PII:** Only anonymized syllabus metrics and faculty notes are processed.

### 3. Google Calendar & Microsoft Outlook Sync
- **Opt-in Sync:** Faculty and students opt-in to sync upcoming exam windows and scheduled timetable classes (`GET /api/calendar-sync/status` & `POST /api/calendar-sync/connect`).
- **Duplicate Prevention via SHA-256 Hashing:** Deterministic hashing (`sourceId::summary::startTime::endTime`) prevents duplicate events.
- **External Modification Conflict Detection:** If an event is edited externally, it is flagged as `CONFLICT_EXTERNAL_MODIFICATION` rather than silently overwritten.
- **One-Click Conflict Resolution:** Choose `OVERWRITE_EXTERNAL` (authoritative MSOT schedule) or `KEEP_EXTERNAL` (retain user modification).
- **One-Click Disconnect:** Revoke and remove sync in 1 click (`POST /api/calendar-sync/disconnect`).
- **Clear Setup Guides:** When integration credentials are not configured, clear step-by-step setup instructions are displayed without claiming the integration works.

### 4. Visiting Faculty Lecture Tracking & Monthly Honorarium
- **Contact Hour Compensation:** Tracks planned vs. delivered sessions and actual contact hours for visiting faculty each month (`POST /api/honorarium/generate`).
- **Administrator-Configured Policy (Never Invented):** Hourly rates must be explicitly configured by an administrator per campus (`POST /api/honorarium/policy`).
- **100% Audit Trail to Source Session Logs:** Every generated report embeds an array of linked `daily_logs` IDs. Users can click "Audit" in the UI to inspect each source log.
- **Two-Step Approval Workflow:** Faculty submits draft report (`POST /api/honorarium/reports/:id/submit`); Academic Administrator reviews and approves (`POST /api/honorarium/reports/:id/approve`).

### 5. Certified CSV & Google Sheets Exports
- **Role- and Campus-Scoped Exports:**
  - `GET /api/csv/export/semester-progress` (Semester progression master)
  - `GET /api/csv/export/timetable` (Weekly teaching timetable)
  - `GET /api/csv/export/syllabus-coverage` (Syllabus units and lesson plans)
  - `GET /api/csv/export/session-logs` (Historical faculty daily logs)
  - `GET /api/csv/export/exam-scope` (Exam windows and cutoff dates)
  - `GET /api/csv/export/honorarium` (Visiting faculty compensation ledger)
  - `GET /api/csv/export/ical` (.ics calendar feed)
- **Formatting Standards:** ISO 8601 timestamps, UTF-8 BOM (`\uFEFF`) for Excel compatibility, and stable unique IDs across all rows.
- **Strict Role Permissions:** Students are forbidden from viewing or exporting faculty honorarium (HTTP 403 Forbidden). Campus managers are strictly scoped to their assigned campus.
- **Google Sheets API Integration:** `POST /api/csv/sheets/:type` writes directly to Google Sheets when configured, or provides immediate CSV download along with exact API setup instructions.

---

## 📐 Calculation Engine & Formulas

Implemented in both the backend and frontend JavaScript engines:
1. **Hours in Scope:** Sum of `planned_hours` of all non-skipped topics.
2. **Covered Hours:**
   - Completed topics: $100\% \times \text{planned\_hours}$
   - In Progress topics: $\text{planned\_hours} \times (\% \text{ complete} / 100)$
3. **Available Teaching Hours:**
   Walks eligible working days from today to the subject's target finish date (or exam start date), checking:
   - Sundays (always off)
   - Saturday rule (`SECOND_FOURTH_SATURDAY` treats 2nd and 4th Saturdays as off)
   - Institutional holidays (`holidays_json`)
   - Sums durations of matching weekly timetable slots minus cancelled classes.
4. **Buffer Ratio:** $\text{Available Hours} \div \text{Remaining Planned Hours}$
   - $\ge 1.15 \rightarrow$ `ON TRACK` (Green)
   - $1.00 - 1.15 \rightarrow$ `TIGHT` (Yellow)
   - $< 1.00 \rightarrow$ `DANGER` (Red)
5. **Worst-Subject Roll-Up Rule:**
   Campus and track status evaluates $\min(\text{buffer\_ratio})$. A single subject in `DANGER` flags the campus in `DANGER` and explicitly names the bottleneck subject for leadership intervention.

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Mock & credentials authentication returning user role and JWT token |
| `GET` | `/api/auth/me` | Fetch currently logged-in user profile |
| `GET` | `/api/auth/demo-users` | Fetch demo accounts for 1-click persona switching |
| `POST` | `/api/admin/semesters` | Create semester configuration and calendar rules |
| `POST` | `/api/timetables` | Create weekly timetable schedule slot |
| `GET` | `/api/timetables` | Fetch weekly schedule filtered by campus, batch, or faculty |
| `GET` | `/api/logs/today` | Fetch today's scheduled sessions pre-filled for faculty |
| `POST` | `/api/logs` | Save daily session log in under 60 seconds |
| `GET` | `/api/dashboards/global` | Global cross-campus roll-up metrics using the worst-subject rule |
| `GET` | `/api/dashboards/exam-readiness` | In-scope coverage and hours needed before upcoming exams |
| `GET` | `/api/dashboard/:role` | Dedicated dashboard for `admin`, `campus-manager`, `faculty`, or `student` |
| `GET` | `/api/subjects` | Full subjects list with topics, progress, and exam countdowns |
| `GET` | `/api/subjects/:id/explain-calculation` | Transparent step-by-step mathematical breakdown of buffer ratio |
| `POST` | `/api/logs/parse-message` | Parse text/voice transcript into a PROPOSED draft session log |
| `GET` | `/api/logs/drafts` | Retrieve pending proposed drafts for faculty review |
| `POST` | `/api/logs/drafts/:id/confirm` | Explicit faculty confirmation to save draft to official daily logs |
| `POST` | `/api/logs/drafts/:id/discard` | Discard an unconfirmed draft session |
| `POST` | `/api/webhooks/whatsapp` | Meta WhatsApp webhook handler with HMAC SHA-256 signature verification |
| `POST` | `/api/webhooks/telegram` | Telegram Bot webhook handler with secret token header verification |
| `GET` | `/api/campus-summaries` | Retrieve weekly campus progression summaries |
| `POST` | `/api/campus-summaries/generate` | Generate AI grounded weekly campus summary |
| `POST` | `/api/campus-summaries/:id/review` | Academic manager review action for campus summary |
| `GET` | `/api/calendar-sync/config-status` | Check server-side calendar integration credentials and setup guide |
| `GET` | `/api/calendar-sync/status` | Current user's connected calendar accounts, sync events, and conflicts |
| `POST` | `/api/calendar-sync/connect` | Connect or update Google Calendar / Microsoft Outlook sync preferences |
| `POST` | `/api/calendar-sync/sync` | Run calendar sync with duplicate prevention & conflict detection |
| `POST` | `/api/calendar-sync/resolve-conflict` | Resolve calendar event conflict (OVERWRITE_EXTERNAL vs KEEP_EXTERNAL) |
| `POST` | `/api/calendar-sync/disconnect` | 1-click disconnect and revoke external calendar sync |
| `GET` | `/api/honorarium/policy` | Get active visiting faculty compensation policy for campus |
| `POST` | `/api/honorarium/policy` | Administrator configures honorarium rate policy (Never invented) |
| `GET` | `/api/honorarium/reports` | List monthly honorarium reports (RBAC scoped, student forbidden) |
| `GET` | `/api/honorarium/reports/:id` | View report detail with linked source session logs for audit |
| `POST` | `/api/honorarium/generate` | Calculate monthly honorarium from delivered daily logs |
| `POST` | `/api/honorarium/reports/:id/submit` | Visiting faculty submits draft honorarium report |
| `POST` | `/api/honorarium/reports/:id/approve` | Administrator approves honorarium report for finance payment |
| `GET` | `/api/csv/export/:dataset` | Role-scoped CSV export with UTF-8 BOM, ISO dates, and clean headers |
| `POST` | `/api/csv/sheets/:dataset` | Write directly to Google Sheets or return API setup instructions |

---

## 🧪 Automated Testing

Run the full end-to-end and unit test suite across both core progression calculations and all stretch features:

```bash
npm test
```

### Test Coverage Highlights (52 Passing Tests across 3 Suites):
1. **Core API & RBAC Suite (`tests/api.test.js` - 24 tests):**
   - Authentication (Admin, Faculty, Student, Compulsory Mobile Number, Google link, Demo OTP `123456`).
   - Admin semester configuration, Saturday rules, and holiday exclusions.
   - Timetable creation, collision detection (room & faculty overlaps with HTTP 409).
   - Rapid faculty logging (<60s flow), topic progress recalculation.
   - Dashboards & Worst-Subject Roll-Up Rule ($\min(\text{buffer\_ratio})$).
   - Exam readiness window cutoff tracking.
   - Pedagogical lesson plans and versioning history.
   - Missed-log alerts and 48-hour escalation.

2. **Progression Calculations Engine Suite (`tests/calculations.test.js` - 4 tests):**
   - Precise topic covered hours (100% completed, proportional in-progress).
   - Working days calendar engine factoring second/fourth Saturday rules and holidays.
   - Subject buffer ratios and status classification (`ON_TRACK`, `TIGHT`, `AT_RISK`, `BEHIND`).
   - Strict worst-subject bottleneck roll-up enforcement (never average).

3. **Stretch Features Suite (`tests/stretchFeatures.test.js` - 24 tests):**
   - **WhatsApp/Telegram:** Draft parsing, non-commit safety invariant (zero silent writes), low-confidence clarification prompts, unauthorized sender rejection, HMAC signature verification, and explicit faculty confirmation.
   - **AI Weekly Summary:** Evidence grounding in notes, absence of timetable auto-modifications, and manager review suggestion labeling.
   - **Calendar Sync:** Setup guide when unconfigured, opt-in connection, duplicate prevention via SHA-256 hash idempotency, external conflict detection, and resolution.
   - **Visiting Faculty Honorarium:** Admin policy configuration (no invented rates), contact hour computation, source session log linking, approval workflow, and student access denial (HTTP 403).
   - **Certified Exports:** UTF-8 BOM encoding for Excel, stable unique IDs, strict role permissions, and graceful fallback when Google Sheets API credentials are not configured.
