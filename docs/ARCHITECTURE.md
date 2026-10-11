# Architecture & System Design Document
## Course Progression Tracker — Mirai School of Technology (MSOT)
### BTech CSE (AI/ML)

---

## 1. Executive Overview

The **Course Progression Tracker** replaces manual, brittle syllabus spreadsheets across Mirai School of Technology campuses (**HI-Tech, Ratnam, RGIB, and JUJ**) with a deterministic, real-time academic progression engine. It tracks planned teaching hours against timetable schedules, holidays, and classroom session logs to provide actionable early warnings before examinations.

---

## 2. High-Level Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Layer (React 18 + Vite + Tailwind CSS)"]
        UI_Admin["Program Manager / Admin Dashboard"]
        UI_Campus["Campus Manager Dashboard"]
        UI_Faculty["Faculty Mobile/Web Workspace"]
        UI_Student["Student Read-Only Portal"]
    end

    subgraph API["REST Backend Layer (Express + TypeScript)"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
        CalcEngine["Deterministic Calculation Engine"]
        CalEngine["Calendar & Timetable Allocation Engine"]
        AlertEngine["Missing Log & 48h Escalation Engine"]
        CSVEngine["CSV Parser & Transactional Validator"]
    end

    subgraph Data["Persistence Layer"]
        PrismaORM["Prisma Client ORM"]
        DB[("SQLite Local / PostgreSQL Container")]
    end

    UI_Admin -->|Bearer JWT| AuthMiddleware
    UI_Campus -->|Bearer JWT| AuthMiddleware
    UI_Faculty -->|Bearer JWT| AuthMiddleware
    UI_Student -->|Bearer JWT| AuthMiddleware

    AuthMiddleware --> CalcEngine
    AuthMiddleware --> CalEngine
    AuthMiddleware --> AlertEngine
    AuthMiddleware --> CSVEngine

    CalcEngine --> PrismaORM
    CalEngine --> PrismaORM
    AlertEngine --> PrismaORM
    CSVEngine --> PrismaORM
    PrismaORM --> DB
```

---

## 3. Core Calculation Definitions

All syllabus tracking in the system is weighted strictly by **planned teaching hours**, never by simple topic count. All calculations maintain internal floating precision and display to **two decimal places** (`.toFixed(2)`).

$$\text{Hours In Scope} = \sum_{\text{topic} \in \text{non-skipped}} \text{topic.plannedHours}$$

$$\text{Covered Hours} = \sum_{\text{completed}} \text{topic.plannedHours} + \sum_{\text{in-progress}} \left(\text{topic.plannedHours} \times \frac{\text{completion \%}}{100}\right)$$

$$\text{Coverage \%} = \frac{\text{Covered Hours}}{\text{Hours In Scope}} \times 100$$

$$\text{Remaining Hours} = \text{Hours In Scope} - \text{Covered Hours}$$

$$\text{Available Hours} = \sum_{\text{working days}}^{\text{target date}} \text{timetableScheduledHours}(\text{weekday})$$

$$\text{Buffer Ratio} = \frac{\text{Available Hours}}{\text{Remaining Hours}}$$

### Status Classification Thresholds:
- **`COMPLETE`**: Remaining Hours $\le 0.00$
- **`ON TRACK`**: Buffer Ratio $\ge 1.15$
- **`TIGHT`**: $1.00 \le \text{Buffer Ratio} < 1.15$
- **`DANGER`**: Buffer Ratio $< 1.00$

### Worst-Subject Roll-up:
Campus and Track roll-ups follow the **worst-case rule**, identifying the bottleneck subject driving that status rather than taking misleading averages.

---

## 4. Calendar & Timetable Allocation Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Server as Timetable Engine
    participant Calendar as Institutional Calendar
    participant DB as Relational Database

    Admin->>Server: Request Date Recalculation
    Server->>Calendar: Fetch Semester Dates, Holidays, Saturday Rules
    loop Every Day in Semester Window
        Server->>Calendar: Is Sunday? -> Skip
        Server->>Calendar: Is Saturday? -> Apply Rule (2nd/4th Working)
        Server->>Calendar: Is Campus Holiday? -> Skip
        alt Working Day
            Server->>DB: Query Subject Scheduled Hours for Weekday
            Server->>DB: Allocate hours sequentially to pending topics
            Note over Server,DB: When accumulated hours >= plannedHours, record plannedDate
        end
    end
    Server->>Admin: Return Allocated Dates & Day-by-Day Audit Trail
```

---

## 5. Missing-Log Alert & Escalation Workflow

```mermaid
stateDiagram-v2
    [*] --> Scheduled: Timetable generates session
    Scheduled --> Logged: Faculty logs session within 24h
    Scheduled --> FacultyReminder: End of scheduled day without log
    FacultyReminder --> Logged: Faculty completes quick log (<60s)
    FacultyReminder --> Escalated48h: Unlogged past 48 hours
    Escalated48h --> CampusManagerNotified: Escalation alert sent to Campus Manager
    CampusManagerNotified --> Logged: Intervention resolved
    Logged --> [*]
```

---

## 6. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    Campus ||--o{ Batch : hosts
    Campus ||--o{ User : assigns
    Campus ||--o{ Subject : offers
    Track ||--o{ Batch : categorizes
    Track ||--o{ Subject : categorizes
    AcademicYear ||--o{ Semester : contains
    Semester ||--o{ ExamWindow : schedules
    Semester ||--o{ Batch : enrols
    Semester ||--o{ Subject : runs
    User ||--o{ Subject : teaches
    User ||--o{ TimetableEntry : scheduled
    User ||--o{ SessionLog : logs
    User ||--o{ Alert : receives
    Subject ||--o{ Topic : contains
    Subject ||--o{ TimetableEntry : schedules
    Subject ||--o{ ScheduledSession : generates
    TimetableEntry ||--o{ ScheduledSession : instances
    ScheduledSession ||--o| SessionLog : records
    SessionLog ||--o{ SessionAuditLog : audits
    ScheduledSession ||--o{ Alert : triggers
    Alert ||--o{ NotificationDeliveryLog : dispatches
```
