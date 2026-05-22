import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";

const isWatch = process.argv.includes("--watch");

const commonOptions = {
  bundle: true,
  sourcemap: true,
  target: "es2022",
  format: "iife",
  logLevel: "info",
};

const entryPoints = [
  {
    entryPoints: ["src/content/index.ts"],
    outfile: "dist/content.js",
    ...commonOptions,
  },
  {
    entryPoints: ["src/background/service-worker.ts"],
    outfile: "dist/service-worker.js",
    ...commonOptions,
  },
  {
    entryPoints: ["src/sidepanel/sidepanel.ts"],
    outfile: "dist/sidepanel.js",
    ...commonOptions,
  },
];

function incrementVersion() {
  if (isWatch) return;

  try {
    const manifestPath = path.resolve("./manifest.json");
    const packagePath = path.resolve("./package.json");

    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      let versionParts = manifest.version.split(".");
      versionParts[versionParts.length - 1] = parseInt(versionParts[versionParts.length - 1], 10) + 1;
      manifest.version = versionParts.join(".");
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`🔼 Version bumped to ${manifest.version}`);

      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
        pkg.version = manifest.version;
        fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
      }

      // Actualizar versión en sidepanel.html
      const sidepanelPath = path.resolve("./src/sidepanel/sidepanel.html");
      if (fs.existsSync(sidepanelPath)) {
        let html = fs.readFileSync(sidepanelPath, "utf-8");
        const versionRegex = /(<h1>.*?<span[^>]*>v)([\d\.]+)(<\/span><\/h1>)/;
        if (versionRegex.test(html)) {
          html = html.replace(versionRegex, `$1${manifest.version}$3`);
          fs.writeFileSync(sidepanelPath, html);
          console.log(`📝 Updated version in sidepanel.html to ${manifest.version}`);
        }
      }
    }
  } catch (err) {
    console.error("Error bumping version:", err);
  }
}

async function build() {
  if (isWatch) {
    const contexts = await Promise.all(
      entryPoints.map((opts) => esbuild.context(opts))
    );
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log("👀 Watching for changes...");
  } else {
    incrementVersion();
    await Promise.all(entryPoints.map((opts) => esbuild.build(opts)));
    console.log("✅ Build complete!");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
