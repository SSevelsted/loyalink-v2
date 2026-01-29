# LoyaLink Pass Generation Service

Self-hosted wallet pass generation service for Apple Wallet and Google Wallet.

## Features

- **Apple Wallet (.pkpass)**: Generate signed PKPass files
- **Google Wallet**: JWT-based save URLs
- **Push Notifications**: APNs for Apple, API updates for Google
- **Web Service**: Apple Wallet callback endpoints for pass updates

## Deployment (Railway.app)

1. Create a new Railway project
2. Connect your Git repository
3. Set environment variables (see `.env.example`)
4. Deploy

## Environment Variables

### Required

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `PUBLIC_URL`: Public URL of this service (for Apple callbacks)

### Apple Wallet

- `APPLE_PASS_TYPE_ID`: Pass type identifier (e.g., `pass.com.loyalink.loyalty`)
- `APPLE_TEAM_ID`: Apple Developer Team ID
- `APPLE_PASS_CERTIFICATE_BASE64`: Base64-encoded .p12 certificate
- `APPLE_PASS_CERTIFICATE_PASSWORD`: Certificate password

### Apple Push Notifications

- `APNS_KEY_BASE64`: Base64-encoded .p8 APNs key
- `APNS_KEY_ID`: Key ID from Apple Developer Portal
- `APNS_HOST`: `api.push.apple.com` (production) or `api.sandbox.push.apple.com` (development)

### Google Wallet

- `GOOGLE_ISSUER_ID`: Issuer ID from Google Pay Console
- `GOOGLE_SERVICE_ACCOUNT_BASE64`: Base64-encoded service account JSON

## API Endpoints

### Pass Generation

- `POST /api/passes/generate` - Generate a new pass
- `GET /api/passes/:serialNumber/download` - Download .pkpass file

### Google Wallet

- `GET /api/google/save-url/:serialNumber` - Get Google Wallet save URL
- `POST /api/google/update/:serialNumber` - Update Google Wallet pass

### Push Notifications

- `POST /api/push/customer/:customerId` - Send push to one customer
- `POST /api/push/studio/:studioId` - Send push to studio customers
- `POST /api/push/process-queue` - Process pending push logs

### Apple Web Service (required for pass updates)

- `POST /v1/devices/:deviceId/registrations/:passTypeId/:serialNumber` - Register device
- `DELETE /v1/devices/:deviceId/registrations/:passTypeId/:serialNumber` - Unregister
- `GET /v1/devices/:deviceId/registrations/:passTypeId` - Get passes for device
- `GET /v1/passes/:passTypeId/:serialNumber` - Get updated pass

## Apple Certificate Setup

1. Go to Apple Developer Portal → Certificates, Identifiers & Profiles
2. Create a Pass Type ID: `pass.com.loyalink.loyalty`
3. Generate a certificate for the Pass Type ID
4. Download and export as .p12 with password
5. Base64 encode: `base64 -i certificate.p12 | tr -d '\n'`
6. Create APNs Authentication Key (.p8) for push notifications
7. Base64 encode the .p8 key

## Google Wallet Setup

1. Go to Google Cloud Console
2. Enable the Google Wallet API
3. Create a service account with `roles/walletobjects.issuer` role
4. Download the service account JSON
5. Base64 encode: `base64 -i service-account.json | tr -d '\n'`
6. Get your Issuer ID from the Google Pay & Wallet Console

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Architecture

```
                    ┌─────────────────┐
                    │  LoyaLink App   │
                    │  (Supabase)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Pass Service   │
                    │  (Railway.app)  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
│  Apple Wallet   │ │  Google Wallet  │ │  APNs/Google    │
│  PKPass + Sign  │ │  JWT + API      │ │  Push Service   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```
