import { networkInterfaces } from 'node:os';

// Let phones/tablets on the same Wi-Fi load the dev server without the cross-origin warning.
// Every LAN address of this machine is allowed; add others with DEV_ORIGINS=host1,host2.
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === 'IPv4' && !n.internal)
  .map((n) => n.address);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [...lanHosts, ...(process.env.DEV_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [])],
};

export default nextConfig;
