import releaseData from "./productionReleases.json";

/**
 * @typedef {Object} ReleaseEntry
 * @property {string} version
 * @property {string} title
 * @property {string} summary
 * @property {string[]} items
 */

/** @type {ReleaseEntry[]} */
export const productionReleases = releaseData;
