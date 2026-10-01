# Real Estate Vertical - Deployment & Testing Guide

## Pre-Deployment Checklist

### 1. Environment Configuration

Ensure all environment variables are set:

```bash
# Trust Accounting / Payments
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx  # or pk_live for production
VITE_PAYSTACK_SECRET_KEY=sk_test_xxxxx  # Secure this!

# Notifications
NOVU_API_KEY=your_novu_api_key

# PowerSync
VITE_POWERSYNC_URL=https://your-instance.powersync.journeyapps.com

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2. Database Migrations

```bash
# 1. Backup existing database
pg_dump your_database > backup_$(date +%s).sql

# 2. Run migration via Supabase SQL editor or CLI
psql -h your-host -U your_user -d your_database < migrations/008_real_estate_enhancements.sql

# 3. Verify all tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'univ_re_%';

# 4. Enable RLS on new tables
ALTER TABLE univ_re_trust_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE univ_re_leases ENABLE ROW LEVEL SECURITY;
-- ... repeat for all new tables

# 5. Set up RLS policies (example)
CREATE POLICY "company_access" ON univ_re_trust_accounts
  FOR ALL USING (auth.jwt() ->> 'company_id' = company_id);
```

### 3. PowerSync Configuration

Update `src/api/AppSchema.js`:
- Verify all new tables are defined
- Check column types (text, real, integer)
- Ensure IDs are text type for UUID compatibility

```bash
# Test PowerSync sync
npm test -- RealEstateTrustAccounting.test.js
```

## Testing Strategy

### Unit Tests

Each API module should have corresponding tests:

```javascript
// Example: tests/RealEstateTrustAccounting.test.js

describe('RealEstateTrustAccounting', () => {
  let companyId = 'test-company-id';
  let userId = 'test-user-id';

  beforeEach(async () => {
    // Setup test data
  });

  test('createTrustAccount creates account with correct fields', async () => {
    const result = await RealEstateTrustAccounting.createTrustAccount(
      companyId,
      { accountName: 'Test Account', accountType: 'client_trust' },
      userId
    );
    expect(result).toBeTruthy();
  });

  test('recordTrustTransaction updates balance correctly', async () => {
    // Test transaction recording
  });

  test('reconcileTrustAccount detects discrepancies', async () => {
    // Test reconciliation logic
  });
});
```

Run all tests:
```bash
npm test
```

### Integration Tests

Test workflows across multiple modules:

```javascript
// Example: Full offer workflow
test('Complete offer workflow', async () => {
  // 1. Create offer
  const offer = await createOffer(companyId, offerData);
  
  // 2. Create counter-offer
  const counter = await RealEstateOffers.createCounterOffer(
    companyId,
    { originalOfferId: offer.id, counterOfferPrice: 500000 },
    userId
  );
  
  // 3. Accept counter
  await RealEstateOffers.respondToCounterOffer(
    companyId,
    counter.id,
    'accepted'
  );
  
  // 4. Calculate commission
  const commission = await RealEstateOffers.evaluateCommissionRules(
    companyId,
    { salePrice: 500000 }
  );
  
  // 5. Record commission
  await RealEstateTrustAccounting.recordCommissionPayout(
    companyId,
    { transactionId: offer.transactionId, ...commission },
    userId
  );
});
```

### End-to-End Tests

Test complete user journeys:

```bash
# Run Cypress/Playwright tests
npm run test:e2e

# Specific test file
npm run test:e2e -- --spec="tests/e2e/offer-workflow.spec.ts"
```

## Staging Deployment

### 1. Deploy to Staging Environment

```bash
# Build for staging
npm run build:staging

# Deploy database migrations
supabase db push --include-migrations

# Deploy Edge Functions
supabase functions deploy re-notifications-service

# Deploy frontend
vercel deploy --prod --env staging
```

### 2. Staging Validation

- [ ] All database tables created and accessible
- [ ] PowerSync syncing correctly
- [ ] API endpoints responding with correct data
- [ ] Notifications sending successfully
- [ ] Paystack payment flow working
- [ ] Document generation and e-signatures working
- [ ] Lease automation scheduling correctly
- [ ] Market data and analytics calculating properly
- [ ] RLS policies enforcing correctly
- [ ] Audit logs recording all actions

### 3. Staging Data Tests

```javascript
// Create test scenarios
const testScenarios = [
  { name: 'Trust Account Flow', test: testTrustAccounting },
  { name: 'Offer Negotiation', test: testOfferFlow },
  { name: 'Document Signing', test: testDocumentFlow },
  { name: 'Maintenance Request', test: testMaintenanceFlow },
  { name: 'Rent Payment', test: testRentPayment },
  { name: 'Market Intelligence', test: testMarketIntel },
  { name: 'Client Scoring', test: testClientScoring }
];

for (const scenario of testScenarios) {
  console.log(`Testing: ${scenario.name}`);
  await scenario.test();
  console.log(`✓ ${scenario.name} passed`);
}
```

## Production Deployment

### 1. Pre-Production Review

- [ ] All staging tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Rollback plan documented
- [ ] Monitor setup configured
- [ ] Alerts configured for:
  - Database errors
  - API errors
  - Payment processing failures
  - Notification delivery failures
  - Sync conflicts

### 2. Production Deployment

```bash
# Final backup
pg_dump production_database > backup_pre_deploy_$(date +%s).sql

