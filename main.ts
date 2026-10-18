import type { Extension } from '@codemirror/state';
import { App, Plugin, PluginSettingTab, type SettingDefinitionItem } from 'obsidian';
import { createFocusActiveSentenceExtension } from './editorExtension';

export interface FocusActiveSentencePluginSettings {
	enabled: boolean;
	focusLevel: 'sentence' | 'paragraph';
	sentenceDelimiters: string;
	extraCharacters: string;
	titles: string;
}

const DEFAULT_SETTINGS: FocusActiveSentencePluginSettings = {
	enabled: true,
	focusLevel: 'sentence',
	sentenceDelimiters: '.!?',
	extraCharacters: `*_"'“”‘’)]}`,
	titles: `Mr.
Ms.
Mrs.`,
};
const LEGACY_EXTRA_CHARACTERS = '*“”‘’';

export default class FocusActiveSentencePlugin extends Plugin {
	settings: FocusActiveSentencePluginSettings = { ...DEFAULT_SETTINGS };
	private readonly editorExtensions: Extension[] = [];
	private refreshTimer: number | null = null;

	onload(): void {
		void this.initialize();
	}

	private async initialize() {
		await this.loadSettings();
		this.addSettingTab(new FocusActiveSentenceSettingTab(this.app, this));
		this.addCommand({
			id: 'toggle-focus',
			name: 'Toggle focus',
			// Matches the focus mode shortcut in iA Writer.
			hotkeys: [
				{
					modifiers: ['Mod'],
					key: 'd',
				},
			],
			callback: () => {
				void this.toggleFocus();
			},
		});

		this.editorExtensions.push(...this.createEditorExtensions());
		this.registerEditorExtension(this.editorExtensions);
		this.register(() => {
			if (this.refreshTimer !== null) {
				window.clearTimeout(this.refreshTimer);
			}
		});
	}

	private async loadSettings() {
		const savedData: unknown = await this.loadData();
		this.settings = {
			enabled: readBooleanSetting(savedData, 'enabled'),
			focusLevel: readFocusLevelSetting(savedData),
			sentenceDelimiters: readStringSetting(savedData, 'sentenceDelimiters'),
			extraCharacters: readStringSetting(savedData, 'extraCharacters'),
			titles: readStringSetting(savedData, 'titles'),
		};
	}

	refreshEditorExtension() {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
		}

		this.refreshTimer = window.setTimeout(() => {
			this.editorExtensions.splice(
				0,
				this.editorExtensions.length,
				...this.createEditorExtensions(),
			);
			this.app.workspace.updateOptions();
			this.refreshTimer = null;
		}, 250);
	}

	private createEditorExtensions(): Extension[] {
		return this.settings.enabled
			? createFocusActiveSentenceExtension(this.settings)
			: [];
	}

	private async toggleFocus() {
		this.settings.enabled = !this.settings.enabled;
		await this.saveData(this.settings);
		this.refreshEditorExtension();
	}
}

function readStringSetting(
	savedData: unknown,
	key: Exclude<keyof FocusActiveSentencePluginSettings, 'enabled' | 'focusLevel'>,
): string {
	if (typeof savedData !== 'object' || savedData === null || !(key in savedData)) {
		return DEFAULT_SETTINGS[key];
	}

	const value = (savedData as Record<string, unknown>)[key];
	if (key === 'extraCharacters' && value === LEGACY_EXTRA_CHARACTERS) {
		return DEFAULT_SETTINGS.extraCharacters;
	}

	return typeof value === 'string' ? value : DEFAULT_SETTINGS[key];
}

function readBooleanSetting(
	savedData: unknown,
	key: 'enabled',
): boolean {
	if (typeof savedData !== 'object' || savedData === null || !(key in savedData)) {
		return Boolean(DEFAULT_SETTINGS[key]);
	}

	const value = (savedData as Record<string, unknown>)[key];
	return typeof value === 'boolean' ? value : Boolean(DEFAULT_SETTINGS[key]);
}

function readFocusLevelSetting(savedData: unknown): 'sentence' | 'paragraph' {
	if (typeof savedData !== 'object' || savedData === null || !('focusLevel' in savedData)) {
		return DEFAULT_SETTINGS.focusLevel;
	}

	const value = (savedData as Record<string, unknown>).focusLevel;
	return value === 'paragraph' || value === 'sentence'
		? value
		: DEFAULT_SETTINGS.focusLevel;
}

class FocusActiveSentenceSettingTab extends PluginSettingTab {
	private readonly plugin: FocusActiveSentencePlugin;

	constructor(app: App, plugin: FocusActiveSentencePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem<keyof FocusActiveSentencePluginSettings>[] {
		return [
			{
				name: 'Enable focus',
				desc: 'Dim everything outside the selected focus level',
				control: {
					type: 'toggle',
					key: 'enabled',
					defaultValue: DEFAULT_SETTINGS.enabled,
				},
			},
			{
				name: 'Focus level',
				desc: 'Choose how much text remains fully visible around the cursor',
				control: {
					type: 'dropdown',
					key: 'focusLevel',
					defaultValue: DEFAULT_SETTINGS.focusLevel,
					options: {
						sentence: 'Sentence',
						paragraph: 'Paragraph',
					},
				},
			},
			{
				name: 'Sentence delimiters',
				desc: 'Characters that mark the end of a sentence',
				control: {
					type: 'text',
					key: 'sentenceDelimiters',
					defaultValue: DEFAULT_SETTINGS.sentenceDelimiters,
					placeholder: DEFAULT_SETTINGS.sentenceDelimiters,
				},
			},
			{
				name: 'Extra characters',
				desc: 'Characters that can follow a sentence delimiter and should remain part of the sentence',
				control: {
					type: 'text',
					key: 'extraCharacters',
					defaultValue: DEFAULT_SETTINGS.extraCharacters,
					placeholder: DEFAULT_SETTINGS.extraCharacters,
				},
			},
			{
				name: 'Titles',
				desc: 'One title per line that should not end a sentence',
				control: {
					type: 'textarea',
					key: 'titles',
					defaultValue: DEFAULT_SETTINGS.titles,
					placeholder: DEFAULT_SETTINGS.titles,
					rows: 4,
				},
			},
		];
	}

	async setControlValue(key: string, value: unknown) {
		await super.setControlValue(key, value);
		this.plugin.refreshEditorExtension();
	}
}
