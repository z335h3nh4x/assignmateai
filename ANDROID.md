# Building the Assignmate Android APK

Lovable can't compile an APK in the cloud — Android builds need the Android SDK.
Everything is already configured here; you just run the build on your own machine.

## One-time setup

1. Install [Android Studio](https://developer.android.com/studio) (includes the Android SDK) and a JDK 21.
2. Export this project to GitHub (Lovable: **+ menu → GitHub → Connect project**), then clone it:
   ```bash
   git clone <your-repo-url>
   cd <your-repo>
   npm install
   ```
3. Add the native Android project:
   ```bash
   npx cap add android
   ```

## Every time you change the app

The native shell loads the live site defined in `capacitor.config.ts`
(`server.url = https://assignmateai.in`). So after you publish from Lovable, the
app updates itself — no rebuild needed.

You only need to rebuild the APK when you change native config, icons, or plugins:

```bash
npm run build
npx cap sync android
npx cap open android
```

## Producing the APK

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

Or from the CLI:

```bash
cd android
./gradlew assembleDebug      # debug APK -> android/app/build/outputs/apk/debug/
./gradlew assembleRelease    # release APK (needs a signing key)
```

### Signing a release build

```bash
keytool -genkey -v -keystore assignmate.keystore -alias assignmate \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then add to `android/app/build.gradle` under `android { }`:

```gradle
signingConfigs {
    release {
        storeFile file('../../assignmate.keystore')
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias 'assignmate'
        keyPassword System.getenv("KEY_PASSWORD")
    }
}
buildTypes {
    release { signingConfig signingConfigs.release }
}
```

## Google sign-in inside the app

Add these to your Google Cloud OAuth client **Authorized JavaScript origins**
if you point `server.url` anywhere other than the production domain. The
Supabase redirect URI stays the same:
`https://qowzmltthmsiyhyklojz.supabase.co/auth/v1/callback`.

## Offline / bundled mode (optional)

To ship the web assets inside the APK instead of loading the live site, remove
the `server` block from `capacitor.config.ts`. Note that server-rendered routes
and server functions require the hosted backend, so the live-URL mode above is
the recommended setup.
