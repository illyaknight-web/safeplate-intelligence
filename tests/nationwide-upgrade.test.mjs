import test from 'node:test';
import assert from 'node:assert/strict';
import {populationCoverage,STATE_POPULATION_2025} from '../netlify/functions/lib/jurisdiction-coverage.mjs';
import {runBacktest} from '../netlify/functions/lib/backtesting.mjs';
import {isActionableStateCandidate} from '../netlify/functions/state-scan-v2.mjs';

test('coverage is population weighted and exposes high-population blind spots',()=>{const r=populationCoverage([{state:'California',status:'ONLINE',actionableSurface:true},{state:'Texas',status:'DEGRADED',actionableSurface:false}]);assert.ok(r.actionablyCoveredPopulation===STATE_POPULATION_2025.California);assert.equal(r.largestPopulationBlindSpots[0].state,'Texas');assert.ok(r.actionableCoveragePercent<r.technicalCoveragePercent+0.01)});
test('generic state food pages cannot become incidents',()=>{assert.equal(isActionableStateCandidate('Food Safety','Food protection program'),false);assert.equal(isActionableStateCandidate('News','Department of Health food safety'),false);assert.equal(isActionableStateCandidate('Salmonella investigation linked to cucumbers','Officials report 12 illnesses'),true)});
test('backtest reports lead time but holds release with inadequate controls',()=>{const r=runBacktest({cases:[{id:'case',status:'CONFIRMED',ground_truth_positive:true,earliest_credible_signal_at:'2026-07-01',recall_published_at:'2026-07-03'}]});assert.equal(r.metrics.meanLeadTimeHours,48);assert.equal(r.releaseGate,'HOLD_INSUFFICIENT_VALIDATION');assert.equal(r.metricsStatus,'PROVISIONAL_NOT_FOR_PERFORMANCE_CLAIMS');assert.equal(r.confusionMatrix.truePositive,1)});
test('undated cases are excluded rather than mislabeled false negatives',()=>{const r=runBacktest({cases:[{id:'unknown',status:'ONGOING'}]});assert.equal(r.validCaseCount,0);assert.equal(r.insufficientDataCaseCount,1);assert.equal(r.confusionMatrix.falseNegative,0)});
