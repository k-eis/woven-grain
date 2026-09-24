Woven Grain — mobile A/B adjustment stability fix

This version keeps the A/B exposure/brilliance adjustment visible in both previews and the woven output, while avoiding full-resolution ImageData processing on every slider movement.

Mobile stability changes:
- Phone photos are reduced to a maximum working dimension of 1600px before pixel processing.
- Filtered sources are cached and rebuilt only when that photo's adjustment actually changes.
- Rapid slider events are coalesced to one render per animation frame.
- The original A/B images remain untouched.

This is intended to prevent iPhone/Safari memory pressure that can cause a black canvas or a page reset after preview rendering.
