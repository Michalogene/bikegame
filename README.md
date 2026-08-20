# Afterdark County

A modular, zero-runtime-install isometric browser survival game vertical slice. The current implementation uses a pinned MIT-licensed Three.js browser module and procedural art so the game can run from any static web server without a paid API or asset service.

## Run locally

```bash
npm run dev
```

Open `http://127.0.0.1:8080`.

## Verify

```bash
npm run verify
```

The verification pipeline performs static checks, JavaScript type checking, unit tests, and a production-copy build to `dist/`.

## Controls

- `WASD`: move
- `Shift`: sprint
- `E`: interact / open loot
- `1–8`: select hotbar slot
- `Left click`: attack, use selected tool, or place a construction ghost
- `Right click`: dig while the shovel is selected
- `Q` / `R`: rotate camera (or rotate a construction ghost while building)
- Mouse wheel: zoom
- `Tab` / `I`: inventory
- `C`: crafting
- `M`: map / mission overview
- `B`: camp construction
- `Esc`: close panel / cancel placement
- `F5` is not required: autosave is periodic and also runs on page hide

## Browser support

Recent Chromium, Firefox, and Safari releases with WebGL 2 support are targeted. Lower quality options are available in Settings.
