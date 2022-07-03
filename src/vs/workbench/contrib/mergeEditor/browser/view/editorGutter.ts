/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { h } from 'vs/base/browser/dom';
import { Disposable, IDisposable } from 'vs/base/common/lifecycle';
import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';
import { autorun, IReader, observableFromEvent, ObservableValue } from 'vs/workbench/contrib/audioCues/browser/observable';
import { LineRange } from 'vs/workbench/contrib/mergeEditor/browser/model/lineRange';

export class EditorGutter<T extends IGutterItemInfo = IGutterItemInfo> extends Disposable {
	private readonly scrollTop = observableFromEvent(
		this._editor.onDidScrollChange,
		(e) => this._editor.getScrollTop()
	);
	private readonly modelAttached = observableFromEvent(
		this._editor.onDidChangeModel,
		(e) => this._editor.hasModel()
	);

	private readonly changeCounter = new ObservableValue(0, 'counter');

	constructor(
		private readonly _editor: CodeEditorWidget,
		private readonly _domNode: HTMLElement,
		private readonly itemProvider: IGutterItemProvider<T>
	) {
		super();
		this._domNode.className = 'gutter monaco-editor';
		const scrollDecoration = this._domNode.appendChild(
			h('div.scroll-decoration', { role: 'presentation', ariaHidden: true, style: { width: '100%' } })
				.root
		);

		this._register(autorun((reader) => {
			scrollDecoration.className = this.scrollTop.read(reader) === 0 ? '' : 'scroll-decoration';
		}, 'update scroll decoration'));


		this._register(autorun((reader) => this.render(reader), 'Render'));

		this._editor.onDidChangeViewZones(e => {
			this.changeCounter.set(this.changeCounter.get() + 1, undefined);
		});

		this._editor.onDidContentSizeChange(e => {
			this.changeCounter.set(this.changeCounter.get() + 1, undefined);
		});
	}

	private readonly views = new Map<string, ManagedGutterItemView>();

	private render(reader: IReader): void {
		if (!this.modelAttached.read(reader)) {
			return;
		}
		this.changeCounter.read(reader);
		const scrollTop = this.scrollTop.read(reader);

		const visibleRanges = this._editor.getVisibleRanges();
		const unusedIds = new Set(this.views.keys());

		if (visibleRanges.length > 0) {
			const visibleRange = visibleRanges[0];

			const visibleRange2 = new LineRange(
				visibleRange.startLineNumber,
				visibleRange.endLineNumber - visibleRange.startLineNumber
			).deltaEnd(1);

			const gutterItems = this.itemProvider.getIntersectingGutterItems(
				visibleRange2,
				reader
			);

			for (const gutterItem of gutterItems) {
				if (!gutterItem.range.touches(visibleRange2)) {
					continue;
				}

				unusedIds.delete(gutterItem.id);
				let view = this.views.get(gutterItem.id);
				if (!view) {
					const viewDomNode = document.createElement('div');
					viewDomNode.className = 'gutter-item';
					this._domNode.appendChild(viewDomNode);
					const itemView = this.itemProvider.createView(
						gutterItem,
						viewDomNode
					);
					view = new ManagedGutterItemView(itemView, viewDomNode);
					this.views.set(gutterItem.id, view);
				} else {
					view.gutterItemView.update(gutterItem);
				}

				const top =
					gutterItem.range.startLineNumber <= this._editor.getModel()!.getLineCount()
						? this._editor.getTopForLineNumber(gutterItem.range.startLineNumber, true) - scrollTop
						: this._editor.getBottomForLineNumber(gutterItem.range.startLineNumber - 1, false) - scrollTop;
				const bottom = this._editor.getBottomForLineNumber(gutterItem.range.endLineNumberExclusive - 1, true) - scrollTop;

				const height = bottom - top;

				view.domNode.style.top = `${top}px`;
				view.domNode.style.height = `${height}px`;

				view.gutterItemView.layout(top, height, 0, -1);
			}
		}

		for (const id of unusedIds) {
			const view = this.views.get(id)!;
			view.gutterItemView.dispose();
			this._domNode.removeChild(view.domNode);
			this.views.delete(id);
		}
	}
}

class ManagedGutterItemView {
	constructor(
		public readonly gutterItemView: IGutterItemView<any>,
		public readonly domNode: HTMLDivElement
	) { }
}

export interface IGutterItemProvider<TItem extends IGutterItemInfo> {
	getIntersectingGutterItems(range: LineRange, reader: IReader): TItem[];

	createView(item: TItem, target: HTMLElement): IGutterItemView<TItem>;
}

export interface IGutterItemInfo {
	id: string;
	range: LineRange;
	/*

	// To accommodate view zones:
	offsetInPx: number;
	additionalHeightInPx: number;
	*/
}

export interface IGutterItemView<T extends IGutterItemInfo> extends IDisposable {
	update(item: T): void;
	layout(top: number, height: number, viewTop: number, viewHeight: number): void;
}

