import "server-only";
import { NextResponse } from "next/server";
import type { CartLineItem, CartPayload } from "@/lib/cart";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION ?? "2026-01";

const DRAFT_ORDER_CREATE = `
  mutation DraftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        invoiceUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function toCustomAttributes(properties?: Record<string, string>) {
  if (!properties) return [];
  return Object.entries(properties)
    .filter(([key]) => !key.startsWith("_"))
    .map(([key, value]) => ({ key, value }));
}

export async function POST(request: Request) {
  if (!STORE_DOMAIN || !ACCESS_TOKEN) {
    return NextResponse.json({ message: "Missing Shopify admin credentials." }, { status: 500 });
  }

  const body = (await request.json()) as CartPayload;
  const items: CartLineItem[] = body.items ?? [];
  if (items.length === 0) {
    return NextResponse.json({ message: "No items to add." }, { status: 400 });
  }

  const input = {
    lineItems: items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      customAttributes: toCustomAttributes(item.properties),
    })),
    customAttributes: Object.entries(body.attributes ?? {}).map(([key, value]) => ({ key, value })),
    useCustomerDefaultAddress: false,
  };

  const res = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ACCESS_TOKEN,
    },
    body: JSON.stringify({ query: DRAFT_ORDER_CREATE, variables: { input } }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { message: `Shopify Admin API request failed: ${res.status} ${res.statusText}` },
      { status: 502 }
    );
  }

  const json = await res.json();
  const userErrors = json?.data?.draftOrderCreate?.userErrors;
  if (json.errors || (userErrors && userErrors.length > 0)) {
    const message = json.errors
      ? JSON.stringify(json.errors)
      : userErrors.map((e: { message: string }) => e.message).join(", ");
    return NextResponse.json({ message: `Something went wrong adding your journal to the cart: ${message}` }, { status: 422 });
  }

  const invoiceUrl = json?.data?.draftOrderCreate?.draftOrder?.invoiceUrl;
  if (!invoiceUrl) {
    return NextResponse.json({ message: "Something went wrong adding your journal to the cart. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ invoiceUrl });
}
