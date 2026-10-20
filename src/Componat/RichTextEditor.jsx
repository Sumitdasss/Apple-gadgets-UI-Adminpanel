import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { FontFamily } from "@tiptap/extension-font-family";

import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

import { Extension } from "@tiptap/core";
import { useEffect } from "react";



// Custom font-size extension
const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,

            parseHTML: (element) =>
              element.style.fontSize || null,

            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
});

export default function RichTextEditor({
  value = "",
  onChange,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,

      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),

      Underline,

      TextStyle,
      Color,
      FontFamily,
      FontSize,

      Highlight.configure({
        multicolor: true,
      }),

      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),

      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],

    content: value || "",
    immediatelyRender: false,

    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;

    const nextHTML = value || "";

    if (editor.getHTML() !== nextHTML) {
      editor.commands.setContent(nextHTML, {
        emitUpdate: false,
      });
    }
  }, [editor, value]);

  if (!editor) return null;

  const buttonClass = (active = false) =>
    `rte-button ${active ? "rte-button-active" : ""}`;

  const addOrEditLink = () => {
    const previousUrl =
      editor.getAttributes("link").href || "";

    const input = window.prompt(
      "Enter URL. Leave empty to remove the link:",
      previousUrl || "https://"
    );

    if (input === null) return;

    const url = input.trim();

    if (!url) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .unsetLink()
        .run();
      return;
    }

    let parsed;

    try {
      parsed = new URL(url);
    } catch {
      alert("Please enter a valid URL.");
      return;
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      alert("Only HTTP and HTTPS links are allowed.");
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: parsed.href })
      .run();
  };

  const setFontSize = (size) => {
    if (!size) {
      editor
        .chain()
        .focus()
        .setMark("textStyle", { fontSize: null })
        .run();
      return;
    }

    editor
      .chain()
      .focus()
      .setMark("textStyle", { fontSize: size })
      .run();
  };

  const setFontFamily = (font) => {
    if (!font) {
      editor.chain().focus().unsetFontFamily().run();
      return;
    }

    editor.chain().focus().setFontFamily(font).run();
  };

  return (
    <div className="rich-editor">
      {/* Font controls */}
      <div className="rte-toolbar">
        <select
          title="Font Family"
          defaultValue=""
          className="rte-select"
          onChange={(e) => setFontFamily(e.target.value)}
        >
          <option value="">Font Family</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Verdana">Verdana</option>
          <option value="'Times New Roman'">
            Times New Roman
          </option>
          <option value="monospace">Monospace</option>
        </select>

        <select
          title="Font Size"
          defaultValue=""
          className="rte-select rte-size-select"
          onChange={(e) => setFontSize(e.target.value)}
        >
          <option value="">Font Size</option>
          {[
            "10px",
            "12px",
            "14px",
            "16px",
            "18px",
            "20px",
            "24px",
            "28px",
            "32px",
            "36px",
            "48px",
          ].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <button
          type="button"
          title="Decrease font size"
          className={buttonClass()}
          onClick={() => {
            const current =
              parseInt(
                editor.getAttributes("textStyle").fontSize,
                10
              ) || 16;

            setFontSize(`${Math.max(8, current - 2)}px`);
          }}
        >
          A−
        </button>

        <button
          type="button"
          title="Increase font size"
          className={buttonClass()}
          onClick={() => {
            const current =
              parseInt(
                editor.getAttributes("textStyle").fontSize,
                10
              ) || 16;

            setFontSize(`${Math.min(96, current + 2)}px`);
          }}
        >
          A+
        </button>
      </div>

      {/* Text formatting */}
      <div className="rte-toolbar">
        <button
          type="button"
          title="Bold"
          className={buttonClass(editor.isActive("bold"))}
          onClick={() =>
            editor.chain().focus().toggleBold().run()
          }
        >
          <b>B</b>
        </button>

        <button
          type="button"
          title="Italic"
          className={buttonClass(editor.isActive("italic"))}
          onClick={() =>
            editor.chain().focus().toggleItalic().run()
          }
        >
          <i>I</i>
        </button>

        <button
          type="button"
          title="Underline"
          className={buttonClass(editor.isActive("underline"))}
          onClick={() =>
            editor.chain().focus().toggleUnderline().run()
          }
        >
          <u>U</u>
        </button>

        <button
          type="button"
          title="Strikethrough"
          className={buttonClass(editor.isActive("strike"))}
          onClick={() =>
            editor.chain().focus().toggleStrike().run()
          }
        >
          <s>S</s>
        </button>

        <label className="rte-color-control" title="Text Color">
          <span>A</span>
          <input
            type="color"
            aria-label="Text color"
            defaultValue="#000000"
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .setColor(e.target.value)
                .run()
            }
          />
        </label>

        <label
          className="rte-color-control"
          title="Text Highlight"
        >
          <span>🖍</span>
          <input
            type="color"
            aria-label="Highlight color"
            defaultValue="#fff176"
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .toggleHighlight({
                  color: e.target.value,
                })
                .run()
            }
          />
        </label>

        <button
          type="button"
          title="Clear text formatting"
          className={buttonClass()}
          onClick={() =>
            editor.chain().focus().unsetAllMarks().run()
          }
        >
          Clear Marks
        </button>
      </div>

      {/* Paragraph controls */}
      <div className="rte-toolbar">
        <select
          title="Paragraph style"
          className="rte-select"
          defaultValue="paragraph"
          onChange={(e) => {
            const value = e.target.value;
            const chain = editor.chain().focus();

            if (value === "paragraph") {
              chain.setParagraph().run();
            } else {
              chain
                .toggleHeading({
                  level: Number(value),
                })
                .run();
            }
          }}
        >
          <option value="paragraph">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        {[
          ["left", "Left"],
          ["center", "Center"],
          ["right", "Right"],
          ["justify", "Justify"],
        ].map(([align, label]) => (
          <button
            key={align}
            type="button"
            title={`${label} alignment`}
            className={buttonClass(
              editor.isActive({ textAlign: align })
            )}
            onClick={() =>
              editor
                .chain()
                .focus()
                .setTextAlign(align)
                .run()
            }
          >
            {label}
          </button>
        ))}

        <button
          type="button"
          title="Bullet List"
          className={buttonClass(editor.isActive("bulletList"))}
          onClick={() =>
            editor.chain().focus().toggleBulletList().run()
          }
        >
          • List
        </button>

        <button
          type="button"
          title="Numbered List"
          className={buttonClass(editor.isActive("orderedList"))}
          onClick={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
        >
          1. List
        </button>
      </div>

      {/* Insert controls */}
      <div className="rte-toolbar">
        <button
          type="button"
          className={buttonClass(editor.isActive("link"))}
          onClick={addOrEditLink}
        >
          🔗 Link
        </button>

        <button
          type="button"
          className={buttonClass()}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({
                rows: 3,
                cols: 3,
                withHeaderRow: true,
              })
              .run()
          }
        >
          + Table
        </button>

        <button
          type="button"
          className={buttonClass()}
          disabled={!editor.can().undo()}
          onClick={() =>
            editor.chain().focus().undo().run()
          }
        >
          ↶ Undo
        </button>

        <button
          type="button"
          className={buttonClass()}
          disabled={!editor.can().redo()}
          onClick={() =>
            editor.chain().focus().redo().run()
          }
        >
          ↷ Redo
        </button>
      </div>

      {/* Table controls */}
      {editor.isActive("table") && (
        <div className="rte-toolbar">
          <button
            type="button"
            className={buttonClass()}
            onClick={() =>
              editor.chain().focus().addColumnBefore().run()
            }
          >
            + Column Before
          </button>

          <button
            type="button"
            className={buttonClass()}
            onClick={() =>
              editor.chain().focus().addColumnAfter().run()
            }
          >
            + Column After
          </button>

          <button
            type="button"
            className={buttonClass()}
            onClick={() =>
              editor.chain().focus().addRowBefore().run()
            }
          >
            + Row Before
          </button>

          <button
            type="button"
            className={buttonClass()}
            onClick={() =>
              editor.chain().focus().addRowAfter().run()
            }
          >
            + Row After
          </button>

          <button
            type="button"
            className={buttonClass()}
            onClick={() =>
              editor.chain().focus().deleteRow().run()
            }
          >
            Delete Row
          </button>

          <button
            type="button"
            className={buttonClass()}
            onClick={() =>
              editor.chain().focus().deleteColumn().run()
            }
          >
            Delete Column
          </button>

          <button
            type="button"
            className={buttonClass()}
            onClick={() =>
              editor.chain().focus().deleteTable().run()
            }
          >
            Delete Table
          </button>
        </div>
      )}

      <EditorContent editor={editor} />

      <div className="rte-footer">
        Rich Text Editor · {editor.storage.characterCount?.characters?.() ?? editor.getText().length} characters
      </div>
    </div>
  );
}
