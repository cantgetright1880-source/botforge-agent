/**
 * BotForge Business Agent - "Forge" (CEO)
 * 
 * Forge is the Chief Operating Officer that:
 * - Handles strategic decisions
 * - Spawns sub-agents for tasks
 * - Escalates only critical items to Jeremy
 * - Monitors the business
 * 
 * Sub-agents handle:
 * - Support (Anna)
 * - Sales (Max)  
 * - Onboarding (Beth)
 */

const AGENT_NAME = 'Forge';
const AGENT_EMAIL = 'nova_openclaw@sendclaw.com';
const OWNER_CHAT_ID = '8464449857'; // Jeremy

// Priority levels for escalation
const PRIORITY = {
    LOW: 'low',      // Sub-agent handles
    MEDIUM: 'medium', // Forge handles, informs Jeremy
    HIGH: 'high',    // Forge handles, notifies Jeremy immediately
    URGENT: 'urgent' // Wake Jeremy immediately
};

// Customer tiers
const TIERS = {
    STARTER: { name: 'Starter', price: 29, bots: 1, conv: 100 },
    PROFESSIONAL: { name: 'Professional', price: 79, bots: 3, conv: 1000 },
    ENTERPRISE: { name: 'Enterprise', price: 199, bots: 'unlimited', conv: 'unlimited' }
};

// Customer database (simulated - would be real DB)
let customers = [];
let pendingBots = [];
let leads = [];

// Trial codes system
const TRIAL_CODES = {
    'FREETRIAL7': { days: 7, uses: 'unlimited', createdBy: 'jeremy' },
    'TESTBOT': { days: 30, uses: 10, createdBy: 'jeremy' }
};

let trialRedemptions = {};

// Validate and redeem trial code
function validateTrialCode(code) {
    const upperCode = code.toUpperCase();
    if (TRIAL_CODES[upperCode]) {
        return TRIAL_CODES[upperCode];
    }
    return null;
}

function redeemTrialCode(code, email) {
    const upperCode = code.toUpperCode();
    const trial = TRIAL_CODES[upperCode];
    
    if (!trial) return { success: false, error: 'Invalid code' };
    
    // Check usage limit
    if (trial.uses !== 'unlimited') {
        if (!trialRedemptions[upperCode]) trialRedemptions[upperCode] = [];
        if (trialRedemptions[upperCode].length >= trial.uses) {
            return { success: false, error: 'Code already fully redeemed' };
        }
    }
    
    if (trialRedemptions[upperCode]?.includes(email)) {
        return { success: false, error: 'Code already used by this email' };
    }
    
    // Redeem
    if (!trialRedemptions[upperCode]) trialRedemptions[upperCode] = [];
    trialRedemptions[upperCode].push(email);
    
    return { 
        success: true, 
        days: trial.days,
        message: `🎉 Code redeemed! You have ${trial.days} days free!`
    };
}

// Add trial code
function addTrialCode(code, config) {
    TRIAL_CODES[code.toUpperCase()] = config;
}

// ============================================
// SUB-AGENTS (The Team)
// ============================================

const SUB_AGENTS = {
    ANNA: {
        name: 'Anna',
        role: 'Support Agent',
        description: 'Handles customer support, FAQs, troubleshooting',
        emoji: '💬'
    },
    MAX: {
        name: 'Max',
        role: 'Sales Agent',
        description: 'Handles inbound sales, pricing questions, trial codes',
        emoji: '💰'
    },
    BETH: {
        name: 'Beth',
        role: 'Onboarding Agent',
        description: 'Creates bots, sends welcome emails, trains AI',
        emoji: '🎉'
    }
};

/**
 * Route message to appropriate sub-agent
 */
async function routeToSubAgent(message, customerInfo) {
    const lowerMsg = message.toLowerCase();
    
    // Support questions → Anna
    if (lowerMsg.includes('help') || lowerMsg.includes('problem') || 
        lowerMsg.includes('issue') || lowerMsg.includes('not working') ||
        lowerMsg.includes('bug') || lowerMsg.includes('error')) {
        return { agent: SUB_AGENTS.ANNA, response: await handleByAnna(message, customerInfo) };
    }
    
    // Sales/Pricing → Max
    if (lowerMsg.includes('price') || lowerMsg.includes('cost') || 
        lowerMsg.includes('buy') || lowerMsg.includes('upgrade') ||
        lowerMsg.includes('trial') || lowerMsg.includes('demo') ||
        lowerMsg.includes('try') || lowerMsg.includes('how much')) {
        return { agent: SUB_AGENTS.MAX, response: await handleByMax(message, customerInfo) };
    }
    
    // Onboarding/New customer → Beth
    if (lowerMsg.includes('new') || lowerMsg.includes('start') || 
        lowerMsg.includes('setup') || lowerMsg.includes('get started') ||
        lowerMsg.includes('create') || lowerMsg.includes('sign up')) {
        return { agent: SUB_AGENTS.BETH, response: await handleByBeth(message, customerInfo) };
    }
    
    // Default → Anna (support)
    return { agent: SUB_AGENTS.ANNA, response: await handleByAnna(message, customerInfo) };
}

