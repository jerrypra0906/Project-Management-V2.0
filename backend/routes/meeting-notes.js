import express from 'express';
import crypto from 'crypto';
import store from '../store.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendMeetingNotesEmail } from '../services/email.js';

const router = express.Router();

const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

const NOTE_STATUSES = ['Draft', 'Published'];
const PARTICIPANT_ROLES = ['Attendee', 'Stakeholder', 'Absent', 'Optional'];

router.use(authenticateToken);

function isPrivilegedRole(user) {
  if (!user) return false;
  if (user.isAdmin) return true;
  const role = (user.role || '').toLowerCase();
  return role.includes('pm') || role.includes('manager');
}

function canPublishOrSend(note, user) {
  if (!note || !user) return false;
  if (user.isAdmin || isPrivilegedRole(user)) return true;
  return note.facilitatorId === user.id || note.noteTakerId === user.id || note.createdBy === user.id;
}

function ensureStatus(status) {
  if (!status) return 'Draft';
  if (NOTE_STATUSES.includes(status)) return status;
  if (status === 'Sent' || status === 'Archived') return 'Published';
  return 'Draft';
}

function normalizeParticipants(participants = []) {
  return (participants || [])
    .filter((p) => p && (p.userId || p.email || p.name))
    .map((p) => ({
      id: p.id || uuid(),
      userId: p.userId || null,
      email: p.email || null,
      name: p.name || null,
      role: PARTICIPANT_ROLES.includes(p.role) ? p.role : 'Attendee',
    }));
}

function normalizeActionItems(actionItems = []) {
  return (actionItems || [])
    .filter((item) => item && item.description && String(item.description).trim())
    .map((item, index) => ({
      id: item.id || uuid(),
      description: String(item.description).trim(),
      ownerId: item.ownerId || null,
      ownerName: item.ownerName || null,
      dueDate: item.dueDate || null,
      priority: item.priority || null,
      status: item.status || 'Not Started',
      orderIndex: Number.isFinite(item.orderIndex) ? item.orderIndex : index,
    }));
}

function buildEmailRecipientSets(note, participants, users, explicitTo = [], explicitCc = []) {
  const toSet = new Set((explicitTo || []).map((e) => String(e || '').trim()).filter(Boolean));
  const ccSet = new Set((explicitCc || []).map((e) => String(e || '').trim()).filter(Boolean));

  const usersById = new Map((users || []).map((u) => [u.id, u]));
  const addFromParticipant = (participant) => {
    if (!participant) return;
    if (participant.email) {
      if (participant.role === 'Stakeholder') ccSet.add(participant.email);
      else toSet.add(participant.email);
      return;
    }
    if (participant.userId && usersById.has(participant.userId)) {
      const email = usersById.get(participant.userId).email;
      if (email) {
        if (participant.role === 'Stakeholder') ccSet.add(email);
        else toSet.add(email);
      }
    }
  };

  participants.forEach(addFromParticipant);

  const addUser = (userId, bucket) => {
    if (!userId || !usersById.has(userId)) return;
    const email = usersById.get(userId).email;
    if (email) bucket.add(email);
  };
  addUser(note.facilitatorId, ccSet);
  addUser(note.noteTakerId, ccSet);

  return {
    to: Array.from(toSet),
    cc: Array.from(ccSet),
  };
}

function validateForPublish(payload, participants) {
  const required = ['title', 'meetingType', 'meetingDate', 'facilitatorId', 'noteTakerId'];
  for (const field of required) {
    if (!payload[field] || (typeof payload[field] === 'string' && payload[field].trim() === '')) {
      return `Missing required field: ${field}`;
    }
  }
  if (!participants || participants.length === 0) {
    return 'At least one participant is required to publish';
  }
  return null;
}

function appendActivityLog(data, initiativeId, changedBy, changes) {
  if (!initiativeId || !Array.isArray(changes) || changes.length === 0) return;
  if (!data.changeHistory) data.changeHistory = [];
  data.changeHistory.push({
    id: uuid(),
    initiativeId,
    timestamp: now(),
    changedBy: changedBy || 'Unknown',
    changes: changes.map((change) => ({
      id: change.id || uuid(),
      field: change.field,
      oldValue: change.oldValue ?? null,
      newValue: change.newValue ?? null,
      changedAt: now(),
    })),
  });
}

