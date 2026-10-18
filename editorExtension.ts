import type { Line, Range } from '@codemirror/state';
import {
	Decoration,
	type DecorationSet,
	EditorView,
	type ViewUpdate,
	ViewPlugin,
} from '@codemirror/view';
import type { FocusActiveSentencePluginSettings } from './main';

const EDITOR_CLASS = 'focus-active-sentence';
const ACTIVE_LINE_CLASS = 'focus-active-sentence-line';
const ACTIVE_SENTENCE_CLASS = 'focus-active-sentence-active';
const INACTIVE_TEXT_CLASS = 'focus-active-sentence-inactive';

function textEndsWithTitle(lineText: string, titles: string[], index: number): boolean {
	return titles.some((title) => {
		const titleStart = index + 1 - title.length;
		if (titleStart < 0 || lineText.slice(titleStart, index + 1) !== title) {
			return false;
		}

		return titleStart === 0 || /[\s([{'\u201c\u2018]/u.test(lineText[titleStart - 1] ?? '');
	});
}

function isSentenceEnd(
	lineText: string,
	index: number,
	sentenceDelimiters: Set<string>,
	extraCharacters: Set<string>,
	titles: string[],
): boolean {
	if (
		!sentenceDelimiters.has(lineText[index] ?? '')
		|| textEndsWithTitle(lineText, titles, index)
	) {
		return false;
	}

	let nextIndex = index + 1;
	while (
		nextIndex < lineText.length
		&& sentenceDelimiters.has(lineText[nextIndex] ?? '')
	) {
		nextIndex++;
	}

	while (
		nextIndex < lineText.length
		&& extraCharacters.has(lineText[nextIndex] ?? '')
	) {
		nextIndex++;
	}

	return nextIndex === lineText.length || /\s/u.test(lineText[nextIndex] ?? '');
}

export function getActiveSentenceBounds(
	line: Line,
	pos: number,
	settings: FocusActiveSentencePluginSettings,
) {
	const sentenceDelimiters = new Set(settings.sentenceDelimiters);
	const extraCharacters = new Set(settings.extraCharacters);
	const titles = settings.titles
		.split(/\r?\n/u)
		.map(title => title.trim())
		.filter(title => title.length > 0);

	const lineStart = line.from;
	const lineText = line.text;
	const cursorOffset = pos - lineStart;

	let start = -1;

	for (let i = cursorOffset - 1; i >= 0; i--) {
		if (isSentenceEnd(lineText, i, sentenceDelimiters, extraCharacters, titles)) {
			let offset = 1;
			while (
				i + offset < cursorOffset
				&& extraCharacters.has(lineText[i + offset] ?? '')
			) {
				offset++;
			}

			while (i + offset < cursorOffset && /\s/u.test(lineText[i + offset] ?? '')) {
				offset++;
			}

			start = i + offset;
			break;
		}
	}
	if (start === -1) {
		start = 0;
	}

	let end = -1;

	for (let i = cursorOffset; i < line.length; i++) {
		if (isSentenceEnd(lineText, i, sentenceDelimiters, extraCharacters, titles)) {
			let offset = 1;
			while (
				i + offset < line.length
				&& sentenceDelimiters.has(lineText[i + offset] ?? '')
			) {
				offset++;
			}

			while (
				i + offset < line.length
				&& extraCharacters.has(lineText[i + offset] ?? '')
			) {
				offset++;
			}

			end = i + offset;
			break;
		}
	}

	return {
		start: start + lineStart,
		end: end === -1 ? null : end + lineStart,
	};
}

function getActiveSentenceDecorations(
	view: EditorView,
	settings: FocusActiveSentencePluginSettings,
): DecorationSet {
	const decorations: Range<Decoration>[] = [];
	const selection = view.state.selection.main;
	const pos = selection.head;
	const line = view.state.doc.lineAt(pos);
	decorations.push(Decoration.line({ class: ACTIVE_LINE_CLASS }).range(line.from));

	if (settings.focusLevel === 'paragraph') {
		return Decoration.set(decorations, true);
	}

	let activeSentenceBounds = getActiveSentenceBounds(line, pos, settings);

	if (activeSentenceBounds.end === null && pos > line.from) {
		activeSentenceBounds = getActiveSentenceBounds(line, pos - 1, settings);
	}

	const start = activeSentenceBounds.start;
	const end = activeSentenceBounds.end ?? line.to;

	function addMark(from: number, to: number, className: string) {
		decorations.push(Decoration.mark({
			inclusive: true,
			class: className,
		}).range(from, to));
	}

	if (start !== end) {
		addMark(start, end, ACTIVE_SENTENCE_CLASS);

		if (line.from !== start) {
			addMark(line.from, start, INACTIVE_TEXT_CLASS);
		}

		if (end !== line.to) {
			addMark(end, line.to, INACTIVE_TEXT_CLASS);
		}
	} else if (line.from !== line.to) {
		addMark(line.from, line.to, INACTIVE_TEXT_CLASS);
	}

	return Decoration.set(decorations, true);
}

export function createFocusActiveSentenceExtension(
	settings: FocusActiveSentencePluginSettings,
) {
	const focusActiveSentenceViewPlugin = ViewPlugin.fromClass(class {
		decorations: DecorationSet;
		private readonly editorElement: HTMLElement;

		constructor(view: EditorView) {
			this.decorations = getActiveSentenceDecorations(view, settings);
			this.editorElement = view.dom;
			this.editorElement.classList.add(EDITOR_CLASS);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.selectionSet) {
				this.decorations = getActiveSentenceDecorations(update.view, settings);
				this.editorElement.classList.add(EDITOR_CLASS);
			}
		}

		destroy() {
			this.editorElement.classList.remove(EDITOR_CLASS);
		}
	}, {
		decorations: value => value.decorations,
	});

	const scrollEventHandler = EditorView.domEventHandlers({
		scroll(_event, view) {
			view.dom.classList.remove(EDITOR_CLASS);
		},
	});

	return [focusActiveSentenceViewPlugin, scrollEventHandler];
}