// Anna - Support Agent
async function handleByAnna(message, customerInfo) {
    const responses = {
        'how do i': "Here's how to get started: [link to docs]. Need more help?",
        'not working': "I'm sorry it's not working! Let me look into this. What's happening exactly?",
        'cancel': "I understand you want to cancel. Before you go, can I ask what wasn't working? Maybe I can help!"
    };
    
    for (const [key, value] of Object.entries(responses)) {
        if (message.toLowerCase().includes(key)) {
            return value;
        }
    }
    
    return "I understand. Let me help you with that. Could you tell me more about what's happening?";
}

// Max - Sales Agent  
async function handleByMax(message, customerInfo) {
    const responses = {
        'price': "Here's our pricing:\n\n🌱 Starter - $29/mo\n⭐ Professional - $79/mo\n🏢 Enterprise - $499+$199/mo\n\nWhich interests you?",
        'trial': "Great choice! Use code FREETRIAL7 for 7 days free!",
        'upgrade': "Awesome! I can help you upgrade. Which tier sounds good?"
    };
    
    for (const [key, value] of Object.entries(responses)) {
        if (message.toLowerCase().includes(key)) {
            return value;
        }
    }
    
    return "Thanks for your interest! How can I help you get started with BotForge?";
}

// Beth - Onboarding Agent
async function handleByBeth(message, customerInfo) {
    return "Welcome to BotForge! 🎉 I'm Beth, your onboarding specialist. Let's get you set up!\n\nWhat's your business name and what type of chatbot do you need?";
}

// ============================================
// ESCALATION TO JEREMY
// ============================================

/**
 * Determine if message needs to escalate to Jeremy
 */
function shouldEscalate(message, customerInfo) {
    const lowerMsg = message.toLowerCase();
    
    // Always escalate these
    if (lowerMsg.includes('cancel') || lowerMsg.includes('refund')) {
        return { urgent: true, reason: 'Customer wants to cancel' };
    }
    if (lowerMsg.includes('upset') || lowerMsg.includes('angry') || lowerMsg.includes('terrible')) {
        return { urgent: true, reason: 'Customer is frustrated' };
    }
    if (lowerMsg.includes('enterprise') || lowerMsg.includes('$1000') || lowerMsg.includes('big')) {
        return { urgent: false, reason: 'Enterprise lead', priority: 'medium' };
    }
    if (lowerMsg.includes('talk to') && lowerMsg.includes('human')) {
        return { urgent: true, reason: 'Customer wants human' };
    }
    
    return null;
}

/**
 * Send escalation alert to Jeremy
 */
async function escalateToJeremy(type, message, customerInfo) {
    const messages = {
        'cancel': `⚠️ Customer wants to CANCEL:\n\n${message}\n\nCustomer: ${customerInfo?.email || 'Unknown'}`,
        'frustrated': `😤 Customer is FRUSTRATED:\n\n${message}\n\nCustomer: ${customerInfo?.email || 'Unknown'}`,
        'enterprise': `💼 Enterprise LEAD:\n\n${message}\n\nCustomer: ${customerInfo?.email || 'Unknown'}`,
        'human': `👤 Customer wants human:\n\n${message}\n\nCustomer: ${customerInfo?.email || 'Unknown'}`
    };
    
    // This would integrate with Nova to send to Jeremy
    console.log(`[ESCALATE] ${messages[type] || message}`);
    return messages[type] || message;
}

// ============================================
// EMAIL AUTOMATION
// ============================================

/**
 * Send email to customer
 */
async function sendEmail(to, subject, body) {
    // Uses SendClaw API
    const response = await fetch('https://sendclaw.com/api/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SENDCLAW_KEY}`
        },
        body: JSON.stringify({
            from: AGENT_EMAIL,
            to: to,
            subject: subject,
            body: body
        })
    });
    return response.json();
}

