# Afterdark County world scale

The project uses the convention **1 world unit ≈ 1 metre**.

## Gameplay dimensions

- Survivor visual height: **1.82 m**
- Survivor collision radius: **0.34 m**
- Walk speed: **2.65 m/s**
- Sprint speed: **5.75 m/s**
- Small loose-loot interaction: **1.45 m**
- Standard interaction: **1.85 m**
- Large-object interaction: **2.20 m**
- Residential door opening: **0.92 × 2.08 m**

## Reference footprints

- Pine Ridge Food Mart: keep its existing approximately **25 × 15 m** footprint
- Residential house: keep approximately **13 × 10 m**, while correcting oversized furniture and openings
- Abandoned school target: **46 × 32 m**
- North Farm barn target: **28 × 20 m**
- Pickup trucks: retain the existing approximately **6 m** length

All new buildings, furniture, vehicles, interaction ranges, colliders and item visuals should use this contract. Changes to visual scale must be accompanied by matching collision, attachment, navigation and interaction updates.
