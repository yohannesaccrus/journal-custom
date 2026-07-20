import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  addAssetVariant,
  deleteAssetVariant,
  renameOptionValue,
  syncJournalOptionRename,
  updateVariantDetails,
} from "@/lib/admin/shopify-admin-data";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productId, optionId, optionName, value, price, sku } = body as {
    productId?: string;
    optionId?: string;
    optionName?: string;
    value?: string;
    price?: string;
    sku?: string;
  };

  if (!productId || !optionId || !optionName || !value) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await addAssetVariant(productId, optionId, optionName, value, price ?? "0.00", sku ?? "");
    return NextResponse.json({ ok: true });
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
