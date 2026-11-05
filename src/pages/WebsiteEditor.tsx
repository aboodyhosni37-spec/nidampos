import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Globe, Image as ImageIcon, Loader2, Plus, RotateCcw, Save, Send, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_SITE_CONTENT,
  HOME_SECTION_LABELS,
  clearDraft,
  loadDraft,
  saveDraft,
  fetchSiteContent,
  saveSiteContent,
  uploadSiteImage,
  type Highlight,
  type LinkItem,
  type GalleryImage,
  type HoursRow,
  type HomeSection,
  type SiteContent,
} from "@/lib/siteContent";

type Section = keyof SiteContent;

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </Label>
    {multiline ? (
      <Textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl"
      />
    ) : (
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl h-11"
      />
    )}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const ImageField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const pick = async (file?: File | null) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const url = await uploadSiteImage(file);
      onChange(url);
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const shown = preview || value;

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-start gap-3">
        <div className="h-24 w-32 shrink-0 rounded-xl border border-border bg-secondary overflow-hidden flex items-center justify-center">
          {shown ? (
            <img src={shown} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <Input
            value={value}
            placeholder="Image link (or upload a file)"
            onChange={(e) => {
              setPreview(null);
              onChange(e.target.value);
            }}
            className="rounded-xl h-11"
          />
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-muted-foreground"
                onClick={() => {
                  setPreview(null);
                  onChange("");
                }}
              >
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ListEditor = ({
  label,
  items,
  onChange,
  max = 6,
}: {
  label: string;
  items: Highlight[];
  onChange: (v: Highlight[]) => void;
  max?: number;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {items.length < max && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => onChange([...items, { title: "", text: "" }])}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      )}
    </div>
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-border p-3 space-y-2 bg-secondary/30">
          <div className="flex gap-2">
            <Input
              value={it.title}
              placeholder="Title"
              className="rounded-lg h-10"
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...it, title: e.target.value };
                onChange(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={it.text}
            rows={2}
            placeholder="Short description"
            className="rounded-lg"
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...it, text: e.target.value };
              onChange(next);
            }}
          />
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing added yet.</p>
      )}
    </div>
  </div>
);

const Row = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
    <div>
      <div className="font-semibold text-sm">{title}</div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
    {children}
  </div>
);

const move = <T,>(list: T[], i: number, d: number): T[] => {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

const MoveButtons = ({ i, n, onMove }: { i: number; n: number; onMove: (d: number) => void }) => (
  <div className="flex shrink-0">
    <Button type="button" variant="ghost" size="icon" disabled={i === 0} aria-label="Move up" onClick={() => onMove(-1)}><ArrowUp className="h-4 w-4" /></Button>
    <Button type="button" variant="ghost" size="icon" disabled={i === n - 1} aria-label="Move down" onClick={() => onMove(1)}><ArrowDown className="h-4 w-4" /></Button>
  </div>
);

const SectionOrder = ({ items, onChange }: { items: HomeSection[]; onChange: (v: HomeSection[]) => void }) => (
  <div className="space-y-2">
    {items.map((it, i) => (
      <div key={it.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
        <span className="w-6 text-center text-sm text-muted-foreground tabular-nums">{i + 1}</span>
        <span className="flex-1 font-medium text-sm">{HOME_SECTION_LABELS[it.id]}</span>
        <span className="text-xs text-muted-foreground">{it.visible ? "Shown" : "Hidden"}</span>
        <Switch checked={it.visible} aria-label={`Show ${HOME_SECTION_LABELS[it.id]}`} onCheckedChange={(v) => onChange(items.map((x, k) => (k === i ? { ...x, visible: v } : x)))} />
        <MoveButtons i={i} n={items.length} onMove={(d) => onChange(move(items, i, d))} />
      </div>
    ))}
  </div>
);

const LinkListEditor = ({ items, onChange }: { items: LinkItem[]; onChange: (v: LinkItem[]) => void }) => (
  <div className="space-y-2">
    {items.map((it, i) => {
      const upd = (patch: Partial<LinkItem>) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x)));
      return (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
          <Input value={it.label} placeholder="Label" className="h-10 rounded-lg flex-1 min-w-32" onChange={(e) => upd({ label: e.target.value })} />
          <Input value={it.href} placeholder="/menu or https://…" className="h-10 rounded-lg flex-1 min-w-32" onChange={(e) => upd({ href: e.target.value })} />
          <Switch checked={it.visible} aria-label="Show link" onCheckedChange={(v) => upd({ visible: v })} />
          <MoveButtons i={i} n={items.length} onMove={(d) => onChange(move(items, i, d))} />
          <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label="Remove link" onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      );
    })}
    {items.length < 8 && (
      <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => onChange([...items, { label: "", href: "/", visible: true }])}>
        <Plus className="h-4 w-4" /> Add link
      </Button>
    )}
  </div>
);

