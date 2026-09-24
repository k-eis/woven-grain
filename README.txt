Woven Grain Pro α8

Mobile/iOS fix: Photo A / Photo B EXPOSURE and BRILLIANCE now affect the woven preview without relying on CanvasRenderingContext2D.filter, which is not supported by Safari/iOS. Filtered output-sized source canvases are cached and reused during rendering. The small A/B thumbnails use CSS filters as well.

The first PLAY WEAVE animation behavior remains unchanged: after the first animation, parameters can be adjusted freely without replaying the animation.
