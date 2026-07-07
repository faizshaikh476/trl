# WhatsApp Cloud API Setup

## Current App Endpoint

Use this callback URL in Meta:

```txt
https://www.therealestatelink.com/api/whatsapp/webhook
```

Subscribe to the `messages` webhook field.

## Required Environment Variables

Set these locally in `.env.local` and in Vercel production:

```env
WHATSAPP_PROVIDER=meta
WHATSAPP_PHONE_NUMBER_ID=<registered_phone_number_id>
WHATSAPP_BUSINESS_ACCOUNT_ID=<whatsapp_business_account_id>
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
# Optional fallback only. Production intake creates/reuses one broker workspace per sender phone.
WHATSAPP_DEFAULT_WORKSPACE_ID=
WHATSAPP_AUTO_REPLY=true
```

Never commit or paste `WHATSAPP_ACCESS_TOKEN` into chat. If a token is exposed, revoke it and create a fresh one before using production.

## Test Number Flow

1. Open Meta Developer Dashboard.
2. Go to the app, then WhatsApp, then API Setup.
3. Add your personal WhatsApp number as a test recipient and verify it by OTP.
4. Send Meta's sample message once.
5. Configure the webhook callback URL and verify token.
6. Send a real property message from the verified recipient phone to Meta's test number.

Example message:

```txt
Pre-leased commercial office for sale in One Place, Salunkhe Vihar Road, Pune.
450 sqft carpet, leased to a doctor at Rs 28,000/month, price Rs 75 lakh.
Immediate rental income and 1 parking.
```

Expected result:

1. Meta sends the message to `/api/whatsapp/webhook`.
2. The app creates or reuses a broker workspace for the sender phone number.
3. The app creates a draft listing in that broker workspace.
4. The app creates an owner profile from the sender phone number.
5. The app creates a private claim link for first-time verification.
6. The app replies on WhatsApp with the shareable listing link.

## Launch Phone Number

Meta's test number only works with verified test recipients. For real brokers and sellers, add a
dedicated WhatsApp Business phone number in WhatsApp Manager, then update
`WHATSAPP_PHONE_NUMBER_ID` in Vercel to the registered production phone number ID.
