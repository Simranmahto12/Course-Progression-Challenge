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
├── assets/                # Official brand design mark (mirai-logo.png)
├── backend/               # Self-contained SQLite Academic Engine
│   ├── src/
│   │   ├── db.ts          # SQLite database connection & schema auto-creation
│   │   ├── seed.ts        # Database seed script for campuses, timetables, and subjects
│   │   ├── routes/        # Auth (send-otp, verify-otp), Admin, Timetables, Logs, Dashboards
│   │   └── services/      # Core deterministic calculation engine (Buffer ratio, Worst subject roll-up)
│   └── tests/             # Automated test suite (Jest + Supertest)
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

- **Live Web Portal:** [http://localhost:5001](http://localhost:5001) (or open `index.html` directly in any browser)
- **API Health Check:** [http://localhost:5001/api/health](http://localhost:5001/api/health)

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

---

## 🧪 Automated Testing

```bash
npm test
```
All 15 automated test suites verify Authentication, RBAC, Semester Configuration, Timetable Setup, Faculty Logging, Calculation Engine, Worst-Subject Roll-Up, and Student Views.
