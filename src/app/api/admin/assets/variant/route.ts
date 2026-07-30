import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  addAssetVariant,
  createJournalCoverProduct,
  deleteAssetVariant,
  renameOptionValue,
  syncJournalOptionAdd,
  syncJournalOptionDelete,
  syncJournalOptionRename,
  syncJournalPricing,
  updateVariantDetails,
  type JournalDeleteResult,
  type JournalSyncResult,
} from "@/lib/admin/shopify-admin-data";
import type { CoverCategory } from "@/lib/types";

/** Tracker tags whose own `price` field feeds the additive journal-pricing formula (base cover price + string/pen-holder add-ons). */
const PRICE_COMPONENT_TAGS = ["cover", "string", "pen-holder"];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productId, optionId, optionName, value, price, sku, productTags, category } = body as {
    productId?: string;
    optionId?: string;
    optionName?: string;
    value?: string;
    price?: string;
    sku?: string;
    productTags?: string[];
    category?: CoverCategory;
  };

  if (!productId || !optionId || !optionName || !value) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (productTags?.includes("cover") && !category) {
    return NextResponse.json({ error: "Missing category for new cover" }, { status: 400 });
  }

  try {
    await addAssetVariant(productId, optionId, optionName, value, price ?? "0.00", sku ?? "");

    let journalSync: JournalSyncResult[] = [];
    if (productTags?.includes("cover")) {
      const result = await createJournalCoverProduct(value, price ?? "0.00", category!);
      journalSync = [{ coverHandle: result.handle, coverTitle: value, created: result.created, skipped: false }];
      await syncJournalPricing();
    } else if (productTags) {
      journalSync = await syncJournalOptionAdd(productTags, value);
      if (journalSync.length > 0) await syncJournalPricing();
    }

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
  const { productId, variantId, value, productTags } = body as {
    productId?: string;
    variantId?: string;
    value?: string;
    productTags?: string[];
  };

  if (!productId || !variantId) {
    return NextResponse.json({ error: "Missing productId or variantId" }, { status: 400 });
  }

  try {
    await deleteAssetVariant(productId, variantId);
    let journalDeleteSync: JournalDeleteResult[] = [];
    if (value && productTags) {
      journalDeleteSync = await syncJournalOptionDelete(productTags, value);
    }
    return NextResponse.json({ ok: true, journalDeleteSync });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
