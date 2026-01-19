"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Extension } from "@tiptap/core";
import RichTextToolbar from "./RichTextToolbar";
import { useEffect } from "react";

// Custom Font Family Extension
const FontFamily = Extension.create({
  name: "fontFamily",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (element) =>
              element.style.fontFamily?.replace(/['"]/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) {
                return {};
              }
              return { style: `font-family: ${attributes.fontFamily}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily: string) =>
        ({ chain }: any) => {
          return chain().setMark("textStyle", { fontFamily }).run();
        },
      unsetFontFamily:
        () =>
        ({ chain }: any) => {
          return chain()
            .setMark("textStyle", { fontFamily: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },
});

// Custom Font Size Extension
const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: any) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }: any) => {
          return chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run();
        },
    } as any;
  },
});

// Custom Line Height Extension
const LineHeight = Extension.create({
  name: "lineHeight",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {};
              }
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ chain }: any) => {
          return chain().setMark("textStyle", { lineHeight }).run();
        },
      unsetLineHeight:
        () =>
        ({ chain }: any) => {
          return chain()
            .setMark("textStyle", { lineHeight: null })
            .removeEmptyTextStyle()
            .run();
        },
    } as any;
  },
});

// Custom Letter Spacing Extension
const LetterSpacing = Extension.create({
  name: "letterSpacing",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element) => element.style.letterSpacing || null,
            renderHTML: (attributes) => {
              if (!attributes.letterSpacing) {
                return {};
              }
              return { style: `letter-spacing: ${attributes.letterSpacing}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLetterSpacing:
        (letterSpacing: string) =>
        ({ chain }: any) => {
          return chain().setMark("textStyle", { letterSpacing }).run();
        },
      unsetLetterSpacing:
        () =>
        ({ chain }: any) => {
          return chain()
            .setMark("textStyle", { letterSpacing: null })
            .removeEmptyTextStyle()
            .run();
        },
    } as any;
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  className = "",
  minHeight = "300px",
}: RichTextEditorProps) {
  // Initialize TipTap editor with all extensions
  const editor = useEditor({
    // IMPORTANT: Disable immediate render to prevent SSR hydration mismatch
    immediatelyRender: false,
    extensions: [
      // StarterKit includes: Document, Paragraph, Text, Bold, Italic, Strike, Code,
      // Heading, Blockquote, BulletList, OrderedList, ListItem, HardBreak, HorizontalRule, History
      StarterKit,
      // Underline - not included in StarterKit
      Underline,
      // Text alignment
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
      }),
      // Placeholder text
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      // TextStyle required for font styling
      TextStyle,
      // Custom extensions for font family, size, and spacing
      FontFamily,
      FontSize,
      LineHeight,
      LetterSpacing,
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[${minHeight}] p-4`,
        style: `min-height: ${minHeight}; font-family: Arial, sans-serif;`,
      },
    },
    onUpdate: ({ editor }) => {
      // Emit HTML content on every change
      const html = editor.getHTML();
      onChange(html);
    },
    // Handle paste events - TipTap preserves formatting automatically
    // but we can add custom handling if needed
  });

  // Update editor content when prop changes (e.g., AI improves content)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>
      {/* Toolbar */}
      <RichTextToolbar editor={editor} />

      {/* Editor Content */}
      <div className="relative rounded-b-lg overflow-hidden">
        <EditorContent editor={editor} className="rich-text-editor" />
      </div>

      {/* Custom styles for the editor */}
      <style jsx global>{`
        .rich-text-editor .ProseMirror {
          min-height: ${minHeight};
          padding: 16px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          outline: none;
        }

        .rich-text-editor .ProseMirror p {
          margin: 0 0 1em 0;
        }

        .rich-text-editor .ProseMirror p:last-child {
          margin-bottom: 0;
        }

        .rich-text-editor .ProseMirror ul {
          padding-left: 1.5em;
          margin: 0.5em 0;
          list-style-type: disc;
        }

        .rich-text-editor .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
          list-style-type: decimal;
        }

        .rich-text-editor .ProseMirror li {
          margin: 0.25em 0;
          display: list-item;
        }

        .rich-text-editor .ProseMirror li p {
          margin: 0;
          display: inline;
        }

        .rich-text-editor .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
        }

        .rich-text-editor .ProseMirror.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }

        /* Placeholder styling */
        .rich-text-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }

        /* Focus styles */
        .rich-text-editor:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}

