# iOS Testing Instructions

You have two ways to test this app on your iPhone.

## Method 1: Immediate Testing (PWA) - Easiest ⚡
You don't need to build anything. You can test **right now**.

1.  Make sure your PC and iPhone are on the **same Wi-Fi network**.
2.  On your PC, verify the app is running (`npm run dev`).
    *   Note the "Network" URL shown in the terminal (e.g., `https://192.168.1.5:3000/`).
3.  On your iPhone, open **Safari**.
4.  Go to that Network URL.
    *   *Note: If you see a security warning about the certificate, click "Advanced" -> "Proceed".*
5.  Tap the **Share** button (box with arrow up).
6.  Scroll down and tap **"Add to Home Screen"**.
7.  Tap **"Add"**.
8.  **Result:** You now have the "SafeDrink" icon on your home screen. Open it to test the app fullscreen like a native app!

---

## Method 2: Cloud Build (App Store Binary) ☁️
This method builds the actual `.ipa` file using GitHub's servers (Macs).

1.  **Extract** this zip file.
2.  **Upload** the contents to a new GitHub repository.
3.  Go to the **Actions** tab in your GitHub repository.
4.  You should see the "Build iOS App" workflow running automatically.
5.  Once finished, you can download the `safedrink-ios-unsigned` artifact derived from the build.

> **Note:** To clear the final hurdle for the App Store, you will eventually need to add your Apple Developer certificates to the GitHub Secrets, but this confirms the build pipeline works!