const HoursEditor = ({ items, onChange }: { items: HoursRow[]; onChange: (v: HoursRow[]) => void }) => (
  <div className="space-y-2">
    {items.map((it, i) => (
      <div key={i} className="flex items-center gap-2">
        <Input value={it.label} placeholder="Days (e.g. Friday)" className="h-10 rounded-lg" onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
        <Input value={it.value} placeholder="Hours (e.g. 2:00 PM – 11:00 PM)" className="h-10 rounded-lg" onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))} />
        <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" aria-label="Remove hours" onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>
      </div>
    ))}
    {items.length < 7 && (
      <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => onChange([...items, { label: "", value: "" }])}>
        <Plus className="h-4 w-4" /> Add opening hours row
      </Button>
    )}
  </div>
);

const GalleryEditor = ({ items, onChange }: { items: GalleryImage[]; onChange: (v: GalleryImage[]) => void }) => (
  <div className="space-y-3">
    {items.map((it, i) => (
      <div key={i} className="rounded-xl border border-border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Photo {i + 1}</span>
          <div className="flex">
            <MoveButtons i={i} n={items.length} onMove={(d) => onChange(move(items, i, d))} />
            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label="Remove photo" onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <ImageField label="Image" value={it.url} onChange={(v) => onChange(items.map((x, k) => (k === i ? { ...x, url: v } : x)))} />
        <Input value={it.caption} placeholder="Caption (optional)" className="h-10 rounded-lg" onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)))} />
      </div>
    ))}
    {items.length < 12 && (
      <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => onChange([...items, { url: "", caption: "" }])}>
        <Plus className="h-4 w-4" /> Add photo
      </Button>
    )}
  </div>
);

