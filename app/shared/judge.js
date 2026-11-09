'use strict';

/**
 * Shared judge utilities used by both main process and renderer (via preload).
 * Single source of truth for output normalization and verdict comparison.
 */

/**
 * Normalize output for judge comparison.
 * Rules:
 * - Normalize line endings to \n
 * - Trim trailing spaces per line
 * - Trim leading/trailing blank space of whole output
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeOutput(text) {
    return String(text ?? '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')
        .trim();
}

/**
 * Compare actual and expected output using shared normalization.
 *
 * @param {string} actual
 * @param {string} expected
 * @returns {{ matched: boolean, actualNorm: string, expectedNorm: string }}
 */
function compareOutputs(actual, expected) {
    const actualNorm = normalizeOutput(actual);
    const expectedNorm = normalizeOutput(expected);
    return {
        matched: actualNorm === expectedNorm,
        actualNorm,
        expectedNorm,
    };
}

module.exports = {
    normalizeOutput,
    compareOutputs,
    compareFunctionOutputs,
};

function compareFunctionOutputs(actual, expected) {
    const result = compareOutputs(actual, expected);
    try {
        const parse = text => JSON.parse(text, (key, value, context) =>
            typeof value === 'number' && /^-?\d+$/.test(context?.source || '') ? BigInt(context.source) : value);
        const equal = (a, b) => {
            if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v,i) => equal(v,b[i]));
            if (typeof a === 'number' && typeof b === 'number') return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= 8 * Number.EPSILON * Math.max(1,Math.abs(a),Math.abs(b));
            if (typeof a === 'bigint' && typeof b === 'number') return Number.isInteger(b) && a === BigInt(b);
            if (typeof b === 'bigint' && typeof a === 'number') return Number.isInteger(a) && b === BigInt(a);
            return a === b;
        };
        result.matched = equal(parse(actual), parse(expected));
    } catch { result.matched = false; }
    return result;
}
