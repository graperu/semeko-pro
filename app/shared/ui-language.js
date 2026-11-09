'use strict';
const { readSettings } = require('./settings-store');
const vi = require('../../src/renderer/ui/i18n-vi');
function translate(text) {
    try {
        if (readSettings()?.appearance?.language === 'vi') return vi[text] || text;
    } catch { /* Keep the dialog usable if settings cannot be read. */ }
    return text;
}
function dialogOptions(options = {}) {
    const localized = { ...options };
    for (const key of ['title', 'buttonLabel', 'message', 'detail']) if (typeof options[key] === 'string') localized[key] = translate(options[key]);
    if (options.filters) localized.filters = options.filters.map(filter => ({ ...filter, name: translate(filter.name) }));
    return localized;
}
module.exports = { translate, dialogOptions };
