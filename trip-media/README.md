# Trip Media

Upload your travel photos and videos into this folder.

Supported photo formats: JPG, JPEG, PNG, WebP.
Recommended video format: MP4.

After uploading a file, add its path, type, title and date to the `tripMedia` array in the root `blog.html` file so it appears in the gallery.

Example:
```js
{ type: "image", src: "trip-media/ella.jpg", title: "Ella trip", date: "2026-12-01" },
{ type: "video", src: "trip-media/beach.mp4", title: "Beach day", date: "2026-12-02" }
```

Keep videos reasonably small. For large videos, use an external video host and embed the video.
