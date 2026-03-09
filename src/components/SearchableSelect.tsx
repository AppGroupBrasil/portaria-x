import { useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
  searchText: string; // lowercase text for search matching
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  style?: React.CSSProperties;
  labelStyle?: "inline" | "tailwind";
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar por nome ou apartamento...",
  style,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = search.trim()
    ? options.filter((o) => o.searchText.includes(search.toLowerCase()))
    : options;

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch("");
  }, [onChange]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", ...style }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%", padding: "12px 14px", paddingLeft: "0.5cm", borderRadius: "12px",
          border: "1px solid #cbd5e1", fontSize: "14px", background: "#fff",
          color: selectedOption ? "#0f172a" : "#94a3b8", outline: "none",
          boxSizing: "border-box", cursor: "pointer", textAlign: "left",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginLeft: "8px", flexShrink: 0 }}>
          {value && (
            <span
              onClick={(e) => { e.stopPropagation(); handleSelect(""); }}
              style={{ cursor: "pointer", display: "flex", padding: "2px" }}
            >
              <X className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
            </span>
          )}
          <ChevronDown
            className="w-4 h-4"
            style={{
              color: "#94a3b8",
              transition: "transform 0.2s",
              transform: isOpen ? "rotate(180deg)" : "rotate(0)",
            }}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          zIndex: 50, background: "#fff", borderRadius: "12px",
          border: "1px solid #e2e8f0", boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
          maxHeight: "320px", display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Search input */}
          <div style={{
            padding: "10px 12px", borderBottom: "1px solid #f1f5f9",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <Search className="w-4 h-4" style={{ color: "#94a3b8", flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                flex: 1, border: "none", outline: "none", fontSize: "14px",
                color: "#0f172a", background: "transparent",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex" }}
              >
                <X className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
              </button>
            )}
          </div>

          {/* Results count */}
          <div style={{
            padding: "4px 14px", fontSize: "11px", color: "#94a3b8", fontWeight: 500,
            background: "#f8fafc", borderBottom: "1px solid #f1f5f9",
          }}>
            {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
            {search && ` para "${search}"`}
          </div>

          {/* Options list */}
          <div style={{ overflowY: "auto", maxHeight: "240px" }}>
            {filtered.length === 0 ? (
              <div style={{
                padding: "20px 14px", textAlign: "center",
                color: "#94a3b8", fontSize: "13px",
              }}>
                Nenhum morador encontrado
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    width: "100%", padding: "10px 14px", border: "none",
                    background: opt.value === value ? "#eef0f5" : "transparent",
                    color: "#0f172a", fontSize: "14px", cursor: "pointer",
                    textAlign: "left", display: "block",
                    borderBottom: "1px solid #f8fafc",
                    fontWeight: opt.value === value ? 600 : 400,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (opt.value !== value) e.currentTarget.style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = opt.value === value ? "#eef0f5" : "transparent";
                  }}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
