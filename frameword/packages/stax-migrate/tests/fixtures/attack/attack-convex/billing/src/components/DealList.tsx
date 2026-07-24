"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function DealList() {
  const deals = useQuery(api.deals.mine);
  const invoices = useQuery(api.invoices.forDeal, {
    dealId: deals?.[0]?._id ?? "",
  });
  const sendInvoice = useMutation(api.invoices.send);

  return (
    <ul>
      {(invoices ?? []).map((inv) => (
        <li key={inv._id}>
          {inv.amountCents / 100}
          <button onClick={() => sendInvoice({ invoiceId: inv._id })}>
            Send
          </button>
        </li>
      ))}
    </ul>
  );
}
