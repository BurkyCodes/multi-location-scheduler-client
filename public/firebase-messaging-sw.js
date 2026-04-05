self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link =
    event.notification?.data?.link ||
    event.notification?.data?.click_action ||
    "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            client.postMessage({ type: "notification_click", link });
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(link);
        }
        return null;
      })
  );
});
