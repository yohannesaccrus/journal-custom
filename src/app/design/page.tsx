import { DesignSlider } from "@/components/DesignSlider";
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
      <main className="flex min-h-screen items-center justify-center bg-[#0f3d34] p-8 text-center text-white">
        <p>This design link is invalid or has expired.</p>
      </main>
    );
  }

  const product = products.find((p) => p.handle === selection.cover);
  if (!product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f3d34] p-8 text-center text-white">
        <p>This design link is invalid or has expired.</p>
      </main>
    );
  }

  const cover = buildCoverEntries(products).find((c) => c.handle === product.handle);
  const variant = resolveVariant(product, selection);
  const charmEntries = buildCharmEntries(charmProduct);
  const frontImage = resolveFrontImage(variant);
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
    { label: "String", value: selection.cord !== "none" ? selection.cord : "None" },
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
  ];

  const views = [
    { label: "Front", image: frontImage, charms: frontCharms, charmSize: "h-10 w-10" },
    { label: "Back", image: backImage, charms: backCharms, charmSize: "h-8 w-8" },
    { label: "Side", image: sideImage, charms: sideCharms, charmSize: "h-6 w-6" },
  ];

  return (
    <main className="min-h-screen bg-[#0f3d34] p-4 sm:p-8">
      <div className="mx-auto w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
        <header className="border-b border-[#eae7de] px-6 sm:px-10 py-6">
          <span className="text-xl tracking-[0.2em] font-serif text-[#b1632f]">SANAYA</span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-serif text-[#1c1c1a]">Your custom journal design</h1>
          <p className="mt-1 text-sm text-[#6b6a63]">This is exactly what was designed — front, back, side, and what ships inside.</p>
        </header>

        <div className="grid grid-cols-1 gap-10 px-6 py-8 sm:px-10 md:grid-cols-2">
          {/* visuals */}
          <div className="flex flex-col gap-8">
            <DesignSlider views={views} charmEntries={charmEntries} patch={selection.patch} />
          </div>

          {/* details */}
          <div className="flex flex-col gap-6">
            <dl className="divide-y divide-[#eae7de] rounded-xl bg-[#f7f5f0] px-6">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between py-3.5">
                  <dt className="text-sm text-[#6b6a63]">{r.label}</dt>
                  <dd className="text-sm font-medium text-[#1c1c1a] text-right">{r.value}</dd>
                </div>
              ))}
            </dl>

            {selection.charms.length > 0 && (
              <div className="flex flex-col">
                <h2 className="text-sm font-medium text-[#1c1c1a]">Charms ({selection.charms.length})</h2>
                <ul className="design-charms-scroll mt-2 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-[#eae7de] bg-[#f7f5f0] p-3">
                  {selection.charms.map((c) => {
                    const entry = charmEntries.find((e) => e.variantId === c.variantId);
                    return (
                      <li
                        key={c.instanceId}
                        className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm text-[#6b6a63] shadow-sm"
                      >
                        {entry && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.imageUrl} alt="" className="h-6 w-6 shrink-0 object-contain" />
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

            <div>
              <h2 className="text-sm font-medium text-[#1c1c1a]">Inside</h2>
              <div className="mt-2 grid grid-cols-3 gap-3 rounded-xl border border-[#eae7de] bg-[#f7f5f0] p-4">
                {notebookSlots.map((design, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="relative h-40 w-full">
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
        </div>
      </div>
    </main>
  );
}
