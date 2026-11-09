'use strict';
const path = require('path');
const base = require('../../package.json').build;
process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL ||= '5';
module.exports = {
    ...base,
    directories: { ...base.directories, output: path.join(process.env.LOCALAPPDATA, 'SemekoBuild', 'release') },
    win: {
        ...base.win,
        target: [{ target: 'nsis', arch: ['x64'] }],
        extraResources: [...base.win.extraResources, { from: 'LICENSE', to: 'SEMEKO-LICENSE.txt' }, {
            from: path.join(process.env.LOCALAPPDATA, 'SemekoBuild', 'runtimes'), to: 'language-runtimes'
        }]
    },
    nsis: {
        artifactName: 'semeko-pro-setup-${version}-x64.${ext}',
        oneClick: true, perMachine: false, allowElevation: false,
        createDesktopShortcut: 'always', createStartMenuShortcut: true,
        shortcutName: 'Semeko', runAfterFinish: true,
        deleteAppDataOnUninstall: false
    }
};
