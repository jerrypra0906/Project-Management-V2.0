## Product Requirements Document (PRD)

### Web-based Project & Change Request (CR) Management Application

#### 1. Overview
- **Objective**: Provide a centralized web application to capture, manage, and report on two initiative types: **Project** and **Change Request (CR)**. The system standardizes data entry, enables lifecycle tracking, and offers executive dashboards for the Head of IT Projects and senior management.
- **Primary Outcomes**:
  - Consistent data model for Projects and CRs
  - End-to-end visibility from intake to Live/Closure
  - Actionable insights via dashboards (status, risk, throughput, timelines)

#### 2. Definitions
- **Initiative**: A work item that is either a Project or a Change Request.
- **Project**: A planned set of tasks to achieve a defined outcome, tracked through milestones.
- **Change Request (CR)**: A request to modify an existing system/process with additional timeline checkpoints (submission, development, SIT, UAT, Live).
- **Milestone**: Key checkpoints within the initiative lifecycle.

#### 3. In Scope
- Capture and manage Projects and CRs with required fields
- Workflow for status and milestone progression
- Search, filter, and list views
- Executive dashboard and analytics
- Attachments/links and comments
- Role-based access, audit logging, notifications

#### 4. Out of Scope (Phase 1)
- Integrated time tracking and budgeting/financials
- Advanced resource management and capacity planning
- External system integrations (e.g., Jira, email gateways, SSO) beyond basic email notifications
- Multi-language UI (English-only MVP)

#### 5. User Roles & Permissions
- **Senior Management**: Read-only access to all initiatives, dashboards, and reports.
- **Head of IT Projects / PMO**: Create/modify initiatives, manage statuses/milestones, view dashboards and reports, manage ownership assignment.
- **IT PIC**: Update assigned initiatives (fields, status, milestones, dates), upload attachments, comment.
- **Business Owner/Requestor**: Submit/view their initiatives, comment; limited edit (remarks, documentation link) when appropriate.
- **Administrator**: System configuration, user/role management, department management, lookup list management, hard delete/restore as allowed.

Role matrix (high-level):
- Create initiative: PMO, IT PIC (if allowed), Business Owner (intake form)
- Edit initiative: PMO, assigned IT PIC; Business Owner partial fields
- View all initiatives: PMO, Senior Management, Admin; scoped view for Business Owners (own items)
- Delete/Archive: Admin (hard delete), PMO (archive/soft delete)

#### 6. Functional Requirements

6.1 Initiative Types
- The system must support two initiative types: `Project`, `Change Request`.
- Common fields apply to both; CR has additional date checkpoints (see 6.3.2).

6.2 Common Fields (Project and CR)
- Project/CR Name (text, required, unique per department + year)
- Description (rich text, required)
- Business Impact (text, required)
- Priority (enum: P0, P1, P2; required)
- Business Owner/Requestor (user reference, required)
- Department (reference to Department, required)
- IT PIC (user reference, required)
- Status (enum: Not Started, On Hold, On Track, At Risk, Delayed, Live, Cancelled; required)
- Milestone (enum: Pre-grooming, Grooming, Tech Assessment, Planning, Development, Testing, Live; required)
- Start Date (date, required)
- End Date (date, optional unless status Live/Cancelled/Delayed)
- Remark (text, optional)
- Project Documentation Link (URL, optional; validate URL)
- Attachments (files, optional)
- Tags (list of short strings, optional)
- Comments (threaded, optional)

6.3 Type-specific Fields
- 6.3.1 Project: No additional fields beyond common list.
- 6.3.2 Change Request (CR):
  - CR Submission Start Date (date, required)
  - CR Submission End Date (date, optional)
  - Development Start Date (date, optional)
  - Development End Date (date, optional)
  - SIT Start Date (date, optional)
  - SIT End Date (date, optional)
  - UAT Start Date (date, optional)
  - UAT End Date (date, optional)
  - Live Date (date, optional; required when Status becomes Live)

6.4 CRUD & Lifecycle
- Create: Form with fields by type; server-side and client-side validation.
- Read: Detail page with all fields, attachments, comments, history.
- Update: Editable fields by role; changes recorded in audit log and status history.
- Archive/Soft Delete: Archive initiatives to hide from default views while retaining analytics; Admin can hard delete if permitted.
- Status transitions: Allow transitions between any statuses except reverting from Cancelled/Live requires Admin override.
- Milestone progression: Allow setting to any milestone; recommended order is enforced by warnings, not hard blocks.

