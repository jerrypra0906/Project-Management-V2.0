# Meeting Notes Feature Specification

## Document Info

- Feature: `Meeting Notes`
- Module: Initiative Detail Page (`Project` and `CR`)
- Entry point: Tabs area between `Comments` and `Activity Log`
- Version: `v1.0`
- Status: `Proposed for implementation`

---

## 1) Objective and Scope

### Business Objectives

1. Allow users to capture meeting outcomes in a structured format.
2. Allow users to send meeting notes via email to participants and stakeholders.
3. Establish meeting notes as a source of truth (history, versioning, traceability).

### In Scope (Phase 1 / MVP)

- New `Meeting Notes` tab in initiative detail view.
- Meeting notes list and create/edit flow via popup modal.
- Structured note fields (metadata + content + action items).
- Draft/Publish lifecycle.
- Email send from note with recipient selection and send history.
- Versioning and audit trail for note edits and sends.

### Out of Scope (Future)

- PDF export.
- Reusable meeting templates by department/team.
- Calendar integration (Google/Outlook).
- Automated reminders for overdue action items.

---

## 2) UX and UI Behavior Specification

## 2.1 Navigation and Placement

- On initiative detail page tabs:
  - `Comments` | `Meeting Notes` | `Activity Log`
- `Meeting Notes` is available for both initiative types: `Project` and `CR`.
- Tab badge shows note count for current initiative.

## 2.2 Main Tab Content (List View)

The tab shows only list-focused content (no side-by-side editor).

### Components

- Search input (`title`, `facilitator`, `note taker`, keywords).
- Filters:
  - Status (`All`, `Draft`, `Published`, `Sent`, `Archived`)
  - Date range
  - Updated by
- Primary CTA: `+ New Meeting Note`
- Notes table/list:
  - Title
  - Meeting date/time
  - Status
  - Version
  - Updated by
  - Last updated at
  - Actions (`View`, `Edit`, `Send Email`, `Duplicate`, `History`)

### Sorting

- Default sort: `updatedAt DESC`.

### Empty State

- Message: `No meeting notes yet`
- Action button: `Create first meeting note`

## 2.3 Editor Interaction Model (Modal)

- Triggered by:
  - `+ New Meeting Note`
  - `Edit` action on list item
- Modal size:
  - Desktop: `80-90%` width, `max-height` with internal scroll
  - Mobile: full-screen modal
- Header:
  - Note title
  - Status badge
  - Version indicator
  - Close (`X`)

### Modal Sections (Structured Form)

1. **Meeting Metadata**
   - Meeting title (required)
   - Meeting type (required)
   - Date/time (required)
   - Facilitator (required)
   - Note taker (required)
2. **Participants**
   - Attendees (user multi-select)
   - Stakeholders (user multi-select and/or external emails)
   - Optional absentees
3. **Content**
   - Agenda
   - Discussion points
   - Decisions
   - Risks/Issues
4. **Action Items Table**
   - Columns: Action, Owner, Due date, Priority, Status
   - Add/remove row
5. **Next Meeting**
   - Optional next meeting date/time
6. **Email Preview Block**
   - To, CC, Subject
   - `Preview Body` action

### Footer Actions

- `Cancel`
- `Save Draft`
- `Publish`
- `Send Email`
- `Save & Send` (enabled only when form is valid)

## 2.4 UI State and Validation Rules

### Required fields (minimum for publish)

- Title
- Meeting type
- Meeting date/time
- Facilitator
- Note taker
- At least one participant or stakeholder recipient

### Status transitions

- `Draft` -> `Published`
- `Published` -> `Sent` (when email sent successfully at least once)
- `Published/Sent` -> `Archived` (optional action)

### Unsaved changes handling

- Closing modal with dirty state prompts:
  - `Discard` or `Save Draft`

### Permissions in UI

- Disable or hide restricted actions based on role.
- Read-only mode for unauthorized editor roles.

## 2.5 Activity Log Integration

Meeting note events are recorded into existing activity stream:

- Note created
- Note updated
- Note published
- Note emailed (with recipient count and result)
- Note archived

---

## 3) Functional Specification

## 3.1 User Roles and Permissions

### Suggested permission matrix

- Create/Edit Draft:
  - Admin, IT PM, IT Manager, IT PIC, Business Owner, assigned Business Users
- Publish:
  - Admin, IT PM, IT Manager, Facilitator, Note taker
- Send Email:
  - Admin, IT PM, IT Manager, Facilitator, Note taker
- Archive:
  - Admin, IT PM, IT Manager
- Delete:
  - Not allowed after publish (preserve source of truth)
  - Draft delete allowed by creator/admin

## 3.2 Core Use Cases

1. Create draft note from initiative detail.
2. Edit draft with structured sections and action items.
3. Publish note (locks baseline as versioned record).
4. Send published note to participants and stakeholders.
5. View note history and email history for traceability.
6. Duplicate old note to speed up recurring meeting cycles.

## 3.3 Data Integrity Rules

