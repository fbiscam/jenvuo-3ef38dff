INSERT INTO public.plans (id, name, price_usd, monthly_credits, rollover_months, feature_journal, feature_realtime_alerts, feature_full_ict, feature_scanner, sort_order, wallet_usd, markup_multiplier, extension_key_limit)
VALUES ('free', 'Free', 0, 0, 0, false, false, false, false, 0, 0, 2.0, 0)
ON CONFLICT (id) DO NOTHING;