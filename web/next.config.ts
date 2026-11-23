import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import {dirname} from "node:path";
import {fileURLToPath} from "node:url";

const webRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Genera un servidor autónomo para la imagen Docker (ver Dockerfile).
  output: "standalone",
  allowedDevOrigins: ["192.168.50.172"],
  async redirects() {
    const canonicalHost = process.env.RELUM_CANONICAL_HOST?.trim().toLowerCase() || "relum.datafy.site";
    const redirectHosts = (process.env.RELUM_REDIRECT_HOSTS ?? "datafy.site,www.datafy.site")
      .split(",")
      .map((host) => host.trim().toLowerCase());

    return redirectHosts
      .filter((host) => host && host !== canonicalHost && host !== "localhost" && host !== "relum.187.53.107.149.sslip.io")
      .map((host) => ({
        source: "/:path*",
        has: [{ type: "host", value: host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") }],
        destination: `https://${canonicalHost}/:path*`,
        permanent: false,
      }));
  },
  turbopack: {
    root: webRoot
  }
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
