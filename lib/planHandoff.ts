import type { MealPlanDayV4 } from './ai';

let _handoffPlan: MealPlanDayV4[] | null = null;

export function setHandoffPlan(p: MealPlanDayV4[]) { _handoffPlan = p; }
export function getHandoffPlan(): MealPlanDayV4[] | null { return _handoffPlan; }
