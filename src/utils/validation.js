/**
 * Client-side validation that mirrors the server rules in the API reference (§6).
 *
 * Errors are stored as { key, vars } (a translation key), not as text, so they
 * re-translate instantly when the user switches language. Errors that come back
 * from the server (422) are plain strings and are shown as-is.
 */

export const TICKET_FIELDS = [
  'subject',
  'description',
  'status',
  'priority',
  'category_id',
  'requester_name',
  'requester_email',
  'assignee_name',
];

export const LIMITS = { subject: 150, requester_name: 100, assignee_name: 100 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';

export function validateTicket(values, { statuses, priorities, categories }) {
  const errors = {};
  const required = (field) => {
    if (isBlank(values[field])) errors[field] = { key: 'validation.required' };
  };
  const max = (field) => {
    const limit = LIMITS[field];
    if (!errors[field] && !isBlank(values[field]) && String(values[field]).trim().length > limit) {
      errors[field] = { key: 'validation.max', vars: { max: limit } };
    }
  };
  const oneOf = (field, allowed) => {
    // Only check when the list actually loaded – otherwise let the server decide.
    if (!errors[field] && allowed.length && !allowed.includes(String(values[field]))) {
      errors[field] = { key: 'validation.option' };
    }
  };

  required('subject');
  max('subject');
  required('description');

  required('status');
  oneOf('status', statuses.map((s) => s.value));
  required('priority');
  oneOf('priority', priorities.map((p) => p.value));
  required('category_id');
  oneOf('category_id', categories.map((c) => String(c.id)));

  required('requester_name');
  max('requester_name');
  required('requester_email');
  if (!errors.requester_email && !EMAIL_RE.test(String(values.requester_email).trim())) {
    errors.requester_email = { key: 'validation.email' };
  }
  max('assignee_name'); // optional field

  return errors;
}

export function validateComment(values) {
  const errors = {};
  if (isBlank(values.author_name)) errors.author_name = { key: 'validation.required' };
  else if (values.author_name.trim().length > 100)
    errors.author_name = { key: 'validation.max', vars: { max: 100 } };
  if (isBlank(values.body)) errors.body = { key: 'validation.required' };
  return errors;
}

/** Ticket form values → API payload (types the server expects). */
export function toTicketPayload(values) {
  return {
    subject: values.subject.trim(),
    description: values.description.trim(),
    status: values.status,
    priority: values.priority,
    category_id: Number(values.category_id),
    requester_name: values.requester_name.trim(),
    requester_email: values.requester_email.trim(),
    assignee_name: isBlank(values.assignee_name) ? null : values.assignee_name.trim(),
  };
}
