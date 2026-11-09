import { createContext, useContext } from "react";

export const PlannerContext = createContext(null);

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error("usePlanner must be used within the planner application shell.");
  }
  return context;
}
