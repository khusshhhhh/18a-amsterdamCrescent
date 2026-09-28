# Lyyden Court – 3D Walkthrough

Interactive three.js walkthrough of the **single storey dwelling for Bluemount Living**,
18A Amsterdam Cr, Salisbury Downs SA 5108 (JDN Designs · job JDN26-852 · drawing PD-08).

The model is generated from the drawing set: every wall, opening, room, fixture, electrical
point, downpipe, boundary and landscape item comes from the PDF sheets' vector geometry at
1:100 / 1:200 (see `js/data.js`). You can switch on the original sheets as overlays to check
them against the 3D model.

## Features

| Tab | What it does |
|---|---|
| **Exterior** | Orbit the house. View presets: *Street · Elev A* (SE, Amsterdam Cr), *Side · Elev B* (NE, Leyden Ct), *Rear · Elev C* (NW), *Side · Elev D* (SW), *Overhead*. *Orthographic* gives true elevations like sheet 03. *Context* hides neighbours/fences/trees. Click doors or the garage door to open them. |
| **Floor plan** | 2D plan (roof and ceilings removed) with room names and sizes, or a 3D dollhouse. Overlay sheets 02 floor plan, 05 plumbing, 07 timber frame, 06 footing. |
| **Roof plan** | Colorbond hip roof at 22.5°, 450 eave, 'D' gutters, downpipes. Overlay sheet 08. |
| **Site** | Boundary with bearings, streets, crossover, fences, trees, landscape schedule, site statistics. Overlay sheet 01. |
| **Electrical** | Every symbol from sheet 04 placed in 3D, with GPO heights, a legend with counts and group filters. The lights work. Overlay sheet 04. |
| **Walk through** | First-person mode with collisions, gravity and steps. Teleport to any room from the view bar. |
| **Sun & weather** | Real sun position for the site (lat/long, the drawing's 21.6° north point, Adelaide daylight saving). Date, time and a day-cycle player. Clear, partly cloudy, overcast, rain and fog. Lights switch on automatically at night. |
| **Measure** | Click two points on any surface to get the distance in mm (snaps to 10 mm). |
| **Finishes** | The Material Colour Schedule (HP1, HP2, BH1, BH2, DP, RF, GT, HD, PLD, windows) with live alternative colours. Interior floor and paint options, since PD-08 doesn't specify interior finishes. |
| **HQ** | High quality mode: ambient occlusion, 4K shadows and full resolution. Leave it off on laptops or integrated graphics. |

### Walk-through controls

| Key | Action |
|---|---|
| Click | Capture the mouse (Esc releases it) |
| W A S D / arrows | Move |
| Mouse | Look |
| Shift | Run |
| Space | Jump |
| C | Crouch |
| E or left-click | Open or close doors, sliding doors, robes and the garage door; flick light switches |
| F | Torch |
| L | All lights on/off |
| N | Toggle day/night |
| M | Minimap |
| Right mouse (hold) | Zoom |

## Run it locally

ES modules don't load from `file://`, so serve the folder:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. Any static server works, for example `npx serve`.

## Publish on GitHub Pages

1. Create a new GitHub repository, for example `lyyden-court-3d`.
2. Upload the **contents** of this folder (`index.html`, `css/`, `js/`, `assets/`, `README.md`, `.nojekyll`) to the root of the repository.
   You can drag and drop them in the GitHub web UI, or run:
   ```bash
   git init
   git add .
   git commit -m "3D walkthrough"
   git branch -M main
   git remote add origin https://github.com/<you>/lyyden-court-3d.git
   git push -u origin main
   ```
3. On GitHub, open **Settings → Pages**, set *Source* to **Deploy from a branch**, choose branch **main** and folder **/ (root)**, then **Save**.
4. After a minute the site is live at `https://<you>.github.io/lyyden-court-3d/`.

three.js (r169) loads from the jsDelivr CDN, so you don't need a build step or `npm install`.

> Note: a GitHub Pages site is public even when the repository is private (unless you're on an
> Enterprise plan). The drawing overlays in `assets/overlays` are images of the JDN Designs
> sheets, so check you're happy to publish them. If not, delete that folder; the overlay
> buttons will then just show nothing.

## Project structure

```
index.html          UI shell (top bar, view bar, panels, HUD)
css/style.css
js/data.js          All drawing data: walls, openings, rooms, fixtures, electrical, site
js/house.js         Walls/openings/windows/doors/floors/ceilings/linings
js/roof.js          Hip-roof generator (eave offset + maximal-rectangle hip union)
js/interior.js      Kitchen, bath/ensuite/laundry fixtures, joinery, furniture, services
js/electrical.js    Fittings, working lights, electrical markers
js/site.js          Boundary, lawns, paving, streets, fences, trees, neighbours
js/sun.js           Solar position, sky, shadows, weather
js/walk.js          First-person controller and minimap
js/measure.js       Measuring tool
js/materials.js     Finishes library (Colorbond / paint / timber options)
js/textures.js      Procedural textures (no image downloads needed)
assets/overlays/    Drawing sheets exported and aligned to the model
```

## What comes from the drawings, and what's assumed

**From PD-08:** all dimensions, wall layout and thicknesses, window and door sizes and types
(ASW, AAW, AFW, ASD, HD, ED, PLD), 2400 lintel and external door height, 2100 internal doors,
2700 ceilings with the 3000 raised ceilings, 2100 nib walls, flat arch openings, niches B and C,
the Hebel columns and bulkheads, the 22.5° roof with 450 eaves, the colour schedule, electrical
points and GPO heights, downpipes, site boundary, landscape schedule and site statistics.

**Assumed (not specified on PD-08):** interior floor coverings, interior paint colour, the
kitchen, joinery and furniture styling, and the exact tile selections. You can change all of
these in the Finishes tab. The neighbouring houses are simple massing blocks for context.
