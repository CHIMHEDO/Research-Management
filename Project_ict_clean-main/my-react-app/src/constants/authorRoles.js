export const AUTHOR_ROLE = Object.freeze({
  FIRST: 'First author',
  CO_AUTHOR: 'Co author',
  CORRESPONDING: 'Corresponding author',
  FIRST_AND_CORRESPONDING: 'First & Corresponding author'
});

export const AUTHOR_OPTIONS = Object.values(AUTHOR_ROLE);

export const isFirstRole = (role) =>
  role === AUTHOR_ROLE.FIRST || role === AUTHOR_ROLE.FIRST_AND_CORRESPONDING;

export const isCorrespondingRole = (role) =>
  role === AUTHOR_ROLE.CORRESPONDING || role === AUTHOR_ROLE.FIRST_AND_CORRESPONDING;

export const isCoAuthorRole = (role) =>
  role === AUTHOR_ROLE.CO_AUTHOR;