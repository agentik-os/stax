"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function DealsPage() {
  const deals = useQuery(api.features.deals.list, { stage: "open" });
  const createDeal = useMutation(api.features.deals.create);
  const archiveDeal = useMutation(api.deals.archive);

  if (deals === undefined) return <p>Loading…</p>;

  return (
    <div>
      <button
        onClick={() =>
          createDeal({ title: "New deal", ownerId: deals[0].ownerId })
        }
      >
        New deal
      </button>
      <ul>
        {deals.map((deal) => (
          <li key={deal._id}>
            {deal.title}
            <button onClick={() => archiveDeal({ id: deal._id })}>
              Archive
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
