function sanitizeString(str, maxLen = 5000) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

function validateEmail(email) {
  if (typeof email !== 'string') return { valid: false, error: 'Email required' };
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return { valid: false, error: 'Please enter a valid email address' };
  return { valid: true, value: trimmed };
}

function validatePassword(password) {
  if (typeof password !== 'string') return { valid: false, error: 'Password required' };
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' };
  return { valid: true, value: password };
}

function validateListing(data) {
  const errors = [];
  const title = sanitizeString(data.title, 255);
  if (!title) errors.push('Title is required');

  const category = sanitizeString(data.category, 100);
  if (!category) errors.push('Category is required');

  const price = parseInt(data.price_fcfa || data.price, 10);
  if (Number.isNaN(price) || price < 0) errors.push('Valid price is required');

  const condition = sanitizeString(data.condition, 50);
  if (!condition) errors.push('Condition is required');

  return {
    valid: errors.length === 0,
    errors,
    sanitized: { title, description: sanitizeString(data.description, 5000), category, price_fcfa: price, condition, campus_zone: sanitizeString(data.campus_zone, 100), tags: Array.isArray(data.tags) ? data.tags.map(t => sanitizeString(t, 50)).filter(Boolean) : [] }
  };
}

function validateUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

module.exports = { sanitizeString, validateEmail, validatePassword, validateListing, validateUUID };
