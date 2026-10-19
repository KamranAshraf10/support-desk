import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, unwrap } from '../api/endpoints';
import { Ltr } from '../components/Badges';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { Alert, EmptyState, ErrorState, LoadingState, Spinner } from '../components/States';
import { useFetch } from '../hooks/useFetch';
import { useLanguage } from '../i18n/LanguageContext';
import { useMeta } from '../meta/MetaContext';
import { errorMessage, mapServerErrors } from '../utils/errors';
import { LIMITS, TICKET_FIELDS, toTicketPayload, validateTicket } from '../utils/validation';

const EMPTY = {
  subject: '',
  description: '',
  status: 'open',
  priority: 'medium',
  category_id: '',
  requester_name: '',
  requester_email: '',
  assignee_name: '',
};

function fromTicket(ticket) {
  return {
    subject: ticket.subject ?? '',
    description: ticket.description ?? '',
    status: ticket.status ?? '',
    priority: ticket.priority ?? '',
    category_id: ticket.category?.id != null ? String(ticket.category.id) : String(ticket.category_id ?? ''),
    requester_name: ticket.requester_name ?? '',
    requester_email: ticket.requester_email ?? '',
    assignee_name: ticket.assignee_name ?? '',
  };
}

/** One component for both create (/tickets/new) and edit (/tickets/:id/edit). */
export default function TicketFormPage({ mode }) {
  const isEdit = mode === 'edit';
  const { id } = useParams();
  const { t, localized } = useLanguage();
  const meta = useMeta();
  const navigate = useNavigate();
  const formRef = useRef(null);

  // In edit mode, load the existing ticket first.
  const ticketQuery = useFetch(
    (signal) => (isEdit ? api.getTicket(id, signal).then(unwrap) : Promise.resolve(null)),
    [isEdit, id],
  );

  const [values, setValues] = useState(EMPTY);
  const [initialised, setInitialised] = useState(!isEdit);
  const [errors, setErrors] = useState({});
  const [attempted, setAttempted] = useState(false); // after the first submit, re-validate live
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && ticketQuery.data && !initialised) {
      setValues(fromTicket(ticketQuery.data));
      setInitialised(true);
    }
  }, [isEdit, ticketQuery.data, initialised]);

  // ----- Loading / error states before the form can be shown -----
  if (meta.loading || (isEdit && ticketQuery.loading && !ticketQuery.data)) {
    return (
      <div className="card">
        <LoadingState />
      </div>
    );
  }
  if (meta.error) {
    return (
      <div className="card">
        <ErrorState title={t('errors.meta')} error={meta.error} onRetry={meta.reload} />
      </div>
    );
  }
  if (isEdit && ticketQuery.error) {
    return (
      <div className="card">
        {ticketQuery.error.status === 404 ? (
          <EmptyState
            title={t('detail.notFound')}
            text={t('detail.notFoundText')}
            action={
              <Link to="/tickets" className="btn btn-secondary">
                {t('detail.back')}
              </Link>
            }
          />
        ) : (
          <ErrorState error={ticketQuery.error} onRetry={ticketQuery.reload} />
        )}
      </div>
    );
  }

  const lists = { statuses: meta.statuses, priorities: meta.priorities, categories: meta.categories };
  const reference = ticketQuery.data?.reference;

  const onChange = (e) => {
    const { name, value } = e.target;
    const next = { ...values, [name]: value };
    setValues(next);
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[name]; // editing a field clears its server error
      if (attempted) {
        const clientError = validateTicket(next, lists)[name];
        if (clientError) updated[name] = clientError;
      }
      return updated;
    });
  };

  const focusFirstError = (errs) => {
    const first = TICKET_FIELDS.find((f) => errs[f]);
    if (first) formRef.current?.querySelector(`#field-${first}`)?.focus();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setAttempted(true);
    setFormError(null);

    // 1) Client-side validation (mirrors the server rules)
    const clientErrors = validateTicket(values, lists);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      setFormError(t('form.fixErrors'));
      focusFirstError(clientErrors);
      return;
    }

    // 2) Send to the API
    setSubmitting(true);
    try {
      const payload = toTicketPayload(values);
      const res = isEdit ? await api.updateTicket(id, payload) : await api.createTicket(payload);
      const saved = unwrap(res);
      const ticketId = saved?.id ?? id;
      navigate(`/tickets/${ticketId}`, {
        state: {
          flash: {
            key: isEdit ? 'flash.updated' : 'flash.created',
            vars: { ref: saved?.reference ?? reference ?? `#${ticketId}` },
          },
        },
      });
    } catch (err) {
      setSubmitting(false);
      if (err.status === 422) {
        // 3) Server validation errors → onto the matching fields
        const { fieldErrors, unmatched } = mapServerErrors(err.errors, TICKET_FIELDS);
        setErrors(fieldErrors);
        setFormError([err.message || t('errors.422'), ...unmatched].filter(Boolean).join(' '));
        focusFirstError(fieldErrors);
      } else {
        setFormError(errorMessage(err, t));
      }
    }
  };

  const fieldProps = (name) => ({
    name,
    value: values[name],
    onChange,
    disabled: submitting,
  });

  const counter = (name) =>
    t('form.counter', { count: values[name].length, max: LIMITS[name] });

  return (
    <section>
      <Link to={isEdit ? `/tickets/${id}` : '/tickets'} className="back-link">
        <Icon name="arrow" className="flip" />
        {isEdit ? <Ltr>{reference}</Ltr> : t('detail.back')}
      </Link>

      <div className="page-header">
        <div>
          <h1>
            {isEdit ? (
              <>
                {t('form.editTitle', { ref: '' }).trim()} <Ltr>{reference}</Ltr>
              </>
            ) : (
              t('form.createTitle')
            )}
          </h1>
          <p className="muted">{t('form.requiredHint')}</p>
        </div>
      </div>

      <form ref={formRef} className="card card-pad form" onSubmit={onSubmit} noValidate>
        {formError && <Alert type="error">{formError}</Alert>}

        <div className="form-grid">
          <div className="span-2">
            <Field
              id="field-subject"
              label={t('fields.subject')}
              required
              error={errors.subject}
              hint={counter('subject')}
            >
              {(p) => <input {...p} {...fieldProps('subject')} className="input" dir="auto" />}
            </Field>
          </div>

          <div className="span-2">
            <Field id="field-description" label={t('fields.description')} required error={errors.description}>
              {(p) => <textarea {...p} {...fieldProps('description')} rows={6} className="input" dir="auto" />}
            </Field>
          </div>

          <Field id="field-status" label={t('fields.status')} required error={errors.status}>
            {(p) => (
              <select {...p} {...fieldProps('status')} className="input select">
                <option value="">{t('form.select')}</option>
                {meta.statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {localized(s, 'label')}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field id="field-priority" label={t('fields.priority')} required error={errors.priority}>
            {(p) => (
              <select {...p} {...fieldProps('priority')} className="input select">
                <option value="">{t('form.select')}</option>
                {meta.priorities.map((pr) => (
                  <option key={pr.value} value={pr.value}>
                    {localized(pr, 'label')}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field id="field-category_id" label={t('fields.category_id')} required error={errors.category_id}>
            {(p) => (
              <select {...p} {...fieldProps('category_id')} className="input select">
                <option value="">{t('form.select')}</option>
                {meta.categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {meta.categoryName(c)}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            id="field-assignee_name"
            label={t('fields.assignee_name')}
            optional
            error={errors.assignee_name}
          >
            {(p) => <input {...p} {...fieldProps('assignee_name')} className="input" dir="auto" />}
          </Field>

          <Field id="field-requester_name" label={t('fields.requester_name')} required error={errors.requester_name}>
            {(p) => <input {...p} {...fieldProps('requester_name')} className="input" dir="auto" autoComplete="name" />}
          </Field>

          <Field
            id="field-requester_email"
            label={t('fields.requester_email')}
            required
            error={errors.requester_email}
          >
            {(p) => (
              <input
                {...p}
                {...fieldProps('requester_email')}
                type="email"
                className="input"
                dir="ltr"
                autoComplete="email"
              />
            )}
          </Field>
        </div>

        <div className="form-actions">
          <Link to={isEdit ? `/tickets/${id}` : '/tickets'} className="btn btn-ghost">
            {t('form.cancel')}
          </Link>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <Spinner size="sm" />}
            {submitting ? t('form.saving') : isEdit ? t('form.save') : t('form.create')}
          </button>
        </div>
      </form>
    </section>
  );
}
