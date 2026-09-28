import { api } from "@/convex/_generated/api";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/use-auth";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  PackagePlus,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";

export default function Settings() {
  return (
    <AppLayout>
      <SettingsContent />
    </AppLayout>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const orgState = useQuery(api.orgs.getMyOrg);
  const members = useQuery(api.orgs.listMembers) ?? [];
  const locations = useQuery(api.locations.list) ?? [];
  const role = orgState?.membership?.role ?? "staff";

  const updateOrg = useMutation(api.orgs.updateOrg);
  const addLocation = useMutation(api.locations.create);
  const removeLocation = useMutation(api.locations.remove);
  const seed = useMutation(api.orgs.loadDemoData);

  const [name, setName] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [locName, setLocName] = useState("");
  const [locType, setLocType] = useState("ambient");
  const [busy, setBusy] = useState(false);

  const dirtyName = name !== null && name !== orgState?.org?.name;
  const dirtyCurrency = currency !== null && currency !== orgState?.org?.currency;

  const saveOrg = async () => {
    setBusy(true);
    try {
      await updateOrg({
        name: dirtyName ? name! : undefined,
        currency: dirtyCurrency ? currency! : undefined,
      });
      toast.success("Organization updated");
      setName(null);
      setCurrency(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Organization, locations and team
        </p>
      </div>

      <Tabs defaultValue="org">
        <TabsList>
          <TabsTrigger value="org">Organization</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* ── Org ── */}
        <TabsContent value="org" className="mt-4 space-y-4">
          <Card className="card-soft rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Building2 className="size-4 text-primary" />
                Organization profile
              </CardTitle>
              <CardDescription>
                Currency is display-only; costs are stored in minor units.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="org-name">Business name</Label>
                  <Input
                    id="org-name"
                    value={name ?? orgState?.org?.name ?? ""}
                    onChange={(e) => setName(e.target.value)}
                    disabled={role === "staff"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select
                    value={currency ?? orgState?.org?.currency ?? "USD"}
                    onValueChange={setCurrency}
                    disabled={role === "staff"}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["USD", "EUR", "GBP", "CAD", "AUD", "AED", "SGD"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(dirtyName || dirtyCurrency) && (
                <div className="flex justify-end">
                  <Button onClick={saveOrg} disabled={busy}>
                    Save changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-soft rounded-2xl">
            <CardHeader>
              <CardTitle className="font-display text-base">Demo data</CardTitle>
              <CardDescription>
                Load a realistic café inventory to explore alerts and analytics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="gap-2"
                disabled={busy || Boolean(orgState?.org?.seeded)}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await seed({});
                    toast.success("Demo data loaded");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to load demo data");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <PackagePlus className="size-4" />
                {orgState?.org?.seeded ? "Demo data loaded" : "Load demo data"}
              </Button>
            </CardContent>
          </Card>

          <Card className="card-soft rounded-2xl">
            <CardHeader>
              <CardTitle className="font-display text-base">Your profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{user?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{user?.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Your role</p>
                <Badge variant="secondary" className="capitalize">{role}</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Locations ── */}
        <TabsContent value="locations" className="mt-4 space-y-4">
          <Card className="card-soft rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <MapPin className="size-4 text-primary" />
                Storage locations
              </CardTitle>
              <CardDescription>
                Walk-ins, dry stores, freezers — where batches live.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {role !== "staff" && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    placeholder="e.g. Bar walk-in"
                    className="sm:max-w-xs"
                  />
                  <Select value={locType} onValueChange={setLocType}>
                    <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambient">Ambient</SelectItem>
                      <SelectItem value="chilled">Chilled</SelectItem>
                      <SelectItem value="frozen">Frozen</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    className="gap-2"
                    disabled={!locName.trim() || busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await addLocation({
                          name: locName.trim(),
                          type: locType as "ambient",
                        });
                        toast.success("Location added");
                        setLocName("");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
              )}
              <div className="divide-y divide-border/60 rounded-xl border border-border">
                {locations.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    No locations yet — add your first storage area above.
                  </p>
                ) : (
                  locations.map((l) => (
                    <div key={l._id} className="flex items-center gap-3 px-4 py-3">
                      <MapPin className="size-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{l.name}</p>
                        <p className="text-xs capitalize text-muted-foreground">{l.type}</p>
                      </div>
                      {role !== "staff" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            if (!confirm(`Archive "${l.name}"? Existing batch history is kept.`)) return;
                            try {
                              await removeLocation({ locationId: l._id });
                              toast.success("Location archived");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Failed");
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Team ── */}
        <TabsContent value="team" className="mt-4">
          <Card className="card-soft rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Users className="size-4 text-primary" />
                Team
              </CardTitle>
              <CardDescription>
                People with access to this organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border/60 rounded-xl border border-border">
                {members.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Loading team…
                  </p>
                ) : (
                  members.map((m) => (
                    <div key={m._id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {(m.userName ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.userName ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{m.userEmail ?? ""}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {m.role}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Inviting teammates by email is planned for the next release —
                roles and the membership model are already in place.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
