"use client";

import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Undo,
  Redo,
  RemoveFormatting,
  ChevronDown,
  Minus,
  Plus,
  ArrowUpDown,
  MoveHorizontal,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

// Email-safe fonts
const EMAIL_SAFE_FONTS = [
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { name: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { name: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { name: "Courier New", value: "'Courier New', Courier, monospace" },
];

// Font sizes in pixels
const FONT_SIZES = [
  { name: "8", value: "8px" },
  { name: "10", value: "10px" },
  { name: "12", value: "12px" },
  { name: "14", value: "14px" },
  { name: "16", value: "16px" },
  { name: "18", value: "18px" },
  { name: "20", value: "20px" },
  { name: "24", value: "24px" },
  { name: "28", value: "28px" },
  { name: "32", value: "32px" },
  { name: "36", value: "36px" },
];

// Line heights
const LINE_HEIGHTS = [
  { name: "1.0", value: "1" },
  { name: "1.15", value: "1.15" },
  { name: "1.5", value: "1.5" },
  { name: "1.75", value: "1.75" },
  { name: "2.0", value: "2" },
  { name: "2.5", value: "2.5" },
];

// Letter spacing options
const LETTER_SPACINGS = [
  { name: "Tight", value: "-0.5px" },
  { name: "Normal", value: "0px" },
  { name: "Wide", value: "1px" },
  { name: "Wider", value: "2px" },
  { name: "Widest", value: "4px" },
];

interface RichTextToolbarProps {
  editor: Editor | null;
  className?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-2 rounded-md transition-all duration-200 
        ${
          isActive
            ? "bg-blue-500 text-white shadow-sm"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        flex items-center justify-center
      `}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-200 mx-1" />;
}

// Dropdown component for various selections
function ToolbarDropdown({
  label,
  value,
  options,
  onChange,
  icon,
  width = "80px",
}: {
  label: string;
  value: string;
  options: { name: string; value: string }[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  width?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={label}
        className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm"
        style={{ minWidth: width }}
      >
        {icon && <span className="text-gray-500">{icon}</span>}
        <span className="truncate">{value}</span>
        <ChevronDown size={12} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-full max-h-[200px] overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-blue-50 transition-colors
                ${value === option.name ? "bg-blue-50 text-blue-600" : ""}`}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RichTextToolbar({
  editor,
  className = "",
}: RichTextToolbarProps) {
  const [currentFontSize, setCurrentFontSize] = useState("14");
  const [currentLineHeight, setCurrentLineHeight] = useState("1.5");
  const [currentLetterSpacing, setCurrentLetterSpacing] = useState("Normal");
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);

  const getCurrentFont = () => {
    if (!editor) return "Arial";
    const fontFamily = editor.getAttributes("textStyle").fontFamily;
    const found = EMAIL_SAFE_FONTS.find((f) => f.value === fontFamily);
    return found?.name || "Arial";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fontDropdownRef.current &&
        !fontDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFontDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFontChange = (fontValue: string) => {
    if (editor) {
      editor.chain().focus().setFontFamily(fontValue).run();
    }
    setShowFontDropdown(false);
  };

  const handleFontSizeChange = (size: string) => {
    if (editor) {
      editor.chain().focus().setFontSize(size).run();
      const sizeName = FONT_SIZES.find((s) => s.value === size)?.name || "14";
      setCurrentFontSize(sizeName);
    }
  };

  const handleLineHeightChange = (lineHeight: string) => {
    if (editor) {
      editor.chain().focus().setLineHeight(lineHeight).run();
      const lhName =
        LINE_HEIGHTS.find((l) => l.value === lineHeight)?.name || "1.5";
      setCurrentLineHeight(lhName);
    }
  };

  const handleLetterSpacingChange = (spacing: string) => {
    if (editor) {
      editor.chain().focus().setLetterSpacing(spacing).run();
      const spacingName =
        LETTER_SPACINGS.find((l) => l.value === spacing)?.name || "Normal";
      setCurrentLetterSpacing(spacingName);
    }
  };

  // Increase/decrease font size
  const adjustFontSize = (direction: "increase" | "decrease") => {
    const currentIndex = FONT_SIZES.findIndex(
      (s) => s.name === currentFontSize,
    );
    const newIndex =
      direction === "increase"
        ? Math.min(currentIndex + 1, FONT_SIZES.length - 1)
        : Math.max(currentIndex - 1, 0);
    handleFontSizeChange(FONT_SIZES[newIndex].value);
  };

  if (!editor) {
    return (
      <div
        className={`p-2 bg-gray-50 border border-gray-200 rounded-t-lg h-[46px] animate-pulse ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1 p-2 bg-gray-50 border border-gray-200 rounded-t-lg ${className}`}
    >
      {/* Row 1: Undo/Redo, Font, Font Size, Basic Formatting */}

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <Redo size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Font Family */}
      <div className="relative" ref={fontDropdownRef}>
        <button
          type="button"
          onClick={() => setShowFontDropdown(!showFontDropdown)}
          title="Font Family"
          className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm min-w-[100px]"
        >
          <span style={{ fontFamily: getCurrentFont() }} className="truncate">
            {getCurrentFont()}
          </span>
          <ChevronDown size={12} className="text-gray-400" />
        </button>

        {showFontDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[160px] max-h-[250px] overflow-y-auto">
            {EMAIL_SAFE_FONTS.map((font) => (
              <button
                key={font.name}
                type="button"
                onClick={() => handleFontChange(font.value)}
                className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors"
                style={{ fontFamily: font.value }}
              >
                {font.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font Size with +/- buttons */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => adjustFontSize("decrease")}
          title="Decrease Font Size"
        >
          <Minus size={14} />
        </ToolbarButton>
        <ToolbarDropdown
          label="Font Size"
          value={currentFontSize}
          options={FONT_SIZES}
          onChange={handleFontSizeChange}
          width="55px"
        />
        <ToolbarButton
          onClick={() => adjustFontSize("increase")}
          title="Increase Font Size"
        >
          <Plus size={14} />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      {/* Text Formatting: Bold, Italic, Underline */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <Underline size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="Align Left"
      >
        <AlignLeft size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="Align Center"
      >
        <AlignCenter size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="Align Right"
      >
        <AlignRight size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListOrdered size={18} />
      </ToolbarButton>

      {/* Indent/Outdent - only show when in list */}
      {(editor.isActive("bulletList") || editor.isActive("orderedList")) && (
        <>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().sinkListItem("listItem").run()
            }
            disabled={!editor.can().sinkListItem("listItem")}
            title="Increase Indent"
          >
            <Indent size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().liftListItem("listItem").run()
            }
            disabled={!editor.can().liftListItem("listItem")}
            title="Decrease Indent"
          >
            <Outdent size={18} />
          </ToolbarButton>
        </>
      )}

      <ToolbarDivider />

      {/* Spacing Controls */}
      <ToolbarDropdown
        label="Line Spacing"
        value={currentLineHeight}
        options={LINE_HEIGHTS}
        onChange={handleLineHeightChange}
        icon={<ArrowUpDown size={14} />}
        width="70px"
      />
      <ToolbarDropdown
        label="Letter Spacing"
        value={currentLetterSpacing}
        options={LETTER_SPACINGS}
        onChange={handleLetterSpacingChange}
        icon={<MoveHorizontal size={14} />}
        width="80px"
      />

      <ToolbarDivider />

      {/* Clear Formatting */}
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()
        }
        title="Clear Formatting"
      >
        <RemoveFormatting size={18} />
      </ToolbarButton>
    </div>
  );
}
