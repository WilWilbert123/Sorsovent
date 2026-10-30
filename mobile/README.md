# Mingle Mobile (Expo React Native)

Official **Expo React Native** mobile app for **Mingle (`https://readytomingle.vercel.app`)**.

## Features
- **Live Production Target**: Connects directly to `https://readytomingle.vercel.app`.
- **Smooth 60fps Native Skeleton Loading**: Renders an animated native Mingle Home screen skeleton (Header, Sorsogon Community Greeting card, Featured Places horizontal carousel, Post Composer, Filter bar, Feed Post card, and Bottom Navigation) using React Native's hardware-accelerated `Animated` API, cross-fading smoothly once the page is ready.
- **Native Dismissible Offline & Connecting Banner**: Automatically detects offline/reconnecting states, displays a compact closable status bar (`Retry` / `✕`), and switches WebView cache mode to `LOAD_CACHE_ELSE_NETWORK` when offline so saved content still loads.
- **Native Hardware Integration**:
  - Android hardware Back button navigation (`canGoBack`)
  - Pull-to-refresh gesture support
  - Native Geolocation & Camera/Photo upload permissions configured in `app.json`
  - Hardware-accelerated WebView (`androidLayerType="hardware"`)

## Quick Start

```bash
cd mobile
npm install
npx expo start
```

- Press **`a`** to open on an Android Emulator or connected Android device.
- Press **`i`** to open on an iOS Simulator.
- Scan the QR code with **Expo Go** on your physical phone.
