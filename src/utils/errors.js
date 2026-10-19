/**
 * Turns any error into a user-friendly, translated message.
 * `t` is the translate function from useLanguage().
 */
export function errorMessage(error, t) {
  if (!error) return '';
  const status = error.status;
  if (status === 0) return t('errors.network');
  if (status === 422) return error.message || t('errors.422');
  if (status >= 500) return t('errors.500');
  if ([401, 403, 404, 429].includes(status)) return t(`errors.${status}`);
  return t('errors.generic');
}

/**
 * Maps a Laravel 422 `errors` object ({ field: ["msg", ...] }) onto form fields.
 * Returns { fieldErrors, unmatched } – unmatched messages are shown in the form banner
 * so nothing the server says is ever silently dropped.
 */
export function mapServerErrors(errors, knownFields) {
  const fieldErrors = {};
  const unmatched = [];
  Object.entries(errors || {}).forEach(([field, messages]) => {
    const message = Array.isArray(messages) ? messages[0] : String(messages);
    if (knownFields.includes(field)) fieldErrors[field] = message;
    else unmatched.push(message);
  });
  return { fieldErrors, unmatched };
}
