/**
 * Build-time SEO without a headless browser:
 *  - injects the home page's head tags into index.html (dev and build)
 *  - writes one HTML file per tool/tab route (e.g. generators/lorem.html)
 *    with its own title, description, canonical, social tags and JSON-LD,
 *    plus a <noscript> fallback with real content and links for crawlers
 *  - writes sitemap.xml
 * Everything comes from src/tools/catalog.ts, the same data the app uses.
 */
import type { Plugin } from "vite";
import {
  allRoutes,
  catalog,
  pageMeta,
  SITE_URL,
  toolMeta,
  toolPath,
  type RouteMeta,
} from "../src/tools/catalog";
import { buildHead, renderHead } from "../src/tools/seo-head";

const MARKER = /<!--seo:start-->[\s\S]*?<!--seo:end-->/;

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Readable fallback for crawlers and visitors without JavaScript. */
function noscript(route: RouteMeta): string {
  const tool = route.toolId
    ? catalog.find((t) => t.id === route.toolId)
    : undefined;
  const related = tool?.tabs
    ? tool.tabs
        .map((tab) => toolMeta(tool, tab))
        .filter((m) => m.path !== route.path)
    : catalog.filter((t) => !t.hidden).map((t) => toolMeta(t));
  return `<noscript>
      <main style="max-width:44rem;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.6">
        <h1>${esc(route.title)}</h1>
        <p>${esc(route.description)}</p>
        <p>DevUtil’s tools run entirely in your browser and need JavaScript enabled.</p>
        <h2>${tool ? "Related" : "Tools"}</h2>
        <ul>${related.map((r) => `<li><a href="${esc(r.path)}">${esc(r.title)}</a></li>`).join("")}</ul>
      </main>
    </noscript>`;
}

function pageFor(baseHtml: string, route: RouteMeta): string {
  return baseHtml
    .replace(
      MARKER,
      `<!--seo:start-->\n    ${renderHead(buildHead(route))}\n    <!--seo:end-->`,
    )
    .replace(/<!--noscript:start-->[\s\S]*?<!--noscript:end-->/, "")
    .replace(
      '<div id="root"></div>',
      `<div id="root"></div>\n    <!--noscript:start-->${noscript(route)}<!--noscript:end-->`,
    );
}

function sitemap(routes: RouteMeta[]): string {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = routes
    .map(
      (r) =>
        `  <url>\n    <loc>${esc(`${SITE_URL}${r.path}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Permanent redirects for legacy URLs (Cloudflare `_redirects`), so search engines and links update. */
function redirects(): string {
  const rules = catalog.flatMap((tool) =>
    (tool.aliases ?? []).map(
      (alias) => `${alias.path} ${toolPath(tool, alias.tab)} 301`,
    ),
  );
  return `# Generated from src/tools/catalog.ts\n${rules.join("\n")}\n`;
}

export function staticRoutes(): Plugin {
  return {
    name: "devutil:static-routes",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return pageFor(html, pageMeta("home", "/"));
      },
    },
    generateBundle: {
      // After Vite's HTML plugin has added index.html to the bundle.
      order: "post",
      handler(_options, bundle) {
        const index = bundle["index.html"];
        if (!index || index.type !== "asset") return; // non-client builds (e.g. the worker)
        const baseHtml = String(index.source);
        const routes = allRoutes();
        for (const route of routes) {
          if (route.path === "/") continue;
          // /generators → generators.html, /generators/lorem → generators/lorem.html
          // (served without a trailing-slash redirect by Cloudflare's auto-trailing-slash)
          this.emitFile({
            type: "asset",
            fileName: `${route.path.slice(1)}.html`,
            source: pageFor(baseHtml, route),
          });
        }
        this.emitFile({
          type: "asset",
          fileName: "_redirects",
          source: redirects(),
        });
        this.emitFile({
          type: "asset",
          fileName: "sitemap.xml",
          source: sitemap(routes),
        });
      },
    },
  };
}
