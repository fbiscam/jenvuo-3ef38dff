/** Public service errors are allowlisted, never copied from upstream diagnostics. */
export function jenvuServiceError(status: number): string {
  if (status === 400) return 'Jenvu API could not process this request. Check the request parameters.';
  if (status === 401) return 'Jenvu API service configuration needs attention. Contact support@jenvu.com.';
  if (status === 402) return 'Jenvu AI service is currently unavailable. Contact support@jenvu.com.';
  if (status === 403) return 'Jenvu API access to this model is restricted. Contact support@jenvu.com.';
  if (status === 404) return 'The selected Jenvu API model is unavailable.';
  if (status === 429) return 'Jenvu API is receiving too many requests. Please try again later.';
  return 'Jenvu AI service is temporarily unavailable. Please try again later.';
}