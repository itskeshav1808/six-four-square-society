/** Volunteers sign in with a mobile number; it maps to this internal login address. */
export const VOLUNTEER_EMAIL_DOMAIN = "volunteer.64squares.app";

export function volunteerLoginEmail(phone: string) {
  return `${phone.replace(/\D/g, "").slice(-10)}@${VOLUNTEER_EMAIL_DOMAIN}`;
}
