# OCR-Based Motor Vehicle Parking Management System — Mobile App

**Pure React Native (bare CLI, no Expo) + Supabase.** Built from the "OCR-Based Motor Vehicle
Parking Management System for Makilala National High School" capstone proposal.

## What's included

- **Auth** — Supabase Auth, admin-created guard/admin accounts (no public sign-up), role-based routing.
- **Guard flow** — camera capture → on-device OCR (ML Kit) → confirm/edit plate → match against
  registered vehicles → log entry or exit → realtime "currently parked" list → unregistered-plate alerts.
- **Admin flow** — dashboard KPIs, vehicle owner CRUD, vehicle CRUD, guard/admin account creation,
  searchable parking record history, weekly entry report chart, audit log viewer.
- **Database** — full Postgres schema + Row Level Security matching the thesis's Users, Vehicle
  Owner, Vehicle, Parking Record, and Logs tables (`supabase/migrations/0001_init.sql`).
- **Admin account creation** — Admin users can create new guard and admin accounts directly in the app. This is done by securely utilizing the Supabase Service Role Key configured in the environment variables, bypassing the need for a separate edge function.
- **Standalone Build** — The app is configured to build as a standalone APK, bypassing the Metro bundler for production-ready deployments.

Every piece of the client is plain React Native — no Expo SDK, no Expo Go, no `expo-*` packages.
Supabase is the only backend service used (Auth, Postgres, Storage, Realtime).

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. Go to **Database → Replication** and confirm `parking_records` and `vehicles` are enabled for
   Realtime (the migration does this via `alter publication`, but double-check in the dashboard).
4. Create your first **admin** account manually (chicken-and-egg: the app can only create accounts
   through an existing admin):
   - Dashboard → Authentication → Add User → create the auth user.
   - SQL editor: `insert into public.users (id, full_name, role) values ('<the-new-auth-uid>', 'Your Name', 'admin');`
   - After that, use the app's Users screen to create everyone else (requires `.env` setup first).

## 2. Create the native projects

This repo ships the `src/` app code, `App.tsx`, and `index.js`, but **not** the generated
`android/` and `ios/` native folders (they're large, platform-specific, and best generated fresh
against your exact RN version). Generate them once:

```bash
npx @react-native-community/cli@latest init OcrParkingManagement --version 0.74.5 --skip-install
```

Then copy this repo's `App.tsx`, `index.js`, `src/`, `package.json`, `babel.config.js`,
`metro.config.js`, `react-native.config.js`, and `tsconfig.json` into the generated project,
overwriting the placeholders. Keep the generated project's `android/` and `ios/` folders.

## 3. Configure environment variables

Copy `.env.example` to `.env` at the project root and fill in your Supabase project URL, anon
key, and service role key (`SUPABASE_SERVICE_ROLE_KEY`). The service role key is required for admin users
to create other accounts. This is read at build time by `react-native-config` — **rebuild the native app** after
changing it (a Metro reload alone won't pick up `.env` changes).

## 4. Native permissions (camera)

`react-native-vision-camera` needs camera permission declared natively — this isn't automatic in
bare RN the way an Expo config plugin would handle it.

**Android** — add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

**iOS** — add to `ios/OcrParkingManagement/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>The camera is used to capture vehicle license plates for OCR recognition at the school gate.</string>
```

## 5. Install & run

```bash
npm install

# iOS only — install native pods
cd ios && pod install && cd ..

npm run android    # or: npm run ios
```

`react-native-vector-icons`, `react-native-vision-camera`, and `@react-native-ml-kit/text-recognition`
all use native code. Autolinking (via `react-native.config.js` and CocoaPods) wires them up on
`pod install` / Gradle sync — no manual linking should be needed on RN 0.74, but if a native module
doesn't show up, `cd ios && pod install` again after any `npm install`.

> **Camera and OCR do not work in a simulator/emulator's default camera feed on most setups.**
> Test on a physical device for the Scan flow.

**Vector icons on Android** — add this line to `android/app/build.gradle` (usually already present
in RN CLI templates ≥0.72):
```gradle
apply from: file("../../node_modules/react-native-vector-icons/fonts.gradle")
```

**Vector icons on iOS** — after `pod install`, the fonts are linked automatically via
`RNVectorIconsManager` when using CocoaPods (as of RN 0.74's default Podfile); no extra step needed.

## 6. Project structure

```
index.js                         entry point (AppRegistry.registerComponent)
App.tsx                          root component (providers + navigation)
src/
  lib/supabase.ts                Supabase client (env via react-native-config)
  lib/ocr.ts                     on-device plate OCR + regex extraction
  types/database.ts              typed schema
  context/AuthContext.tsx        session + role
  hooks/                         useAuditLog, useVehicleByPlate, useParkingRecords
  navigation/RootNavigator.tsx   auth gate + Guard/Admin tab navigators
  screens/auth/                  Login
  screens/guard/                 Scan, ConfirmPlate, LiveStatus, Alerts
  screens/admin/                 Dashboard, Owners, Vehicles, Users, Records, Reports, Logs
  components/                    StatusPill, RecordCard
supabase/
  migrations/0001_init.sql       schema + RLS + storage bucket
```

## 7. Where to extend

- **Plate regex** (`src/lib/ocr.ts`) — tune `PLATE_PATTERNS` to your region's actual plate formats.
- **Offline queueing** — wrap `useParkingRecords.logEntryOrExit` writes in a local outbox (e.g.
  AsyncStorage queue flushed on reconnect) if the gate has unreliable connectivity.
- **Reports** — `ReportsScreen.tsx` currently shows a 7-day entries bar chart; add date-range
  pickers or CSV export as the school's reporting needs grow.
- **Cloud OCR fallback** — if on-device accuracy is too low on damaged/angled plates, add a second
  Edge Function that proxies the image to a cloud OCR/ANPR API, called only when on-device
  confidence is `"low"`.
