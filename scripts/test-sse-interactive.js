#!/usr/bin/env node

/**
 * Interactive SSE Test Tool
 *
 * This script allows you to:
 * 1. Connect to SSE and monitor events
 * 2. Send test events interactively
 * 3. Send webhook events interactively
 *
 * Usage:
 *   node scripts/test-sse-interactive.js [userId]
 *
 * If no userId is provided, it will use a default test user ID.
 */

const { EventSource } = require('eventsource');
const readline = require('readline');

const BACKEND_URL = 'http://localhost:3005';
const DEFAULT_USER_ID = '38f4283a-61c6-453f-af44-efdac7cb8721';
const TEST_USER_ID = process.argv[2] || DEFAULT_USER_ID;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let eventSource = null;
let eventCount = 0;
let isConnected = false;

console.log('🧪 Interactive SSE Test Tool');
console.log('============================');
console.log(`🔗 Backend URL: ${BACKEND_URL}`);
console.log(`👤 User ID: ${TEST_USER_ID}`);
console.log('');

// Initialize SSE connection
function connectSSE() {
  if (eventSource) {
    eventSource.close();
  }

  const url = `${BACKEND_URL}/api/notifications/subscribe?userId=${TEST_USER_ID}`;
  console.log(`🔌 Connecting to SSE: ${url}`);

  eventSource = new EventSource(url);

  eventSource.onopen = () => {
    console.log('✅ SSE connection opened');
    isConnected = true;
    showMenu();
  };

  eventSource.onmessage = (event) => {
    eventCount++;
    console.log(`\n📨 Event #${eventCount}:`);
    console.log('  Raw data:', event.data);

    try {
      const data = JSON.parse(event.data);
      console.log('  Parsed:', JSON.stringify(data, null, 2));

      // Handle specific event types
      switch (data.type) {
        case 'connection_established':
          console.log('🎉 Connection established!');
          break;
        case 'heartbeat':
          console.log('💓 Heartbeat received');
          break;
        case 'subscription_created':
          console.log('📋 Subscription created event');
          break;
        case 'subscription_activated':
          console.log('✅ Subscription activated event');
          break;
        case 'subscription_charged':
          console.log('💳 Subscription charged event');
          break;
        case 'subscription_cancelled':
          console.log('❌ Subscription cancelled event');
          break;
        case 'subscription_resumed':
          console.log('🔄 Subscription resumed event');
          break;
        case 'subscription_pending':
          console.log('⏳ Subscription pending event');
          break;
        case 'subscription_halted':
          console.log('⏸️ Subscription halted event');
          break;
        case 'payment_success':
          console.log('💰 Payment success event');
          break;
        case 'payment_failed':
          console.log('💸 Payment failed event');
          break;
        case 'test':
          console.log('🧪 Test event');
          break;
        default:
          console.log(`🔔 ${data.type} event`);
      }
    } catch (error) {
      console.log('  Parse error:', error.message);
    }

    console.log('---');
    showMenu();
  };

  eventSource.onerror = (error) => {
    console.error('❌ SSE Error:', error);
    isConnected = false;
    console.log('Ready state:', eventSource.readyState);
    showMenu();
  };
}

// Show interactive menu
function showMenu() {
  console.log('\n📋 Available Commands:');
  console.log('  📤 Test Events:');
  console.log('    1. Send test event');
  console.log('  📋 Subscription Events:');
  console.log('    2. subscription_authenticated');
  console.log('    3. subscription_activated');
  console.log('    4. subscription_charged');
  console.log('    5. subscription_cancelled');
  console.log('    6. subscription_resumed');
  console.log('    7. subscription_pending');
  console.log('    8. subscription_halted');
  console.log('  💰 Payment Events:');
  console.log('    9. payment_authorized');
  console.log('   10. payment_failed');
  console.log('  🔧 System:');
  console.log('   11. Reconnect SSE');
  console.log('   12. Show status');
  console.log('   13. Exit');
  console.log('');

  rl.question('Enter command (1-13): ', handleCommand);
}

// Handle user commands
async function handleCommand(input) {
  const command = input.trim();

  switch (command) {
    case '1':
      await sendTestEvent();
      break;
    case '2':
      await sendWebhookEvent('subscription_authenticated');
      break;
    case '3':
      await sendWebhookEvent('subscription_activated');
      break;
    case '4':
      await sendWebhookEvent('subscription_charged');
      break;
    case '5':
      await sendWebhookEvent('subscription_cancelled');
      break;
    case '6':
      await sendWebhookEvent('subscription_resumed');
      break;
    case '7':
      await sendWebhookEvent('subscription_pending');
      break;
    case '8':
      await sendWebhookEvent('subscription_halted');
      break;
    case '9':
      await sendWebhookEvent('payment_authorized');
      break;
    case '10':
      await sendWebhookEvent('payment_failed');
      break;
    case '11':
      console.log('🔄 Reconnecting SSE...');
      connectSSE();
      break;
    case '12':
      showStatus();
      break;
    case '13':
      console.log('👋 Goodbye!');
      cleanup();
      process.exit(0);
      break;
    default:
      console.log('❌ Invalid command. Please enter 1-13.');
      showMenu();
  }
}

