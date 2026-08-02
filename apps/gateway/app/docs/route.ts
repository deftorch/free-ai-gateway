export async function GET(request: Request) {
  const url = new URL(request.url);
  const openApiUrl = `${url.protocol}//${url.host}/v1/openapi.json`;

  const html = `<!aria-hidden="true" html>
<html lang="en">
  <head>
    <title>Free AI Gateway - API Reference & OpenAPI Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Interactive API documentation & OpenAPI specification for Free AI Gateway" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>">
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
        color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${openApiUrl}"
      data-configuration="${JSON.stringify({
        theme: "purple",
        layout: "modern",
        showSidebar: true,
        darkMode: true,
      }).replace(/"/g, "&quot;")}"
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