- All notes must be linked to one `initiativeId`.
- Versions increment on each save after initial creation.
- Published notes are immutable as baseline:
  - Further edits create a new version record.
- Email sends are logged even on failure.
- External recipient emails must pass format validation.

## 3.4 Notifications and Email Behavior

- `Send Email` operation:
  - Build recipient list from attendees + stakeholders + optional manual emails.
  - Validate recipient emails; show invalid entries before send.
  - Save email payload snapshot (subject/body/recipients).
  - Attempt SMTP send via existing email service.
  - Store delivery result (`sent`, `failed`, error message).

## 3.5 Non-Functional Requirements

- Performance:
  - List load target under 500ms for up to 500 notes per initiative.
- Reliability:
  - Save and send actions are idempotent using request tokens.
- Auditability:
  - Full change and send history retained.
- Security:
  - Authenticated routes only.
  - Role checks for write/send/archive operations.

---

## 4) Technical Specification

## 4.1 Backend Architecture Integration

Current backend style:

- Express routes under `backend/routes`
- Data persistence through `backend/store.js`
- Notification and email patterns already available

Additions:

- New route file: `backend/routes/meeting-notes.js`
- Register route in `backend/server.js`
- Extend schema initialization and read/write mappings in `backend/store.js`

## 4.2 Data Model

## 4.2.1 `meetingNotes`

- `id` TEXT PK
- `initiativeId` TEXT NOT NULL
- `title` TEXT NOT NULL
- `meetingType` TEXT NOT NULL
- `meetingDate` TEXT NOT NULL (ISO timestamp)
- `location` TEXT NULL
- `meetingLink` TEXT NULL
- `facilitatorId` TEXT NOT NULL
- `noteTakerId` TEXT NOT NULL
- `agenda` TEXT NULL
- `discussion` TEXT NULL
- `decisions` TEXT NULL
- `risks` TEXT NULL
- `nextMeetingAt` TEXT NULL
- `status` TEXT NOT NULL (`Draft|Published|Sent|Archived`)
- `version` INTEGER NOT NULL DEFAULT 1
- `createdBy` TEXT NOT NULL
- `createdAt` TEXT NOT NULL
- `updatedAt` TEXT NOT NULL

## 4.2.2 `meetingNoteParticipants`

- `id` TEXT PK
- `meetingNoteId` TEXT NOT NULL
- `userId` TEXT NULL
- `email` TEXT NULL
- `name` TEXT NULL
- `role` TEXT NOT NULL (`Attendee|Stakeholder|Absent|Optional`)

## 4.2.3 `meetingNoteActionItems`

- `id` TEXT PK
- `meetingNoteId` TEXT NOT NULL
- `description` TEXT NOT NULL
- `ownerId` TEXT NULL
- `ownerName` TEXT NULL
- `dueDate` TEXT NULL
- `priority` TEXT NULL (`Low|Medium|High`)
- `status` TEXT NOT NULL (`Not Started|In Progress|Done|Blocked|Cancelled`)
- `orderIndex` INTEGER NOT NULL DEFAULT 0

## 4.2.4 `meetingNoteEmailLog`

- `id` TEXT PK
- `meetingNoteId` TEXT NOT NULL
- `subject` TEXT NOT NULL
- `toEmails` TEXT NOT NULL (comma-separated)
- `ccEmails` TEXT NULL (comma-separated)
- `bodySnapshot` TEXT NOT NULL
- `sentBy` TEXT NOT NULL
- `sentAt` TEXT NOT NULL
- `deliveryStatus` TEXT NOT NULL (`Sent|Failed`)
- `providerMessageId` TEXT NULL
- `errorMessage` TEXT NULL

## 4.2.5 `meetingNoteHistory`

- `id` TEXT PK
- `meetingNoteId` TEXT NOT NULL
- `version` INTEGER NOT NULL
- `field` TEXT NOT NULL
- `oldValue` TEXT NULL
- `newValue` TEXT NULL
- `changedBy` TEXT NOT NULL
- `changedAt` TEXT NOT NULL

## 4.3 API Contract (REST)

Base path: `/api/meeting-notes`

### 1) List by initiative

- `GET /initiative/:initiativeId`
- Query: `q`, `status`, `from`, `to`, `page`, `pageSize`
- Response:
  - `items[]`, `total`, `page`, `pageSize`

### 2) Get detail

- `GET /:id`
- Response:
  - note header/body
  - participants
  - action items
  - latest email summary

### 3) Create draft

- `POST /`
- Body: note payload
- Response: created note with `id`, `version=1`

### 4) Update note

- `PUT /:id`
- Body: changed payload
- Behavior:
  - validate role
  - update note
  - increment version
  - append field-level history

### 5) Publish

- `POST /:id/publish`
- Behavior:
  - validate required fields
  - set status `Published`
  - write activity log event

### 6) Send email

- `POST /:id/send-email`
- Body:
  - `to[]`, `cc[]`, `subject`, optional `messageIntro`
