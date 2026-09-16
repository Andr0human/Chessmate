import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // Emit .next/standalone — a self-contained server plus only the node_modules
  // the build actually traced. Needed by the self-hosted Docker image: without
  // it the runtime stage would have to ship the full dependency tree and run
  // `next start`, which is several hundred MB of image for no benefit.
  //
  // SAFE FOR THE VERCEL DEPLOYMENT, and checked rather than assumed: the flag
  // is ADDITIVE. In next 15.5.15, collectBuildTraces() is not gated on output
  // mode, so next build still writes .next/server, .next/static and
  // next-server.js.nft.json exactly as before, and only then copies a
  // standalone tree beside them (build/index.js: `if (config.output ===
  // 'standalone')` runs last, in the tail shared by both bundlers). Vercel's
  // own builder contains no reference to "standalone" at all -- it reads the
  // normal layout and never looks at the extra directory. The cost there is a
  // few seconds of copying.
  //
  // What DOES break Vercel is pointing a vercel.json `outputDirectory` at
  // .next/standalone. This repo has no vercel.json. Keep it that way.
  //
  // client/Dockerfile ASSERTS .next/standalone/server.js exists after the build
  // rather than trusting this line — a build that silently stops honouring it
  // would otherwise produce a broken image with a green exit code.
  output: "standalone",
};

export default nextConfig;
