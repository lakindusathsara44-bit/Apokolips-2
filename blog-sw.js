self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const scope = self.registration.scope;
  const icon = new URL("file_00000000a7ec820890154ca6ed49b608.ico", scope).href;
  const options = {
    body: data.body || "There is a new update on the blog.",
    icon,
    badge: icon,
    data: { url: data.url || "blog.html" },
    tag: data.notificationId || "apokolips-blog-update",
    renotify: false
  };
  event.waitUntil(self.registration.showNotification(data.title || "Apokolips Blog", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const scope = self.registration.scope;
  let requested = String(event.notification.data?.url || "blog.html");
  if (requested.startsWith("/blog.html")) requested = requested.slice(1);
  const target = new URL(requested, scope).href;
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(scope) && "focus" in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
