# Semeko naming and updates

The user-facing name is **Semeko** in About, splash/welcome screens, package product metadata, shortcuts, Discord activity state and activity image tooltip. Internal package name, application ID, source repository and public release repository remain stable so existing installations keep their data and update channel.

Discord's application heading is controlled by the owner of application `1476184013742805105` in Discord Developer Portal. Changing an RPC activity does not rename that remote application. The source now sends Semeko; if Discord still shows an old application heading, its owner must rename the application there. No remote Discord application settings were changed.

## Publishing an update

1. Finish validation and choose a version higher than the installed version.
2. Build the NSIS installer using `npm run build:release`.
3. Publish the installer, its generated `latest.yml`, and blockmap together on a non-draft stable GitHub release in `graperu/semeko-pro-downloads`. Do not rename files after generating the manifest; manifest URL/hash/size must match the uploaded installer.
4. Users with the installed Windows application check on startup; newer source also checks every four hours while open. Settings → About offers a manual check. Prerelease versions are opt-in.
5. The app displays update/download progress and offers a restart after download; it does not silently install on quit.

Uploading source or an installer alone does not update installed clients. Development Electron runs do not check automatically. Version 1.4.0 remains the public release; no new release was created during this work. End-to-end installation of a future version has not been tested because publication is still on hold.

`npm run test:updates` validates event delivery with a simulated newer release, including progress and restart-ready status. It never downloads or installs an update.

`npm run test:terminal` runs interactive prompts in C, C++, Python, Java and C# through the real editor/build/run pipeline. It checks clicking the output area to focus stdin, Enter submission, signed values, disabled input after exit, whitespace and EOF.
