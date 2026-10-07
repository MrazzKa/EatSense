/** A request nobody takes within this window expires instead of implying someone is coming. */
export const REQUEST_TTL_MINUTES = Number(process.env.HOTLINE_REQUEST_TTL_MINUTES || 20);

/**
 * A taken request that nobody marks finished is closed once its conversation has
 * been quiet for this long (see HotlineService.closeAbandoned). Without it a
 * forgotten "finish" keeps the client's request open forever and every visit to
 * the hotline screen bounces them into an old chat instead of letting them ask again.
 */
export const ACCEPTED_TTL_HOURS = Number(process.env.HOTLINE_ACCEPTED_TTL_HOURS || 12);

/** Upper bound on one presence heartbeat, so a stuck tab cannot hold the line open. */
export const PRESENCE_HEARTBEAT_MAX_MINUTES = 15;

/** Rough promise shown while waiting. Deliberately pessimistic. */
export const MINUTES_PER_PERSON_AHEAD = 4;

/**
 * Payments are written but switched off for the pilot. The flag exists so the
 * seam is visible in code rather than being retrofitted later.
 */
export const HOTLINE_PAID = process.env.HOTLINE_PAID === 'true';

/** Error code the app keys on to show the emergency screen instead of a generic failure. */
export const RED_FLAGGED_CODE = 'HOTLINE_RED_FLAGGED';