# Deploy with zero-downtime strategy
# 1. Deploy new code (without data changes)
vercel deploy --prod

# 2. Run migrations
supabase db push --include-migrations

# 3. Deploy Edge Functions
supabase functions deploy re-notifications-service

# 4. Enable new features via feature flags
# 5. Monitor metrics
```

### 3. Post-Deployment Monitoring

```javascript
// Monitor key metrics
setInterval(async () => {
  const metrics = {
    trustAccountsCreated: await getTrustAccountCount(),
    offersProcessed: await getOfferCount(),
    documentsGenerated: await getDocumentCount(),
    leasePaymentsProcessed: await getPaymentCount(),
    notificationsSent: await getNotificationCount(),
    errorRate: await getErrorRate()
  };
  
  logToMonitoring(metrics);
}, 60000); // Every minute
```

## Performance Monitoring

### Key Metrics

- **Response Times**: Target <200ms for API calls
- **Database Query Performance**: Monitor slow queries
- **PowerSync Sync Time**: Target <5 seconds
- **Notification Delivery**: Target <1 minute
- **Payment Processing**: Track authorization time

### Monitoring Queries

```sql
-- Check slow queries
SELECT query, mean_time FROM pg_stat_statements
WHERE query LIKE '%univ_re%'
ORDER BY mean_time DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT table_name, pg_size_pretty(pg_total_relation_size(table_name))
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'univ_re%'
ORDER BY pg_total_relation_size(table_name) DESC;
```

## Rollback Procedure

If issues are detected post-deployment:

```bash
# 1. Immediate rollback (revert code)
vercel rollback

# 2. Database rollback (if needed)
psql your_database < backup_pre_deploy_TIMESTAMP.sql

# 3. Disable problematic features via feature flags
# 4. Communicate status to users
# 5. Post-incident review
```

## Logging & Debugging

### Application Logging

All modules log to console:
```javascript
console.error('[Module] Action failed:', error);
console.warn('[Module] Warning message');
console.log('[Module] Info message');
```

### Debug Mode

Enable detailed logging:
```bash
DEBUG=slate:* npm start
```

### Query Logging

Enable PostgreSQL query logging:
```sql
SET log_statement = 'all';
SET log_min_duration_statement = 100; -- Log queries > 100ms
```

## Data Reconciliation

Run these checks post-deployment:

```javascript
// Verify trust accounting totals
async function reconcileAllAccounts(companyId) {
  const accounts = await getTrustAccounts(companyId);
  
  for (const account of accounts) {
    const ledgerTotal = await calculateLedgerTotal(account.id);
    const dbBalance = account.balance;
    
    if (Math.abs(ledgerTotal - dbBalance) > 0.01) {
      console.warn(`Discrepancy in ${account.id}: ${ledgerTotal} vs ${dbBalance}`);
    }
  }
}

// Verify commission totals
async function reconcileCommissions(transactionId) {
  const transaction = await getTransaction(transactionId);
  const commissions = await getTransactionCommissions(transactionId);
  
  const total = commissions.reduce((sum, c) => sum + c.totalAmount, 0);
  const expected = transaction.salePrice * (transaction.commissionRate / 100);
  
  if (Math.abs(total - expected) > 0.01) {
    console.warn(`Commission mismatch for ${transactionId}`);
  }
}
```

## Version Management

Track deployment versions:

```bash
# Tag release
git tag -a v1.0-real-estate-enhancements -m "Real estate vertical enhancements"
git push origin v1.0-real-estate-enhancements

# Document in CHANGELOG
# Add entry: "v1.0 - Real Estate Enhancements (2026-06-24)"
```

## Support & Escalation

### Tier 1: Database Issues
- [ ] Check table existence and structure
- [ ] Verify RLS policies
- [ ] Check for slow queries

### Tier 2: API Issues
- [ ] Verify error logs
- [ ] Check PowerSync sync status
- [ ] Test endpoints with curl/Postman

### Tier 3: Payment Issues
- [ ] Check Paystack API status
- [ ] Verify webhook configuration
- [ ] Check payment reference matching

### Tier 4: Architecture Issues
- [ ] Review migration plan
- [ ] Check feature flags
- [ ] Consider gradual rollout

## Success Criteria

Deployment is successful when:

- ✓ All database tables created and populated
- ✓ PowerSync syncing without conflicts
- ✓ 99% of API calls succeed (<1% error rate)
- ✓ Notifications delivered within 60 seconds
- ✓ Payment processing < 5 seconds
- ✓ Document generation < 10 seconds
- ✓ Market analytics calculating correctly
- ✓ Audit logs recording all transactions
- ✓ No data loss or inconsistencies
- ✓ RLS policies enforcing access control

## Continuous Monitoring

Post-deployment, monitor:

1. **Error Rates**: Alert if >1% of requests fail
2. **Response Times**: Alert if >500ms average
3. **Database Health**: Monitor connections, locks, replication lag
4. **Notification Delivery**: Track delivery success rate
5. **Payment Processing**: Monitor for failed transactions
6. **Data Integrity**: Run hourly reconciliation checks
