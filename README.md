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
4. Press **Publish to website**. Everything goes into one commit, and GitHub Pages updates the site in about a minute.

## How it's put together

| Path | What it is |
| --- | --- |
| `index.html` | Home page: circuit-board hero, skill orbit, live build, featured projects, timeline, education |
| `projects.html` | Project explorer: search, type, status, technology and date-range filters, plus card, timeline and table views |
| `projects/<name>.html` | One page per project. The admin panel generates these. |
| `data/projects.json` | The source of truth for all project data |
| `admin.html` | Admin panel (marked `noindex`) |
| `assets/` | CSS, JavaScript modules, self-hosted fonts, images, documents |
| `HTML Pages/` | Redirects, so links to the old site still work |

`assets/js/lib/template.js` builds the project pages, and `assets/js/lib/schema.js` validates every project before it's saved.

If you edit `data/projects.json` by hand, open the admin panel afterwards and use **Maintenance → Queue a rebuild of all project pages**, then **Publish**. That regenerates the pages from the data.

## Security

- **No secrets in this repository.** Publishing uses your own GitHub token, which only lives in the admin tab's memory. It's never written to localStorage, sessionStorage, cookies or the URL. Reloading or closing the tab forgets it, and after 30 minutes of inactivity the panel locks itself.
- Only fine-grained tokens belonging to `JMagDev1` are accepted. Classic `ghp_` tokens are refused because they can reach every repository.
- Every page sets a strict Content-Security-Policy: no inline scripts, no third-party scripts, styles or fonts, and the admin can only talk to `api.github.com`.
- Project text is always inserted as text, never as HTML. Links have to be `https://` (or a page on this site), so `javascript:` URLs are rejected.
- Uploaded images are checked by their file signature and re-encoded in the browser. That strips EXIF metadata, including GPS location from phone photos. SVG uploads aren't allowed.
- The admin refuses to accept a token if it's shown inside a frame (clickjacking guard). Publishing never force-pushes, and it stops if the data was changed somewhere else in the meantime.

## Credits

Fonts: [Poppins](https://github.com/itfoundry/Poppins) and [Space Mono](https://github.com/googlefonts/spacemono), both under the SIL Open Font License (see `assets/fonts/`).
