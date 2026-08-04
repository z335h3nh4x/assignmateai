import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.assignmateai.in",
  appName: "Assignmate",
  webDir: "dist/client",
  // Assignmate is a server-rendered app, so the native shell loads the live
  // deployment instead of a static bundle. Point this at your own build server
  // (e.g. http://192.168.x.x:8080) while developing locally.
  server: {
    url: "https://assignmateai.in",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b0b16",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0b0b16",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b0b16",
    },
  },
};

export default config;
