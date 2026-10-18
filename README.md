# Focus Active Sentence

A plugin for [Obsidian.md](https://obsidian.md/) that keeps the active sentence or paragraph in focus and dims the rest of the document. Inspired by iA Writer.

![screenshot 1](./screenshot_1.png)

The focus effect is removed while you scroll so you can scan the document. It is restored when you move the cursor or begin typing.

## Installation

### From Obsidian

1. Open **Settings → Community plugins** and turn off Restricted mode if needed.
2. Select **Browse**, search for **Focus Active Sentence**, and select **Install**.
3. Select **Enable** after installation.

### Manual installation

Download `main.js`, `manifest.json`, and `styles.css` from the matching GitHub release. Place them in `<vault>/.obsidian/plugins/focus-active-sentence/`, then reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Usage

Open a Markdown note in source mode or Live Preview and place the cursor in a sentence. The active sentence remains fully visible while the rest of the document is dimmed.

Press `Command+D` on macOS or `Ctrl+D` on Windows and Linux to toggle the focus effect. You can also run **Focus Active Sentence: Toggle focus** from the command palette or change the shortcut under **Settings → Hotkeys**.

Under **Settings → Focus Active Sentence**, choose whether the active sentence or the active paragraph remains fully visible. You can also set the default enabled state and customize sentence delimiters, trailing characters, and titles such as `Mr.`. Delimiters end a sentence only when they are followed by whitespace or the end of the line, after any configured trailing characters. This avoids splitting decimal numbers, URLs, and file paths at a period.

## Privacy

Focus Active Sentence works locally. It does not make network requests, collect telemetry, or access files outside your Obsidian vault.

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and validation instructions.

## License

Focus Active Sentence is available under the [MIT License](./LICENSE).