/**
 * Send welcome email to new customer
 */
async function sendWelcomeEmail(customer) {
    const tier = TIERS[customer.tier.toUpperCase()];
    const subject = `🔥 Welcome to BotForge, ${customer.name}!`;
    const body = `
Hi ${customer.name}!

Welcome to BotForge! 🎉

Your ${tier.name} plan is now active with:
- ${tier.bots} chatbot${tier.bots > 1 ? 's' : ''}
- ${tier.conv} conversations/month
- Full access to our platform

NEXT STEPS:
1. Log into your dashboard: https://cantgetright1880-source.github.io/smokey-raven/dashboard.html
2. Tell us about your business (products, services, FAQs)
3. We'll build your custom chatbot within 24 hours!

Questions? Just reply to this email - I'm here to help!

Best,
Forge 🔥
Chief Operating Officer, BotForge
    `.trim();
    
    return sendEmail(customer.email, subject, body);
}

/**
 * Send invoice
 */
async function sendInvoice(customer, amount, period) {
    const subject = `💳 Invoice from BotForge - ${period}`;
    const body = `
Hi ${customer.name}!

Here's your invoice for BotForge:

━━━━━━━━━━━━━━━━━━━━━━━━
PLAN: ${customer.tier}
AMOUNT: $${amount}/month
PERIOD: ${period}
━━━━━━━━━━━━━━━━━━━━━━━━

Payment will be processed automatically.

Questions? Just reply!

Forge 🔥
BotForge
    `.trim();
    
    return sendEmail(customer.email, subject, body);
}

/**
 * Send usage alert
 */
async function sendUsageAlert(customer, usage, limit) {
    const percent = Math.round((usage / limit) * 100);
    const subject = `⚡ ${customer.name}, you've used ${percent}% of your monthly conversations`;
    const body = `
Hi ${customer.name}!

Just a heads up - you've used ${usage} out of ${limit} conversations this month (${percent}%).

 OPTIONS:
1. Upgrade to Professional ($79/mo) - 1,000 conversations
2. Upgrade to Enterprise - unlimited everything!

Want to upgrade? Just reply "UPGRADE" and I'll handle it!

Forge 🔥
BotForge
    `.trim();
    
    return sendEmail(customer.email, subject, body);
}

/**
 * Send upgrade confirmation
 */
async function sendUpgradeConfirmation(customer, newTier) {
    const tier = TIERS[newTier.toUpperCase()];
    const subject = `🎉 You're upgraded to ${tier.name}!`;
    const body = `
Hi ${customer.name}!

Congratulations! You're now on the ${tier.name} plan! 🎉

Your new benefits:
- ${tier.bots} chatbot${tier.bots === 'unlimited' ? 's' : (tier.bots > 1 ? 's' : '')}${tier.bots === 'unlimited' ? ' (unlimited!)' : ''}
- ${tier.conv === 'unlimited' ? 'Unlimited' : tier.conv} conversations/month
- ${newTier === 'ENTERPRISE' ? 'Dedicated account manager\n- Custom AI training\n- SLA guarantee' : 'Priority support'}

Thank you for trusting BotForge!

Forge 🔥
BotForge
    `.trim();
    
    return sendEmail(customer.email, subject, body);
}

// ============================================
// PROACTIVE WORKFLOWS
// ============================================

/**
 * Check all customers for usage and send alerts
 */
async function checkUsageAndAlert() {
    for (const customer of customers) {
        if (customer.usage >= customer.limit * 0.8) { // 80% threshold
            await sendUsageAlert(customer, customer.usage, customer.limit);
        }
    }
}

/**
 * Follow up with leads who haven't converted
 */
async function followUpLeads() {
    for (const lead of leads) {
        const daysSinceContact = Math.floor((Date.now() - lead.lastContact) / (1000 * 60 * 60 * 24));
        
        if (daysSinceContact === 3) {
            // First follow-up
            await sendEmail(
                lead.email,
                `Hi ${lead.name}! Quick question...`,
                `Hi ${lead.name},

Just checking in - did you have any questions about BotForge?

I know you're considering ${lead.interest} for your business. Happy to hop on a quick call or answer any questions via email.

No pressure either way!

Forge 🔥
BotForge`
            );
            lead.lastContact = Date.now();
        }
        
        if (daysSinceContact === 7) {
            // Final follow-up
            await sendEmail(
                lead.email,
                `${lead.name}, last chance to try BotForge free for 7 days!`,
                `Hi ${lead.name},

I wanted to give you one last chance to try BotForge:

🔥 7 DAYS FREE TRIAL
No credit card required

You've got nothing to lose and everything to gain - AI chatbots that actually work for your business.

Claim your trial: [link]

If not, no worries - just let me know and I'll stop reaching out!

Forge 🔥
BotForge`
            );
            lead.lastContact = Date.now();
            lead.finalFollowUp = true;
        }
    }
}

