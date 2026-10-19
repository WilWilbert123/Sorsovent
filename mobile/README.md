# Mingle Mobile App (Expo & React Native)

This mobile app wrapper runs the **Mingle** platform (`https://readytomingle.vercel.app/`) inside a performant, native React Native WebView with smooth mobile optimizations.

---

## 📱 Features

- **Direct Live Sync**: Loads `https://readytomingle.vercel.app/` directly — any updates deployed to Vercel instantly reflect on the mobile app.
- **Android Hardware Back Button**: Uses `BackHandler` to step back through web page history (`canGoBack`) without closing the app prematurely.
- **Safe Area Insets**: Edge-to-edge support with `react-native-safe-area-context` so notches and navigation gesture bars never overlap UI elements.
- **Top Progress Bar**: Subtle gradient indicator that animates during route transitions.
- **Pull to Refresh**: Pull down anywhere on screen to reload the live feed.
- **Offline / Error Recovery**: Clean native retry screen with reconnect CTA if internet connection drops.
- **Camera & Photo Uploads**: Android and iOS permissions configured for posting photos and attaching images.
- **Geolocation Enabled**: Full support for Sorsogon spot discovery and interactive map.

---

## 🚀 How to Run Locally

### 1. Navigate to the mobile directory
```bash
cd mobile
```

### 2. Start Expo
```bash
npx expo start
```

### 3. Testing on Android Emulator
- Make sure Android Studio and your Android Virtual Device (AVD) are running.
- In the Expo terminal, press `a` (or run `npx expo start --android`).

### 4. Testing on Physical Device (Expo Go)
- Download **Expo Go** from Google Play Store or Apple App Store.
- Scan the QR code shown in your terminal with your camera (iOS) or Expo Go app (Android).