6.5 Validation Rules
- Required fields cannot be empty.
- Date coherence:
  - Start Date ≤ End Date (when End Date present)
  - For CR: CR Submission Start ≤ CR Submission End; Development Start ≤ Development End; SIT Start ≤ SIT End; UAT Start ≤ UAT End
  - Live Date ≥ UAT End (if present)
  - End Date/Live Date cannot be in the past when Status is future-oriented unless justified (Remark required).
- Documentation Link must be a valid URL (http/https).
- Priority must be one of P0/P1/P2.
- Department, Business Owner, and IT PIC must exist and be active users/entities.

6.6 Search, Filters, and Sorting
- Global search by Name, Description, Tags.
- Filters: Type, Status, Milestone, Priority, Department, IT PIC, Business Owner, Date ranges (Start/End, Live Date for CR), and custom tag filters.
- Sorting: Name, Priority, Status, Start Date, End Date/Live Date, Last Updated.
- Saved views per user; PMO can publish shared views.

6.7 Dashboards & Reporting
- Executive Dashboard (default landing for PMO/Senior Management):
  - KPI tiles: Total Initiatives, Projects vs CRs, On Track, At Risk, Delayed, On Hold, Live YTD
  - Trend charts: Monthly Created vs Live, Lead time (Start→Live), Cycle time by milestone
  - Breakdown charts: By Department, by Priority, by IT PIC
  - Status distribution: Stacked bar or donut
  - Aging: Items in Not Started/On Hold/At Risk > threshold days
  - Upcoming: Initiatives with End/Live dates in next 30/60 days
  - SLA adherence (for CR): % meeting target windows (Submission→Dev start, Dev→SIT→UAT→Live)
- Drill-down: Click any widget to view filtered list.
- Export: CSV/Excel exports for list views and widget datasets.

6.8 Notifications & Subscriptions
- Email notifications: on assignment, status change, milestone change, comment mentions, approaching deadlines.
- Digest emails: weekly summaries to stakeholders (opt-in).
- Subscriptions: users can follow an initiative to receive updates.

6.9 Comments, Attachments, and Links
- Threaded comments with mentions (@user) and timestamps.
- File attachments with size/type limits and virus scanning.
- Single/multiple documentation links; label display and URL validation.

6.10 Audit & History
- Audit log of field-level changes: who, what changed, when, old→new values.
- Status and milestone history timeline.

6.11 Administration
- Manage users, roles, and departments.
- Manage lookup values (Statuses, Milestones, Priorities) with guardrails to preserve reporting consistency.
- Configure notification templates and thresholds (aging, SLA targets).

#### 7. Data Model (Conceptual)

Entities and key fields (indicative types):

- User
  - id (uuid)
  - name (string)
  - email (string)
  - role (enum: SeniorManagement, PMO, ITPIC, BusinessOwner, Admin)
  - departmentId (uuid, optional)
  - active (boolean)

- Department
  - id (uuid)
  - name (string, unique)

- Initiative (abstract/base)
  - id (uuid)
  - type (enum: Project, CR)
  - name (string)
  - description (text)
  - businessImpact (text)
  - priority (enum: P0, P1, P2)
  - businessOwnerId (uuid → User)
  - departmentId (uuid → Department)
  - itPicId (uuid → User)
  - status (enum)
  - milestone (enum)
  - startDate (date)
  - endDate (date, nullable)
  - remark (text, nullable)
  - documentationLink (url, nullable)
  - createdAt, updatedAt (timestamp)

- Project (extends Initiative)
  - (no additional fields in MVP)

- ChangeRequest (extends Initiative)
  - crSubmissionStart (date)
  - crSubmissionEnd (date, nullable)
  - developmentStart (date, nullable)
  - developmentEnd (date, nullable)
  - sitStart (date, nullable)
  - sitEnd (date, nullable)
  - uatStart (date, nullable)
  - uatEnd (date, nullable)
  - liveDate (date, nullable)

- StatusHistory
  - id (uuid)
  - initiativeId (uuid)
  - fromStatus (enum)
  - toStatus (enum)
  - changedBy (uuid → User)
  - changedAt (timestamp)

- MilestoneHistory
  - id (uuid)
  - initiativeId (uuid)
  - fromMilestone (enum)
  - toMilestone (enum)
  - changedBy (uuid → User)
  - changedAt (timestamp)

- Comment
  - id (uuid)
  - initiativeId (uuid)
  - authorId (uuid → User)
  - body (text)
  - createdAt (timestamp)

- Attachment
  - id (uuid)
  - initiativeId (uuid)
  - fileName (string)
  - fileUrl (string)
  - sizeBytes (number)
  - uploadedBy (uuid → User)
  - uploadedAt (timestamp)