const WebsiteEditor = () => {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [saving, setSaving] = useState(false);

  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => {
    const draft = loadDraft();
    if (draft) { setContent(draft); setHasDraft(true); return; }
    fetchSiteContent()
      .then(setContent)
      .catch(() => setContent(structuredClone(DEFAULT_SITE_CONTENT)));
  }, []);

  const saveLocal = () => {
    if (!content) return;
    saveDraft(content);
    setHasDraft(true);
    toast({ title: "Draft saved", description: "Not live yet — use Preview to check it, then Publish." });
  };
  const preview = () => {
    if (!content) return;
    saveDraft(content);
    setHasDraft(true);
    window.open("/?preview=1", "_blank", "noopener");
  };
  const discard = async () => {
    clearDraft();
    setHasDraft(false);
    setContent(await fetchSiteContent().catch(() => structuredClone(DEFAULT_SITE_CONTENT)));
    toast({ title: "Draft discarded" });
  };

  const set = <S extends Section, K extends keyof SiteContent[S]>(
    section: S,
    key: K,
    value: SiteContent[S][K]
  ) => {
    setContent((c) => (c ? { ...c, [section]: { ...c[section], [key]: value } } : c));
  };

  const save = async () => {
    if (!content) return;
    setSaving(true);
    try {
      await saveSiteContent(content);
      clearDraft();
      setHasDraft(false);
      toast({
        title: "Website updated",
        description: "Your changes are now live on the customer website.",
      });
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!content) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-20 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading website content…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Globe className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Website Management</h1>
            <p className="text-sm text-muted-foreground">
              Edit every part of the customer website. Save a draft, preview it, then Publish
              to make it live. Products and prices stay in Inventory.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasDraft && (
            <Button variant="ghost" className="rounded-xl" onClick={discard}>Discard draft</Button>
          )}
          <Button variant="outline" className="rounded-xl" onClick={saveLocal}>
            <Save className="h-4 w-4" /> Save draft
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={preview}>
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setContent(structuredClone(DEFAULT_SITE_CONTENT))}
          >
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Button>
          <Button onClick={save} disabled={saving} className="rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publish
          </Button>
        </div>
      </div>

      <Tabs defaultValue="layout">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="layout">Sections & Style</TabsTrigger>
          <TabsTrigger value="brand">Branding & Contact</TabsTrigger>
          <TabsTrigger value="nav">Navigation & Footer</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="home">Homepage</TabsTrigger>
          <TabsTrigger value="about">About page</TabsTrigger>
          <TabsTrigger value="menu">Menu page</TabsTrigger>
          <TabsTrigger value="contact">Contact page</TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="space-y-4 pt-4">
          <Card className="p-6 rounded-2xl space-y-5">
            <div>
              <h2 className="font-bold">Homepage sections</h2>
              <p className="text-xs text-muted-foreground">Show or hide each section and change the order they appear in.</p>
            </div>
            <SectionOrder items={content.layout.home_sections} onChange={(v) => set("layout", "home_sections", v)} />
          </Card>
          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Colors & backgrounds</h2>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Banner photo darkness ({content.theme.hero_shade}%)
              </Label>
              <input type="range" min={0} max={100} step={5} value={content.theme.hero_shade} className="w-full accent-foreground" onChange={(e) => set("theme", "hero_shade", Number(e.target.value))} />
              <p className="text-[11px] text-muted-foreground">Darker keeps the white banner text easy to read.</p>
            </div>
            <Row title="Light grey section backgrounds" hint="Alternate homepage sections get a soft grey background.">
              <Switch checked={content.theme.alt_backgrounds} onCheckedChange={(v) => set("theme", "alt_backgrounds", v)} />
            </Row>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Small label color</Label>
              <div className="flex flex-wrap gap-2">
                {([["none", "Grey (default)"], ["gold", "Gold"], ["orange", "Orange"]] as const).map(([k, l]) => (
                  <Button key={k} type="button" variant={content.theme.accent === k ? "default" : "outline"} size="sm" className="rounded-xl" onClick={() => set("theme", "accent", k)}>{l}</Button>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="nav" className="space-y-4 pt-4">
          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Top menu links</h2>
            <LinkListEditor items={content.nav.links} onChange={(v) => set("nav", "links", v)} />
            <Field label="Order button label" value={content.nav.order_button_label} onChange={(v) => set("nav", "order_button_label", v)} />
          </Card>
          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Footer</h2>
            <Field label="Footer text" multiline rows={2} value={content.home.footer_text} onChange={(v) => set("home", "footer_text", v)} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Links column title" value={content.footer.explore_title} onChange={(v) => set("footer", "explore_title", v)} />
              <Field label="Contact column title" value={content.footer.visit_title} onChange={(v) => set("footer", "visit_title", v)} />
              <Field label="Hours column title" value={content.footer.hours_title} onChange={(v) => set("footer", "hours_title", v)} />
            </div>
            <Field label="Copyright line" value={content.footer.copyright} onChange={(v) => set("footer", "copyright", v)} hint="Leave empty to show © year and business name automatically." />
            <Row title="Show order link in footer"><Switch checked={content.footer.show_order_link} onCheckedChange={(v) => set("footer", "show_order_link", v)} /></Row>
            <Row title="Show Staff login link"><Switch checked={content.nav.show_staff_login} onCheckedChange={(v) => set("nav", "show_staff_login", v)} /></Row>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4 pt-4">
          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Gallery (homepage)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Small label" value={content.gallery.eyebrow} onChange={(v) => set("gallery", "eyebrow", v)} />
              <Field label="Section title" value={content.gallery.title} onChange={(v) => set("gallery", "title", v)} />
            </div>
            <GalleryEditor items={content.gallery.images} onChange={(v) => set("gallery", "images", v)} />
            <p className="text-xs text-muted-foreground">The gallery only appears once at least one photo is added.</p>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="space-y-4 pt-4">
          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Branding</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Business name"
                value={content.brand.name}
                onChange={(v) => set("brand", "name", v)}
              />
              <Field
                label="Short tagline under the name"
                value={content.brand.tagline}
                onChange={(v) => set("brand", "tagline", v)}
              />
            </div>
            <ImageField
              label="Logo"
              value={content.brand.logo_url}
              onChange={(v) => set("brand", "logo_url", v)}
            />
            <ImageField
              label="Favicon (browser tab icon)"
              value={content.brand.favicon_url}
              onChange={(v) => set("brand", "favicon_url", v)}
            />
          </Card>

          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Contact details & opening hours</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Phone"
                value={content.contact.phone}
                onChange={(v) => set("contact", "phone", v)}
              />
              <Field
                label="Email"
                value={content.contact.email}
                onChange={(v) => set("contact", "email", v)}
              />
              <Field
                label="Address / location"
                value={content.contact.address}
                onChange={(v) => set("contact", "address", v)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Days"
                  value={content.contact.hours_label}
                  onChange={(v) => set("contact", "hours_label", v)}
                />
                <Field
                  label="Hours"
                  value={content.contact.hours_value}
                  onChange={(v) => set("contact", "hours_value", v)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">More opening hours</Label>
              <HoursEditor items={content.contact.extra_hours} onChange={(v) => set("contact", "extra_hours", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="TikTok link" value={content.contact.tiktok} onChange={(v) => set("contact", "tiktok", v)} />
              <Field
                label="Facebook link"
                value={content.contact.facebook}
                onChange={(v) => set("contact", "facebook", v)}
              />
              <Field
                label="Instagram link"
                value={content.contact.instagram}
                onChange={(v) => set("contact", "instagram", v)}
              />
              <Field
                label="WhatsApp link"
                value={content.contact.whatsapp}
                onChange={(v) => set("contact", "whatsapp", v)}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="home" className="space-y-4 pt-4">
          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Hero section</h2>
            <ImageField
              label="Banner image"
              value={content.home.hero_custom_image}
              onChange={(v) => set("home", "hero_custom_image", v)}
            />
            <p className="text-[11px] text-muted-foreground -mt-3">Leave empty to use a photo from your menu automatically.</p>
            <Field
              hint="Leave empty to show the tagline and address."
              label="Small badge text"
              value={content.home.hero_badge}
              onChange={(v) => set("home", "hero_badge", v)}
            />
            <Field
              label="Hero title"
              value={content.home.hero_title}
              onChange={(v) => set("home", "hero_title", v)}
            />
            <Field
              label="Hero subtitle"
              multiline
              rows={2}
              value={content.home.hero_subtitle}
              onChange={(v) => set("home", "hero_subtitle", v)}
            />
            <Field
              label="Hero description"
              multiline
              rows={3}
              value={content.home.hero_description}
              onChange={(v) => set("home", "hero_description", v)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Main button label"
                value={content.home.primary_cta_label}
                onChange={(v) => set("home", "primary_cta_label", v)}
              />
              <Field
                label="Main button link"
                value={content.home.primary_cta_href}
                onChange={(v) => set("home", "primary_cta_href", v)}
                hint="For example /menu or /order"
              />
              <Field
                label="Second button label"
                value={content.home.secondary_cta_label}
                onChange={(v) => set("home", "secondary_cta_label", v)}
              />
              <Field
                label="Second button link"
                value={content.home.secondary_cta_href}
                onChange={(v) => set("home", "secondary_cta_href", v)}
              />
            </div>
          </Card>

          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Business highlights</h2>
            <ListEditor
              label="Highlights (shown under the hero)"
              items={content.home.highlights}
              onChange={(v) => set("home", "highlights", v)}
              max={3}
            />
          </Card>

          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Menu categories section</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Small label" value={content.home.categories_eyebrow} onChange={(v) => set("home", "categories_eyebrow", v)} />
              <Field label="Section title" value={content.home.categories_title} onChange={(v) => set("home", "categories_title", v)} />
              <Field label="Link label" value={content.home.categories_link_label} onChange={(v) => set("home", "categories_link_label", v)} />
            </div>
          </Card>

          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Featured products section</h2>
            <Field label="Link label" value={content.home.featured_link_label} onChange={(v) => set("home", "featured_link_label", v)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Small label"
                value={content.home.featured_eyebrow}
                onChange={(v) => set("home", "featured_eyebrow", v)}
              />
              <Field
                label="Section title"
                value={content.home.featured_title}
                onChange={(v) => set("home", "featured_title", v)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The products shown here come from your existing product list in Inventory.
            </p>
          </Card>

          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Somali food & drinks sections</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Somali food — small label" value={content.home.traditional_eyebrow} onChange={(v) => set("home", "traditional_eyebrow", v)} />
              <Field label="Somali food — title" value={content.home.traditional_title} onChange={(v) => set("home", "traditional_title", v)} />
              <Field label="Coffee & beverages — title" value={content.home.drinks_title} onChange={(v) => set("home", "drinks_title", v)} />
            </div>
            <p className="text-xs text-muted-foreground">Products come from matching categories in Inventory.</p>
          </Card>

          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">About section on the homepage</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Small label"
                value={content.home.about_eyebrow}
                onChange={(v) => set("home", "about_eyebrow", v)}
              />
              <Field
                label="Title"
                value={content.home.about_title}
                onChange={(v) => set("home", "about_title", v)}
              />
            </div>
            <Field
              label="Text"
              multiline
              rows={5}
              value={content.home.about_text}
              onChange={(v) => set("home", "about_text", v)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Button label" value={content.home.about_button_label} onChange={(v) => set("home", "about_button_label", v)} />
              <Field label="Button link" value={content.home.about_button_href} onChange={(v) => set("home", "about_button_href", v)} />
            </div>
            <ImageField
              label="Image"
              value={content.home.about_image}
              onChange={(v) => set("home", "about_image", v)}
            />
          </Card>

          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Visit us banner</h2>
            <Field label="Title" value={content.home.visit_title} onChange={(v) => set("home", "visit_title", v)} hint="Leave empty to show “Visit” and the business name." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Order button label" value={content.home.visit_order_label} onChange={(v) => set("home", "visit_order_label", v)} />
              <Field label="Call button label" value={content.home.visit_contact_label} onChange={(v) => set("home", "visit_contact_label", v)} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="space-y-4 pt-4">
          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">About page</h2>
            <Field label="Small label" value={content.about.eyebrow} onChange={(v) => set("about", "eyebrow", v)} />
            <ImageField
              label="Top image"
              value={content.about.hero_image}
              onChange={(v) => set("about", "hero_image", v)}
            />
            <Field
              label="Page title"
              value={content.about.title}
              onChange={(v) => set("about", "title", v)}
            />
            <Field
              label="Intro text"
              multiline
              rows={3}
              value={content.about.intro}
              onChange={(v) => set("about", "intro", v)}
            />
            <Field
              label="Story title"
              value={content.about.story_title}
              onChange={(v) => set("about", "story_title", v)}
            />
            <Field
              label="Story paragraph 1"
              multiline
              rows={4}
              value={content.about.story_text}
              onChange={(v) => set("about", "story_text", v)}
            />
            <Field
              label="Story paragraph 2"
              multiline
              rows={4}
              value={content.about.story_text_2}
              onChange={(v) => set("about", "story_text_2", v)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Button label" value={content.about.button_label} onChange={(v) => set("about", "button_label", v)} />
              <Field label="Button link" value={content.about.button_href} onChange={(v) => set("about", "button_href", v)} />
            </div>
            <ImageField
              label="Story image"
              value={content.about.image}
              onChange={(v) => set("about", "image", v)}
            />
            <Field
              label="Values section title"
              value={content.about.values_title}
              onChange={(v) => set("about", "values_title", v)}
            />
            <ListEditor
              label="Values"
              items={content.about.values}
              onChange={(v) => set("about", "values", v)}
              max={4}
            />
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="space-y-4 pt-4">
          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Menu page</h2>
            <Field
              label="Small label"
              value={content.menu.eyebrow}
              onChange={(v) => set("menu", "eyebrow", v)}
            />
            <Field
              label="Page title"
              value={content.menu.title}
              onChange={(v) => set("menu", "title", v)}
            />
            <Field
              label="Description"
              multiline
              rows={3}
              value={content.menu.description}
              onChange={(v) => set("menu", "description", v)}
            />
            <Field label="Search box text" value={content.menu.search_placeholder} onChange={(v) => set("menu", "search_placeholder", v)} />
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="font-semibold text-sm">Show product photos</div>
                <p className="text-xs text-muted-foreground">
                  Photos come from your existing product list.
                </p>
              </div>
              <Switch
                checked={content.menu.show_images}
                onCheckedChange={(v) => set("menu", "show_images", v)}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="font-semibold text-sm">Show category filters</div>
                <p className="text-xs text-muted-foreground">
                  Lets customers filter the menu by category.
                </p>
              </div>
              <Switch
                checked={content.menu.show_categories}
                onCheckedChange={(v) => set("menu", "show_categories", v)}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4 pt-4">
          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Contact page</h2>
            <Field label="Small label" value={content.contact_page.eyebrow} onChange={(v) => set("contact_page", "eyebrow", v)} />
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Visit card title" value={content.contact_page.visit_title} onChange={(v) => set("contact_page", "visit_title", v)} />
              <Field label="Call card title" value={content.contact_page.call_title} onChange={(v) => set("contact_page", "call_title", v)} />
              <Field label="Email card title" value={content.contact_page.email_title} onChange={(v) => set("contact_page", "email_title", v)} />
              <Field label="Hours box title" value={content.contact_page.hours_title} onChange={(v) => set("contact_page", "hours_title", v)} />
            </div>
            <Field
              label="Page title"
              value={content.contact_page.title}
              onChange={(v) => set("contact_page", "title", v)}
            />
            <Field
              label="Description"
              multiline
              rows={3}
              value={content.contact_page.description}
              onChange={(v) => set("contact_page", "description", v)}
            />
            <ImageField
              label="Contact image (optional)"
              value={content.contact_page.image}
              onChange={(v) => set("contact_page", "image", v)}
            />
            <Field
              label="Order box title"
              value={content.contact_page.cta_title}
              onChange={(v) => set("contact_page", "cta_title", v)}
            />
            <Field
              label="Order box text"
              multiline
              rows={3}
              value={content.contact_page.cta_text}
              onChange={(v) => set("contact_page", "cta_text", v)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Order box button label" value={content.contact_page.cta_button_label} onChange={(v) => set("contact_page", "cta_button_label", v)} />
              <Field label="Order box button link" value={content.contact_page.cta_button_href} onChange={(v) => set("contact_page", "cta_button_href", v)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Phone, email, address and opening hours are edited in Branding & Contact.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebsiteEditor;
