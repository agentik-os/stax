export const loadUsers = () => fetch("/api/users").then((r) => r.json());
export const ghost = () => fetch("/api/ghost", { method: "POST" });
