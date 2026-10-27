# Android Build Instructions (Capacitor)

The web platform is installable on Android today as a **PWA** (see README → PWA section):
open the site in Chrome on Android → menu → *Add to Home screen*.

Native APK/AAB packaging is configured via Capacitor (`capacitor.config.ts`,
`webDir: dist`). **No APK has been built in this repository** — the build machine
does not currently have Java or the Android SDK, and the npm registry connection
for `@capacitor/*` packages was interrupted. The steps below are reproducible.

## Prerequisites

| Requirement | Check | Install |
|---|---|---|
| Node.js ≥ 18 | `node -v` | https://nodejs.org |
| Java JDK 17 | `java -version` | `winget install Microsoft.OpenJDK.17` |
| Android Studio + SDK | open Android Studio | https://developer.android.com/studio |
| ANDROID_HOME | `echo %ANDROID_HOME%` | set to e.g. `C:\Users\<you>\AppData\Local\Android\Sdk` |

## Build steps (run on a machine with the prerequisites)

```powershell
# 1. Install dependencies (once the registry connection is available)
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Production web build (this is what the APK bundles)
npm run build

# 3. Create the native Android project (one time)
npx cap add android

# 4. Sync web assets into the Android project (run after every web change)
npx cap sync android

# 5a. Open in Android Studio to run on a device/emulator
npx cap open android

# 5b. Or build from the CLI (requires Android SDK build-tools)
cd android
gradlew.bat assembleDebug        # APK → android/app/build/outputs/apk/debug/app-debug.apk
gradlew.bat bundleRelease        # AAB for Play Store (needs a signing config)
```

## Notes

- **Point the app at your deployed API**: the Android build loads `dist/`, and its
  API calls go to the same origin. For a native shell that calls a remote server,
  deploy the platform (e.g. Render — see `docs/DEPLOYMENT.md`) and open the
  deployed URL in the Capacitor `server.url`, or keep the PWA approach which needs
  no native build.
- The service worker, manifest, and icons are already included in `dist/`.
- Do not commit `android/` build outputs or keystores; never hardcode the
  `ADMIN_TOKEN` or any Google credentials in the app.
- Android back-navigation works via the router history; external Google Forms
  links open in the system browser (`target="_blank"`).
