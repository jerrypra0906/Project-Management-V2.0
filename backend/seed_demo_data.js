import 'dotenv/config';
import store from './store.js';
import bcrypt from 'bcryptjs';

const DEMO_PREFIX = 'seed-';

const daysAgoIso = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const daysFromNowIso = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || !item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function removePreviousDemoData(data) {
  const isDemoId = (id) => typeof id === 'string' && id.startsWith(DEMO_PREFIX);

  const demoInitiativeIds = new Set((data.initiatives || []).filter((i) => isDemoId(i.id)).map((i) => i.id));
  const demoCommentIds = new Set((data.comments || []).filter((c) => isDemoId(c.id)).map((c) => c.id));
  const demoMeetingNoteIds = new Set((data.meetingNotes || []).filter((n) => isDemoId(n.id)).map((n) => n.id));
  const demoChangeHistoryIds = new Set((data.changeHistory || []).filter((h) => isDemoId(h.id)).map((h) => h.id));

  data.departments = (data.departments || []).filter((d) => !isDemoId(d.id));
  data.users = (data.users || []).filter((u) => !isDemoId(u.id));
  data.initiatives = (data.initiatives || []).filter((i) => !isDemoId(i.id));
  data.changeRequests = (data.changeRequests || []).filter((cr) => !demoInitiativeIds.has(cr.initiativeId));
  data.tags = (data.tags || []).filter((t) => !isDemoId(t.id));
  data.initiativeTags = (data.initiativeTags || []).filter(
    (it) => !isDemoId(it.id) && !demoInitiativeIds.has(it.initiativeId)
  );
  data.statusHistory = (data.statusHistory || []).filter((s) => !isDemoId(s.id) && !demoInitiativeIds.has(s.initiativeId));
  data.milestoneHistory = (data.milestoneHistory || []).filter((m) => !isDemoId(m.id) && !demoInitiativeIds.has(m.initiativeId));
  data.changeHistory = (data.changeHistory || []).filter((h) => !isDemoId(h.id) && !demoInitiativeIds.has(h.initiativeId));
  data.comments = (data.comments || []).filter((c) => !isDemoId(c.id) && !demoInitiativeIds.has(c.initiativeId));
  data.tasks = (data.tasks || []).filter((t) => !isDemoId(t.id) && !demoInitiativeIds.has(t.initiativeId));
  data.documents = (data.documents || []).filter((d) => !isDemoId(d.id) && !demoInitiativeIds.has(d.initiativeId));
  data.notifications = (data.notifications || []).filter(
    (n) =>
      !isDemoId(n.id) &&
      !isDemoId(n.userId) &&
      !demoInitiativeIds.has(n.initiativeId) &&
      !demoCommentIds.has(n.commentId)
  );
  data.meetingNotes = (data.meetingNotes || []).filter((n) => !isDemoId(n.id) && !demoInitiativeIds.has(n.initiativeId));
  data.meetingNoteParticipants = (data.meetingNoteParticipants || []).filter(
    (p) => !isDemoId(p.id) && !demoMeetingNoteIds.has(p.meetingNoteId)
  );
  data.meetingNoteActionItems = (data.meetingNoteActionItems || []).filter(
    (t) => !isDemoId(t.id) && !demoMeetingNoteIds.has(t.meetingNoteId)
  );
  data.meetingNoteEmailLog = (data.meetingNoteEmailLog || []).filter(
    (e) => !isDemoId(e.id) && !demoMeetingNoteIds.has(e.meetingNoteId)
  );
  data.meetingNoteHistory = (data.meetingNoteHistory || []).filter(
    (h) => !isDemoId(h.id) && !demoMeetingNoteIds.has(h.meetingNoteId)
  );

  return {
    demoInitiativesRemoved: demoInitiativeIds.size,
    demoChangeHistoryRemoved: demoChangeHistoryIds.size,
  };
}

