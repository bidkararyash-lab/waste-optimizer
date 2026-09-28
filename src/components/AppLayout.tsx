import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Bell,
  LayoutDashboard,
  Leaf,
  Loader2,
  LogOut,
  Package,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import type { ReactNode } from "react";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/inventory", label: "Inventory", icon: Package },
  { to: "/app/waste", label: "Waste log", icon: Trash2 },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const orgState = useQuery(api.orgs.getMyOrg);
  const unread = useQuery(api.alerts.unreadCount) ?? 0;

  const initial = (user?.name || user?.email || "?").slice(0, 1).toUpperCase();

  const sidebar = (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <Leaf className="size-6 text-primary" />
        <span className="font-display text-base font-bold tracking-tight">
          WASTE<span className="text-primary">MIZE</span>
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`
            }
          >
            <item.icon className="size-4" />
            {item.label}
            {item.label === "Alerts" && unread > 0 && (
              <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border/60 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user?.name ?? "Team member"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {orgState?.org?.name ?? "No organization"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start gap-2 text-muted-foreground"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile nav + alert bell) */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/85 px-4 backdrop-blur lg:hidden">
          <Leaf className="size-5 text-primary" />
          <span className="font-display text-sm font-bold">
            WASTE<span className="text-primary">MIZE</span>
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild className="relative">
              <Link to="/app/alerts" aria-label="Alerts">
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
                )}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              aria-label="Sign out"
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border/60 bg-background/95 py-2 backdrop-blur lg:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-md px-3 py-1 text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          {orgState === undefined ? (
            <div className="space-y-4 pt-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
            ) : orgState === null || !orgState.membership ? (
            <Onboarding />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

/** Create-your-organization flow, shown before any business data exists. */
function Onboarding() {
  const { user } = useAuth();
  const createOrg = useMutation(api.orgs.createOrganization);
  const loadDemo = useMutation(api.orgs.loadDemoData);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"create" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name && !name) setName(`${user.name.split(" ")[0]}'s Kitchen`);
  }, [user?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    if (!name.trim()) return;
    setBusy("create");
    setError(null);
    try {
      await createOrg({ name: name.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const createWithDemo = async () => {
    setBusy("demo");
    setError(null);
    try {
      await createOrg({ name: name.trim() || "Demo Kitchen" });
      await loadDemo({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-lg pt-10">
      <Card className="card-soft rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <CardTitle className="font-display text-xl">
            Welcome to WASTEMIZE
          </CardTitle>
          <CardDescription>
            Create your organization to start tracking stock, expiry and waste.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="org-name" className="text-sm font-medium">
              Business name
            </label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Harbor Cafe & Bakery"
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>
          <Button className="w-full gap-2" onClick={create} disabled={!name.trim() || busy !== null}>
            {busy === "create" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create organization
          </Button>
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-2 text-xs uppercase text-muted-foreground">
                or
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={createWithDemo}
            disabled={busy !== null}
          >
            {busy === "demo" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <AlertTriangle className="size-4 text-amber-500" />
            )}
            Explore with demo data
          </Button>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            Demo data loads a realistic café inventory with live expiry
            horizons, so you can see alerts, FEFO picking and waste analytics
            right away.
          </p>
          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