/**
 * Utility function to convert HTML to plain text
 * Used for email fallback when HTML is not supported
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";

  return (
    html
      // Handle line breaks
      .replace(/<br\s*\/?>/gi, "\n")
      // Handle paragraphs
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<p[^>]*>/gi, "")
      // Handle bullet lists
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<\/li>/gi, "\n")
      // Handle ordered lists (simplified - just bullets for now)
      .replace(/<ol[^>]*>/gi, "")
      .replace(/<\/ol>/gi, "")
      .replace(/<ul[^>]*>/gi, "")
      .replace(/<\/ul>/gi, "\n")
      // Handle links - convert to text (URL)
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
      // Remove all other HTML tags
      .replace(/<[^>]+>/g, "")
      // Handle HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up multiple newlines
      .replace(/\n{3,}/g, "\n\n")
      // Trim whitespace
      .trim()
  );
}

/**
 * Utility function to get word count from HTML
 */
export function getWordCount(html: string): number {
  const text = htmlToPlainText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Utility function to get character count from HTML
 */
export function getCharacterCount(html: string): number {
  const text = htmlToPlainText(html);
  return text.length;
}

/**
 * Utility function to convert markdown to HTML
 * Used when AI returns markdown-formatted text that needs to be displayed in the rich text editor
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split(/\r?\n/);
  let html = "";
  let listStack: Array<"ul" | "ol"> = [];

  const closeList = () => {
    const type = listStack.pop();
    if (type) html += `</${type}>`;
  };

  const formatLine = (text: string) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      // Empty line -> close lists, ignore (will result in </p><p> via below logic if multiple)
      while (listStack.length > 0) closeList();
      continue;
    }

    // Check for Unordered List
    const ulMatch = line.match(/^[-*•]\s+(.*)/);
    if (ulMatch) {
      if (listStack[listStack.length - 1] !== "ul") {
        while (listStack.length > 0) closeList();
        html += "<ul>";
        listStack.push("ul");
      }
      html += `<li>${formatLine(ulMatch[1])}</li>`;
      continue;
    }

    // Check for Ordered List
    const olMatch = line.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (listStack[listStack.length - 1] !== "ol") {
        while (listStack.length > 0) closeList();
        html += "<ol>";
        listStack.push("ol");
      }
      html += `<li>${formatLine(olMatch[1])}</li>`;
      continue;
    }

    // Regular line
    // If we are in a list, close it
    while (listStack.length > 0) closeList();

    // If it's a regular line, wrap in <p>.
    // BUT we need to handle "soft" paragraphs (lines next to each other in MD are same paragraph).
    // However, for email templates, usually newlines = breaks.
    // The previous regex had .replace(/\n/g, "<br>").
    // The user's screenshot shows the text is collapsed.
    // So we should probably treat every non-list line as a paragraph OR append to previous?

    // Simplest robust solution: Wrap every non-list line in <p> if it's not already.
    // Or just append <p>line</p>
    html += `<p>${formatLine(line)}</p>`;
  }

  while (listStack.length > 0) closeList();

  return html;
}

/**
 * Utility function to strip markdown formatting entirely
 * Use this if you want clean text without bold/italic markers
 */
export function stripMarkdown(text: string): string {
  if (!text) return "";

  return (
    text
      // Remove **bold** markers, keep text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      // Remove *italic* markers, keep text
      .replace(/\*([^*]+)\*/g, "$1")
      // Remove any remaining asterisks
      .replace(/\*/g, "")
      .trim()
  );
}