router.get('/initiative/:initiativeId', async (req, res) => {
  try {
    const data = await store.read();
    const initiative = (data.initiatives || []).find((x) => x.id === req.params.initiativeId);
    if (!initiative) return res.status(404).json({ error: 'Initiative not found' });

    const q = (req.query.q || '').toString().toLowerCase();
    const status = (req.query.status || '').toString();
    const rows = (data.meetingNotes || [])
      .filter((note) => note.initiativeId === req.params.initiativeId)
      .filter((note) => !note.deletedAt)
      .filter((note) => (status ? note.status === status : true))
      .filter((note) => {
        if (!q) return true;
        return (
          (note.title || '').toLowerCase().includes(q) ||
          (note.meetingType || '').toLowerCase().includes(q) ||
          (note.agenda || '').toLowerCase().includes(q) ||
          (note.discussion || '').toLowerCase().includes(q) ||
          (note.decisions || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    res.json(rows);
  } catch (e) {
    console.error('Meeting notes list error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await store.read();
    const note = (data.meetingNotes || []).find((x) => x.id === req.params.id);
    if (!note || note.deletedAt) return res.status(404).json({ error: 'Meeting note not found' });

    const initiative = (data.initiatives || []).find((x) => x.id === note.initiativeId);
    if (!initiative) return res.status(404).json({ error: 'Initiative not found' });

    const participants = (data.meetingNoteParticipants || []).filter((x) => x.meetingNoteId === note.id);
    const actionItems = (data.meetingNoteActionItems || [])
      .filter((x) => x.meetingNoteId === note.id)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const history = (data.meetingNoteHistory || [])
      .filter((x) => x.meetingNoteId === note.id)
      .sort((a, b) => (b.changedAt || '').localeCompare(a.changedAt || ''));
    const emailHistory = (data.meetingNoteEmailLog || [])
      .filter((x) => x.meetingNoteId === note.id)
      .sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));

    res.json({ ...note, participants, actionItems, history, emailHistory });
  } catch (e) {
    console.error('Meeting note detail error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    const data = await store.read();
    const note = (data.meetingNotes || []).find((x) => x.id === req.params.id);
    if (!note || note.deletedAt) return res.status(404).json({ error: 'Meeting note not found' });
    const initiative = (data.initiatives || []).find((x) => x.id === note.initiativeId);
    if (!initiative) return res.status(404).json({ error: 'Initiative not found' });
    const history = (data.meetingNoteHistory || [])
      .filter((x) => x.meetingNoteId === note.id)
      .sort((a, b) => (b.changedAt || '').localeCompare(a.changedAt || ''));
    res.json(history);
  } catch (e) {
    console.error('Meeting note history error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/:id/email-history', async (req, res) => {
  try {
    const data = await store.read();
    const note = (data.meetingNotes || []).find((x) => x.id === req.params.id);
    if (!note || note.deletedAt) return res.status(404).json({ error: 'Meeting note not found' });
    const initiative = (data.initiatives || []).find((x) => x.id === note.initiativeId);
    if (!initiative) return res.status(404).json({ error: 'Initiative not found' });
    const rows = (data.meetingNoteEmailLog || [])
      .filter((x) => x.meetingNoteId === note.id)
      .sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
    res.json(rows);
  } catch (e) {
    console.error('Meeting note email history error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.initiativeId) return res.status(400).json({ error: 'initiativeId is required' });

    const data = await store.read();
    const initiative = (data.initiatives || []).find((x) => x.id === payload.initiativeId);
    if (!initiative) return res.status(404).json({ error: 'Initiative not found' });

    const ts = now();
    const note = {
      id: uuid(),
      initiativeId: payload.initiativeId,
      title: payload.title || 'Untitled Meeting Note',
      meetingType: payload.meetingType || 'General',
      meetingDate: payload.meetingDate || ts,
      location: payload.location || null,
      meetingLink: payload.meetingLink || null,
      facilitatorId: payload.facilitatorId || req.user.id,
      noteTakerId: payload.noteTakerId || req.user.id,
      agenda: payload.agenda || '',
      discussion: payload.discussion || '',
      decisions: payload.decisions || '',
      risks: payload.risks || '',
      nextMeetingAt: payload.nextMeetingAt || null,
      status: ensureStatus(payload.status),
      version: 1,
      createdBy: req.user.id,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };

    if (note.status === 'Published') {
      const participants = normalizeParticipants(payload.participants || []);
      const validationError = validateForPublish(note, participants);
      if (validationError) return res.status(400).json({ error: validationError });
    }

    if (!data.meetingNotes) data.meetingNotes = [];
    if (!data.meetingNoteParticipants) data.meetingNoteParticipants = [];
    if (!data.meetingNoteActionItems) data.meetingNoteActionItems = [];
    if (!data.meetingNoteHistory) data.meetingNoteHistory = [];

    data.meetingNotes.push(note);
    const participants = normalizeParticipants(payload.participants || []);
    const actionItems = normalizeActionItems(payload.actionItems || []);
    participants.forEach((participant) => {
      data.meetingNoteParticipants.push({ ...participant, meetingNoteId: note.id });
    });
    actionItems.forEach((item) => {
      data.meetingNoteActionItems.push({ ...item, meetingNoteId: note.id });
    });

    data.meetingNoteHistory.push({
      id: uuid(),
      meetingNoteId: note.id,
      version: 1,
      field: 'create',
      oldValue: null,
      newValue: `Meeting note created (${note.status})`,
      changedBy: req.user.id,
      changedAt: ts,
    });

    appendActivityLog(data, note.initiativeId, req.user.id, [
      { field: 'meetingNote.create', oldValue: null, newValue: note.title },
    ]);

    await store.write(data);

    res.status(201).json(note);
  } catch (e) {
    console.error('Meeting note create error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const payload = req.body || {};
    const data = await store.read();
    const note = (data.meetingNotes || []).find((x) => x.id === req.params.id);
    if (!note || note.deletedAt) return res.status(404).json({ error: 'Meeting note not found' });

    const initiative = (data.initiatives || []).find((x) => x.id === note.initiativeId);
    if (!initiative) return res.status(404).json({ error: 'Initiative not found' });

    const nextStatus = ensureStatus(payload.status || note.status);
    if (note.status === 'Published' && nextStatus === 'Draft') {
      return res.status(400).json({ error: 'Published meeting notes cannot be reverted to draft' });
    }
    const participants = normalizeParticipants(payload.participants || []);
    if (nextStatus === 'Published') {
      const validationError = validateForPublish({ ...note, ...payload, status: nextStatus }, participants);
      if (validationError) return res.status(400).json({ error: validationError });
    }

    const updatableFields = [
      'title', 'meetingType', 'meetingDate', 'location', 'meetingLink', 'facilitatorId', 'noteTakerId',
      'agenda', 'discussion', 'decisions', 'risks', 'nextMeetingAt', 'status',
    ];

    const changes = [];
    updatableFields.forEach((field) => {
      if (!(field in payload)) return;
      const oldValue = note[field] ?? null;
      const newValue = payload[field] ?? null;
      if (String(oldValue ?? '') !== String(newValue ?? '')) {
        changes.push({ field, oldValue, newValue });
        note[field] = newValue;
      }
    });
    note.status = nextStatus;
    note.version = Number(note.version || 1) + 1;
    note.updatedAt = now();

    if (!data.meetingNoteParticipants) data.meetingNoteParticipants = [];
    if (!data.meetingNoteActionItems) data.meetingNoteActionItems = [];
    if (!data.meetingNoteHistory) data.meetingNoteHistory = [];

    data.meetingNoteParticipants = data.meetingNoteParticipants.filter((x) => x.meetingNoteId !== note.id);
    participants.forEach((participant) => {
      data.meetingNoteParticipants.push({ ...participant, meetingNoteId: note.id });
    });

    data.meetingNoteActionItems = data.meetingNoteActionItems.filter((x) => x.meetingNoteId !== note.id);
    normalizeActionItems(payload.actionItems || []).forEach((item) => {
      data.meetingNoteActionItems.push({ ...item, meetingNoteId: note.id });
    });

    changes.forEach((change) => {
      data.meetingNoteHistory.push({
        id: uuid(),
        meetingNoteId: note.id,
        version: note.version,
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        changedBy: req.user.id,
        changedAt: note.updatedAt,
      });
    });

    if (changes.length > 0) {
      appendActivityLog(data, note.initiativeId, req.user.id, changes.map((change) => ({
        field: `meetingNote.${change.field}`,
        oldValue: change.oldValue,
        newValue: change.newValue,
      })));
    }

    await store.write(data);

    res.json({ ok: true, note });
  } catch (e) {
    console.error('Meeting note update error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/:id/publish', async (req, res) => {
  try {
    const data = await store.read();
    const note = (data.meetingNotes || []).find((x) => x.id === req.params.id);
    if (!note || note.deletedAt) return res.status(404).json({ error: 'Meeting note not found' });
    const initiative = (data.initiatives || []).find((x) => x.id === note.initiativeId);
    if (!initiative) return res.status(404).json({ error: 'Initiative not found' });
    if (!canPublishOrSend(note, req.user)) return res.status(403).json({ error: 'Insufficient permission to publish' });

    const participants = (data.meetingNoteParticipants || []).filter((x) => x.meetingNoteId === note.id);
    const validationError = validateForPublish(note, participants);
    if (validationError) return res.status(400).json({ error: validationError });

    if (note.status === 'Published') {
      return res.json({ ok: true, note });
    }

    const oldStatus = note.status;
    note.status = 'Published';
    note.version = Number(note.version || 1) + 1;
    note.updatedAt = now();

    if (!data.meetingNoteHistory) data.meetingNoteHistory = [];
    data.meetingNoteHistory.push({
      id: uuid(),
      meetingNoteId: note.id,
      version: note.version,
      field: 'status',
      oldValue: oldStatus,
      newValue: 'Published',
      changedBy: req.user.id,
      changedAt: note.updatedAt,
    });

    appendActivityLog(data, note.initiativeId, req.user.id, [
      { field: 'meetingNote.status', oldValue: oldStatus, newValue: 'Published' },
    ]);

    await store.write(data);
    res.json({ ok: true, note });
  } catch (e) {
    console.error('Meeting note publish error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/:id/send-email', async (req, res) => {
  try {
    const data = await store.read();
    const note = (data.meetingNotes || []).find((x) => x.id === req.params.id);
    if (!note || note.deletedAt) return res.status(404).json({ error: 'Meeting note not found' });
    const initiative = (data.initiatives || []).find((x) => x.id === note.initiativeId);
    if (!initiative) return res.status(404).json({ error: 'Initiative not found' });
    if (!canPublishOrSend(note, req.user)) return res.status(403).json({ error: 'Insufficient permission to send email' });
    if (note.status !== 'Published') {
      return res.status(400).json({ error: 'Meeting note must be Published before sending email' });
    }

    const participants = (data.meetingNoteParticipants || []).filter((x) => x.meetingNoteId === note.id);
    const actionItems = (data.meetingNoteActionItems || [])
      .filter((x) => x.meetingNoteId === note.id)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const recipients = buildEmailRecipientSets(
      note,
      participants,
      data.users || [],
      req.body?.to || [],
      req.body?.cc || []
    );
    if (recipients.to.length === 0) return res.status(400).json({ error: 'No valid recipients in To list' });

    const subject = req.body?.subject || `Meeting Notes - ${note.title}`;
    const sendResult = await sendMeetingNotesEmail(
      {
        note,
        participants,
        actionItems,
        initiative,
        users: data.users || [],
      },
      {
        to: recipients.to,
        cc: recipients.cc,
      },
      {
        subject,
        sentBy: req.user.name || req.user.email || req.user.id,
      }
    );

    if (!data.meetingNoteEmailLog) data.meetingNoteEmailLog = [];
    const log = {
      id: uuid(),
      meetingNoteId: note.id,
      subject,
      toEmails: recipients.to.join(','),
      ccEmails: recipients.cc.join(','),
      bodySnapshot: sendResult.bodySnapshot || '',
      sentBy: req.user.id,
      sentAt: now(),
      deliveryStatus: sendResult.success ? 'Sent' : 'Failed',
      providerMessageId: sendResult.messageId || null,
      errorMessage: sendResult.success ? null : (sendResult.error || 'Unknown email error'),
    };
    data.meetingNoteEmailLog.push(log);

    if (sendResult.success) {
      note.updatedAt = log.sentAt;
    }

    appendActivityLog(data, note.initiativeId, req.user.id, [
      { field: 'meetingNote.email', oldValue: null, newValue: `${log.deliveryStatus} to ${recipients.to.length} recipient(s)` },
    ]);

    await store.write(data);
    if (!sendResult.success) {
      return res.status(503).json({
        ok: false,
        deliveryStatus: log.deliveryStatus,
        recipients,
        messageId: null,
        error: sendResult.error || log.errorMessage || 'Failed to send meeting notes email',
        technicalError: sendResult.technicalError || null,
        attempts: sendResult.attempts || 1,
      });
    }

    res.json({
      ok: true,
      deliveryStatus: log.deliveryStatus,
      recipients,
      messageId: sendResult.messageId || null,
      error: null,
      attempts: sendResult.attempts || 1,
    });
  } catch (e) {
    console.error('Meeting note send email error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/:id/duplicate', async (req, res) => {
  try {
    const data = await store.read();
    const source = (data.meetingNotes || []).find((x) => x.id === req.params.id);
    if (!source || source.deletedAt) return res.status(404).json({ error: 'Meeting note not found' });
    const initiative = (data.initiatives || []).find((x) => x.id === source.initiativeId);
    if (!initiative) return res.status(404).json({ error: 'Initiative not found' });

    const sourceParticipants = (data.meetingNoteParticipants || []).filter((x) => x.meetingNoteId === source.id);
    const sourceItems = (data.meetingNoteActionItems || []).filter((x) => x.meetingNoteId === source.id);
    const ts = now();
    const copyId = uuid();

    const clone = {
      ...source,
      id: copyId,
      title: `${source.title} (Copy)`,
      status: 'Draft',
      version: 1,
      createdBy: req.user.id,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
    };
    if (!data.meetingNotes) data.meetingNotes = [];
    if (!data.meetingNoteParticipants) data.meetingNoteParticipants = [];
    if (!data.meetingNoteActionItems) data.meetingNoteActionItems = [];
    if (!data.meetingNoteHistory) data.meetingNoteHistory = [];
    data.meetingNotes.push(clone);

    sourceParticipants.forEach((participant) => {
      data.meetingNoteParticipants.push({
        ...participant,
        id: uuid(),
        meetingNoteId: copyId,
      });
    });
    sourceItems.forEach((item, index) => {
      data.meetingNoteActionItems.push({
        ...item,
        id: uuid(),
        meetingNoteId: copyId,
        orderIndex: Number.isFinite(item.orderIndex) ? item.orderIndex : index,
      });
    });
    data.meetingNoteHistory.push({
      id: uuid(),
      meetingNoteId: copyId,
      version: 1,
      field: 'duplicate',
      oldValue: source.id,
      newValue: clone.title,
      changedBy: req.user.id,
      changedAt: ts,
    });

    appendActivityLog(data, clone.initiativeId, req.user.id, [
      { field: 'meetingNote.duplicate', oldValue: source.title, newValue: clone.title },
    ]);

    await store.write(data);
    res.status(201).json(clone);
  } catch (e) {
    console.error('Meeting note duplicate error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const data = await store.read();
    const note = (data.meetingNotes || []).find((x) => x.id === req.params.id);
    if (!note || note.deletedAt) return res.status(404).json({ error: 'Meeting note not found' });
    const initiative = (data.initiatives || []).find((x) => x.id === note.initiativeId);
    if (!initiative) return res.status(404).json({ error: 'Initiative not found' });
    if (!canPublishOrSend(note, req.user)) return res.status(403).json({ error: 'Insufficient permission to delete meeting note' });
    if (note.status !== 'Draft') {
      return res.status(400).json({ error: 'Only draft meeting notes can be deleted' });
    }

    const ts = now();
    note.deletedAt = ts;
    note.updatedAt = ts;

    if (!data.meetingNoteHistory) data.meetingNoteHistory = [];
    data.meetingNoteHistory.push({
      id: uuid(),
      meetingNoteId: note.id,
      version: Number(note.version || 1),
      field: 'deletedAt',
      oldValue: null,
      newValue: ts,
      changedBy: req.user.id,
      changedAt: ts,
    });

    appendActivityLog(data, note.initiativeId, req.user.id, [
      { field: 'meetingNote.softDelete', oldValue: note.title, newValue: ts },
    ]);

    await store.write(data);
    res.json({ ok: true });
  } catch (e) {
    console.error('Meeting note delete error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
