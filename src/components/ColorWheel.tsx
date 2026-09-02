import { BRAND_SLOT_INDEX, type PaletteColor } from '../lib/palette'
import './ColorWheel.css'

export interface ColorWheelProps {
  colors: PaletteColor[]
}

/** SVG viewBox is a fixed 0-200 coordinate space; CSS scales the rendered size. */
const VIEWBOX_SIZE = 200
const CENTER = VIEWBOX_SIZE / 2
/** Distance from center every hue marker sits at, regardless of the color's S/L. */
const WHEEL_RADIUS = 84
const MARKER_RADIUS = 8
/** Derived-slot markers are DEFAULT_RADIUS; the brand slot is drawn larger (below). */
const BRAND_MARKER_RADIUS = 12

/**
 * Converts a hue (0-360) into the angle (degrees, standard SVG/math
 * convention where 0deg points along +x and increases clockwise on screen)
 * used to place that hue's marker on the wheel. The `-90` offset rotates hue
 * 0 to the top of the circle (12 o'clock) instead of the right (3 o'clock),
 * so red (hue 0) reads as "up" the way a physical color wheel is usually
 * drawn; hue then increases clockwise around the dial.
 */
function hueToAngleDeg(hue: number): number {
  return -90 + hue
}

/** The (x, y) point on the wheel's circumference for a given hue, at `radius` from center. */
function hueToPoint(hue: number, radius: number): { x: number; y: number } {
  const angleRad = (hueToAngleDeg(hue) * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  }
}

/**
 * Presentational SVG color wheel for spec A's M-6 (new): maps every palette
 * color's hue onto a 360° dial via `hueToAngleDeg`/`hueToPoint` (hue 0 = top,
 * clockwise) so the geometric harmony between a generation mode's derived
 * hues (complementary/triadic/split-complementary/etc., see
 * src/lib/palette.ts's `GenerationMode`) is visible at a glance as the
 * angular spacing between dots.
 *
 * Purely derived, read-only rendering of `colors` - no state, no
 * interactivity, no palette derivation logic of its own. Marker fill is
 * generated data (the palette color itself), not a design token, mirroring
 * PaletteSwatch's swatch-fill precedent.
 *
 * The brand main color slot (`BRAND_SLOT_INDEX`) is drawn larger and with an
 * extra outline ring so it reads as the anchor color the other 4 markers are
 * derived from, distinguishing it from the 4 derived-color markers.
 */
export function ColorWheel({ colors }: ColorWheelProps) {
  return (
    <div className="color-wheel">
      <div className="color-wheel__frame">
        <svg
          className="color-wheel__svg"
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          role="img"
          aria-label="Color wheel mapping each palette color's hue to a position on a 360-degree dial"
        >
          <circle
            className="color-wheel__ring"
            cx={CENTER}
            cy={CENTER}
            r={WHEEL_RADIUS}
          />
          {colors.map((color, index) => {
            const isBrand = index === BRAND_SLOT_INDEX
            const { x, y } = hueToPoint(color.hsl.h, WHEEL_RADIUS)
            const radius = isBrand ? BRAND_MARKER_RADIUS : MARKER_RADIUS

            return (
              <g key={`${index}-${color.hex}`}>
                {isBrand && (
                  <circle
                    className="color-wheel__marker-ring"
                    cx={x}
                    cy={y}
                    r={radius + 4}
                  />
                )}
                <circle
                  className="color-wheel__marker"
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={color.hex}
                />
              </g>
            )
          })}
        </svg>
      </div>
      <p className="color-wheel__caption">Palette hues mapped on a 360° color wheel</p>
    </div>
  )
}
