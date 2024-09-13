if (typeof window === "undefined") {
  self.addEventListener("install", function () {
    self.skipWaiting();
  });
  self.addEventListener("activate", function (event) {
    event.waitUntil(self.clients.claim());
  });
  self.addEventListener("fetch", function (event) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (
          response.headers.get("Cross-Origin-Embedder-Policy") === null ||
          response.headers.get("Cross-Origin-Opener-Policy") === null
        ) {
          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        }
        return response;
      })
    );
  });
}
