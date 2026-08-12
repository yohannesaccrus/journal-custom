"use client";

import { useState } from "react";
import type { AdminProduct } from "@/lib/admin/shopify-admin-data";
import { ProductLinePicker } from "@/components/admin/ProductLinePicker";
import AssetCategoryCard from "@/app/admin/(dashboard)/assets/AssetCategoryCard";

// Fixed display order for the asset category cards, matching the order the
// customizer's own steps present these to the customer (Cover -> String ->
// Patch -> Charm -> Pen Holder -> Corner Edge -> Pouch -> Notebook) rather
// than whatever order Shopify's API happens to return.
const CATEGORY_ORDER = ["cover", "string", "patch", "charm", "pen-holder", "edge", "pouch", "notebook"];

function categoryRank(product: AdminProduct): number {
  const index = CATEGORY_ORDER.findIndex((tag) => product.tags.includes(tag));
  return index === -1 ? CATEGORY_ORDER.length : index;
}

export function AssetsPageBody({
  products,
  coverImage,
  journalByCoverName,
}: {
  products: AdminProduct[];
  coverImage: string | null;
  journalByCoverName: Record<string, AdminProduct>;
}) {
  const [selected, setSelected] = useState("journal");

  const orderedProducts = [...products].sort((a, b) => categoryRank(a) - categoryRank(b));

  return (
    <div>
      <div className="mt-6">
        <ProductLinePicker
          selected={selected}
          onSelect={setSelected}
          cards={[
            {
              key: "journal",
              title: "Journal Customizer",
              description: `${products.length} asset categories`,
              imageUrl: coverImage,
              active: true,
            },
            {
              key: "passport",
              title: "Passport Customizer",
              description: "Not built yet",
              imageUrl: null,
              active: false,
            },
            {
              key: "jewelry",
              title: "Jewelry Customizer",
              description: "Not built yet",
              imageUrl: null,
              active: false,
            },
          ]}
        />
      </div>

      {selected === "journal" && (
        <div className="mt-8 space-y-6">
          {orderedProducts.map((product) => (
            <AssetCategoryCard key={product.id} product={product} journalByCoverName={journalByCoverName} />
          ))}
        </div>
      )}
    </div>
  );
}
