import type { PriceAlert } from '../stores/alerts-store';
import { getPrice } from '../mocks/prices';

export interface AlertEvaluation {
  alert: PriceAlert;
  currentPrice: number;
  shouldTrigger: boolean;
}

/**
 * Evaluates a single alert against the current price for its card+grade.
 * Returns null if the price isn't available (we can't decide either way).
 */
export function evaluateAlert(alert: PriceAlert): AlertEvaluation | null {
  const price = getPrice(alert.cardId, alert.grade);
  if (!price) return null;

  const current = price.currentPrice;
  const shouldTrigger =
    !alert.triggered &&
    (alert.type === 'above'
      ? current >= alert.targetPrice
      : current <= alert.targetPrice);

  return { alert, currentPrice: current, shouldTrigger };
}

/**
 * Pure: takes a list of alerts and returns the ones that should fire right
 * now. Used by both the foreground checker and the background fetch task,
 * so the trigger logic stays in one place.
 */
export function findAlertsToTrigger(
  alerts: PriceAlert[],
): AlertEvaluation[] {
  return alerts
    .map(evaluateAlert)
    .filter((e): e is AlertEvaluation => e !== null && e.shouldTrigger);
}

/**
 * Format the user-facing notification body for a triggered alert.
 * Kept here so foreground + background paths show identical copy.
 */
export function formatAlertMessage(
  alert: PriceAlert,
  triggeredPrice: number,
): { title: string; body: string } {
  const direction = alert.type === 'above' ? 'above' : 'below';
  const gradeLabel = alert.grade === 'PSA10' ? 'PSA 10' : 'Raw';
  return {
    title: `${alert.cardName} hit your target`,
    body: `${gradeLabel} is now ${direction} $${alert.targetPrice.toFixed(2)} — currently $${triggeredPrice.toFixed(2)}.`,
  };
}