// Send test event
async function sendTestEvent() {
  try {
    console.log('📤 Sending test event...');
    const url = `${BACKEND_URL}/api/notifications/test-event?userId=${TEST_USER_ID}&eventType=test`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ Test event sent successfully');
      console.log('Response:', data);
    } else {
      console.error('❌ Error sending test event:', data);
    }
  } catch (error) {
    console.error('❌ Error sending test event:', error.message);
  }
  showMenu();
}

// Send webhook event
async function sendWebhookEvent(eventType) {
  try {
    console.log(`📤 Sending ${eventType} webhook...`);

    const payloads = {
      subscription_authenticated: {
        event: 'subscription.authenticated',
        payload: {
          subscription: {
            entity: {
              id: 'sub_test_123',
              plan_id: 'plan_test_monthly',
              status: 'authenticated',
              start_at: Math.floor(Date.now() / 1000),
              end_at: Math.floor(Date.now() / 1000) + 2592000, // 30 days
              next_billing_at: Math.floor(Date.now() / 1000) + 2592000,
              current_start: Math.floor(Date.now() / 1000),
              current_end: Math.floor(Date.now() / 1000) + 2592000,
              quantity: 1,
              notes: {
                user_id: TEST_USER_ID,
                onTrial: 'true'
              },
              charge_at: Math.floor(Date.now() / 1000) + 2592000,
              short_url: 'https://rzp.io/test',
              customer_notify: true,
              total_count: 12,
              paid_count: 0,
              remaining_count: 12,
              created_at: Math.floor(Date.now() / 1000),
              entity: 'subscription',
              source: 'api'
            }
          }
        }
      },
      subscription_activated: {
        event: 'subscription.activated',
        payload: {
          subscription: {
            entity: {
              id: 'sub_test_123',
              plan_id: 'plan_test_monthly',
              status: 'active',
              start_at: Math.floor(Date.now() / 1000),
              end_at: Math.floor(Date.now() / 1000) + 2592000,
              next_billing_at: Math.floor(Date.now() / 1000) + 2592000,
              current_start: Math.floor(Date.now() / 1000),
              current_end: Math.floor(Date.now() / 1000) + 2592000,
              quantity: 1,
              notes: {
                user_id: TEST_USER_ID
              },
              charge_at: Math.floor(Date.now() / 1000) + 2592000,
              short_url: 'https://rzp.io/test',
              customer_notify: true,
              total_count: 12,
              paid_count: 1,
              remaining_count: 11,
              created_at: Math.floor(Date.now() / 1000),
              entity: 'subscription',
              source: 'api'
            }
          }
        }
      },
      subscription_charged: {
        event: 'subscription.charged',
        payload: {
          subscription: {
            entity: {
              id: 'sub_test_123',
              plan_id: 'plan_test_monthly',
              status: 'active',
              start_at: Math.floor(Date.now() / 1000) - 2592000,
              end_at: Math.floor(Date.now() / 1000),
              next_billing_at: Math.floor(Date.now() / 1000) + 2592000,
              current_start: Math.floor(Date.now() / 1000) - 2592000,
              current_end: Math.floor(Date.now() / 1000),
              quantity: 1,
              notes: {
                user_id: TEST_USER_ID
              },
              charge_at: Math.floor(Date.now() / 1000),
              short_url: 'https://rzp.io/test',
              customer_notify: true,
              total_count: 12,
              paid_count: 2,
              remaining_count: 10,
              created_at: Math.floor(Date.now() / 1000) - 2592000,
              entity: 'subscription',
              source: 'api'
            }
          }
        }
      },
      subscription_cancelled: {
        event: 'subscription.cancelled',
        payload: {
          subscription: {
            entity: {
              id: 'sub_test_123',
              plan_id: 'plan_test_monthly',
              status: 'cancelled',
              start_at: Math.floor(Date.now() / 1000) - 86400,
              end_at: Math.floor(Date.now() / 1000),
              next_billing_at: null,
              current_start: Math.floor(Date.now() / 1000) - 86400,
              current_end: Math.floor(Date.now() / 1000),
              quantity: 1,
              notes: {
                user_id: TEST_USER_ID
              },
              charge_at: null,
              short_url: 'https://rzp.io/test',
              customer_notify: true,
              total_count: 12,
              paid_count: 1,
              remaining_count: 11,
              created_at: Math.floor(Date.now() / 1000) - 86400,
              entity: 'subscription',
              source: 'api'
            }
          }
        }
      },
      subscription_resumed: {
        event: 'subscription.resumed',
        payload: {
          subscription: {
            entity: {
              id: 'sub_test_123',
              plan_id: 'plan_test_monthly',
              status: 'active',
              start_at: Math.floor(Date.now() / 1000) - 86400,
              end_at: Math.floor(Date.now() / 1000) + 2505600,
              next_billing_at: Math.floor(Date.now() / 1000) + 2505600,
              current_start: Math.floor(Date.now() / 1000) - 86400,
              current_end: Math.floor(Date.now() / 1000) + 2505600,
              quantity: 1,
              notes: {
                user_id: TEST_USER_ID
              },
              charge_at: Math.floor(Date.now() / 1000) + 2505600,
              short_url: 'https://rzp.io/test',
              customer_notify: true,
              total_count: 12,
              paid_count: 1,
              remaining_count: 11,
              created_at: Math.floor(Date.now() / 1000) - 86400,
              entity: 'subscription',
              source: 'api'
            }
          }
        }
      },
      subscription_pending: {
        event: 'subscription.pending',
        payload: {
          subscription: {
            entity: {
              id: 'sub_test_123',
              plan_id: 'plan_test_monthly',
              status: 'pending',
              start_at: Math.floor(Date.now() / 1000),
              end_at: Math.floor(Date.now() / 1000) + 2592000,
              next_billing_at: Math.floor(Date.now() / 1000) + 2592000,
              current_start: Math.floor(Date.now() / 1000),
              current_end: Math.floor(Date.now() / 1000) + 2592000,
              quantity: 1,
              notes: {
                user_id: TEST_USER_ID
              },
              charge_at: Math.floor(Date.now() / 1000) + 2592000,
              short_url: 'https://rzp.io/test',
              customer_notify: true,
              total_count: 12,
              paid_count: 0,
              remaining_count: 12,
              created_at: Math.floor(Date.now() / 1000),
              entity: 'subscription',
              source: 'api'
            }
          }
        }
      },
      subscription_halted: {
        event: 'subscription.halted',
        payload: {
          subscription: {
            entity: {
              id: 'sub_test_123',
              plan_id: 'plan_test_monthly',
              status: 'halted',
              start_at: Math.floor(Date.now() / 1000) - 86400,
              end_at: Math.floor(Date.now() / 1000) + 2505600,
              next_billing_at: null,
              current_start: Math.floor(Date.now() / 1000) - 86400,
              current_end: Math.floor(Date.now() / 1000) + 2505600,
              quantity: 1,
              notes: {
                user_id: TEST_USER_ID
              },
              charge_at: null,
              short_url: 'https://rzp.io/test',
              customer_notify: true,
              total_count: 12,
              paid_count: 1,
              remaining_count: 11,
              created_at: Math.floor(Date.now() / 1000) - 86400,
              entity: 'subscription',
              source: 'api'
            }
          }
        }
      },
      payment_authorized: {
        event: 'payment.authorized',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              amount: 29900,
              currency: 'INR',
              status: 'authorized',
              order_id: 'order_test_123',
              subscription_id: 'sub_test_123',
              method: 'card',
              description: 'Test payment authorization',
              created_at: Math.floor(Date.now() / 1000),
              entity: 'payment'
            }
          }
        }
      },
      payment_failed: {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              amount: 29900,
              currency: 'INR',
              status: 'failed',
              order_id: 'order_test_123',
              subscription_id: 'sub_test_123',
              method: 'card',
              description: 'Test payment failure',
              created_at: Math.floor(Date.now() / 1000),
              entity: 'payment'
            }
          }
        }
      }
    };

    const payload = payloads[eventType];
    if (!payload) {
      console.error('❌ Unknown event type:', eventType);
      showMenu();
      return;
    }

    const response = await fetch(`${BACKEND_URL}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${eventType} webhook sent successfully`);
      console.log('Response:', data);
    } else {
      console.error(`❌ Error sending ${eventType} webhook:`, data);
    }
  } catch (error) {
    console.error(`❌ Error sending ${eventType} webhook:`, error.message);
  }
  showMenu();
}

// Show current status
function showStatus() {
  console.log('\n📊 Current Status:');
  console.log(`  SSE Connected: ${isConnected ? '✅' : '❌'}`);
  console.log(`  Events Received: ${eventCount}`);
  console.log(`  User ID: ${TEST_USER_ID}`);
  console.log(`  Backend URL: ${BACKEND_URL}`);
  showMenu();
}

// Cleanup function
function cleanup() {
  if (eventSource) {
    eventSource.close();
  }
  rl.close();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  cleanup();
  process.exit(0);
});

// Start the application
console.log('🚀 Starting Interactive SSE Test Tool...');
connectSSE();
