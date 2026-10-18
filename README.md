# Course Progression Tracker
### Mirai School of Technology (MSOT) — BTech CSE (AI/ML)

> A full-stack, deterministic academic course progression system replacing manual syllabus-tracking spreadsheets with real-time timetable consumption, exam readiness indicators, and rapid mobile session logging.

---

## 🌟 Key Features

1. **Deterministic Syllabus Tracking:**
   - Evaluates progress weighted strictly by **planned teaching hours** (never by simple topic counts).
   - Real-time **Buffer Ratio** calculations:
     - **Complete:** 0 remaining syllabus hours.
     - **On Track:** Buffer ratio $\ge 1.15$.
     - **Tight:** $1.00 \le \text{Buffer ratio} < 1.15$.
     - **Danger:** Buffer ratio $< 1.00$.
2. **Deterministic Calendar & Timetable Allocation:**
   - Walks the institutional calendar consuming scheduled timetable hours on eligible working days.
   - Dynamic support for all three Saturday rules: `ALL_SATURDAYS`, `NO_SATURDAYS`, `SECOND_FOURTH_SATURDAY`.
   - Automatic date shifts when holidays are added or sessions are cancelled.
   - **Explain Calculation:** Full audit inspection modal showing why a topic received a specific planned date.
3. **Sub-60-Second Mobile Faculty Logging:**
   - Pre-filled "Today's Sessions" view matching timetable schedule and expected next topic.
   - 1-click outcome status: `COMPLETED`, `IN_PROGRESS`, `SKIPPED`, `MERGED`, `CANCELLED`.
   - Partial completion sliders, classwork/homework tracking, and immutable audit trail.
4. **Missing-Log Alert Workflow:**
   - End of scheduled day creates a faculty reminder.
   - Unlogged sessions past 48 hours escalate automatically to Campus Managers.
   - Built-in deduplication prevents repeated notification spam.
5. **Role-Aware Dashboards & Strict RBAC:**
   - **Admin / Program Manager:** Cross-campus governance across **HI-Tech, Ratnam, RGIB, and JUJ**; worst-subject roll-ups; threshold configuration.
   - **Campus Manager:** Campus timetable slots, track health, 48h escalation alerts.
   - **Faculty:** Today's sessions, assigned subjects, overdue topics, exam countdowns.
   - **Student:** Read-only syllabus roadmap, upcoming exam windows, and topics covered (strictly hides staff notes and alerts).
6. **CSV Import & Export Center:**
   - Downloadable standardized templates for Calendar, Timetable, Subjects, and Lesson Plans.
   - Pre-validation preview with row-level error reporting (row numbers, field names, error causes).
   - Atomic transactional commit for valid data.

---

## 🏗️ System Architecture

```
Course-Progression-Tracker/
├── backend/                  # REST API, JWT auth, RBAC, engines, Prisma ORM
│   ├── src/
│   │   ├── services/         # CalculationEngine, CalendarEngine, AlertEngine, CSVEngine
│   │   ├── routes/           # Auth, Subjects, Timetable, Sessions, Dashboards, Alerts, CSV
│   │   ├── middleware/       # Auth & RBAC boundary checks
│   │   └── seed.ts           # Core academic setup seed
│   ├── prisma/               # schema.prisma (SQLite / PostgreSQL)
│   └── tests/                # Automated unit, calendar, permission, alert & CSV tests
├── frontend/                 # Responsive React 18 + TypeScript + Vite + Tailwind CSS
│   └── src/
│       ├── components/       # StatusBadge, ProgressBar, SessionLogModal, ExplainModal, Navbar
│       ├── pages/            # Role dashboards (Faculty, Manager, Admin, Student), CSV Center
│       └── context/          # AuthContext with 1-click demo persona switcher
├── database/                 # Schema DDL and CSV templates
│   ├── schema.sql            # PostgreSQL / SQLite compatible schema DDL
│   └── templates/            # CSV templates (calendar, timetable, subjects, lesson_plans)
├── tests/load/               # Autocannon concurrency load test benchmark
├── docs/                     # ARCHITECTURE.md, TEST_REPORT.md, DESIGN_NOTES.md
├── docker-compose.yml        # Docker Compose deployment (Postgres, Backend, Frontend)
└── README.md
```

---

## 🚀 Quickstart & One-Command Local Run

### Prerequisites
- Node.js (v18+) and npm (v9+)
- (Optional) Docker for containerized run

### Local Setup (Zero-Friction SQLite)
```bash
# 1. Install dependencies for backend and frontend
cd backend && npm install
cd ../frontend && npm install
cd ..

# 2. Setup database and seed core academic records
npm run db:migrate --workspace=backend
npm run db:seed --workspace=backend

# 3. Start development servers concurrently
npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5001/api
- **Health Check:** http://localhost:5001/api/health

---

## 👥 Demo Login Personas

All accounts are pre-configured in seed data with password: `mirai123`. Sign in with an account below or use the role-specific demo buttons on the login screen. New sessions open at the sign-in screen; the app no longer signs in as a demo user automatically.

| Role | Email | Campus | Description |
|---|---|---|---|
| **Admin** | `admin@mirai.edu.in` | Global (All) | Program Director, cross-campus dashboards, thresholds |
| **Campus Manager** | `manager.hitech@mirai.edu.in` | HI-Tech | Campus operations, timetable, 48h escalation alerts |
| **Campus Manager** | `manager.ratnam@mirai.edu.in` | Ratnam | Campus operations for Ratnam campus |
| **Faculty 1** | `faculty1@mirai.edu.in` | HI-Tech | Vishal Rathee (Assigned: **DSA in c++**) |
| **Faculty 2** | `faculty2@mirai.edu.in` | HI-Tech | Varun Kumar Sharma (Assigned: **Web development**) |
| **Faculty 3** | `faculty3@mirai.edu.in` | Ratnam | Dr. Vikram Verma |
| **Student** | `student@mirai.edu.in` | HI-Tech | Aarav Patel (BTech CSE AI/ML Batch A read-only portal) |

> 💡 **Tip:** After signing in, use the frontend header's 1-click **Role Switcher** pills (`Admin`, `Manager`, `Faculty`, `Student`) to switch demo identities instantly.

---

## 🧪 Running Automated Tests

```bash
# Run the 28 automated Jest test suites (Calculations, API, Calendar, Alerts, CSV, RBAC)
npm run test --workspace=backend

# Run with test coverage
npm run test:coverage --workspace=backend

# Run concurrency load test (with backend running)
npm run test:load
```

Review full verification evidence in [`docs/TEST_REPORT.md`](file:///Users/simrankumari/Course-Progression-Challenge/Course-Progression-Challenge/docs/TEST_REPORT.md).

---

## 📄 License & Institutional Attribution
Built for **Mirai School of Technology (MSOT)** • Course Progression Challenge.
