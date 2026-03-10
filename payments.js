/**
 * BotForge Payments Module
 * Stripe + PayPal integration
 */

const STRIPE = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Pricing configuration
const PRICING = {
    STARTER: {
        name: 'BotForge Starter',
        priceId: process.env.STRIPE_PRICE_STARTER,
        monthly: 29,
        features: ['1 chatbot', '100 conversations/mo', 'Basic customization']
    },
    PROFESSIONAL: {
        name: 'BotForge Professional',
        priceId: process.env.STRIPE_PRICE_PROFESSIONAL,
        monthly: 79,
        features: ['3 chatbots', '1,000 conversations/mo', 'Advanced AI', 'Priority support']
    },
    ENTERPRISE: {
        name: 'BotForge Enterprise',
        priceId: process.env.STRIPE_PRICE_ENTERPRISE,
        monthly: 199,
        setupFee: 499,
        features: ['Unlimited chatbots', 'Unlimited conversations', 'Dedicated manager', 'SLA']
    }
};

/**
 * Create Stripe checkout session
 */
async function createCheckoutSession(customerEmail, tier, trialDays = 0) {
    const price = PRICING[tier];
    
    const session = await STRIPE.checkout.sessions.create({
        customer_email: customerEmail,
        payment_method_types: ['card'],
        line_items: [{
            price: price.priceId,
            quantity: 1
        }],
        mode: 'subscription',
        success_url: 'https://cantgetright1880-source.github.io/smokey-raven/success.html',
        cancel_url: 'https://cantgetright1880-source.github.io/smokey-raven/cancel.html',
        subscription_data: {
            trial_days: trialDays,
            metadata: {
                tier: tier,
                source: 'botforge'
            }
        },
        metadata: {
            tier: tier,
            customer: customerEmail
        }
    });
    
    return session;
}

/**
 * Create one-time payment (for Enterprise setup fee)
 */
async function createOneTimePayment(customerEmail, amount, description) {
    const session = await STRIPE.checkout.sessions.create({
        customer_email: customerEmail,
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: description
                },
                unit_amount: amount * 100 // cents
            },
            quantity: 1
        }],
        mode: 'payment',
        success_url: 'https://cantgetright1880-source.github.io/smokey-raven/success.html',
        cancel_url: 'https://cantgetright1880-source.github.io/smokey-raven/cancel.html'
    });
    
    return session;
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId) {
    return await STRIPE.subscriptions.cancel(subscriptionId);
}

/**
 * Get subscription details
 */
async function getSubscription(subscriptionId) {
    return await STRIPE.subscriptions.retrieve(subscriptionId);
}

/**
 * Handle webhook events
 */
async function handleWebhook(event) {
    switch (event.type) {
        case 'checkout.session.completed':
            // New subscription created
            console.log('✅ Checkout completed:', event.data.object.id);
            break;
            
        case 'customer.subscription.updated':
            // Subscription changed
            console.log('📝 Subscription updated:', event.data.object.id);
            break;
            
        case 'customer.subscription.deleted':
            // Subscription cancelled
            console.log('❌ Subscription cancelled:', event.data.object.id);
            break;
            
        case 'invoice.payment_failed':
            // Payment failed - alert Forge
            console.log('⚠️ Payment failed:', event.data.object.id);
            // TODO: Send alert to Forge
            break;
            
        case 'invoice.paid':
            // Payment successful
            console.log('💰 Invoice paid:', event.data.object.id);
            break;
    }
}

/**
 * Create customer
 */
async function createCustomer(email, name) {
    return await STRIPE.customers.create({
        email: email,
        name: name,
        metadata: {
            source: 'botforge'
        }
    });
}

/**
 * Get customer by email
 */
async function getCustomer(email) {
    const customers = await STRIPE.customers.list({
        email: email,
        limit: 1
    });
    return customers.data[0] || null;
}

/**
 * Generate invoice PDF link
 */
async function getInvoiceUrl(invoiceId) {
    const invoice = await STRIPE.invoices.retrieve(invoiceId);
    return invoice.invoice_pdf;
}

/**
 * Process refund
 */
async function processRefund(paymentIntentId, amount = null) {
    // amount in cents if specified
    return await STRIPE.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? amount * 100 : undefined // full refund if not specified
    });
}

module.exports = {
    PRICING,
    createCheckoutSession,
    createOneTimePayment,
    cancelSubscription,
    getSubscription,
    handleWebhook,
    createCustomer,
    getCustomer,
    getInvoiceUrl,
    processRefund
};
