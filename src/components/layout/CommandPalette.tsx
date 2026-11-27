import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  BookOpen,
  Home,
  Monitor,
  Moon,
  ShieldCheck,
  Star,
  Sun,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
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
  visibleTools,
  type ToolDefinition,
} from "@/tools/registry";
import { useFavorites, useRecents } from "@/hooks/use-tool-prefs";
import { site } from "@/config/site";
import { GithubIcon } from "@/components/icons";
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

function ToolItem({
  tool,
  onSelect,
  prefix,
}: {
  tool: ToolDefinition;
  onSelect: () => void;
  prefix: string;
}) {
  const Icon = tool.icon;
  return (
    <CommandItem
      value={`${prefix}:${tool.id}`}
      keywords={[tool.name, tool.description, ...tool.keywords]}
      onSelect={onSelect}
    >
      <Icon />
      <span className="font-medium">{tool.name}</span>
      <span className="truncate text-muted-foreground">{tool.description}</span>
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

  const searching = search.trim().length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search tools"
      description="Jump to a tool or run a command"
      className="sm:max-w-xl"
    >
      <Command>
        <CommandInput
          placeholder="Search tools, e.g. “base64”, “uuid”, “cron”…"
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[min(60vh,420px)]">
          <CommandEmpty>No tools match “{search}”.</CommandEmpty>

          {!searching && pinned.length > 0 && (
            <CommandGroup heading="Favorites & recent">
              {pinned.map((tool) => (
                <ToolItem
                  key={tool.id}
                  tool={tool}
                  prefix="pinned"
                  onSelect={() => go(tool.path)}
                />
              ))}
            </CommandGroup>
          )}

          {categories.map((category) => {
            const list = visibleTools.filter((t) => t.category === category.id);
            if (list.length === 0) return null;
            return (
              <CommandGroup key={category.id} heading={category.label}>
                {list.map((tool) => (
                  <ToolItem
                    key={tool.id}
                    tool={tool}
                    prefix="tool"
                    onSelect={() => go(tool.path)}
                  />
                ))}
              </CommandGroup>
            );
          })}

          {searching && (
            <CommandGroup heading="Inside tools">
              {visibleTools.flatMap((tool) =>
                (tool.features ?? []).map((feature) => {
                  const Icon = tool.icon;
                  return (
                    <CommandItem
                      key={`${tool.id}:${feature.id}`}
                      value={`feature:${tool.id}:${feature.id}`}
                      keywords={[
                        feature.name,
                        ...(feature.keywords ?? []),
                        tool.name,
                      ]}
                      onSelect={() => go(tool.path)}
                    >
                      <Icon />
                      <span>{feature.name}</span>
                      <span className="text-muted-foreground">
                        in {tool.name}
                      </span>
                    </CommandItem>
                  );
                }),
              )}
            </CommandGroup>
          )}

          <CommandSeparator />
          <CommandGroup heading="General">
            <CommandItem
              value="action:home"
              keywords={["home", "all tools"]}
              onSelect={() => go("/")}
            >
              <Home /> All tools
            </CommandItem>
            <CommandItem
              value="action:theme-light"
              keywords={["theme", "light mode"]}
              onSelect={() => run(() => setTheme("light"))}
            >
              <Sun /> Light theme
            </CommandItem>
            <CommandItem
              value="action:theme-dark"
              keywords={["theme", "dark mode"]}
              onSelect={() => run(() => setTheme("dark"))}
            >
              <Moon /> Dark theme
            </CommandItem>
            <CommandItem
              value="action:theme-system"
              keywords={["theme", "system", "auto"]}
              onSelect={() => run(() => setTheme("system"))}
            >
              <Monitor /> System theme
            </CommandItem>
            <CommandItem
              value="action:privacy"
              keywords={["privacy", "data"]}
              onSelect={() => go("?modal=privacy")}
            >
              <ShieldCheck /> Privacy
            </CommandItem>
            <CommandItem
              value="action:contribute"
              keywords={["contribute", "help"]}
              onSelect={() => go("/contribute")}
            >
              <BookOpen /> Contribute
            </CommandItem>
            <CommandItem
              value="action:github"
              keywords={["github", "source", "repository", "star"]}
              onSelect={() =>
                run(() =>
                  window.open(site.repoUrl, "_blank", "noopener,noreferrer"),
                )
              }
            >
              <GithubIcon /> View source on GitHub
              <CommandShortcut>
                <Star className="size-3" />
              </CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
