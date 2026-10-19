import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, unwrap } from '../api/endpoints';
import { Ltr, PriorityBadge, StatusBadge } from '../components/Badges';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { Alert, EmptyState, ErrorState, LoadingState, Spinner } from '../components/States';
import { useFetch } from '../hooks/useFetch';
import { useFlash } from '../hooks/useFlash';
import { useLanguage } from '../i18n/LanguageContext';
import { useMeta } from '../meta/MetaContext';
import { errorMessage, mapServerErrors } from '../utils/errors';
import { validateComment } from '../utils/validation';

export default function TicketDetailPage() {
  const { id } = useParams();
  const { t, formatDate } = useLanguage();
  const { categoryName } = useMeta();
  const navigate = useNavigate();
  const [flash, clearFlash] = useFlash();

  const { data, loading, error, reload, setData } = useFetch(
    (signal) => api.getTicket(id, signal).then(unwrap),
    [id],
  );

  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (loading && !data) {
    return (
      <div className="card">
        <LoadingState label={t('detail.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <BackLink />
        <div className="card">
          {error.status === 404 ? (
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
            <ErrorState error={error} onRetry={reload} />
          )}
        </div>
      </>
    );
  }

  const ticket = data;
  const comments = ticket.comments ?? [];

  const onDelete = async () => {
    if (!window.confirm(t('detail.confirmDelete', { ref: ticket.reference }))) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.deleteTicket(ticket.id);
      navigate('/tickets', { state: { flash: { key: 'flash.deleted', vars: { ref: ticket.reference } } } });
    } catch (err) {
      setActionError(errorMessage(err, t));
      setDeleting(false);
    }
  };

  const onCommentAdded = (comment) =>
    setData((current) => ({ ...current, comments: [...(current.comments ?? []), comment] }));

  return (
    <article>
      <BackLink />

      {flash && (
        <Alert type="success" onClose={clearFlash}>
          {t(flash.key, flash.vars)}
        </Alert>
      )}
      {actionError && (
        <Alert type="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <div className="page-header">
        <div className="detail-heading">
          <Ltr className="ref ref-lg">{ticket.reference}</Ltr>
          <h1 dir="auto">{ticket.subject}</h1>
          <div className="badge-row">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
        <div className="actions">
          <Link to={`/tickets/${ticket.id}/edit`} className="btn btn-secondary">
            <Icon name="edit" />
            {t('detail.edit')}
          </Link>
          <button type="button" className="btn btn-danger" onClick={onDelete} disabled={deleting}>
            {deleting ? <Spinner size="sm" /> : <Icon name="trash" />}
            {deleting ? t('detail.deleting') : t('detail.delete')}
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack">
          <section className="card card-pad">
            <h2 className="section-title">{t('detail.description')}</h2>
            <p className="description" dir="auto">
              {ticket.description}
            </p>
          </section>

          <section className="card card-pad" aria-labelledby="comments-title">
            <h2 id="comments-title" className="section-title">
              {t('detail.comments')} <span className="count">{comments.length}</span>
            </h2>
            {comments.length === 0 ? (
              <p className="muted">{t('detail.noComments')}</p>
            ) : (
              <ol className="comments">
                {comments.map((c) => (
                  <li key={c.id} className="comment">
                    <div className="avatar" aria-hidden="true">
                      {(c.author_name || '?').trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="comment-main">
                      <div className="comment-meta">
                        <strong dir="auto">{c.author_name}</strong>
                        <time className="muted" dateTime={c.created_at}>
                          {formatDate(c.created_at)}
                        </time>
                      </div>
                      <p dir="auto">{c.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <CommentForm ticketId={ticket.id} onAdded={onCommentAdded} />
          </section>
        </div>

        <aside className="card card-pad">
          <h2 className="section-title">{t('detail.details')}</h2>
          <dl className="details">
            <dt>{t('detail.requester')}</dt>
            <dd dir="auto">{ticket.requester_name}</dd>
            <dt>{t('detail.email')}</dt>
            <dd>
              <a href={`mailto:${ticket.requester_email}`}>
                <Ltr>{ticket.requester_email}</Ltr>
              </a>
            </dd>
            <dt>{t('detail.assignee')}</dt>
            <dd dir="auto">{ticket.assignee_name || <span className="muted">{t('common.unassigned')}</span>}</dd>
            <dt>{t('detail.category')}</dt>
            <dd>{categoryName(ticket.category)}</dd>
            <dt>{t('detail.created')}</dt>
            <dd>
              <time dateTime={ticket.created_at}>{formatDate(ticket.created_at)}</time>
            </dd>
            <dt>{t('detail.updated')}</dt>
            <dd>
              <time dateTime={ticket.updated_at}>{formatDate(ticket.updated_at)}</time>
            </dd>
          </dl>
        </aside>
      </div>
    </article>
  );
}

function BackLink() {
  const { t } = useLanguage();
  return (
    <Link to="/tickets" className="back-link">
      <Icon name="arrow" className="flip" />
      {t('detail.back')}
    </Link>
  );
}

/** Bonus: POST /api/tickets/{id}/comments, with client + server (422) validation. */
function CommentForm({ ticketId, onAdded }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [values, setValues] = useState({ author_name: user?.name ?? '', body: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [posted, setPosted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
    setPosted(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    const clientErrors = validateComment(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      const res = await api.addComment(ticketId, {
        author_name: values.author_name.trim(),
        body: values.body.trim(),
      });
      onAdded(unwrap(res));
      setValues((v) => ({ ...v, body: '' }));
      setPosted(true);
    } catch (err) {
      if (err.status === 422) {
        const { fieldErrors, unmatched } = mapServerErrors(err.errors, ['author_name', 'body']);
        setErrors(fieldErrors);
        if (unmatched.length) setFormError(unmatched.join(' '));
      } else {
        setFormError(errorMessage(err, t));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="comment-form" onSubmit={onSubmit} noValidate>
      <h3 className="subsection-title">{t('comment.add')}</h3>
      {formError && <Alert type="error">{formError}</Alert>}
      {posted && <Alert type="success">{t('comment.posted')}</Alert>}
      <Field id="comment-author" label={t('comment.author')} required error={errors.author_name}>
        {(props) => (
          <input
            {...props}
            name="author_name"
            className="input"
            value={values.author_name}
            onChange={onChange}
            disabled={submitting}
            dir="auto"
          />
        )}
      </Field>
      <Field id="comment-body" label={t('comment.body')} required error={errors.body}>
        {(props) => (
          <textarea
            {...props}
            name="body"
            rows={3}
            className="input"
            value={values.body}
            onChange={onChange}
            disabled={submitting}
            dir="auto"
          />
        )}
      </Field>
      <div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting && <Spinner size="sm" />}
          {submitting ? t('comment.submitting') : t('comment.submit')}
        </button>
      </div>
    </form>
  );
}
