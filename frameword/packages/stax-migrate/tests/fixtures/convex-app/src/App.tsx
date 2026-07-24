import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function Deals() {
  const deals = useQuery(api.deals.list, {});
  const create = useMutation(api.deals.create);
  // api.deals.restage is intentionally NEVER called: the scanner must flag it unused
  return <button onClick={() => create({ name: "x" })}>{deals?.length}</button>;
}
