export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  // 1xx Informational
  100: 'Continue',
  101: 'Switching Protocols',

  // 2xx Success
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',

  // 3xx Redirection
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',

  // 4xx Client Error
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  408: 'Request Timeout',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',

  // 5xx Server Error
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

export const getStatusMessage = (status?: number): string => {
  if (!status) return 'An unexpected error occurred';
  return HTTP_STATUS_MESSAGES[status] || 'An unexpected error occurred';
};
