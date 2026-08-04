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
        const fingerprints = (process.env["ANDROID_CERT_SHA256"] ?? "")
          .split(",")
          .map((value) => value.trim().toUpperCase())
          .filter(Boolean);

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
