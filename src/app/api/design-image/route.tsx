import { ImageResponse } from "next/og";
import { buildCharmEntries, PATCH_POSITION, resolveFrontImage, resolveSideImage, resolveVariant } from "@/lib/catalog";
import { decodeDesign } from "@/lib/design-link";
import { fetchCharmProduct, fetchJournalProducts } from "@/lib/shopify-admin";

export const runtime = "nodejs";

const WIDTH = 480;
const HEIGHT = 566; // matches the 560/660 aspect ratio used by the interactive design slider

// Fixed marker sizes (px) per view — same values the interactive slider uses, since
// charm/patch position is stored as a percentage of the canvas, not relative to it.
const CHARM_SIZE: Record<string, number> = { front: 40, back: 32, side: 24 };

const STAR_PATH = "M12,2 L14.9,8.6 L22,9.3 L16.6,14 L18.2,21 L12,17.3 L5.8,21 L7.4,14 L2,9.3 L9.1,8.6 Z";
const HEART_PATH =
  "M12,21 C7,16.8 2.5,12.9 2.5,8.4 C2.5,4.9 5.2,2.5 8.3,2.5 C10.2,2.5 11.6,3.5 12,5.2 C12.4,3.5 13.8,2.5 15.7,2.5 C18.8,2.5 21.5,4.9 21.5,8.4 C21.5,12.9 17,16.8 12,21 Z";

function fallback(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f5f0",
          color: "#a89a80",
          fontSize: 20,
          textAlign: "center",
          padding: 32,
        }}
      >
        {message}
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}

/**
 * Renders a static PNG of one view (front/back/side) of a finished journal
 * design — cover/cord/pen-holder photo plus charm markers and the patch,
 * composited server-side. Email clients can't run the interactive slider
 * (`DesignSlider`) that does this with absolutely-positioned overlays in the
 * browser, so the order-confirmation email links here instead for its static
 * thumbnails. Fully derived from the same `d` payload as the `/design` page —
 * no order data needed beyond that one query param.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const d = searchParams.get("d");
  const view = searchParams.get("view");

  if (!d || (view !== "front" && view !== "back" && view !== "side")) {
    return fallback("Preview unavailable");
  }

  const selection = decodeDesign(d);
  if (!selection) return fallback("Preview unavailable");

  const [products, charmProduct] = await Promise.all([fetchJournalProducts(), fetchCharmProduct()]);
  const product = products.find((p) => p.handle === selection.cover);
  if (!product || !charmProduct) return fallback("Preview unavailable");

  let variant;
  try {
    variant = resolveVariant(product, selection);
  } catch {
    return fallback("Preview unavailable");
  }

  const baseImage =
    view === "front" ? resolveFrontImage(variant) : resolveSideImage(product, view, selection);
  if (!baseImage) return fallback("Preview unavailable");

  const charmEntries = buildCharmEntries(charmProduct);
  const charms = selection.charms.filter((c) => c.side === view);
  const charmSize = CHARM_SIZE[view];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#f7f4ee",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori (next/og) only understands plain <img>, not next/image */}
        <img
          src={baseImage}
          alt=""
          width={WIDTH}
          height={HEIGHT}
          style={{ position: "absolute", top: 0, left: 0, width: WIDTH, height: HEIGHT, objectFit: "contain" }}
        />

        {view === "front" && selection.patch !== "none" && (
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: `${PATCH_POSITION.x}%`,
              top: `${PATCH_POSITION.y}%`,
              width: (PATCH_POSITION.sizePercent / 100) * WIDTH,
              height: (PATCH_POSITION.sizePercent / 100) * WIDTH,
              transform: `translate(-50%, -50%)`,
            }}
          >
            <svg viewBox="0 0 24 24" width="100%" height="100%">
              <path
                d={selection.patch === "star" ? STAR_PATH : HEART_PATH}
                fill="#c79a5b"
                stroke="rgba(0,0,0,0.35)"
                strokeWidth={0.5}
              />
            </svg>
          </div>
        )}

        {charms.map((c) => {
          const entry = charmEntries.find((e) => e.variantId === c.variantId);
          if (!entry?.imageUrl) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element -- Satori (next/og) only understands plain <img>, not next/image
            <img
              key={c.instanceId}
              src={entry.imageUrl}
              alt=""
              width={charmSize}
              height={charmSize}
              style={{
                position: "absolute",
                left: `${c.x}%`,
                top: `${c.y}%`,
                width: charmSize,
                height: charmSize,
                objectFit: "contain",
                transform: `translate(-50%, -50%)`,
              }}
            />
          );
        })}
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
