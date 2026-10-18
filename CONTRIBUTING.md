# Contributing

Thanks for helping improve Focus Active Sentence.

## Development setup

1. Install the current Node.js LTS release.
2. Run `npm ci` to install dependencies.
3. Run `npm run dev` to rebuild the plugin when source files change.
4. Copy or link `main.js`, `manifest.json`, and `styles.css` into
   `<vault>/.obsidian/plugins/focus-active-sentence/` for manual testing.

Before opening a pull request, run `npm run check`. Please describe the behavior
you tested in both source mode and Live Preview, including mobile testing when
the change affects editor interactions.

## Reporting issues

Include your Obsidian version, operating system, plugin version, editing mode,
and a small example that reproduces the problem.
