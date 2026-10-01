// src/hooks/useIntelligence.js
// React hook for consuming the Intelligence Layer
// Provides: insights, loading state, run engine, dismiss insight

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { powerSync } from '@/api/PowerSyncConnector';
import { useCompany } from '@/hooks/useCompanyId';
import { runEngine, storeInsight } from '@/lib/intelligence/engine';
import { submitInsightFeedback } from '@/lib/intelligence/feedback';
import { computeHealthScore } from '@/lib/intelligence/health-score';

// Import all vertical engines
import analyzeUniversal from '@/lib/intelligence/engines/universal';
import analyzeLegal from '@/lib/intelligence/engines/legal';
import analyzeHospital from '@/lib/intelligence/engines/hospital';
import analyzeSchool from '@/lib/intelligence/engines/school';
import analyzeHR from '@/lib/intelligence/engines/hr';
import analyzeRetail from '@/lib/intelligence/engines/retail';
import analyzeHotel from '@/lib/intelligence/engines/hotel';
import analyzeLogistics from '@/lib/intelligence/engines/logistics';
import analyzeInsurance from '@/lib/intelligence/engines/insurance';
import analyzeReligion from '@/lib/intelligence/engines/religion';
import analyzeMarketing from '@/lib/intelligence/engines/marketing';
import analyzeUniversity from '@/lib/intelligence/engines/university';
import analyzeOptavel from '@/lib/intelligence/engines/optavel-engine';
import analyzeRealEstate from '@/lib/intelligence/engines/real-estate';

const ENGINE_MAP = {
  universal: { fn: analyzeUniversal, name: 'universal-intelligence' },
  law: { fn: analyzeLegal, name: 'legal-intelligence' },
  legal: { fn: analyzeLegal, name: 'legal-intelligence' },
  hospital: { fn: analyzeHospital, name: 'healthcare-intelligence' },
  healthcare: { fn: analyzeHospital, name: 'healthcare-intelligence' },
  school: { fn: analyzeSchool, name: 'education-intelligence' },
  education: { fn: analyzeSchool, name: 'education-intelligence' },
  university: { fn: analyzeUniversity, name: 'university-intelligence' },
  hr: { fn: analyzeHR, name: 'hr-intelligence' },
  human_resources: { fn: analyzeHR, name: 'hr-intelligence' },
  retail: { fn: analyzeRetail, name: 'retail-intelligence' },
  ecommerce: { fn: analyzeRetail, name: 'retail-intelligence' },
  hotel: { fn: analyzeHotel, name: 'hotel-intelligence' },
  hospitality: { fn: analyzeHotel, name: 'hotel-intelligence' },
  logistics: { fn: analyzeLogistics, name: 'logistics-intelligence' },
  insurance: { fn: analyzeInsurance, name: 'insurance-intelligence' },
  religion: { fn: analyzeReligion, name: 'religion-intelligence' },
  church: { fn: analyzeReligion, name: 'religion-intelligence' },
  marketing: { fn: analyzeMarketing, name: 'marketing-intelligence' },
  real_estate: { fn: analyzeRealEstate, name: 'real-estate-intelligence' },
  'real-estate': { fn: analyzeRealEstate, name: 'real-estate-intelligence' },
  real_estate_jcl: { fn: analyzeRealEstate, name: 'real-estate-intelligence' },
  optavel: { fn: analyzeOptavel, name: 'optavel-intelligence' },
};

/**
 * Main hook to access intelligence insights
 * @param {string} vertical - Industry vertical (optional, fetches all if not provided)
 * @param {object} options - { autoRun: boolean, entityId: string }
 */
