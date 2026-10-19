import { apiRequest } from './client';

/**
 * One function per endpoint from the API reference.
 * Pages never build URLs themselves – they call these.
 */
export const api = {
  // Auth
  login: (email, password) =>
    apiRequest('/login', { method: 'POST', body: { email, password } }),
  logout: () => apiRequest('/logout', { method: 'POST' }),
  me: () => apiRequest('/me'),

  // Reference data
  meta: (signal) => apiRequest('/meta', { signal }),
  categories: (signal) => apiRequest('/categories', { signal }),

  // Tickets
  listTickets: (params, signal) => apiRequest('/tickets', { params, signal }),
  getTicket: (id, signal) => apiRequest(`/tickets/${id}`, { signal }),
  createTicket: (data) => apiRequest('/tickets', { method: 'POST', body: data }),
  updateTicket: (id, data) => apiRequest(`/tickets/${id}`, { method: 'PUT', body: data }),
  deleteTicket: (id) => apiRequest(`/tickets/${id}`, { method: 'DELETE' }),

  // Comments (bonus)
  addComment: (id, data) =>
    apiRequest(`/tickets/${id}/comments`, { method: 'POST', body: data }),
};

/** Some endpoints wrap the payload in { data: ... }, some don't – normalise. */
export function unwrap(response) {
  if (response && typeof response === 'object' && 'data' in response && !Array.isArray(response)) {
    return response.data;
  }
  return response;
}
