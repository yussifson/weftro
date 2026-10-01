// src/lib/intelligence/engines/insurance.js
// Insurance vertical intelligence engine
// Analyzes claims fraud, policy renewals, loss ratios, and underwriting patterns.

import { generateInsight, groupByWeek, groupByDay } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

const VERTICAL = 'insurance';

// ────────────────────────────────────────────────────────
// 1. Claims Fraud Detection
//    Flags unusually high-value claims (>2× average) and
//    rapid successive claims from the same claimant.
// ────────────────────────────────────────────────────────
async function detectClaimsFraud(companyId) {
  const insights = [];

  const claimsRes = await powerSync.execute(
    `SELECT id, claim_number, policy_id, claimant_name, claim_type, amount, status, date_filed
     FROM univ_claims
     WHERE company_id = ?
     ORDER BY date_filed DESC`,
    [companyId]
  );
  const claims = claimsRes.rows._array;

  if (claims.length < 3) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'insurance_fraud_building',
      title: 'Claims Intelligence Building',
      body: 'Not enough claims data to run fraud detection yet. At least 3 claims are needed.',
      severity: 'info',
    }];
  }

  // --- High-value outlier detection ---
  const amounts = claims.map(c => Number(c.amount) || 0).filter(a => a > 0);
  const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const threshold = avgAmount * 2;

  const highValueClaims = claims.filter(c => (Number(c.amount) || 0) > threshold);

  if (highValueClaims.length > 0) {
    const aiBody = await generateInsight(
      `Analyze these ${highValueClaims.length} insurance claims that exceed 2× the average claim amount of $${avgAmount.toFixed(2)}. Identify fraud risk patterns.`,
      {
        averageClaim: avgAmount.toFixed(2),
        threshold: threshold.toFixed(2),
        flaggedClaims: highValueClaims.map(c => ({
          claim_number: c.claim_number,
          claimant: c.claimant_name,
          amount: c.amount,
          type: c.claim_type,
          date: c.date_filed,
        })),
      }
    );

    insights.push({
      vertical: VERTICAL,
      insight_type: 'anomaly',
      insight_key: 'insurance_high_value_claims',
      entity_type: 'claim',
      title: `${highValueClaims.length} High-Value Claim${highValueClaims.length > 1 ? 's' : ''} Flagged`,
      body: aiBody,
      severity: highValueClaims.length >= 3 ? 'critical' : 'warning',
      confidence: 0.85,
      data_snapshot: {
        average_amount: avgAmount.toFixed(2),
        threshold: threshold.toFixed(2),
        flagged_count: highValueClaims.length,
        flagged_claims: highValueClaims.map(c => c.claim_number),
      },
      action_label: 'Review Flagged Claims',
      action_url: '/insurance/claims?filter=flagged',
    });
  }

  // --- Rapid successive claims from same claimant ---
  const claimantMap = {};
  for (const c of claims) {
    const name = (c.claimant_name || '').trim().toLowerCase();
    if (!name) continue;
    if (!claimantMap[name]) claimantMap[name] = [];
    claimantMap[name].push(c);
  }

  const rapidClaimants = [];
  for (const [name, claimList] of Object.entries(claimantMap)) {
    if (claimList.length < 2) continue;
    const sorted = claimList.sort((a, b) => new Date(a.date_filed) - new Date(b.date_filed));
    for (let i = 1; i < sorted.length; i++) {
      const daysBetween = (new Date(sorted[i].date_filed) - new Date(sorted[i - 1].date_filed)) / (1000 * 60 * 60 * 24);
      if (daysBetween <= 30) {
        rapidClaimants.push({
          claimant: name,
          claims_count: claimList.length,
          shortest_gap_days: Math.round(daysBetween),
          total_amount: claimList.reduce((s, c) => s + (Number(c.amount) || 0), 0),
        });
        break; // one entry per claimant
      }
    }
  }

  if (rapidClaimants.length > 0) {
    const aiBody = await generateInsight(
      `These claimants filed multiple insurance claims within 30 days of each other. Assess the fraud risk and recommend next steps.`,
      { rapid_claimants: rapidClaimants }
    );

    insights.push({
      vertical: VERTICAL,
      insight_type: 'risk',
      insight_key: 'insurance_rapid_successive_claims',
      title: `${rapidClaimants.length} Claimant${rapidClaimants.length > 1 ? 's' : ''} With Rapid Successive Claims`,
      body: aiBody,
      severity: rapidClaimants.length >= 3 ? 'critical' : 'warning',
      confidence: 0.78,
      data_snapshot: { rapid_claimants: rapidClaimants },
      action_label: 'Investigate Claimants',
      action_url: '/insurance/claims?filter=rapid',
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// 2. Policy Renewal Risk
//    Identifies policies expiring in the next 30 days
//    with no renewal activity.
// ────────────────────────────────────────────────────────
async function analyzeRenewalRisk(companyId) {
  const insights = [];
  const now = new Date().toISOString().split('T')[0];
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const expiringRes = await powerSync.execute(
    `SELECT id, policy_number, policyholder_name, policy_type, premium, start_date, end_date, status
     FROM univ_policies
     WHERE company_id = ? AND end_date >= ? AND end_date <= ? AND status != 'renewed' AND status != 'cancelled'
     ORDER BY end_date ASC`,
    [companyId, now, thirtyDaysOut]
  );
  const expiring = expiringRes.rows._array;

  if (expiring.length === 0) return insights;

  const totalPremiumAtRisk = expiring.reduce((s, p) => s + (Number(p.premium) || 0), 0);

  const aiBody = await generateInsight(
    `${expiring.length} insurance policies are expiring within 30 days with no renewal activity. Total premium revenue at risk is $${totalPremiumAtRisk.toFixed(2)}. Summarize the risk and recommend retention actions.`,
    {
      expiring_count: expiring.length,
      premium_at_risk: totalPremiumAtRisk.toFixed(2),
      policies: expiring.map(p => ({
        policy_number: p.policy_number,
        holder: p.policyholder_name,
        type: p.policy_type,
        premium: p.premium,
        end_date: p.end_date,
      })),
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'risk',
    insight_key: 'insurance_renewal_risk',
    title: `${expiring.length} Polic${expiring.length > 1 ? 'ies' : 'y'} Expiring — $${totalPremiumAtRisk.toLocaleString()} at Risk`,
    body: aiBody,
    severity: totalPremiumAtRisk > 50000 ? 'critical' : 'warning',
    confidence: 0.92,
    data_snapshot: {
      expiring_count: expiring.length,
      premium_at_risk: totalPremiumAtRisk.toFixed(2),
      earliest_expiry: expiring[0]?.end_date,
    },
    action_label: 'View Expiring Policies',
    action_url: '/insurance/policies?filter=expiring',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// 3. Loss Ratio Analysis
//    Compares total claims paid against total premiums
//    collected. A ratio above 0.7 is concerning.
// ────────────────────────────────────────────────────────
async function analyzeLossRatio(companyId) {
  const insights = [];

  const claimsRes = await powerSync.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total_claims, COUNT(*) AS claim_count
     FROM univ_claims
     WHERE company_id = ? AND (status = 'paid' OR status = 'approved' OR status = 'settled')`,
    [companyId]
  );
  const totalClaims = Number(claimsRes.rows._array[0]?.total_claims) || 0;
  const claimCount = Number(claimsRes.rows._array[0]?.claim_count) || 0;

  const premiumsRes = await powerSync.execute(
    `SELECT COALESCE(SUM(premium), 0) AS total_premiums, COUNT(*) AS policy_count
     FROM univ_policies
     WHERE company_id = ?`,
    [companyId]
  );
  const totalPremiums = Number(premiumsRes.rows._array[0]?.total_premiums) || 0;
  const policyCount = Number(premiumsRes.rows._array[0]?.policy_count) || 0;

  if (totalPremiums === 0 || policyCount === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'insurance_loss_ratio_building',
      title: 'Loss Ratio Intelligence Building',
      body: 'Insufficient premium data to calculate loss ratios. Add policies to enable this analysis.',
      severity: 'info',
    }];
  }

  const lossRatio = totalClaims / totalPremiums;

  let severity = 'positive';
  if (lossRatio > 1.0) severity = 'critical';
  else if (lossRatio > 0.7) severity = 'warning';
  else if (lossRatio > 0.5) severity = 'info';

  const aiBody = await generateInsight(
    `Analyze this insurance loss ratio. Total premiums: $${totalPremiums.toFixed(2)}, total claims paid: $${totalClaims.toFixed(2)}, loss ratio: ${(lossRatio * 100).toFixed(1)}%. Across ${policyCount} policies and ${claimCount} paid claims. Explain the business implications.`,
    {
      total_premiums: totalPremiums.toFixed(2),
      total_claims: totalClaims.toFixed(2),
      loss_ratio: (lossRatio * 100).toFixed(1),
      policy_count: policyCount,
      claim_count: claimCount,
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'summary',
    insight_key: 'insurance_loss_ratio',
    title: `Loss Ratio: ${(lossRatio * 100).toFixed(1)}%`,
    body: aiBody,
    severity,
    confidence: 0.95,
    data_snapshot: {
      total_premiums: totalPremiums.toFixed(2),
      total_claims: totalClaims.toFixed(2),
      loss_ratio: (lossRatio * 100).toFixed(1),
      policy_count: policyCount,
      claim_count: claimCount,
    },
    action_label: 'View Claims Breakdown',
    action_url: '/insurance/analytics',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// 4. Underwriting Patterns
//    Detects concentration risk when too many policies
//    are clustered in a single policy type.
// ────────────────────────────────────────────────────────
async function analyzeUnderwritingPatterns(companyId) {
  const insights = [];

  const res = await powerSync.execute(
    `SELECT policy_type, COUNT(*) AS type_count, COALESCE(SUM(premium), 0) AS type_premium
     FROM univ_policies
     WHERE company_id = ?
     GROUP BY policy_type
     ORDER BY type_count DESC`,
    [companyId]
  );
  const distribution = res.rows._array;

  if (distribution.length < 2) return insights;

  const totalPolicies = distribution.reduce((s, d) => s + (Number(d.type_count) || 0), 0);
  const totalPremium = distribution.reduce((s, d) => s + (Number(d.type_premium) || 0), 0);

  // Flag any type that holds >60% of total policies
  const concentrated = distribution.filter(d => {
    const share = (Number(d.type_count) || 0) / totalPolicies;
    return share > 0.6;
  });

  if (concentrated.length > 0) {
    const topType = concentrated[0];
    const share = ((Number(topType.type_count) / totalPolicies) * 100).toFixed(1);

    const aiBody = await generateInsight(
      `Insurance portfolio concentration risk detected. Policy type "${topType.policy_type}" represents ${share}% of all ${totalPolicies} policies. Analyze the risk of over-concentration and recommend diversification.`,
      {
        distribution: distribution.map(d => ({
          type: d.policy_type,
          count: d.type_count,
          premium: Number(d.type_premium).toFixed(2),
          share_pct: ((Number(d.type_count) / totalPolicies) * 100).toFixed(1),
        })),
        total_policies: totalPolicies,
        total_premium: totalPremium.toFixed(2),
      }
    );

    insights.push({
      vertical: VERTICAL,
      insight_type: 'risk',
      insight_key: 'insurance_concentration_risk',
      title: `Concentration Risk: ${topType.policy_type} at ${share}%`,
      body: aiBody,
      severity: Number(share) > 80 ? 'critical' : 'warning',
      confidence: 0.88,
      data_snapshot: {
        distribution: distribution.map(d => ({
          type: d.policy_type,
          count: d.type_count,
          share_pct: ((Number(d.type_count) / totalPolicies) * 100).toFixed(1),
        })),
      },
      action_label: 'View Portfolio Mix',
      action_url: '/insurance/underwriting',
    });
  } else {
    // Portfolio is well diversified — positive insight
    const aiBody = await generateInsight(
      `Insurance portfolio is diversified across ${distribution.length} policy types with no single type exceeding 60%. Summarize the health of the portfolio distribution.`,
      {
        distribution: distribution.map(d => ({
          type: d.policy_type,
          count: d.type_count,
          share_pct: ((Number(d.type_count) / totalPolicies) * 100).toFixed(1),
        })),
      }
    );

    insights.push({
      vertical: VERTICAL,
      insight_type: 'pattern',
      insight_key: 'insurance_diversified_portfolio',
      title: 'Portfolio Well Diversified',
      body: aiBody,
      severity: 'positive',
      confidence: 0.9,
      data_snapshot: {
        type_count: distribution.length,
        total_policies: totalPolicies,
      },
    });
  }

  return insights;
}

// ────────────────────────────────────────────────────────
// Main export — runs all sub-engines, returns combined insights
// ────────────────────────────────────────────────────────
export default async function insuranceEngine(companyId) {
  const results = await Promise.allSettled([
    detectClaimsFraud(companyId),
    analyzeRenewalRisk(companyId),
    analyzeLossRatio(companyId),
    analyzeUnderwritingPatterns(companyId),
  ]);

  return results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}
