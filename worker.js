export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname.slice(1));

    // Get file list from KV
    const json = await env.trees.get("tree");
    if (!json) return new Response("File index not yet available", { status: 503 });

    const fileList = JSON.parse(json);
    const tree = buildTree(fileList);

    const [node, isDir] = walkPath(path, tree);

    if (node && isDir) {
      if (!url.pathname.endsWith("/")) {
        return Response.redirect(url.pathname + "/", 301);
      }
      return new Response(renderDirectory(path, node), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (node === null) {
      return new Response("Not found", { status: 404 });
    }

    // It's a file — redirect to raw download
    return Response.redirect(`https://huggingface.co/mathewb20121/test/resolve/main/${path}`, 302);
  }
};

// Build tree from paths
function buildTree(paths) {
  const tree = {};
  for (const path of paths) {
    const parts = path.split("/");
    let node = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      node = node[parts[i]] ||= {};
    }
    node[parts.at(-1)] = null;
  }
  return tree;
}

function walkPath(path, tree) {
  const parts = path ? path.split("/").filter(Boolean) : [];
  let node = tree;
  for (const part of parts) {
    if (!(part in node)) return [null, false];
    node = node[part];
  }
  return [node, typeof node === "object" && node !== null];
}

function renderDirectory(path, node) {
  const entries = Object.entries(node).sort().map(([name, value]) => {
    const isDir = typeof value === "object";
    const href = encodeURIComponent(name) + (isDir ? "/" : "");
    return `<li><a href="${href}">${name}${isDir ? "/" : ""}</a></li>`;
  }).join("\n");

  return `
  <html><body>
    <h1>Index of /${path}</h1>
    <ul><li><a href="../">../</a></li>${entries}</ul>
  </body></html>`;
}
