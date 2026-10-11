# Design Notes & Usability Decisions
## Mirai School of Technology (MSOT) — Course Progression Tracker

---

## 1. Usability & Ergonomics: The Sub-60-Second Faculty Flow

### The Problem
Faculty adoption in academic portals typically fails because session logging requires too many clicks, navigating through multi-level deep dropdowns, or typing extensive duplicate syllabus descriptions.

### Design Solution
1. **Pre-filled "Today's Sessions":**
   When faculty open their mobile dashboard, the current date's scheduled classes are already rendered at the top, pre-populated with:
   - Subject code and name.
   - Exact timetable time slot and room.
   - The **expected next topic** pre-selected by looking ahead at the sequence of pending syllabus topics.
2. **Minimal Typing & Smart Defaults:**
   - Single-tap outcome chips: `COMPLETED`, `IN PROGRESS`, `SKIPPED`, `MERGED`, `CANCELLED`.
   - Selecting `COMPLETED` automatically defaults topic coverage to 100%.
   - Selecting `IN PROGRESS` reveals interactive percentage chips (25%, 50%, 75%) and a smooth slider.
   - One-tap Classwork/Homework chips: `NONE`, `GIVEN`, `COLLECTED`, `REVIEWED`.
3. **Audit Trail Transparency:**
   Any change or override after initial submission records a timestamped delta with previous and updated states in `SessionAuditLog`.

---

## 2. Deterministic Calculation Service

- **Deterministic Replay:** Given the academic calendar, timetable, and lesson plan, planned dates can be recalculated and verified idempotently without state divergence.
- **Explainability:** An "Explain Calculation" modal is accessible for every subject, showing the step-by-step calendar dates, working day checks, and hours consumed that determined a topic's target date.
- **Worst-Status Aggregation:** When rolling up status to a Campus or Track, averages are strictly avoided. A single subject in `DANGER` flags the campus status as `DANGER`, highlighting the driving bottleneck subject to enable timely intervention.

---

## 3. Role-Based Access Boundaries (RBAC)

| Resource | Admin | Campus Manager | Faculty | Student |
|---|---|---|---|---|
| Institutional Settings / Saturday Rules | Read / Write | Read | Read | Read |
| Campus Timetable Management | Read / Write | Read / Write (Campus Only) | Read | Read |
| Session Logging | Read / Write | Read | Write (Assigned Subjects Only) | No Access |
| Missing-Log Alert Center | Full Visibility | Campus Escalations | Assigned Reminders | Hidden |
| Student Portal | Read | Read | Read | Read-Only (Batch Only) |
