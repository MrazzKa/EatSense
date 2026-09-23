/** A request nobody takes within this window expires instead of implying someone is coming. */
export const REQUEST_TTL_MINUTES = Number(process.env.HOTLINE_REQUEST_TTL_MINUTES || 20);

/** Upper bound on one presence heartbeat, so a stuck tab cannot hold the line open. */
export const PRESENCE_HEARTBEAT_MAX_MINUTES = 15;

/** Rough promise shown while waiting. Deliberately pessimistic. */
export const MINUTES_PER_PERSON_AHEAD = 4;

/**
 * Push copy.
 *
 * Fixed strings with no detail from the request. A notification is read on a
 * lock screen, in public, by whoever is holding the phone — the last place a
 * health complaint should be spelled out. The detail lives behind the login.
 */
export const HOTLINE_PUSH_TITLE = 'EatSense';
export const HOTLINE_EXPERT_PUSH_BODY = 'Someone is waiting on the hotline';
export const HOTLINE_CLIENT_PUSH_BODY = 'A specialist has joined — open the chat';

/**
 * Payments are written but switched off for the pilot. The flag exists so the
 * seam is visible in code rather than being retrofitted later.
 */
export const HOTLINE_PAID = process.env.HOTLINE_PAID === 'true';