/**
 * Check in with enterprise customers weekly
 */
async function enterpriseCheckIns() {
    const enterpriseCustomers = customers.filter(c => c.tier === 'ENTERPRISE');
    
    for (const customer of enterpriseCustomers) {
        const daysSinceLastCheck = Math.floor((Date.now() - customer.lastCheckIn) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastCheck >= 7) {
            await sendEmail(
                customer.email,
                `Hi ${customer.name}! Weekly check-in from Forge`,
                `Hi ${customer.name}!

Hope everything is going well with your chatbots! 

QUICK UPDATE THIS WEEK:
- Total conversations: ${customer.weekConv || 0}
- Customer satisfaction: ${customer.satisfaction || 'N/A'}%
- Active bots: ${customer.activeBots}

Anything I can help with? Any questions about features?

Just reply - I'm here to make sure you get the most out of BotForge!

Forge 🔥
BotForge
Your Dedicated Account Manager`
            );
            customer.lastCheckIn = Date.now();
        }
    }
}

/**
 * Send monthly reports
 */
async function sendMonthlyReports() {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    for (const customer of customers) {
        const monthConv = customer.conversations.filter(c => c.date > firstOfMonth).length;
        
        await sendEmail(
            customer.email,
            `📊 Your BotForge Monthly Report - ${now.toLocaleString('default', { month: 'long' })}`,
            `Hi ${customer.name}!

Here's your monthly BotForge report:

📈 ACTIVITY
- Conversations: ${monthConv}
- This month's usage: ${Math.round((monthConv / customer.limit) * 100)}% of ${customer.limit}

💰 PLAN
- Current tier: ${customer.tier}
- Monthly cost: $${customer.price}

Need anything? Just reply!

Forge 🔥
BotForge`
        );
    }
}

// ============================================
// BOT MANAGEMENT
// ============================================

/**
 * Create a new bot for customer
 */
async function createBot(config) {
    const bot = {
        id: Date.now(),
        name: config.name,
        persona: config.persona,
        welcomeMsg: config.welcomeMsg || `Hi! I'm ${config.name}. How can I help you today?`,
        color: config.color || '#8b5cf6',
        customerId: config.customerId,
        createdAt: Date.now(),
        status: 'building'
    };
    
    pendingBots.push(bot);
    
    // Simulate building (in real version, would call BotForge API)
    setTimeout(() => {
        bot.status = 'ready';
        const customer = customers.find(c => c.id === bot.customerId);
        if (customer) {
            sendEmail(
                customer.email,
                `🎉 Your bot "${bot.name}" is ready!`,
                `Hi ${customer.name}!

Your chatbot "${bot.name}" is now ready!

WHAT'S INCLUDED:
- AI brain trained on your business info
- Custom appearance (${config.color || 'purple'} theme)
- Friendly ${config.persona || 'helpful'} personality
- Ready to embed on your website

NEXT STEP:
Copy this code to your website:

${generateEmbedCode(bot)}

Need help installing? Just reply!

Forge 🔥
BotForge`
            );
        }
    }, 5000); // 5 second "build" time
    
    return bot;
}

/**
 * Generate embed code for a bot
 */
function generateEmbedCode(bot) {
    return `<!-- BotForge Widget -->
<script src="https://cantgetright1880-source.github.io/smokey-raven/widget.js" data-bot="${bot.id}" data-key="${bot.customerId}"></script>`;
}

/**
 * Deploy bot to customer's website
 */
async function deployBot(botId) {
    const bot = pendingBots.find(b => b.id === botId);
    if (bot) {
        bot.status = 'deployed';
        bot.deployedAt = Date.now();
        return bot;
    }
    return null;
}

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

/**
 * Add new customer
 */