- Tag
  - id (uuid)
  - name (string, unique)

- InitiativeTag (join)
  - id (uuid)
  - initiativeId (uuid)
  - tagId (uuid)

Indexes & constraints (examples):
- Unique: (name, departmentId, year(startDate))
- Indexes on: status, milestone, priority, departmentId, itPicId, type, dates

#### 8. Non-Functional Requirements

- Security
  - Role-based access control (RBAC)
  - Enforce least privilege; data access scoped by department for Business Owners and IT PICs
  - Encryption in transit (TLS 1.2+); encryption at rest for PII and attachments
  - Input validation and OWASP Top 10 mitigations
  - Audit trails immutable and retained per policy

- Performance
  - Page loads < 2s (p95) for primary views (lists, details, dashboards)
  - Searches/filtering return results < 3s (p95) for up to 50k initiatives
  - Exports generate within 60s for up to 100k rows (async with download link)

- Availability & Reliability
  - Target availability: 99.5% monthly
  - Daily backups; point-in-time recovery for database (RPO ≤ 24h for MVP)
  - Graceful degradation of dashboards if analytics store is delayed

- Usability & Accessibility
  - Responsive UI (desktop-first); readable on tablet
  - WCAG 2.1 AA color contrast and keyboard navigation for core flows

- Observability
  - Application logs with correlation IDs
  - Metrics for API latency/error rates; uptime monitoring

- Data Retention
  - Archived initiatives retained for at least 3 years; deletions require Admin

#### 9. Workflows (Happy Paths)

- Create Project
  1) PMO selects "New Project" and completes required fields
  2) System validates and creates Project with Status "Not Started" and Milestone "Pre-grooming"
  3) Assignment notifications sent to Business Owner and IT PIC

- Create CR
  1) Business Owner/PMO selects "New CR"
  2) Provides common fields plus CR Submission Start (required); others optional initially
  3) System validates and creates CR; dashboard reflects intake volume

- Progress & Update
  1) IT PIC updates milestones and statuses as work progresses
  2) Date checkpoints maintained (for CR)
  3) Notifications dispatched for changes and upcoming deadlines

- Go Live / Closure
  1) For Project: set Status to "Live", set Milestone to "Live", ensure End Date present
  2) For CR: set Status to "Live", ensure Live Date and UAT End set coherently

#### 10. Acceptance Criteria (Samples)

- Creating a Project with missing required fields prevents submission and shows inline errors.
- Creating a CR without CR Submission Start Date prevents submission.
- Changing Status to "Live" for a CR requires Live Date; for a Project requires End Date.
- Dashboard correctly counts At Risk and Delayed items by department.
- Filtering by IT PIC and Status returns matching initiatives within 3 seconds (p95).
- Audit log shows field-level changes with user and timestamp after edits.

#### 11. Dashboard Details (MVP)

- KPI tiles:
  - Total Initiatives, Projects, CRs
  - On Track, At Risk, Delayed, On Hold counts
  - Live (last 30/90 days, YTD)

- Charts:
  - Status distribution (donut)
  - By Department (stacked bar by Status)
  - Trend: Created vs Live per month (last 12 months)
  - Lead time: Start→Live median by type
  - CR SLA funnel: Submission→Dev→SIT→UAT→Live median days

- Lists:
  - Upcoming deadlines (End/Live within next 30/60 days)
  - Aging backlog (Not Started/On Hold/At Risk beyond threshold)

#### 12. MVP vs Phase 2

- MVP
  - Projects and CRs with full field set and validations
  - Dashboards and exports
  - RBAC, audit logging, notifications
  - Comments, attachments, documentation links

- Phase 2 (Future)
  - SSO/IdP integration, granular permissions per field
  - API integrations (Jira/DevOps), webhook events
  - Budgeting, effort/time tracking, resource planning
  - Custom fields per department, multi-language support

#### 13. Assumptions
- Users exist in a central directory or can be independently managed in-app.
- Departments list is finite and curated by Admin/PMO.
- English UI; date formats localized based on user profile if added later.

#### 14. Risks & Mitigations
- Data quality risk due to inconsistent updates → Notifications, required fields, dashboard aging views
- Scope creep for dashboards → Lock MVP widgets; backlog for future analytics
- Performance at higher data volumes → Indexing strategy, async exports, caching for dashboard queries

#### 15. Open Questions
- Should Business Owners be able to edit End Date after Live?
- Are there SLAs per department for CR phase transitions?
- Required retention period beyond 3 years?
- Do we need granular field-level permissions in MVP?


