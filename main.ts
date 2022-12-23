import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

import { Line, Range } from "@codemirror/state";
import { EditorView, ViewUpdate, Decoration, DecorationSet, ViewPlugin } from "@codemirror/view";


interface FocusActiveSentencePluginSettings {
	sentenceDelimiters: string;
	extraCharacters: string;
}

const DEFAULT_SETTINGS: FocusActiveSentencePluginSettings = {
	sentenceDelimiters: '.!?',
	extraCharacters: '*“”‘’'
}

export default class FocusActiveSentencePlugin extends Plugin {
	settings: FocusActiveSentencePluginSettings;

	async onload() {
		await this.loadSettings();
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new FocusActiveSentenceSettingTab(this.app, this));

		this.registerEditorExtension(FocusActiveSentenceViewPlugin.extension);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class FocusActiveSentenceSettingTab extends PluginSettingTab {
	plugin: FocusActiveSentencePlugin;

	constructor(app: App, plugin: FocusActiveSentencePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Sentence delimiters')
			.setDesc('Characters that mark the end of a sentence. Default: .!?')
			.addText(text => text
				.setPlaceholder('.!?')
				.setValue(this.plugin.settings.sentenceDelimiters)
				.onChange(async (value) => {
					this.plugin.settings.sentenceDelimiters = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Extra characters')
			.setDesc('Characters that may follow the end of a sentence, and should be included as part of it. Default: *“”‘’')
			.addText(text => text
				.setPlaceholder('*“”‘’')
				.setValue(this.plugin.settings.extraCharacters)
				.onChange(async (value) => {
					this.plugin.settings.extraCharacters = value;
					await this.plugin.saveSettings();
				}));
	}
}


// const sentenceDelimiters = [".", "?", "!"];
// const extraCharacters = ["*", "“", "”", "‘", "’"];


function getActiveSentenceBounds(line: Line, pos: number) {
	// @ts-ignore
	const plugin:FocusActiveSentencePlugin = window.app.plugins.plugins["obsidian-focus-active-sentence"];
	const sentenceDelimiters = plugin.settings.sentenceDelimiters.split("");
	const extraCharacters = plugin.settings.extraCharacters.split("");

	const lineStart = line.from;
	const lineText = line.text;

	let start = -1;

	for (let i = pos-lineStart-1; i >= 0; i--) {

		if (sentenceDelimiters.contains(lineText[i])) {
			let offset = 1;

			// Don't highlight spaces between sentences
			while (lineText[i + offset] === " " && offset < pos-lineStart-1) {
				offset += 1;
			}

			// Account for markdown syntax at the end of sentences (*)
			while (extraCharacters.contains(lineText[i + offset]) && sentenceDelimiters.contains(lineText[i + offset - 1]) && offset < pos-lineStart-1) {
				offset += 1;
			}

			start = i + offset;

			break;
		}
	}
	if (start == -1) start = 0;


	let end = -1;

	for (let i = pos-lineStart; i < line.length; i++) {

		if (sentenceDelimiters.contains(lineText[i])) {

			let offset = 1;

			// Account for ellipses, "!?", etc.
			while (sentenceDelimiters.contains(lineText[i + offset]) && offset < line.length) {
				offset += 1;
			}

			// Account for markdown syntax at the end of sentences (*)
			while (extraCharacters.contains(lineText[i + offset]) && offset < line.length) {
				offset += 1;
			}

			end = i + offset;

			break;
		}
	}


	if (end != -1) {
		return {start: start + lineStart, end: end + lineStart};
	}
	else {
		return {start: start + lineStart, end: null};
	}
}


function getActiveSentenceDeco(view: EditorView) {

	const widgets: Range<Decoration>[] = [];
    const selection = view.state.selection.main;
	const pos = selection.from;
	const line = view.state.doc.lineAt(pos);

	let activeSentenceBounds = getActiveSentenceBounds(line, pos);


	if (activeSentenceBounds.end == null) {
		if (pos > line.from) {
			activeSentenceBounds = getActiveSentenceBounds(line, pos-1);
		}
	}

	const start = activeSentenceBounds.start;
	let end = activeSentenceBounds.end;
	if (end == null) end = line.to;

	// console.log("Current sentence:");
	// console.log(line.text.slice(start, end));

	function addWidget(from: number, to: number, className: string) {
		widgets.push(Decoration.mark({
			inclusive: true,
			attributes: {},
			class: className
		}).range(from, to));
	}

	if (start != end) {
		addWidget(start, end, "active-sentence");

		if (line.from != start)
			addWidget(line.from, start, "active-paragraph");

		if (end != line.to)
			addWidget(end, line.to, "active-paragraph");
	}
	else {
		if (line.from != line.to)
			addWidget(line.from, line.to, "active-paragraph");
	}

    return Decoration.set(widgets, true);
}


const FocusActiveSentenceViewPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = getActiveSentenceDeco(view);
    }

    update(update: ViewUpdate) {
		if (update.docChanged || update.selectionSet) {
			this.decorations = getActiveSentenceDeco(update.view);
		}
    }

}, { decorations: v => v.decorations, });