export function useIntelligence(vertical, options = {}) {
  const { company } = useCompany();
  const companyId = company?.id || null;
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState(null);

  // Fetch stored insights from PowerSync
  const { data: insights = [], isLoading, refetch } = useQuery({
    queryKey: ['workspace_insights', companyId, vertical],
    queryFn: async () => {
      if (!companyId) return [];

      let query = `SELECT * FROM workspace_insights WHERE company_id = ? AND is_dismissed = 0`;
      const params = [companyId];

      if (vertical) {
        query += ` AND (vertical = ? OR vertical = 'universal')`;
        params.push(vertical);
      }

      // Filter out expired insights
      query += ` AND (expires_at IS NULL OR expires_at > datetime('now'))`;
      query += ` ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 WHEN 'positive' THEN 2 ELSE 3 END, computed_at DESC`;

      const res = await powerSync.execute(query, params);
      const rawInsights = res.rows._array;

      // Fetch accuracy/engagement history for this workspace
      const accRes = await powerSync.execute(
        `SELECT insight_key, accuracy_score, dismissed, total_produced FROM engine_accuracy WHERE company_id = ?`,
        [companyId]
      );
      const accuracyMap = new Map(accRes.rows._array.map(a => [a.insight_key, a]));

      const scored = rawInsights.map(insight => {
        let score = 0;
        
        // Severity weight
        const severityScore = { critical: 40, warning: 25, info: 10, positive: 15 };
        score += severityScore[insight.severity] || 10;

        // Freshness (newer is more relevant)
        const hoursOld = (Date.now() - new Date(insight.computed_at).getTime()) / (60 * 60 * 1000);
        score += Math.max(0, 20 - hoursOld * 0.5);

        // Confidence
        score += ((insight.confidence || 50) / 100) * 15;

        // Historical accuracy
        const acc = accuracyMap.get(insight.insight_key);
        if (acc && acc.total_produced >= 5) {
          const accuracyBoost = ((acc.accuracy_score || 50) - 50) / 10;
          score += accuracyBoost;
          const dismissRate = acc.dismissed / acc.total_produced;
          if (dismissRate > 0.6) score -= 20;
        }

        // Vertical match
        if (insight.vertical === vertical) score += 10;

        // Actionable
        if (insight.action_label && insight.action_url) score += 5;

        return {
          ...insight,
          relevance_score: Math.max(0, score),
          data_snapshot: insight.data_snapshot ? JSON.parse(insight.data_snapshot) : null,
          is_dismissed: !!insight.is_dismissed,
        };
      });

      return scored.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 50);
    },
    enabled: !!companyId,
    staleTime: 30000, // 30 seconds
  });

  // Run the intelligence engine for a specific vertical
  const runVerticalEngine = useCallback(async (targetVertical) => {
    if (!companyId || isRunning) return;
    setIsRunning(true);

    try {
      const results = [];

      // Always run universal engine
      const universalConfig = ENGINE_MAP.universal;
      const universalResult = await runEngine(companyId, 'universal', universalConfig.name, universalConfig.fn);
      results.push({ vertical: 'universal', ...universalResult });

      // Run the specific vertical engine
      if (targetVertical && ENGINE_MAP[targetVertical]) {
        const config = ENGINE_MAP[targetVertical];
        const result = await runEngine(companyId, targetVertical, config.name, config.fn);
        results.push({ vertical: targetVertical, ...result });
      }

      setLastRunResult(results);

      // Finally compute health score and store it
      try {
        const healthInsight = await computeHealthScore(companyId, vertical);
        if (healthInsight) {
          await storeInsight(companyId, { ...healthInsight, vertical: 'universal' });
        }
      } catch (healthErr) {
        console.error('Health score error:', healthErr);
      }

      // Refetch insights from the store
      queryClient.invalidateQueries(['workspace_insights']);
      await refetch();
    } catch (err) {
      console.error('[Intelligence] Engine run failed:', err);
    } finally {
      setIsRunning(false);
    }
  }, [companyId, isRunning, queryClient, refetch]);

  // Dismiss an insight
  const dismissInsight = useMutation({
    mutationFn: async (insightId) => {
      await submitInsightFeedback(insightId, companyId, 'dismissed', null, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace_insights']);
    },
  });

  // Submit explicit feedback
  const submitFeedback = useMutation({
    mutationFn: async ({ insightId, feedbackType, outcome }) => {
      await submitInsightFeedback(insightId, companyId, feedbackType, outcome, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace_insights']);
    },
  });

  // Fetch entity-level intelligence
  const getEntityIntelligence = useCallback(async (entityType, entityId) => {
    if (!companyId) return null;
    const res = await powerSync.execute(
      `SELECT * FROM entity_intelligence WHERE company_id = ? AND entity_type = ? AND entity_id = ?`,
      [companyId, entityType, entityId]
    );
    const row = res.rows._array[0];
    if (!row) return null;
    return {
      ...row,
      risk_factors: row.risk_factors ? JSON.parse(row.risk_factors) : [],
      next_actions: row.next_actions ? JSON.parse(row.next_actions) : [],
      key_signals: row.key_signals ? JSON.parse(row.key_signals) : [],
    };
  }, [companyId]);

  // Get last engine run info
  const { data: lastRun } = useQuery({
    queryKey: ['intelligence_runs', companyId, vertical],
    queryFn: async () => {
      if (!companyId) return null;
      let query = `SELECT * FROM intelligence_runs WHERE company_id = ?`;
      const params = [companyId];
      if (vertical) {
        query += ` AND vertical = ?`;
        params.push(vertical);
      }
      query += ` ORDER BY started_at DESC LIMIT 1`;
      const res = await powerSync.execute(query, params);
      return res.rows._array[0] || null;
    },
    enabled: !!companyId,
  });

  // Computed stats
  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const warningCount = insights.filter(i => i.severity === 'warning').length;
  const positiveCount = insights.filter(i => i.severity === 'positive').length;

  return {
    insights,
    isLoading,
    isRunning,
    lastRun,
    lastRunResult,
    criticalCount,
    warningCount,
    positiveCount,
    runEngine: runVerticalEngine,
    dismissInsight: dismissInsight.mutate,
    submitFeedback: submitFeedback.mutate,
    getEntityIntelligence,
    refetch,
  };
}

/**
 * Convenience hook for entity-specific intelligence
 */
export function useEntityIntelligence(entityType, entityId) {
  const { company } = useCompany();
  const companyId = company?.id || null;

  return useQuery({
    queryKey: ['entity_intelligence', companyId, entityType, entityId],
    queryFn: async () => {
      if (!companyId || !entityId) return null;
      const res = await powerSync.execute(
        `SELECT * FROM entity_intelligence WHERE company_id = ? AND entity_type = ? AND entity_id = ?`,
        [companyId, entityType, entityId]
      );
      const row = res.rows._array[0];
      if (!row) return null;
      return {
        ...row,
        risk_factors: row.risk_factors ? JSON.parse(row.risk_factors) : [],
        next_actions: row.next_actions ? JSON.parse(row.next_actions) : [],
        key_signals: row.key_signals ? JSON.parse(row.key_signals) : [],
      };
    },
    enabled: !!companyId && !!entityId,
    staleTime: 60000,
  });
}
