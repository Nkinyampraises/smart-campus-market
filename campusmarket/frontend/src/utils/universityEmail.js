export const UNIVERSITY_EMAIL_DOMAIN = 'ictuniversity.edu.cm';
export const UNIVERSITY_EMAIL_SUFFIX = `@${UNIVERSITY_EMAIL_DOMAIN}`;
export const UNIVERSITY_EMAIL_ERROR = `Use your ${UNIVERSITY_EMAIL_SUFFIX} email address`;
export const UNIVERSITY_EMAIL_MAX_LENGTH = 255;

const UNIVERSITY_EMAIL_PATTERN = /^[a-z0-9._%+-]+@ictuniversity[.]edu[.]cm$/;

export const normalizeUniversityEmail = (email) => (
  typeof email === 'string' ? email.trim().toLowerCase() : ''
);

export const validateUniversityEmail = (email) => {
  const normalizedEmail = normalizeUniversityEmail(email);
  return {
    valid: normalizedEmail.length <= UNIVERSITY_EMAIL_MAX_LENGTH
      && UNIVERSITY_EMAIL_PATTERN.test(normalizedEmail),
    value: normalizedEmail,
    error: UNIVERSITY_EMAIL_ERROR,
  };
};
