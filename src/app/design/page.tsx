import { NotebookIcon } from "@/components/NotebookIcon";
import {
  buildCharmEntries,
  buildCoverEntries,
  NOTEBOOKS_PER_JOURNAL,
  resolveFrontImage,
  resolveSideImage,
  resolveVariant,
} from "@/lib/catalog";
import { decodeDesign } from "@/lib/design-link";
import { formatIDR } from "@/lib/pricing";
import { fetchCharmProduct, fetchJournalProducts } from "@/lib/shopify-admin";

export const metadata = {
  title: "Your Sanaya Journal Design",
  robots: { index: false, follow: false },
};

interface DesignPageProps {
  searchParams: Promise<{ d?: string }>;
}

export default async function DesignPage({ searchParams }: DesignPageProps) {
  const { d } = await searchParams;
  const selection = d ? decodeDesign(d) : null;

  const [products, charmProduct] = await Promise.all([fetchJournalProducts(), fetchCharmProduct()]);

  if (!selection || !charmProduct) {
    return (
      <main className="flex min-h-[600px] items-center justify-center bg-[#0f3d34] p-8 text-center text-white">
        <p>This design link is invalid or has expired.</p>
      </main>
    );
  }

  const product = products.find((p) => p.handle === selection.cover);
  if (!product) {
    return (
      <main className="flex min-h-[600px] items-center justify-center bg-[#0f3d34] p-8 text-center text-white">
        <p>This design link is invalid or has expired.</p>
      </main>
    );
  }

  const cover = buildCoverEntries(products).find((c) => c.handle === product.handle);
  const variant = resolveVariant(product, selection);
  const charmEntries = buildCharmEntries(charmProduct);
  const frontImage = resolveFrontImage(product, variant, selection);
  const backImage = resolveSideImage(product, "back", selection);
  const sideImage = resolveSideImage(product, "side", selection);
  const frontCharms = selection.charms.filter((c) => c.side === "front");
  const backCharms = selection.charms.filter((c) => c.side === "back");
  const sideCharms = selection.charms.filter((c) => c.side === "side");

  const notebookSlots: (string | null)[] = [
    ...Object.entries(selection.notebooks).flatMap(([design, count]) => Array(count).fill(design)),
  ];
  while (notebookSlots.length < NOTEBOOKS_PER_JOURNAL) notebookSlots.push(null);

  const rows = [
    { label: "Cover", value: cover?.label ?? product.title },
    { label: "Cord", value: selection.cord !== "none" ? selection.cord : "None" },
    { label: "Patch", value: selection.patch === "none" ? "None" : selection.patch.charAt(0).toUpperCase() + selection.patch.slice(1) },
    {
      label: "Pen holder",
      value: selection.penHolder === "none" ? "None" : selection.penHolder === "black" ? "Black" : "Brown",
    },
    { label: "Corner edge", value: selection.edge && selection.penHolder !== "none" ? "Yes" : "No" },
    {
      label: "Notebooks",
      value:
        Object.keys(selection.notebooks).length === 0
          ? "None chosen"
          : Object.entries(selection.notebooks)
              .map(([design, count]) => `${count}× ${design}`)
              .join(", "),
    },
    { label: "SKU", value: variant.sku },
  ];

  return (
    <main className="min-h-[600px] bg-[#0f3d34] p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden">
        <header className="border-b border-[#eae7de] px-6 sm:px-10 py-6">
          <span className="text-xl tracking-[0.2em] font-serif text-[#b1632f]">SANAYA</span>
          <h1 className="mt-3 text-3xl font-serif text-[#1c1c1a]">Your custom journal design</h1>
          <p className="mt-1 text-[#6b6a63]">This is exactly what was designed — front, back, side, and what ships inside.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-6 sm:px-10 py-8">
          {/* visuals */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-full max-w-[280px] aspect-[560/660]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frontImage} alt="Front of journal" className="h-full w-full object-contain drop-shadow-xl" />
              {frontCharms.map((c) => (
                <img
                  key={c.instanceId}
                  src={charmEntries.find((e) => e.variantId === c.variantId)?.imageUrl}
                  alt={c.design}
                  className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-md"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                />
              ))}
            </div>

            <div className="flex items-start gap-6">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-[#a89a80]">Back</span>
                <div className="relative w-[100px] aspect-[560/660] rounded-lg overflow-hidden shadow-md">
                  {backImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={backImage} alt="Back of journal" className="h-full w-full object-contain" />
                  )}
                  {backCharms.map((c) => (
                    <img
                      key={c.instanceId}
                      src={charmEntries.find((e) => e.variantId === c.variantId)?.imageUrl}
                      alt={c.design}
                      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow"
                      style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-[#a89a80]">Side</span>
                <div className="relative w-[52px] aspect-[200/660] rounded-lg overflow-hidden shadow-md">
                  {sideImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sideImage} alt="Side of journal" className="h-full w-full object-contain" />
                  )}
                  {sideCharms.map((c) => (
                    <img
                      key={c.instanceId}
                      src={charmEntries.find((e) => e.variantId === c.variantId)?.imageUrl}
                      alt={c.design}
                      className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow"
                      style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full max-w-[320px]">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[#a89a80]">Inside</span>
              <div className="mt-2 grid grid-cols-3 items-start gap-4 rounded-lg bg-[#efeae0] p-4">
                {notebookSlots.map((design, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="relative h-36 w-full">
                      {design ? (
                        <>
                          <div className="absolute inset-x-1.5 top-1.5 h-full rounded-md bg-[#e7e1d3]" />
                          <div className="absolute inset-x-[3px] top-[3px] h-full rounded-md bg-[#f2ede2]" />
                          <div className="relative h-full w-full">
                            <NotebookIcon design={design} size="lg" />
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-[#c8c2b3] text-center text-[9px] text-[#a89a80]">
                          —
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-[#6b6a63]">
                      {design ? design.replace(" Notebook", "") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* details */}
          <div>
            <dl className="divide-y divide-[#eae7de] rounded-xl bg-[#f7f5f0] px-6">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between py-4">
                  <dt className="text-sm text-[#6b6a63]">{r.label}</dt>
                  <dd className="text-sm font-medium text-[#1c1c1a] text-right">{r.value}</dd>
                </div>
              ))}
            </dl>

            {selection.charms.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-medium text-[#1c1c1a]">Charms</h2>
                <ul className="mt-2 space-y-2">
                  {selection.charms.map((c) => {
                    const entry = charmEntries.find((e) => e.variantId === c.variantId);
                    return (
                      <li key={c.instanceId} className="flex items-center gap-3 text-sm text-[#6b6a63]">
                        {entry && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.imageUrl} alt="" className="h-6 w-6 object-contain" />
                        )}
                        <span>
                          {c.design} — {c.side.charAt(0).toUpperCase() + c.side.slice(1)}
                          {entry ? ` (${formatIDR(entry.price)})` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