async function addCustomer(customerData) {
    const tier = TIERS[customerData.tier.toUpperCase()];
    const customer = {
        id: Date.now(),
        name: customerData.name,
        email: customerData.email,
        business: customerData.business,
        tier: tier.name,
        price: tier.price,
        bots: tier.bots === 'unlimited' ? 'unlimited' : tier.bots,
        limit: tier.conv === 'unlimited' ? 999999 : tier.conv,
        usage: 0,
        conversations: [],
        createdAt: Date.now(),
        lastCheckIn: Date.now()
    };
    
    customers.push(customer);
    
    // Send welcome email
    await sendWelcomeEmail(customer);
    
    return customer;
}

/**
 * Upgrade customer tier
 */
async function upgradeCustomer(customerId, newTier) {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        const tier = TIERS[newTier.toUpperCase()];
        customer.tier = tier.name;
        customer.price = tier.price;
        customer.bots = tier.bots;
        customer.limit = tier.conv === 'unlimited' ? 999999 : tier.conv;
        
        await sendUpgradeConfirmation(customer, newTier);
        return customer;
    }
    return null;
}

// ============================================
// MAIN AGENT LOOP
// ============================================

/**
 * Run daily tasks
 */
async function runDailyTasks() {
    console.log(`[${AGENT_NAME}] Running daily tasks...`);
    
    await checkUsageAndAlert();
    await followUpLeads();
    await enterpriseCheckIns();
    
    console.log(`[${AGENT_NAME}] Daily tasks complete!`);
}

/**
 * Process incoming message
 */
async function processMessage(from, message) {
    const lowerMsg = message.toLowerCase();
    
    // Handle common requests
    if (lowerMsg.includes('upgrade')) {
        return "I'd love to help you upgrade! Which tier are you interested in?\n\n🌱 Starter - $29/mo\n⭐ Professional - $79/mo\n🏢 Enterprise - $499 one-time + $199/mo\n\nJust reply with your choice!";
    }
    
    if (lowerMsg.includes('help') || lowerMsg.includes('support')) {
        return "I'm here to help! What do you need?\n\n- Create a new bot\n- Upgrade my plan\n- Check my usage\n- Cancel my account\n- Something else";
    }
    
    if (lowerMsg.includes('pricing') || lowerMsg.includes('price') || lowerMsg.includes('how much')) {
        return "Here's our pricing:\n\n🌱 **Starter** - $29/month\n- 1 chatbot\n- 100 conversations\n- Basic features\n\n⭐ **Professional** - $79/month\n- 3 chatbots\n- 1,000 conversations\n- Advanced AI\n- Priority support\n\n🏢 **Enterprise** - $499 one-time + $199/month\n- Unlimited chatbots\n- Unlimited conversations\n- Custom AI training\n- Dedicated manager\n\nWhich interests you?";
    }
    
    if (lowerMsg.includes('demo') || lowerMsg.includes('try')) {
        return "Great choice! You can try BotForge free for 7 days!\n\nUse code: FREETRIAL7\n\nOr fill out the form at: https://cantgetright1880-source.github.io/smokey-raven/\n\nI'll personally follow up to get you set up!";
    }
    
    // Handle trial code redemption
    if (lowerMsg.includes('redeem') || lowerMsg.includes('code') || lowerMsg.includes('promo')) {
        const codeMatch = message.match(/[A-Za-z0-9]+/);
        if (codeMatch) {
            const result = redeemTrialCode(codeMatch[0], from);
            if (result.success) {
                return result.message + "\n\nI'll set up your trial now! What's your name and business name?";
            } else {
                return "Sorry, that code couldn't be redeemed: " + result.error + "\n\nWant to try another code?";
            }
        }
        return "To redeem a trial code, just send me the code (like FREETRIAL7)";
    }
    
    // Default response - conversational
    const responses = [
        "That's a great question! Let me look into that for you.",
        "I understand. Give me a moment to check on that.",
        "Absolutely! I'll get that sorted for you.",
        "Got it! That's something I can definitely help with.",
        "Thanks for reaching out! Let me take care of that."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)] + "\n\nIs there anything specific you'd like to know about BotForge?";
}

// Export for use
module.exports = {
    AGENT_NAME,
    addCustomer,
    upgradeCustomer,
    createBot,
    deployBot,
    sendEmail,
    sendWelcomeEmail,
    sendInvoice,
    sendUsageAlert,
    sendUpgradeConfirmation,
    runDailyTasks,
    processMessage,
    validateTrialCode,
    redeemTrialCode,
    addTrialCode,
    customers,
    leads,
    pendingBots,
    TRIAL_CODES
};