function buildDemoData(passwordHash) {
  const departments = [
    { id: 'seed-dept-ops', name: 'Operations' },
    { id: 'seed-dept-fin', name: 'Finance' },
    { id: 'seed-dept-log', name: 'Logistics' },
    { id: 'seed-dept-it', name: 'IT Delivery' },
  ];

  const users = [
    { id: 'seed-user-bu1', name: 'Stevanus Kurniawan', email: 'stevanus.k@example.com', role: 'Business Owner', type: 'Business', departmentId: 'seed-dept-ops', active: true },
    { id: 'seed-user-bu2', name: 'Kiki Dewi', email: 'kiki.dewi@example.com', role: 'Business User', type: 'Business', departmentId: 'seed-dept-log', active: true },
    { id: 'seed-user-bu3', name: 'Rian Dharmawan', email: 'rian.dharmawan@example.com', role: 'Business User', type: 'Business', departmentId: 'seed-dept-fin', active: true },
    { id: 'seed-user-it1', name: 'Fajar Prasetyo', email: 'fajar.prasetyo@example.com', role: 'IT PIC', type: 'IT', departmentId: 'seed-dept-it', active: true },
    { id: 'seed-user-it2', name: 'Nanda Putri', email: 'nanda.putri@example.com', role: 'IT PIC', type: 'IT', departmentId: 'seed-dept-it', active: true },
    { id: 'seed-user-pm1', name: 'Agus Santoso', email: 'agus.santoso@example.com', role: 'IT PM', type: 'IT', departmentId: 'seed-dept-it', active: true },
    { id: 'seed-user-mgr1', name: 'Lina Wijaya', email: 'lina.wijaya@example.com', role: 'IT Manager', type: 'IT', departmentId: 'seed-dept-it', active: true },
  ].map((u) => ({
    ...u,
    passwordHash,
    isAdmin: false,
    emailActivated: true,
    activationToken: null,
    activationTokenExpiry: null,
    resetToken: null,
    resetTokenExpiry: null,
    teamMemberIds: '',
  }));

  const initiatives = [
    {
      id: 'seed-init-proj-1',
      type: 'Project',
      name: 'Asset Number Validation Enhancement',
      ticket: 'PRJ-2026-001',
      description: 'Improve validation flow for new asset number creation and SAP synchronization.',
      businessImpact: 'Reduce data correction workload and prevent duplicate assets across systems.',
      priority: 'P1',
      businessOwnerId: 'seed-user-bu1',
      businessUserIds: 'seed-user-bu2,seed-user-bu3',
      departmentId: 'seed-dept-ops',
      itPicId: 'seed-user-it1',
      itPicIds: 'seed-user-it1,seed-user-it2',
      itPmId: 'seed-user-pm1',
      itManagerIds: 'seed-user-mgr1',
      status: 'On Track',
      milestone: 'Development',
      startDate: daysAgoIso(45),
      endDate: daysFromNowIso(30),
      planStartDate: daysAgoIso(60),
      planEndDate: daysFromNowIso(45),
      remark: 'SIT sandbox data prepared and waiting final script review.',
      documentationLink: 'https://confluence.example.com/asset-validation',
      createdAt: daysAgoIso(70),
      updatedAt: daysAgoIso(1),
    },
    {
      id: 'seed-init-proj-2',
      type: 'Project',
      name: 'Warehouse Picklist Mobile Upgrade',
      ticket: 'PRJ-2026-002',
      description: 'Migrate warehouse picklist operations to responsive mobile interface.',
      businessImpact: 'Shorten picking cycle and reduce manual dispatch errors.',
      priority: 'P0',
      businessOwnerId: 'seed-user-bu1',
      businessUserIds: 'seed-user-bu2',
      departmentId: 'seed-dept-log',
      itPicId: 'seed-user-it2',
      itPicIds: 'seed-user-it2',
      itPmId: 'seed-user-pm1',
      itManagerIds: 'seed-user-mgr1',
      status: 'At Risk',
      milestone: 'Testing',
      startDate: daysAgoIso(75),
      endDate: daysFromNowIso(20),
      planStartDate: daysAgoIso(90),
      planEndDate: daysFromNowIso(30),
      remark: 'UAT delayed due to unavailable handheld scanner devices.',
      documentationLink: 'https://confluence.example.com/picklist-mobile',
      createdAt: daysAgoIso(95),
      updatedAt: daysAgoIso(2),
    },
    {
      id: 'seed-init-cr-1',
      type: 'CR',
      name: 'CR - Add mandatory approver for high-value PO',
      ticket: 'CR15042026001',
      description: 'Add approval gate for purchase orders above threshold before ERP posting.',
      businessImpact: null,
      priority: 'P1',
      businessOwnerId: 'seed-user-bu1',
      businessUserIds: 'seed-user-bu3',
      departmentId: 'seed-dept-fin',
      itPicId: 'seed-user-it1',
      itPicIds: 'seed-user-it1',
      itPmId: null,
      itManagerIds: 'seed-user-mgr1',
      status: 'On Hold',
      milestone: 'Business Requirement',
      startDate: daysAgoIso(12),
      endDate: daysFromNowIso(18),
      planStartDate: daysAgoIso(18),
      planEndDate: daysFromNowIso(25),
      remark: 'Waiting sign-off from compliance.',
      documentationLink: 'https://confluence.example.com/cr-po-approver',
      createdAt: daysAgoIso(20),
      updatedAt: daysAgoIso(3),
    },
    {
      id: 'seed-init-cr-2',
      type: 'CR',
      name: 'CR - Auto-close stale shipment tasks',
      ticket: 'CR12042026002',
      description: 'Automatically close shipment tasks with no activity for 14 days.',
      businessImpact: null,
      priority: 'P2',
      businessOwnerId: 'seed-user-bu1',
      businessUserIds: 'seed-user-bu2',
      departmentId: 'seed-dept-log',
      itPicId: 'seed-user-it2',
      itPicIds: 'seed-user-it2',
      itPmId: null,
      itManagerIds: 'seed-user-mgr1',
      status: 'Not Started',
      milestone: 'Preparation',
      startDate: null,
      endDate: null,
      planStartDate: daysAgoIso(5),
      planEndDate: daysFromNowIso(20),
      remark: 'Pending effort estimate.',
      documentationLink: '',
      createdAt: daysAgoIso(8),
      updatedAt: daysAgoIso(4),
    },
  ];

  const changeRequests = [
    {
      initiativeId: 'seed-init-cr-1',
      crSubmissionStart: daysAgoIso(17),
      crSubmissionEnd: daysAgoIso(14),
      developmentStart: daysAgoIso(10),
      developmentEnd: daysFromNowIso(2),
      sitStart: daysFromNowIso(3),
      sitEnd: daysFromNowIso(8),
      uatStart: daysFromNowIso(9),
      uatEnd: daysFromNowIso(14),
      liveDate: daysFromNowIso(15),
      crSection1Start: null,
      crSection1End: null,
      crSection2Start: null,
      crSection2End: null,
      crSection3Start: null,
      crSection3End: null,
      liveStart: null,
      liveEnd: null,
    },
    {
      initiativeId: 'seed-init-cr-2',
      crSubmissionStart: daysAgoIso(6),
      crSubmissionEnd: daysAgoIso(5),
      developmentStart: null,
      developmentEnd: null,
      sitStart: null,
      sitEnd: null,
      uatStart: null,
      uatEnd: null,
      liveDate: null,
      crSection1Start: null,
      crSection1End: null,
      crSection2Start: null,
      crSection2End: null,
      crSection3Start: null,
      crSection3End: null,
      liveStart: null,
      liveEnd: null,
    },
  ];

  const comments = [
    {
      id: 'seed-comment-1',
      initiativeId: 'seed-init-proj-1',
      authorId: 'seed-user-bu1',
      body: 'Need to verify with @Kiki Dewi due to testing of new Asset per Jan 26. Test case: search asset number in application.',
      createdAt: daysAgoIso(2),
      updatedAt: null,
    },
    {
      id: 'seed-comment-2',
      initiativeId: 'seed-init-cr-1',
      authorId: 'seed-user-it1',
      body: 'Please review revised requirement with @Rian Dharmawan before SIT window is confirmed.',
      createdAt: daysAgoIso(1),
      updatedAt: null,
    },
    {
      id: 'seed-comment-3',
      initiativeId: 'seed-init-proj-2',
      authorId: 'seed-user-pm1',
      body: 'UAT environment opened. @Lina Wijaya please align approval for extended test period.',
      createdAt: daysAgoIso(3),
      updatedAt: null,
    },
  ];

  const tasks = [
    { id: 'seed-task-1', initiativeId: 'seed-init-proj-1', name: 'Finalize BRD sign-off', description: 'Business confirms validation rules and edge cases.', status: 'done', milestone: 'Business Requirement', assigneeId: 'seed-user-bu2', startDate: daysAgoIso(50), endDate: daysAgoIso(40), createdAt: daysAgoIso(50), updatedAt: daysAgoIso(40) },
    { id: 'seed-task-2', initiativeId: 'seed-init-proj-1', name: 'Implement API rule engine', description: 'Backend validation and SAP duplicate check.', status: 'in progress', milestone: 'Development', assigneeId: 'seed-user-it1', startDate: daysAgoIso(20), endDate: daysFromNowIso(5), createdAt: daysAgoIso(20), updatedAt: daysAgoIso(1) },
    { id: 'seed-task-3', initiativeId: 'seed-init-proj-2', name: 'Prepare UAT script', description: 'Create warehouse scenarios for mobile picklist flow.', status: 'at risk', milestone: 'Testing', assigneeId: 'seed-user-pm1', startDate: daysAgoIso(8), endDate: daysFromNowIso(6), createdAt: daysAgoIso(8), updatedAt: daysAgoIso(2) },
    { id: 'seed-task-4', initiativeId: 'seed-init-cr-1', name: 'Develop approval workflow', description: 'Add threshold and approver matrix in service layer.', status: 'in progress', milestone: 'Development', assigneeId: 'seed-user-it2', startDate: daysAgoIso(9), endDate: daysFromNowIso(2), createdAt: daysAgoIso(9), updatedAt: daysAgoIso(1) },
    { id: 'seed-task-5', initiativeId: 'seed-init-cr-2', name: 'Estimate implementation effort', description: 'Refine effort and deployment approach.', status: 'not started', milestone: 'Planning', assigneeId: 'seed-user-it2', startDate: null, endDate: null, createdAt: daysAgoIso(4), updatedAt: null },
  ];

  const statusHistory = [
    { id: 'seed-status-1', initiativeId: 'seed-init-proj-2', status: 'On Track', changedAt: daysAgoIso(10), changedBy: 'seed-user-pm1' },
    { id: 'seed-status-2', initiativeId: 'seed-init-proj-2', status: 'At Risk', changedAt: daysAgoIso(2), changedBy: 'seed-user-pm1' },
    { id: 'seed-status-3', initiativeId: 'seed-init-cr-1', status: 'On Hold', changedAt: daysAgoIso(3), changedBy: 'seed-user-it1' },
  ];

  const milestoneHistory = [
    { id: 'seed-milestone-1', initiativeId: 'seed-init-proj-1', milestone: 'Planning', changedAt: daysAgoIso(25), changedBy: 'seed-user-it1' },
    { id: 'seed-milestone-2', initiativeId: 'seed-init-proj-1', milestone: 'Development', changedAt: daysAgoIso(12), changedBy: 'seed-user-it1' },
    { id: 'seed-milestone-3', initiativeId: 'seed-init-cr-1', milestone: 'Business Requirement', changedAt: daysAgoIso(7), changedBy: 'seed-user-it1' },
  ];

  const changeHistory = [
    {
      id: 'seed-change-1',
      initiativeId: 'seed-init-proj-2',
      timestamp: daysAgoIso(2),
      changedBy: 'seed-user-pm1',
      changes: [
        { id: 'seed-change-1-item-1', field: 'status', oldValue: 'On Track', newValue: 'At Risk', changedAt: daysAgoIso(2) },
        { id: 'seed-change-1-item-2', field: 'remark', oldValue: 'UAT planned next week.', newValue: 'UAT delayed due to unavailable handheld scanner devices.', changedAt: daysAgoIso(2) },
      ],
    },
    {
      id: 'seed-change-2',
      initiativeId: 'seed-init-cr-1',
      timestamp: daysAgoIso(3),
      changedBy: 'seed-user-it1',
      changes: [
        { id: 'seed-change-2-item-1', field: 'status', oldValue: 'On Track', newValue: 'On Hold', changedAt: daysAgoIso(3) },
      ],
    },
  ];

  const notifications = [
    {
      id: 'seed-notif-1',
      userId: 'seed-user-bu2',
      type: 'mention',
      title: 'Stevanus Kurniawan mentioned you',
      message: 'Stevanus Kurniawan mentioned you in "Asset Number Validation Enhancement".',
      initiativeId: 'seed-init-proj-1',
      commentId: 'seed-comment-1',
      read: false,
      createdAt: daysAgoIso(2),
    },
    {
      id: 'seed-notif-2',
      userId: 'seed-user-bu3',
      type: 'mention',
      title: 'Fajar Prasetyo mentioned you',
      message: 'Fajar Prasetyo mentioned you in "CR - Add mandatory approver for high-value PO".',
      initiativeId: 'seed-init-cr-1',
      commentId: 'seed-comment-2',
      read: true,
      createdAt: daysAgoIso(1),
    },
  ];

  const tags = [
    { id: 'seed-tag-1', name: 'SAP' },
    { id: 'seed-tag-2', name: 'Warehouse' },
    { id: 'seed-tag-3', name: 'Approval' },
  ];

  const initiativeTags = [
    { id: 'seed-itag-1', initiativeId: 'seed-init-proj-1', tagId: 'seed-tag-1' },
    { id: 'seed-itag-2', initiativeId: 'seed-init-proj-2', tagId: 'seed-tag-2' },
    { id: 'seed-itag-3', initiativeId: 'seed-init-cr-1', tagId: 'seed-tag-3' },
  ];

  const meetingNotes = [
    {
      id: 'seed-note-1',
      initiativeId: 'seed-init-cr-1',
      title: 'Weekly CR Sync - Approval Flow',
      meetingType: 'Weekly Sync',
      meetingDate: daysAgoIso(1),
      location: 'Teams',
      meetingLink: 'https://teams.microsoft.com/demo-meeting-1',
      facilitatorId: 'seed-user-pm1',
      noteTakerId: 'seed-user-bu3',
      agenda: '1. SIT blocker review\n2. Compliance approval confirmation',
      discussion: 'SIT delayed by dependency on master data.\nCompliance requested additional approval layer.',
      decisions: 'Mandatory approver for high-value PO will be enforced.\nSIT start moved by 3 days.',
      risks: 'Late compliance sign-off may impact UAT window.',
      nextMeetingAt: daysFromNowIso(4),
      status: 'Published',
      version: 3,
      createdBy: 'seed-user-bu3',
      createdAt: daysAgoIso(6),
      updatedAt: daysAgoIso(1),
    },
    {
      id: 'seed-note-2',
      initiativeId: 'seed-init-proj-1',
      title: 'Asset Validation SIT Prep',
      meetingType: 'SIT Prep',
      meetingDate: daysAgoIso(2),
      location: 'War Room',
      meetingLink: null,
      facilitatorId: 'seed-user-it1',
      noteTakerId: 'seed-user-bu2',
      agenda: 'Review SIT scope and test data readiness.',
      discussion: 'SAP sample data is ready.\nNeed one additional batch from business.',
      decisions: 'Proceed with SIT wave 1 this week.',
      risks: 'Delay in sample data can push testing window.',
      nextMeetingAt: daysFromNowIso(5),
      status: 'Draft',
      version: 1,
      createdBy: 'seed-user-bu2',
      createdAt: daysAgoIso(2),
      updatedAt: daysAgoIso(2),
    },
  ];

  const meetingNoteParticipants = [
    { id: 'seed-note-part-1', meetingNoteId: 'seed-note-1', userId: 'seed-user-bu1', email: 'stevanus.k@example.com', name: 'Stevanus Kurniawan', role: 'Attendee' },
    { id: 'seed-note-part-2', meetingNoteId: 'seed-note-1', userId: 'seed-user-bu2', email: 'kiki.dewi@example.com', name: 'Kiki Dewi', role: 'Attendee' },
    { id: 'seed-note-part-3', meetingNoteId: 'seed-note-1', userId: 'seed-user-mgr1', email: 'lina.wijaya@example.com', name: 'Lina Wijaya', role: 'Stakeholder' },
    { id: 'seed-note-part-4', meetingNoteId: 'seed-note-2', userId: 'seed-user-it1', email: 'fajar.prasetyo@example.com', name: 'Fajar Prasetyo', role: 'Attendee' },
    { id: 'seed-note-part-5', meetingNoteId: 'seed-note-2', userId: 'seed-user-bu2', email: 'kiki.dewi@example.com', name: 'Kiki Dewi', role: 'Attendee' },
  ];

  const meetingNoteActionItems = [
    { id: 'seed-note-action-1', meetingNoteId: 'seed-note-1', description: 'Draft revised BRD', ownerId: 'seed-user-bu2', ownerName: 'Kiki Dewi', dueDate: daysFromNowIso(2).slice(0, 10), priority: 'High', status: 'In Progress', orderIndex: 0 },
    { id: 'seed-note-action-2', meetingNoteId: 'seed-note-1', description: 'Update API validation script', ownerId: 'seed-user-it1', ownerName: 'Fajar Prasetyo', dueDate: daysFromNowIso(3).slice(0, 10), priority: 'Medium', status: 'Not Started', orderIndex: 1 },
    { id: 'seed-note-action-3', meetingNoteId: 'seed-note-2', description: 'Prepare additional SAP data set', ownerId: 'seed-user-bu1', ownerName: 'Stevanus Kurniawan', dueDate: daysFromNowIso(1).slice(0, 10), priority: 'High', status: 'In Progress', orderIndex: 0 },
  ];

  const meetingNoteHistory = [
    { id: 'seed-note-hist-1', meetingNoteId: 'seed-note-1', version: 1, field: 'create', oldValue: null, newValue: 'Meeting note created', changedBy: 'seed-user-bu3', changedAt: daysAgoIso(6) },
    { id: 'seed-note-hist-2', meetingNoteId: 'seed-note-1', version: 2, field: 'decisions', oldValue: 'Draft decisions', newValue: 'Mandatory approver for high-value PO will be enforced.\nSIT start moved by 3 days.', changedBy: 'seed-user-pm1', changedAt: daysAgoIso(2) },
    { id: 'seed-note-hist-3', meetingNoteId: 'seed-note-1', version: 3, field: 'email', oldValue: null, newValue: 'Email sent to participants', changedBy: 'seed-user-pm1', changedAt: daysAgoIso(1) },
  ];

  const meetingNoteEmailLog = [
    {
      id: 'seed-note-email-1',
      meetingNoteId: 'seed-note-1',
      subject: 'Meeting Notes - Weekly CR Sync - Approval Flow',
      toEmails: 'stevanus.k@example.com,kiki.dewi@example.com',
      ccEmails: 'lina.wijaya@example.com',
      bodySnapshot: 'Meeting Notes - Weekly CR Sync - Approval Flow',
      sentBy: 'seed-user-pm1',
      sentAt: daysAgoIso(1),
      deliveryStatus: 'Sent',
      providerMessageId: null,
      errorMessage: null,
    },
  ];

  return {
    departments,
    users,
    initiatives,
    changeRequests,
    tags,
    initiativeTags,
    statusHistory,
    milestoneHistory,
    changeHistory,
    comments,
    tasks,
    documents: [],
    notifications,
    meetingNotes,
    meetingNoteParticipants,
    meetingNoteActionItems,
    meetingNoteEmailLog,
    meetingNoteHistory,
  };
}

