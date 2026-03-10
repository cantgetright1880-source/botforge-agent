# BotForge Payments Module

## Overview
Handles Stripe and PayPal payments, subscriptions, invoices, and trial conversions.

## Pricing

| Tier | Monthly | Setup Fee | Annual (20% off) |
|------|---------|-----------|------------------|
| Starter | $29/mo | $0 | $278/yr |
| Professional | $79/mo | $0 | $758/yr |
| Enterprise | $199/mo | $499 one-time | $1,910/yr |

## Stripe Setup

### Environment Variables
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

### Products (create in Stripe Dashboard)
1. **BotForge Starter** - $29/mo
2. **BotForge Professional** - $79/mo  
3. **BotForge Enterprise** - $199/mo + $499 setup

## PayPal Setup

### Environment Variables
```
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox  # or 'live'
```

## API Endpoints

### POST /api/payment/checkout
Create checkout session

### POST /api/payment/webhook
Handle Stripe/PayPal webhooks

### POST /api/payment/cancel
Cancel subscription

### GET /api/payment/invoice/:id
Get invoice PDF

## Trial Flow
1. Customer uses trial code → marked as trial in DB
2. Trial converts automatically after X days
3. Payment fails → retry 3 times → notify Forge → email customer

## Refund Policy
- 30-day money-back guarantee
- Process via Stripe Dashboard or API
- Auto-email confirmation
