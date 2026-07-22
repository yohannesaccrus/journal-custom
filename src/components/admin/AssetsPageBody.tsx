"use client";

import { useState } from "react";
import type { AdminProduct } from "@/lib/admin/shopify-admin-data";
import { ProductLinePicker } from "@/components/admin/ProductLinePicker";
import AssetCategoryCard from "@/app/admin/(dashboard)/assets/AssetCategoryCard";

export function AssetsPageBody({ products, coverImage }: { products: AdminProduct[]; coverImage: string | null }) {
  const [selected, setSelected] = useState("journal");

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
          {products.map((product) => (
            <AssetCategoryCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
