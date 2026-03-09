/**
 * ═══════════════════════════════════════════════════════════
 * PUSH NOTIFICATIONS — Client-side registration
 * Handles Capacitor Push Notification plugin integration.
 * Registers device token with the server on login.
 * ═══════════════════════════════════════════════════════════
 */

import { apiFetch } from "./api";
import { isNative } from "./config";

let pushInitialized = false;
let currentToken: string | null = null;

/**
 * Initialize push notifications (call after login).
 * Only works on native Capacitor (Android/iOS).
 * On web, this is a no-op.
 */
export async function initPushNotifications(): Promise<void> {
  if (!isNative || pushInitialized) return;

  try {
    // Dynamic import — only loads on native
    const { PushNotifications } = await import("@capacitor/push-notifications");

    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") {
      console.warn("Push notification permission denied");
      return;
    }

    // Register with APNS/FCM
    await PushNotifications.register();

    // Listen for registration success
    PushNotifications.addListener("registration", async (token) => {
      console.log("Push token:", token.value);
      currentToken = token.value;
      pushInitialized = true;

      // Send token to server
      try {
        await apiFetch("/api/device-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: token.value,
            platform: "android",
            deviceInfo: navigator.userAgent,
          }),
        });
      } catch (err) {
        console.error("Failed to register push token:", err);
      }
    });

    // Listen for registration errors
    PushNotifications.addListener("registrationError", (error) => {
      console.error("Push registration error:", error);
    });

    // Listen for push received (foreground)
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Push received (foreground):", notification);
      // Could show an in-app toast/notification here
    });

    // Listen for push action (user tapped notification)
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("Push action:", action);
      const data = action.notification.data;

      // Navigate based on push type
      if (data?.type === "estou-chegando") {
        window.location.href = "/portaria/estou-chegando";
      } else if (data?.type === "correspondencia") {
        window.location.href = "/portaria/correspondencias";
      } else if (data?.type === "visitor") {
        window.location.href = "/portaria/visitantes";
      }
    });
  } catch (err) {
    console.error("Push notification init error:", err);
  }
}

/**
 * Unregister push token (call on logout).
 */
export async function unregisterPushToken(): Promise<void> {
  if (!isNative || !currentToken) return;

  try {
    await apiFetch("/api/device-tokens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: currentToken }),
    });
    currentToken = null;
  } catch (err) {
    console.error("Failed to unregister push token:", err);
  }
}

/**
 * Get the current push token (if registered).
 */
export function getPushToken(): string | null {
  return currentToken;
}
