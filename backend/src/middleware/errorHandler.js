function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  let message = err.message || 'Something went wrong. Please try again.';
  if (err.code === 'ER_DUP_ENTRY') message = 'Duplicate entry. This identifier is already in use.';
  if (status === 500 && process.env.NODE_ENV === 'production') message = 'Something went wrong. Please try again.';
  res.status(status).json({ message });
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

module.exports = { errorHandler, httpError };
