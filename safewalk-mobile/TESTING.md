# Running & testing Trayl yourself

This app is **not** a plain Expo Go app — it uses native modules (`@rnmapbox/maps`,
`expo-notifications`) that Expo Go doesn't include. So testing always needs two
things running together:

1. **Metro** — the JS bundler. Serves your JS code live so you don't have to
   rebuild the native app every time you change a `.tsx` file.
2. **A dev client build** — the actual native Android app (built once, reused
   many times), installed on an emulator or your S25. It connects to Metro to
   fetch the latest JS.

You only need to rebuild #2 when you add/change a **native** dependency
(a new native package, a config plugin, `app.json`'s native config). Plain
code changes in `app/`, `components/`, `services/`, etc. never need a rebuild
— just save the file and Metro pushes it live.

---

## 1. Start Metro

From `safewalk-mobile/`:

```
npx expo start --port 8082
```

- Wait for `Waiting on http://localhost:8082` in the terminal.
- Leave this terminal window open the whole time you're testing — closing it
  (or the terminal crashing) is the #1 cause of "app stuck on the loading
  screen."
- Port 8082 is a habit from this project specifically dodging conflicts with
  other Metro instances — 8081 (Expo's default) works fine too if nothing else
  is using it.
- **Only run one Metro instance at a time.** Two instances on different ports
  both watching this project is what caused several odd bugs this session
  (stuck loading screens, port mismatches). Check first:
  ```
  curl http://localhost:8081/status
  curl http://localhost:8082/status
  ```
  Whichever responds `packager-status:running` is your live one.

---

## 2. Testing on the emulator

**Start it** (Android Studio → Device Manager → play button on your AVD), or
from a terminal once it's created:
```
emulator -avd <your_avd_name>
```

**Check it's connected:**
```
adb devices
```
You should see `emulator-5554   device`.

**Launch Trayl on it:**
```
adb -s emulator-5554 shell monkey -p com.anonymous.safewalkmobile -c android.intent.category.LAUNCHER 1
```
(Or just tap the Trayl icon in the emulator's app drawer — same thing.)

**If it's stuck on the loading screen:** the app defaults to expecting Metro
on port 8081. If your Metro is running on a different port (e.g. 8082), tell
adb to forward the difference:
```
adb -s emulator-5554 reverse tcp:8081 tcp:8082
```
Then force-stop and relaunch the app.

**Mock GPS location** (the emulator doesn't have real GPS — it defaults to a
fixed spot, and drifts if left running across sessions):
```
adb -s emulator-5554 emu geo fix <longitude> <latitude>
```
Example (Winnipeg, matching this project's test data): `adb -s emulator-5554 emu geo fix -97.1384 49.8951`

**Known emulator gotcha:** if touch input stops working entirely partway
through a long session (taps register nothing), don't debug the app — it's a
known emulator bug (duplicate virtual touchscreen devices piling up). Fix:
close the emulator fully, run `adb kill-server && adb start-server`, then
start a fresh emulator instance.

---

## 3. Testing on your Galaxy S25 (wireless ADB)

### One-time pairing (only needed once per PC, or after a reset)
1. On the S25: **Settings → Developer options → Wireless debugging** → on.
   (If Developer options isn't visible: Settings → About phone → tap "Build
   number" 7 times.)
2. Tap **Wireless debugging → Pair device with pairing code**. It shows an
   IP:port and a 6-digit code.
3. On the PC:
   ```
   adb pair <ip:port from step 2>
   ```
   Enter the 6-digit code when prompted.

### Every time after that
Your phone and PC auto-rediscover each other over Wi-Fi (mDNS) as long as
both are on the same network and Wireless debugging is toggled on — usually
you don't need to do anything else. Confirm with:
```
adb devices
```
You should see something like `adb-XXXXXXXX._adb-tls-connect._tcp   device`.

If nothing shows up, reconnect manually using the address on the **main**
Wireless debugging screen (a different address than the pairing one):
```
adb connect <ip:port from the Wireless debugging home screen>
```

### USB fallback
If Wi-Fi is being difficult: enable **USB debugging** (same Developer options
screen), plug in a cable, tap "Allow" on the phone's prompt. `adb devices`
will show it directly, no pairing needed.

### Launching Trayl on the S25
Same as the emulator, just target the S25's serial instead of `emulator-5554`
(use whatever `adb devices` showed you):
```
adb -s <s25-serial> reverse tcp:8081 tcp:8082
adb -s <s25-serial> shell monkey -p com.anonymous.safewalkmobile -c android.intent.category.LAUNCHER 1
```
If you have multiple devices connected at once (emulator + S25, or two
transports to the same S25), `-s <serial>` is required — without it, adb
doesn't know which one you mean and commands can silently go to the wrong
device.

---

## 4. When you actually need a rebuild

Rule of thumb: **did you add/remove a package that touches native code, or
change `app.json`'s native config (plugins, permissions, package name)?**
If yes, rebuild. If you only edited JS/TSX, you don't.

```
npx expo prebuild --platform android
```
This regenerates the `android/` folder from scratch based on `app.json` +
installed packages. It's meant to be disposable — never hand-edit files in
there, your changes will be silently wiped next time this runs.

Then build + install:
```
cd android
./gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a
adb -s <serial> install -r app/build/outputs/apk/debug/app-debug.apk
```

Notes from this project's own build history, in case you hit them again:
- `-PreactNativeArchitectures=arm64-v8a` matters — a build without it targets
  all architectures and produces a much bigger/slower build; targeting just
  arm64-v8a (what the S25 and most modern phones use) is faster. Leave it off
  entirely to build for the emulator (x86_64) instead, or pass
  `-PreactNativeArchitectures=x86_64` explicitly.
- If `gradlew.bat` fails with a Java-related error, make sure `JAVA_HOME`
  points at Android Studio's bundled JDK, not a system Java install:
  ```
  set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
  ```
- `npx expo prebuild` can fail with `EBUSY: resource busy or locked` trying
  to delete the old `android/` folder. This means some other process has a
  handle on it — usually a leftover Gradle daemon (`java.exe`), a second
  Metro instance, or (rarely) something else entirely holding a Windows-level
  lock that even closing every obvious app doesn't release. If restarting
  your editor and closing background dev tools doesn't clear it, a full
  reboot will.

---

## Quick reference — the commands you'll actually use most

```
# Start Metro (do this first, every session)
npx expo start --port 8082

# See what's connected
adb devices

# Fix "stuck on loading screen" (port mismatch)
adb -s <serial> reverse tcp:8081 tcp:8082

# Relaunch the app after a JS-only change that didn't hot-reload
adb -s <serial> shell am force-stop com.anonymous.safewalkmobile
adb -s <serial> shell monkey -p com.anonymous.safewalkmobile -c android.intent.category.LAUNCHER 1

# Full native rebuild (only after native/config changes)
npx expo prebuild --platform android
cd android && ./gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a
adb -s <serial> install -r app/build/outputs/apk/debug/app-debug.apk
```
