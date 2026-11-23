import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import {dirname} from "node:path";
import {fileURLToPath} from "node:url";

const webRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Genera un servidor autónomo para la imagen Docker (ver Dockerfile).
  output: "standalone",
  allowedDevOrigins: ["192.168.50.172"],
  turbopack: {
    root: webRoot
  }
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
