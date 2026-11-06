'use strict';
const assert = require('assert');
const service = require('../../app/services/competitive/problem-browser');
async function main() {
    assert.throws(() => service.officialURL('unknown', 'x'), /Unsupported/);
    assert.throws(() => service.officialURL('leetcode', '../../secret'), /Invalid/);
    assert.throws(() => service.officialURL('codeforces', 'abc'), /Invalid/);
    assert.strictEqual(service.officialURL('codeforces', '4-A'), 'https://codeforces.com/problemset/problem/4/A');
    for (const [provider, search, id, title] of [
        ['codeforces', '4A', '4-A', 'Watermelon'],
        ['leetcode', 'two sum', 'two-sum', 'Two Sum'],
        ['hackerrank', 'simple array sum', 'simple-array-sum', 'Simple Array Sum']
    ]) {
        const result = await service.list({ provider, search });
        assert(result.items.some(item => item.id === id && item.title === title), `${provider} search failed`);
        const detail = await service.detail(provider, id);
        assert.strictEqual(detail.title, title);
        assert(detail.url.startsWith('https://'));
        if (provider === 'codeforces') assert(detail.note.includes('Companion'));
        else assert(detail.html.length > 100 && Object.keys(detail.snippets).length >= 5);
        const cached = await service.list({ provider, search });
        assert.deepStrictEqual(cached, result);
        console.log(`PASS live ${provider}: searchable catalog, canonical detail and cached repeat`);
    }
    const hard = await service.list({ provider: 'hackerrank', difficulty: 'hard' });
    assert(hard.items.length && hard.items.every(item => /hard|advanced|expert/i.test(item.difficulty)));
    const second = await service.list({ provider: 'hackerrank', page: 1 });
    assert(second.items.length > 0 && second.page === 1);
    console.log('PASS HackerRank filtering and pagination; unsafe providers/identifiers rejected');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