async function seedDemoData() {
  const data = await store.read();

  removePreviousDemoData(data);

  const defaultPassword = process.env.DEMO_USER_PASSWORD || 'Demo123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const demo = buildDemoData(passwordHash);

  data.departments = uniqueById([...(data.departments || []), ...demo.departments]);
  data.users = uniqueById([...(data.users || []), ...demo.users]);
  data.initiatives = uniqueById([...(data.initiatives || []), ...demo.initiatives]);
  data.changeRequests = [...(data.changeRequests || []), ...demo.changeRequests];
  data.tags = uniqueById([...(data.tags || []), ...demo.tags]);
  data.initiativeTags = uniqueById([...(data.initiativeTags || []), ...demo.initiativeTags]);
  data.statusHistory = uniqueById([...(data.statusHistory || []), ...demo.statusHistory]);
  data.milestoneHistory = uniqueById([...(data.milestoneHistory || []), ...demo.milestoneHistory]);
  data.changeHistory = uniqueById([...(data.changeHistory || []), ...demo.changeHistory]);
  data.comments = uniqueById([...(data.comments || []), ...demo.comments]);
  data.tasks = uniqueById([...(data.tasks || []), ...demo.tasks]);
  data.documents = uniqueById([...(data.documents || []), ...demo.documents]);
  data.notifications = uniqueById([...(data.notifications || []), ...demo.notifications]);
  data.meetingNotes = uniqueById([...(data.meetingNotes || []), ...demo.meetingNotes]);
  data.meetingNoteParticipants = uniqueById([...(data.meetingNoteParticipants || []), ...demo.meetingNoteParticipants]);
  data.meetingNoteActionItems = uniqueById([...(data.meetingNoteActionItems || []), ...demo.meetingNoteActionItems]);
  data.meetingNoteEmailLog = uniqueById([...(data.meetingNoteEmailLog || []), ...demo.meetingNoteEmailLog]);
  data.meetingNoteHistory = uniqueById([...(data.meetingNoteHistory || []), ...demo.meetingNoteHistory]);

  await store.write(data);

  console.log('Demo data seeded successfully.');
  console.log(`Departments: ${demo.departments.length}`);
  console.log(`Users: ${demo.users.length}`);
  console.log(`Initiatives: ${demo.initiatives.length} (Projects + CR)`);
  console.log(`Comments: ${demo.comments.length}`);
  console.log(`Tasks: ${demo.tasks.length}`);
  console.log(`Meeting Notes: ${demo.meetingNotes.length}`);
  console.log('');
  console.log('Demo user password for seeded users:', defaultPassword);
  console.log('Admin login remains unchanged from your current environment settings.');
}

seedDemoData().catch((err) => {
  console.error('Failed to seed demo data:', err);
  process.exit(1);
});
