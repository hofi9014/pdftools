/**
 * The limits of the AI tools, for the server that enforces them and the pages that state them.
 * They live here, without imports, so page code can read them without bundling the Redis client.
 */

/** How many AI requests one address may make in 24 hours. */
export const DAILY_LIMIT = 15;

/** How much of a document's text chat sends with each question (characters). */
export const MAX_CHAT_TEXT_LENGTH = 12000;

/** How much of a document's text summary and translation send (characters). */
export const MAX_BULK_TEXT_LENGTH = 120000;
