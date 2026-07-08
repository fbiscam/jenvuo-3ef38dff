import type { ComponentType } from 'react'
import { template as newArticleTemplate } from './new-article'
import { template as signalAlertTemplate } from './signal-alert'
import { template as newDeviceTemplate } from './new-device'
import { template as lowCreditTemplate } from './low-credit'
import { template as planUpgradeTemplate } from './plan-upgrade'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'new-article': newArticleTemplate,
  'signal-alert': signalAlertTemplate,
  'new-device': newDeviceTemplate,
  'low-credit': lowCreditTemplate,
  'plan-upgrade': planUpgradeTemplate,
}
