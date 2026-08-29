/**
 * KK marks — the one place where a Lucide glyph was the wrong answer.
 *
 * This is not a second icon set. Lucide stays the icon system; §8's ladder
 * (12/14/16/18/20) still applies, and what is drawn here is drawn on Lucide's
 * own 24×24 grid so it sits beside a Lucide glyph without looking imported from
 * somewhere else.
 *
 * The reward token was `Coins`: two flat overlapping discs. A currency needs to
 * look struck, and no stroke glyph does. So it is built here, around the
 * supplied `food-token-icon-KK.svg`.
 *
 * The other half of the same complaint — seven badges sharing one rosette — was
 * a choice rather than a drawing, and lives in `badgeMarks.ts`.
 */

interface MarkProps {
  size?: number;
  className?: string;
}

/**
 * The KK token, struck around the supplied `food-token-icon-KK.svg`.
 *
 * That asset — at the project root, an SVG Repo export of a Cloudflare
 * `cf-icon-svg` — is a black disc with a cone knocked out of it and three specks
 * left standing inside the cone. It is the right *device*: a food thing on a
 * round token, at one stroke weight, on a grid close enough to Lucide's that it
 * sits beside one. Dropped in as shipped it would not have been ours, so four
 * things were changed and one was kept exactly:
 *
 *  - Kept: the face. The cone's rim and body are the file's own path data,
 *    unedited, so the drawing is the drawing you chose rather than my copy of it.
 *  - Colour: the flat `#000` became `currentColor`, and the ink is stated once in
 *    §12 of primitives.css instead of at four call sites. The face is knocked out
 *    in warm white at 0.94 rather than pure white, so it reads as a struck
 *    surface catching light rather than as a hole punched through.
 *  - Milling: 24 notches cut into the blank's own circumference. This is the one
 *    addition that does the most work — the source disc is a flat circle, and a
 *    flat circle behind a glyph is a sticker. Notches make it a minted thing.
 *  - Rim: a hairline inside the milling, so the empty ring between the notches
 *    and the cone becomes a field the device is struck into.
 *  - Grid: remapped from the file's `-1 0 19 19` onto Lucide's 24×24, blank at
 *    r=9.8 (82% of the box, which is Lucide's own optical coverage), and the face
 *    scaled to 1.02 so its widest corner clears the rim line.
 *
 * Everything except the blank is white, so the coin needs a mid-to-dark `color`
 * to read — on a pale one the knockouts vanish into the blank and it becomes a
 * plain disc. It takes no `tone` prop for that reason: `.kk-coin` sets the colour,
 * and is inherited by nothing. Two of the four call sites were `color: #fff` for
 * the stroke glyph they used to hold, which is exactly the inheritance that would
 * have erased it.
 *
 * The specks stay in the blank's colour rather than being knocked out too — they
 * are the source's own idea and they are what keeps the cone from reading as an
 * empty triangle. They are drawn slightly larger than the file has them (r 1.3
 * against 1.026) because at the 15px of a record row the original lands under a
 * pixel and mushes into the cone.
 *
 * Below 18px the milling and the rim line are dropped and the face is struck
 * larger instead. This is not a shortcut: a 1.5px notch on a 15px coin is a
 * fifth of a pixel, so those two features stop being detail and become a grey
 * fuzz around the edge — the exact sloppiness they were added to remove at 24px
 * and above. What survives small is the silhouette, so small gets the silhouette
 * and nothing else. The two sizes are the same object seen from further away.
 */
export function CoinMark({ size = 20, className }: MarkProps) {
  /* The threshold is the ladder's own step, not a guess: §8 sizes icons at
     12/14/16/18/20, and 18 is the first rung where a sub-pixel stroke resolves. */
  const struck = size >= 18;
  return (
    <svg
      className={className ? `kk-coin ${className}` : 'kk-coin'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* The blank. */}
      <circle cx="12" cy="12" r="9.8" fill="currentColor" />
      {struck && (
        <>
          {/* Milled edge — dashes on the blank's own circumference, so they read
              as notches cut into the rim rather than as a ring floating around
              it. 24 of them: the pattern divides the circumference evenly, so
              there is no seam where the dash sequence wraps. */}
          <circle
            cx="12" cy="12" r="9.8"
            stroke="#fff" strokeOpacity="0.4" strokeWidth="1.5"
            strokeDasharray="0.5 2.07" strokeLinecap="round"
          />
          {/* Rim line. */}
          <circle cx="12" cy="12" r="7.6" stroke="#fff" strokeOpacity="0.34" strokeWidth="0.85" />
        </>
      )}
      {/* The face, struck. Path data verbatim from `food-token-icon-KK.svg`; the
          group is what moves it off that file's grid and onto this one — its own
          centre (8.42, 9.89) to this centre. 1.02 clears the rim line; without a
          rim line to clear there is no reason to hold it that small. */}
      <g
        transform={`translate(12 12) scale(${struck ? 1.02 : 1.18}) translate(-8.42 -9.89)`}
        fill="#fff"
        fillOpacity="0.94"
      >
        <path d="M12.252 4.979a10.965 10.965 0 0 0-7.662-.004.396.396 0 1 0 .275.742 10.173 10.173 0 0 1 7.11.003.396.396 0 1 0 .277-.741z" />
        <path d="M11.817 6.459s-.23-.09-.498-.175a9.597 9.597 0 0 0-5.697-.034c-.3.09-.596.205-.596.205a.308.308 0 0 0-.175.407l3.444 8.327c.067.16.175.16.242 0l3.453-8.323a.31.31 0 0 0-.173-.408z" />
        {/* The three specks, left standing in the blank's own colour. */}
        <circle cx="6.875" cy="7.636" r="1.3" fill="currentColor" fillOpacity="1" />
        <circle cx="9.58" cy="8.742" r="1.3" fill="currentColor" fillOpacity="1" />
        <circle cx="8.421" cy="11.489" r="1.3" fill="currentColor" fillOpacity="1" />
      </g>
    </svg>
  );
}
