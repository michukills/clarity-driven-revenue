ALTER TABLE public.customer_integrations DROP CONSTRAINT IF EXISTS customer_integrations_provider_chk;

ALTER TABLE public.customer_integrations
ADD CONSTRAINT customer_integrations_provider_chk
CHECK (
  provider = ANY (
    ARRAY[
      'quickbooks'::text,
      'xero'::text,
      'freshbooks'::text,
      'stripe'::text,
      'square'::text,
      'paypal'::text,
      'hubspot'::text,
      'salesforce'::text,
      'pipedrive'::text,
      'ga4'::text,
      'google_search_console'::text,
      'meta_ads'::text,
      'paycom'::text,
      'adp'::text,
      'gusto'::text,
      'jobber'::text,
      'housecall_pro'::text,
      'servicetitan'::text,
      'custom'::text
    ]
  )
);