# jmagdev1.github.io

Jack Maguire's portfolio: robotics, electronics, CAD and software projects.
It's a static site for GitHub Pages. There's no server and no build step: every page is plain HTML, CSS and JavaScript.

## Adding or editing a project

1. Go to **https://jmagdev1.github.io/admin.html** (or use the **Admin** link in the footer of any page).
2. Sign in with a GitHub **fine-grained personal access token**:
   - GitHub → Settings → Developer settings → Fine-grained tokens → *Generate new token*
   - Repository access: **Only select repositories** → `jmagdev1.github.io`
   - Repository permissions: **Contents → Read and write** (leave everything else as *No access*)
   - Pick an expiry (90 days or less) and keep the token in your password manager.
3. Add, edit or delete projects. The live preview shows the real page as you type.
   Every image needs a short description (alt text) saying what it shows. The editor won't save a missing description, a file name like `IMG_2041`, or one that just repeats the title.
4. Press **Publish to website**. Everything goes into one commit, and GitHub Pages updates the site in about a minute.

## How it's put together

| Path | What it is |
| --- | --- |
| `index.html` | Home page: circuit-board hero, skill orbit, live build, featured projects, timeline, education |
| `projects.html` | Project explorer: search, type, status, technology and date-range filters, plus card, timeline and table views |
| `projects/<name>.html` | One page per project. The admin panel generates these. |
| `data/projects.json` | The source of truth for all project data |
| `accessibility.html` | Accessibility statement: features, settings and known limitations |
| `admin.html` | Admin panel (marked `noindex`) |
| `assets/` | CSS, JavaScript modules, self-hosted fonts, images, documents |
| `HTML Pages/` | Redirects, so links to the old site still work |

`assets/js/lib/template.js` builds the project pages, and `assets/js/lib/schema.js` validates every project before it's saved.

If you edit `data/projects.json` by hand, open the admin panel afterwards and use **Maintenance → Queue a rebuild of all project pages**, then **Publish**. That regenerates the pages from the data.

## Accessibility

The site aims to meet WCAG 2.2 AA, and it follows the visitor's device settings first:

- **Device settings:** light/dark mode, reduce motion, Windows contrast themes (forced colours), increased contrast, reduced transparency and the browser's text size are all respected. Layout breakpoints are in `em`, so they follow the text size too.
- **Accessibility & display panel** (person icon in the header): theme (Match my device / Light / Dark), Reduce animations, Easier reading (Atkinson Hyperlegible, extra spacing, underlined links), Read aloud, and Reset to device settings. Choices are stored only in that browser.
- **Read aloud** (`assets/js/lib/speech.js`): opt-in, uses the device's own voice and speed, and reads the selection if there is one. It has pause, skip, speed and stop controls, and highlights the paragraph being read.
- **Keyboard:** skip link, visible focus everywhere, Esc closes every popup and returns focus, and Ctrl/⌘ + K for search (no single-key shortcuts). The timeline has Earlier/Later buttons as an alternative to dragging.
- **Screen readers:** headings, landmarks, live result counts, named filter buttons with counts, announced gallery changes, and links that say when they open a new tab.
- **Moving content** can be paused from the hero ("Pause animations") or the panel.

Checked with axe-core on every page and state (both themes, desktop and phone), plus automated keyboard walkthroughs and tests for motion, read-aloud, forced colours, 320px reflow, 200% browser text size and text spacing.

## Security

- **No secrets in this repository.** Publishing uses your own GitHub token, which only lives in the admin tab's memory. It's never written to localStorage, sessionStorage, cookies or the URL. Reloading or closing the tab forgets it, and after 30 minutes of inactivity the panel locks itself.
- Only fine-grained tokens belonging to `JMagDev1` are accepted. Classic `ghp_` tokens are refused because they can reach every repository.
- Every page sets a strict Content-Security-Policy: no inline scripts, no third-party scripts, styles or fonts, and the admin can only talk to `api.github.com`.
- Project text is always inserted as text, never as HTML. Links have to be `https://` (or a page on this site), so `javascript:` URLs are rejected.
- Uploaded images are checked by their file signature and re-encoded in the browser. That strips EXIF metadata, including GPS location from phone photos. SVG uploads aren't allowed.
- The admin refuses to accept a token if it's shown inside a frame (clickjacking guard). Publishing never force-pushes, and it stops if the data was changed somewhere else in the meantime.

## Credits

Fonts: [Poppins](https://github.com/itfoundry/Poppins), [Space Mono](https://github.com/googlefonts/spacemono) and [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) (Braille Institute), all under the SIL Open Font License (see `assets/fonts/`).
