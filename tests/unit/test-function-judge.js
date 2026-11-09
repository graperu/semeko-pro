'use strict';
const assert = require('assert');
const { compareFunctionOutputs, compareOutputs } = require('../../app/shared/judge');
const cases = [
    ['1.23456789e-5', '0.0000123456789', true],
    ['1.23457', '1.23456789', false],
    ['9007199254740993', '9007199254740992', false],
    ['9223372036854775807', '9223372036854775807', true],
    ['-9223372036854775808', '-9223372036854775807', false],
    ['[1, 2]', '[1,2]', true],
    ['[2,1]', '[1,2]', false],
    ['[[1],[2]]', '[[1,2]]', false],
    ['[true,false]', '[1,0]', false],
    ['"line\\nbreak"', '"line\\nbreak"', true],
    ['"line break"', '"line\\nbreak"', false],
    ['"\\u1ebf"', '"ế"', true],
    ['1 trailing', '1', false],
    ['NaN', '0', false],
    ['{"x":1}', '{"x":1}', false]
];
for (const [actual, expected, matched] of cases) {
    assert.strictEqual(compareFunctionOutputs(actual, expected).matched, matched, actual + ' vs ' + expected);
}
assert.strictEqual(compareOutputs('1e2', '100').matched, false, 'stdin output keeps ordinary judging rules');
console.log(`PASS ${cases.length + 1} function judge regressions`);
