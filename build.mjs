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

function generateBase64Logos() {
  try {
    const logosDir = path.resolve("./src/assets/logos");
    const outputPath = path.resolve("./src/extractors/base64Logos.ts");

    if (!fs.existsSync(logosDir)) {
      console.warn("⚠️ src/assets/logos directory does not exist.");
      return;
    }

    const files = fs.readdirSync(logosDir);
    const logoMap = {};

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
        const filePath = path.join(logosDir, file);
        const fileBuffer = fs.readFileSync(filePath);
        let mimeType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.svg') mimeType = 'image/svg+xml';

        const base64 = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        logoMap[file] = base64;
      }
    }

    const fileContent = `// Automatically generated during build. Do not edit manually.
export const BASE64_LOGOS: Record<string, string> = ${JSON.stringify(logoMap, null, 2)};
`;

    fs.writeFileSync(outputPath, fileContent);
    console.log(`📁 Auto-scanned assets/logos. Embedded ${Object.keys(logoMap).length} logo(s) inside base64Logos.ts`);
  } catch (err) {
    console.error("Failed to auto-scan and embed logos:", err);
  }
}

async function build() {
  generateBase64Logos();
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
