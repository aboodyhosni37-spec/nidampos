import { useEffect, useRef, useState } from "react";
import { Globe, Image as ImageIcon, Loader2, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
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
  fetchSiteContent,
  saveSiteContent,
  uploadSiteImage,
  type Highlight,
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

const WebsiteEditor = () => {
  const [content, setContent] = useState<SiteContent | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSiteContent()
      .then(setContent)
      .catch(() => setContent(structuredClone(DEFAULT_SITE_CONTENT)));
  }, []);

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
              Edit the customer website text, images and contact details. Products and
              prices stay in Inventory.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setContent(structuredClone(DEFAULT_SITE_CONTENT))}
          >
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Button>
          <Button onClick={save} disabled={saving} className="rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="brand">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="brand">Branding & Contact</TabsTrigger>
          <TabsTrigger value="home">Homepage</TabsTrigger>
          <TabsTrigger value="about">About page</TabsTrigger>
          <TabsTrigger value="menu">Menu page</TabsTrigger>
          <TabsTrigger value="contact">Contact page</TabsTrigger>
        </TabsList>

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
            <div className="grid gap-4 sm:grid-cols-3">
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
              label="Hero image"
              value={content.home.hero_image}
              onChange={(v) => set("home", "hero_image", v)}
            />
            <Field
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
            <h2 className="font-bold">Featured products section</h2>
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
            <ImageField
              label="Image"
              value={content.home.about_image}
              onChange={(v) => set("home", "about_image", v)}
            />
          </Card>

          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">Call to action & footer</h2>
            <Field
              label="Title"
              value={content.home.cta_title}
              onChange={(v) => set("home", "cta_title", v)}
            />
            <Field
              label="Text"
              multiline
              rows={3}
              value={content.home.cta_text}
              onChange={(v) => set("home", "cta_text", v)}
            />
            <Field
              label="Button label"
              value={content.home.cta_button_label}
              onChange={(v) => set("home", "cta_button_label", v)}
            />
            <Field
              label="Footer text"
              multiline
              rows={2}
              value={content.home.footer_text}
              onChange={(v) => set("home", "footer_text", v)}
            />
          </Card>
        </TabsContent>

        <TabsContent value="about" className="space-y-4 pt-4">
          <Card className="p-6 rounded-2xl space-y-5">
            <h2 className="font-bold">About page</h2>
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
