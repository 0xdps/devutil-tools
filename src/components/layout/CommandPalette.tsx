import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  BookOpen,
  Home,
  Keyboard,
  Monitor,
  Moon,
  ShieldCheck,
  Star,
  Sun,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  categories,
  getToolById,
  toolHref,
  visibleTools,
  type ToolDefinition,
} from "@/tools/registry";
import { useFavorites, useRecents } from "@/hooks/use-tool-prefs";
import { site } from "@/config/site";
import { GithubIcon } from "@/components/icons";
import { detectContent } from "@/lib/detect";
import { paletteScore } from "@/lib/palette-rank";
import { useOpenSuggestion } from "@/hooks/use-open-suggestion";
import { CommandPaletteContext } from "./command-palette-context";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      } else if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  );
}

type PaletteEntry = {
  key: string;
  icon: ComponentType<{ className?: string }>;
  label: ReactNode;
  /** Secondary text, truncated to keep every row on one line. */
  detail?: string;
  /** terms[0] is the name, the last is a long description (see paletteScore). */
  terms: string[];
  trailing?: ReactNode;
  onSelect: () => void;
};

function Row({ entry }: { entry: PaletteEntry }) {
  const Icon = entry.icon;
  return (
    <CommandItem value={entry.key} onSelect={entry.onSelect}>
      <Icon />
      <span className="shrink-0 font-medium">{entry.label}</span>
      {entry.detail && (
        <span className="min-w-0 truncate text-muted-foreground">
          {entry.detail}
        </span>
      )}
      {entry.trailing}
    </CommandItem>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { favorites } = useFavorites();
  const recents = useRecents();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };
  const go = (path: string) => run(() => navigate(path));

  const toolEntry = (tool: ToolDefinition, prefix: string): PaletteEntry => ({
    key: `${prefix}:${tool.id}`,
    icon: tool.icon,
    label: tool.name,
    detail: tool.description,
    terms: [tool.name, ...tool.keywords, tool.description],
    onSelect: () => go(tool.path),
  });

  const featureEntries: PaletteEntry[] = visibleTools.flatMap((tool) =>
    (tool.features ?? []).map((feature) => ({
      key: `feature:${tool.id}:${feature.id}`,
      icon: tool.icon,
      label: feature.name,
      detail: `in ${tool.name}`,
      terms: [feature.name, ...(feature.keywords ?? []), tool.name],
      onSelect: () => go(toolHref(tool, feature.tab)),
    })),
  );

  const actions: PaletteEntry[] = [
    {
      key: "action:home",
      icon: Home,
      label: "All tools",
      terms: ["All tools", "home"],
      onSelect: () => go("/"),
    },
    {
      key: "action:theme-light",
      icon: Sun,
      label: "Light theme",
      terms: ["Light theme", "theme", "light mode"],
      onSelect: () => run(() => setTheme("light")),
    },
    {
      key: "action:theme-dark",
      icon: Moon,
      label: "Dark theme",
      terms: ["Dark theme", "theme", "dark mode"],
      onSelect: () => run(() => setTheme("dark")),
    },
    {
      key: "action:theme-system",
      icon: Monitor,
      label: "System theme",
      terms: ["System theme", "theme", "auto"],
      onSelect: () => run(() => setTheme("system")),
    },
    {
      key: "action:privacy",
      icon: ShieldCheck,
      label: "Privacy",
      terms: ["Privacy", "data"],
      onSelect: () => go("?modal=privacy"),
    },
    {
      key: "action:shortcuts",
      icon: Keyboard,
      label: "Keyboard shortcuts",
      terms: ["Keyboard shortcuts", "keys", "hotkeys", "help"],
      onSelect: () => go("?modal=shortcuts"),
    },
    {
      key: "action:contribute",
      icon: BookOpen,
      label: "Contribute",
      terms: ["Contribute", "help"],
      onSelect: () => go("/contribute"),
    },
    {
      key: "action:github",
      icon: GithubIcon,
      label: "View source on GitHub",
      terms: ["View source on GitHub", "github", "repository", "star"],
      trailing: (
        <CommandShortcut>
          <Star className="size-3" />
        </CommandShortcut>
      ),
      onSelect: () =>
        run(() => window.open(site.repoUrl, "_blank", "noopener,noreferrer")),
    },
  ];

  const pinned = useMemo(() => {
    const ids = [
      ...favorites,
      ...recents.filter((r) => !favorites.includes(r)),
    ];
    return ids
      .map(getToolById)
      .filter((t): t is ToolDefinition => !!t && !t.hidden)
      .slice(0, 6);
  }, [favorites, recents]);

  const query = search.trim();
  const openSuggestion = useOpenSuggestion();
  // Smart paste: pasted data (a JWT, JSON, timestamp…) suggests tools.
  const suggestions = useMemo(
    () => (query.length >= 6 ? detectContent(search) : []),
    [query, search],
  );

  // Search results: one list, best match first. Ties keep tools before
  // in-tool features before actions (sort is stable).
  const results = query
    ? [
        ...visibleTools.map((t) => toolEntry(t, "tool")),
        ...featureEntries,
        ...actions,
      ]
        .map((entry) => ({ entry, score: paletteScore(entry.terms, query) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.entry)
    : [];

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search tools"
      description="Jump to a tool or run a command"
      className="sm:max-w-3xl"
    >
      {/* We rank results ourselves (paletteScore), so cmdk must not filter or reorder. */}
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search tools, e.g. “base64”, “uuid”, “cron”…"
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[min(60vh,420px)]">
          {suggestions.length > 0 ? (
            <CommandGroup heading="Open with">
              {suggestions.map((sug, i) => {
                const tool = getToolById(sug.toolId);
                if (!tool) return null;
                return (
                  <Row
                    key={`${sug.toolId}:${sug.tab ?? ""}:${i}`}
                    entry={{
                      key: `suggest:${i}`,
                      icon: tool.icon,
                      label: sug.action,
                      detail: `${sug.kind} · ${tool.name}`,
                      terms: [],
                      onSelect: () => run(() => openSuggestion(sug)),
                    }}
                  />
                );
              })}
            </CommandGroup>
          ) : query ? (
            results.length > 0 ? (
              <CommandGroup heading="Results">
                {results.map((entry) => (
                  <Row key={entry.key} entry={entry} />
                ))}
              </CommandGroup>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No tools match “{query}”.
              </div>
            )
          ) : (
            <>
              {pinned.length > 0 && (
                <CommandGroup heading="Favorites & recent">
                  {pinned.map((tool) => (
                    <Row key={tool.id} entry={toolEntry(tool, "pinned")} />
                  ))}
                </CommandGroup>
              )}
              {categories.map((category) => {
                const list = visibleTools.filter(
                  (t) => t.category === category.id,
                );
                if (list.length === 0) return null;
                return (
                  <CommandGroup key={category.id} heading={category.label}>
                    {list.map((tool) => (
                      <Row key={tool.id} entry={toolEntry(tool, "tool")} />
                    ))}
                  </CommandGroup>
                );
              })}
              <CommandSeparator />
              <CommandGroup heading="General">
                {actions.map((entry) => (
                  <Row key={entry.key} entry={entry} />
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
