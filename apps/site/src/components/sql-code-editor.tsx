"use client";

import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { PostgreSQL, sql } from "@codemirror/lang-sql";
import { HighlightStyle, bracketMatching, syntaxHighlighting } from "@codemirror/language";
import { EditorState, Prec } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { useEffect, useRef } from "react";

interface SqlCodeEditorProps {
  id?: string;
  value: string;
  onChange: (nextValue: string) => void;
  onExecute: () => void;
  ariaLabel?: string;
}

const tydbaseHighlight = HighlightStyle.define([
  {
    tag: [t.keyword, t.controlKeyword, t.operatorKeyword],
    color: "var(--syn-keyword)",
    fontWeight: "600",
  },
  { tag: [t.string, t.special(t.string)], color: "var(--syn-string)" },
  { tag: [t.number, t.integer, t.float, t.bool], color: "var(--syn-number)" },
  { tag: [t.typeName, t.standard(t.name), t.function(t.variableName)], color: "var(--syn-type)" },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: "var(--syn-operator)" },
  {
    tag: [t.comment, t.lineComment, t.blockComment],
    color: "var(--syn-comment)",
    fontStyle: "italic",
  },
  { tag: [t.variableName, t.propertyName, t.name], color: "var(--syn-ident)" },
]);

const tydbaseEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--color-surface-well)",
      color: "var(--color-ink)",
      fontFamily: "var(--font-mono)",
      fontSize: "0.875rem",
      lineHeight: "1.65",
    },
    "&.cm-focused": {
      outline: "2px solid var(--color-accent)",
      outlineOffset: "-1px",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)",
      minHeight: "11.5rem",
      maxHeight: "20rem",
      overflow: "auto",
    },
    ".cm-content": {
      padding: "0.85rem 1rem",
      caretColor: "var(--color-accent)",
    },
    ".cm-line": {
      padding: "0 0.25rem",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-ground)",
      color: "var(--color-ink-muted)",
      borderRight: "1px solid var(--color-border)",
      minWidth: "2.75rem",
      userSelect: "none",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 0.75rem 0 0.5rem",
      fontVariantNumeric: "tabular-nums",
      fontSize: "0.75rem",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--syn-line-active)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--syn-line-active)",
      color: "var(--color-accent)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--color-accent)",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "var(--syn-selection)",
    },
    ".cm-matchingBracket": {
      backgroundColor: "var(--color-accent-tint)",
      color: "var(--color-accent)",
      outline: "1px solid var(--color-accent)",
    },
    ".cm-placeholder": {
      color: "var(--color-ink-muted)",
    },
  },
  { dark: true }
);

export function SqlCodeEditor({
  id,
  value,
  onChange,
  onExecute,
  ariaLabel = "In-browser PostgreSQL query editor",
}: SqlCodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onExecuteRef = useRef(onExecute);
  const initialValueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onExecuteRef.current = onExecute;
  }, [onExecute]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const runKeymap = Prec.highest(
      keymap.of([
        {
          key: "Mod-Enter",
          run: () => {
            onExecuteRef.current();
            return true;
          },
        },
      ])
    );

    const state = EditorState.create({
      doc: initialValueRef.current,
      extensions: [
        runKeymap,
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        sql({ dialect: PostgreSQL }),
        syntaxHighlighting(tydbaseHighlight),
        tydbaseEditorTheme,
        placeholder("-- Write PostgreSQL SQL and press Cmd/Ctrl + Enter to run"),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.contentAttributes.of({
          "aria-label": ariaLabel,
          spellcheck: "false",
          autocorrect: "off",
          autocapitalize: "off",
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: host,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [ariaLabel]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
    }
  }, [value]);

  const lineCount = value.split("\n").length;

  return (
    <div id={id} className="border border-line-strong bg-surface-well">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-ground px-3.5 py-2 text-xs text-ink-muted">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-accent">postgresql.sql</span>
          <span className="tyd-tabular">{lineCount} lines</span>
        </div>
        <span>Cmd/Ctrl + Enter to execute</span>
      </div>
      <div ref={hostRef} className="w-full" />
    </div>
  );
}
