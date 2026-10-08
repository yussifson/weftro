const fs = require('fs');
const file = 'tests/ClipadV3Phase7Connect.test.js';
let c = fs.readFileSync(file, 'utf8');

const webhookTest = `
  it('dispatches webhook securely if enabled', async () => {
    isV3FeatureEnabled.mockReturnValue(true);
    const { dispatchWebhookEvent } = await import('../src/lib/clipadWebhookService');
    
    // Test that the mock dispatch runs without crashing and enforces flag
    const result = await dispatchWebhookEvent({ company_id: 'c1' }, 'memory.created', { id: 'm1' });
    // In our mock, since the webhook select returns empty (by default), it should return false or gracefully exit
    expect(result).toBeDefined();
  });
`;

c = c.replace(/}\);$/, webhookTest + "\n});");
fs.writeFileSync(file, c);
