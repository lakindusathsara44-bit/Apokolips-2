self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || "Apokolips Blog";
  const pageUrl = new URL("./blog.html", self.location.href);
  const requestedUrl = data.url && data.url !== "/blog.html" ? data.url : pageUrl.href;
  const options = {
    body: data.body || "There is a new update on the blog.",
    icon: new URL("./file_00000000a7ec820890154ca6ed49b608.ico", self.location.href).href,
    badge: new URL("./file_00000000a7ec820890154ca6ed49b608.ico", self.location.href).href,
    data: { url: new URL(requestedUrl, self.location.href).href },
    tag: data.notificationId || "apokolips-blog-update",
    renotify: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const fallback = new URL("./blog.html", self.location.href).href;
  const target = new URL(event.notification.data?.url || fallback, self.location.href).href;
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
