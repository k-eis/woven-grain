Woven Grain — mobile A/B adjustment fix

Fixes iOS/mobile preview and woven rendering for Photo A/B EXPOSURE and BRILLIANCE.
The adjustments are baked into cached pixel-processed source canvases instead of relying on CanvasRenderingContext2D.filter.

This keeps the A/B controls independent and makes the adjusted images visible both in the small previews and in the woven output.
