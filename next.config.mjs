import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;

// `next dev` sırasında Cloudflare ortamını (yerel D1 veritabanı) taklit eder
initOpenNextCloudflareForDev();
