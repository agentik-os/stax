"use client";

import { useEffect, useState } from "react";

type Product = { id: string; name: string; price: number };

export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products));
  }, []);

  async function cancelOrder(orderId: string) {
    await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
  }

  return (
    <div>
      {products.map((p) => (
        <button key={p.id} onClick={() => cancelOrder(p.id)}>
          {p.name}
        </button>
      ))}
    </div>
  );
}
