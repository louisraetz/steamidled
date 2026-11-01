import { LOGO_EYE_STROKE, LOGO_EYES_PATH } from '../constants/logo';

export function MascotClosedEyes() {
  return <path d={LOGO_EYES_PATH} strokeWidth={LOGO_EYE_STROKE} className="stroke-background" />;
}