- Behavior:
  - render email from note snapshot
  - attempt SMTP send
  - save `meetingNoteEmailLog`
  - set status to `Sent` if first successful send

### 7) Duplicate

- `POST /:id/duplicate`
- Behavior:
  - clone note + participants + action items
  - reset status to `Draft`

### 8) History

- `GET /:id/history`
- Returns version history and field changes

### 9) Email history

- `GET /:id/email-history`
- Returns send attempts and outcomes

## 4.4 Email Service Extension

Add function to `backend/services/email.js`:

- `sendMeetingNotesEmail(noteData, recipientData, options)`

Responsibilities:

- Build HTML and text templates.
- Validate and deduplicate recipients.
- Use existing SMTP transporter logic.
- Return normalized send result:
  - `success`, `messageId`, `error`, `sentToCount`

## 4.5 Store Layer Changes (`backend/store.js`)

### Schema initialization additions

- Create the five meeting note tables if not exists.
- Add missing columns safely via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

### Read mapping additions

- Include new tables in `tables` list returned by `read()`.
- Normalize potential case differences for new fields.

### Write mapping additions

- Extend transactional `write(data)` to clear and reinsert:
  - `meetingNotes`
  - `meetingNoteParticipants`
  - `meetingNoteActionItems`
  - `meetingNoteEmailLog`
  - `meetingNoteHistory`

Note: Keep insertion order to satisfy relationship dependencies.

## 4.6 Frontend Architecture Changes (`frontend/main.js`)

### New UI modules (suggested extraction or grouped functions)

- `renderMeetingNotesTab(initiativeId)`
- `renderMeetingNotesList(items, filters)`
- `openMeetingNoteModal(mode, noteId?)`
- `renderMeetingNoteForm(state)`
- `bindMeetingNoteActions()`
- `submitMeetingNoteDraft()`
- `publishMeetingNote()`
- `sendMeetingNoteEmail()`

### State model (client)

- `meetingNotes.list`
- `meetingNotes.filters`
- `meetingNotes.selectedNoteId`
- `meetingNotes.modal.open`
- `meetingNotes.modal.dirty`
- `meetingNotes.modal.saving`

### Reuse existing patterns

- Reuse mention/user lookup options for participants.
- Reuse existing modal and button styles where possible.
- Reuse route auth and fetch error handling pattern.

## 4.7 Security and Validation

- Require JWT auth for all meeting note endpoints.
- Validate initiative access before read/write.
- Enforce role checks server-side (not only UI).
- Sanitize text fields to prevent script injection in rendered email and UI.
- Validate email format and maximum recipient count limit (configurable).

## 4.8 Observability

- Add structured logs for:
  - create/update/publish/send operations
  - email success/failure with error codes
- Optional metrics:
  - notes created per week
  - send success rate
  - avg recipients per note

## 4.9 Migration Plan

1. Add SQL migration `migrations/004_add_meeting_notes_tables.sql`
2. Update `backend/store.js` schema fallback DDL
3. Deploy backend routes and frontend tab in feature flag mode (optional)
4. Seed demo notes for test initiatives
5. Enable for all users after smoke test

---

## 5) QA and Test Plan

## 5.1 Functional Test Cases

- Create draft with minimal required fields.
- Edit note and verify version increment.
- Publish without required fields must fail with clear message.
- Send email with valid recipients succeeds and logs message.
- Send email with invalid recipients shows validation and blocks send.
- Duplicate note copies structure but resets status/version appropriately.
- Permission checks for viewer/editor/publisher/send actions.

## 5.2 Regression Test Areas

- Existing `Comments` tab behavior unchanged.
- Existing `Activity Log` rendering unchanged.
- Initiative detail performance remains acceptable.
- No break in existing email functions (`CR creation`, activation flows).

## 5.3 Edge Cases

- Large text content in decisions/discussion.
- Many participants (50+).
- SMTP unavailable: send attempt logged as failed.
- Concurrent edit conflict (optional optimistic lock by version).

---

## 6) Implementation Breakdown (Recommended Order)

1. Database migration + store schema updates
2. Backend routes CRUD + publish + history
3. Email send endpoint + logging
4. Frontend tab list rendering
5. Modal editor with validation and actions
6. Activity log integration for meeting note events
7. QA, bug fixing, and seed demo notes

---

## 7) Open Decisions (To Confirm)

1. Should published notes be hard-locked, or editable with mandatory version bump?
2. Should external emails be allowed for recipients, or internal users only?
3. Should send-to list default include all attendees and stakeholders?
4. Do we need attachment support in meeting note emails for MVP?
5. What is the max allowed size for note content and recipient count?

---

## 8) Definition of Done

- `Meeting Notes` tab visible and functional in initiative detail.
- Users can create/edit/publish/send meeting notes via modal.
- Version history and email log are persisted and viewable.
- Role-based restrictions enforced backend-side.
- Activity log captures meeting note lifecycle events.
- QA pass for core and regression scenarios.

