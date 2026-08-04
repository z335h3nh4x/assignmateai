import { createFileRoute } from "@tanstack/react-router";

import { ANDROID_PACKAGE_NAME } from "@/lib/deeplinks";

/**
 * Android App Links verification file.
 *
 * Served at https://assignmateai.in/.well-known/assetlinks.json so Android can
 * verify that this domain belongs to the app and open matching https links
 * directly in the installed app instead of the browser.
 *
 * Set ANDROID_CERT_SHA256 to your signing certificate SHA-256 fingerprint(s)
 * (comma separated) — get it with:
 *   keytool -list -v -keystore assignmate.keystore -alias assignmate
 */
export const Route = createFileRoute("/.well-known/assetlinks.json")({
  server: {
    handlers: {
      GET: () => {
        // App signing certificate fingerprint (override/extend with the
        // ANDROID_CERT_SHA256 env var, comma separated, e.g. for Play App Signing).
        const DEFAULT_FINGERPRINT =
          "3B:BF:86:AE:AF:49:97:9C:01:3E:EF:17:31:31:06:0C:AA:EF:D5:01:EE:39:58:26:93:FA:09:A8:83:24:06:BA";

        const fingerprints = Array.from(
          new Set(
            `${DEFAULT_FINGERPRINT},${process.env["ANDROID_CERT_SHA256"] ?? ""}`
              .split(",")
              .map((value) => value.trim().toUpperCase())
              .filter(Boolean),
          ),
        );

        const body = [
          {
            relation: [
              "delegate_permission/common.handle_all_urls",
              "delegate_permission/common.get_login_creds",
            ],
            target: {
              namespace: "android_app",
              package_name: ANDROID_PACKAGE_NAME,
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ];

        return new Response(JSON.stringify(body, null, 2), {
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
