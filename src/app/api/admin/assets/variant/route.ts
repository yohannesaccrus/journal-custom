import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  addAssetVariant,
  deleteAssetVariant,
  renameOptionValue,
  syncJournalOptionAdd,
  syncJournalOptionRename,
  syncJournalPricing,
  updateVariantDetails,
} from "@/lib/admin/shopify-admin-data";

/** Tracker tags whose own `price` field feeds the additive journal-pricing formula (base cover price + string/pen-holder add-ons). */
const PRICE_COMPONENT_TAGS = ["cover", "string", "pen-holder"];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productId, optionId, optionName, value, price, sku, productTags } = body as {
    productId?: string;
    optionId?: string;
    optionName?: string;
    value?: string;
    price?: string;
    sku?: string;
    productTags?: string[];
  };

  if (!productId || !optionId || !optionName || !value) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await addAssetVariant(productId, optionId, optionName, value, price ?? "0.00", sku ?? "");
    const journalSync = productTags ? await syncJournalOptionAdd(productTags, value) : [];
    if (journalSync.length > 0) await syncJournalPricing();
    return NextResponse.json({ ok: true, journalSync });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { productId, variantId, price, sku, name, previousName, productTags, optionId, optionValueId } = body as {
    productId?: string;
    variantId?: string;
    price?: string;
    sku?: string;
    name?: string;
    previousName?: string;
    productTags?: string[];
    optionId?: string;
    optionValueId?: string;
  };

  if (!productId || !variantId) {
    return NextResponse.json({ error: "Missing productId or variantId" }, { status: 400 });
  }

  try {
    if (price !== undefined || sku !== undefined) {
      const fields: { price?: string; sku?: string } = {};
      if (price !== undefined) fields.price = price;
      if (sku !== undefined) fields.sku = sku;
      await updateVariantDetails(variantId, productId, fields);
      if (price !== undefined && productTags?.some((t) => PRICE_COMPONENT_TAGS.includes(t))) {
        await syncJournalPricing();
      }
    }
    if (name !== undefined && optionId && optionValueId) {
      await renameOptionValue(productId, optionId, optionValueId, name);
      if (previousName) {
        await syncJournalOptionRename(productTags ?? [], previousName, name);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { productId, variantId } = body as { productId?: string; variantId?: string };

  if (!productId || !variantId) {
    return NextResponse.json({ error: "Missing productId or variantId" }, { status: 400 });
  }

  try {
    await deleteAssetVariant(productId, variantId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
