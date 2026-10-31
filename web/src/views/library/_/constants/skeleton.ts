const MOBILE_ROWS = 8;
const DESKTOP_ROWS = 12;

export const SKELETON_ROWS = Array.from({ length: DESKTOP_ROWS }, (_, index) => ({
  id: index,
  className: index < MOBILE_ROWS ? 'flex' : 'hidden sm:flex',
}));

export const MAX_FAVORITE_SKELETON_ROWS = DESKTOP_ROWS;
