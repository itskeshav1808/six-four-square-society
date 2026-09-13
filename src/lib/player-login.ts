/** Player accounts sign in with a mobile number mapped to this internal address. */
export const PLAYER_EMAIL_DOMAIN = "player.64squares.app";

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export function playerLoginEmail(phone: string) {
  return `${phone.replace(/\D/g, "").slice(-10)}@${PLAYER_EMAIL_DOMAIN}`;
}

export function looksLikeIndianMobile(raw: string) {
  return /^[6-9]\d{9}$/.test(raw.replace(/\D/g, ""));
}
