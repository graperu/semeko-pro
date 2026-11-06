'use strict';

window.MaterialIcons = (() => {
    const manifest = window.MaterialIconManifest;
    const own = (object, key) => object && Object.hasOwn(object, key) ? object[key] : null;
    const basename = name => String(name || '').replace(/\\/g, '/').split('/').pop().toLowerCase();
    function theme() { return document.documentElement.dataset.themeVariant === 'light' ? manifest.light || {} : {}; }
    function association(group, key) { return own(theme()[group], key) || own(manifest[group], key); }
    function fileId(name) {
        const base = basename(name);
        const exact = association('fileNames', base);
        if (exact) return exact;
        const parts = base.split('.');
        for (let index = 1; index < parts.length; index++) {
            const id = association('fileExtensions', parts.slice(index).join('.'));
            if (id) return id;
        }
        return theme().file || manifest.file;
    }
    function folderId(name, expanded) {
        return association(expanded ? 'folderNamesExpanded' : 'folderNames', basename(name))
            || theme()[expanded ? 'folderExpanded' : 'folder'] || manifest[expanded ? 'folderExpanded' : 'folder'];
    }
    function image(id, folder = false) {
        const src = manifest.iconDefinitions[id]?.iconPath || manifest.iconDefinitions[folder ? manifest.folder : manifest.file].iconPath;
        return `<img class="explorer-icon material-file-icon" src="${src}" alt="" aria-hidden="true" width="18" height="18" draggable="false">`;
    }
    return { file: name => image(fileId(name)), folder: (name, expanded) => image(folderId(name, expanded), true), fileId, folderId };
})();
