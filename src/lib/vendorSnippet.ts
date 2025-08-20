// Generic, CSP-friendly snippet loader (no inline/eval).
type Options = {
  id: string;                     // your vendor/project ID
  src: string;                    // vendor script URL (use {ID} placeholder if needed)
  attrs?: Record<string, string>; // optional data-* attributes
};

export function loadVendorSnippet({ id, src, attrs }: Options) {
  if (typeof document === "undefined" || !id) return;

  // Avoid duplicate inserts
  const tagId = `vendor-snippet-${id}`;
  if (document.getElementById(tagId)) return;

  const s = document.createElement("script");
  s.id = tagId;
  s.async = true;
  s.src = src.replace("{ID}", encodeURIComponent(id));
  s.referrerPolicy = "no-referrer";

  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      s.setAttribute(`data-${k}`, v);
    }
  }
  document.head.appendChild(s);
}
