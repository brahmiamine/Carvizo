/* Carvizo : le service worker ne met jamais en cache les données personnelles. */
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
self.addEventListener("push",event=>{
 let payload={title:"Carvizo",body:"Un rappel automobile vous attend",url:"/"};
 try{payload={...payload,...event.data?.json()}}catch{}
 event.waitUntil(self.registration.showNotification(payload.title,{body:payload.body,icon:"/icon",badge:"/badge",tag:"carvizo-reminder",data:{url:payload.url||"/"}}));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 event.waitUntil(self.clients.openWindow(new URL(event.notification.data?.url||"/",self.location.origin).href));
});
