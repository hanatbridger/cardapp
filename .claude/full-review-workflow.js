export const meta = {
  name: 'cardpulse-full-review',
  description: 'Fan-out code review of the CardPulse app (bugs, security, reliability, perf) with adversarial verification',
  phases: [
    { title: 'Review', detail: 'one reviewer per area, reads its files, returns structured findings' },
    { title: 'Verify', detail: 'adversarial refute-by-default verification of each finding' },
  ],
}

// The api/ edge functions were already reviewed and fixed in a prior pass
// (commits cdcdea6). This run covers everything else: auth/payments,
// data services, alerts/notifications, state+hooks, screens, components,
// and the utils/theme/types base layer.
const AREAS = [
  {
    key: 'auth-payments',
    title: 'Auth & payments',
    files: [
      'app/(auth)/_layout.tsx', 'app/(auth)/login.tsx', 'app/(auth)/signup.tsx',
      'src/components/AuthForm.tsx', 'src/services/google-auth.ts',
      'src/services/supabase.ts', 'src/services/revenue-cat.ts',
      'app/paywall.tsx', 'app/change-password.tsx', 'app/edit-profile.tsx',
      'api/account/delete.ts', 'src/stores/user-store.ts',
      'src/constants/google-auth.ts',
    ],
    focus:
      'Auth correctness and payment/entitlement integrity. Look hard for: premium/entitlement state that can desync from RevenueCat; auth flows that leave the user in a half-authenticated state; session/token handling; OAuth redirect/audience mistakes; secrets or service-role keys reachable from the client bundle; the account-delete endpoint authorizing the wrong user or failing partway; password-change validation gaps.',
  },
  {
    key: 'data-services',
    title: 'Data services',
    files: [
      'src/services/api-client.ts', 'src/services/ebay-proxy.ts',
      'src/services/news.ts', 'src/services/pokemon-tcg.ts',
      'src/services/tcgplayer.ts', 'src/services/trending.ts',
      'src/services/price-prediction.ts',
    ],
    focus:
      'Network/data-layer reliability. Look for: missing timeouts/abort on fetch; unhandled non-2xx responses; JSON parsed without shape-checking then indexed into; NaN/undefined propagating into prices; cache keys that collide or never invalidate; retry storms; silent catch that hides failures; off-by-one or wrong-field mapping from upstream payloads.',
  },
  {
    key: 'alerts-notifications',
    title: 'Alerts & notifications',
    files: [
      'src/services/alert-checker.ts', 'src/services/background-alerts.ts',
      'src/services/notifications.ts', 'src/hooks/use-alert-checker.ts',
      'src/stores/alerts-store.ts',
    ],
    focus:
      'Price-alert correctness and background execution. Look for: alerts that never fire or fire repeatedly; above/below comparison inverted; triggered-state races; background task registration/cleanup leaks; notification permission assumptions; timezone/date bugs in scheduling; the new free-cap upsert logic mis-counting active alerts.',
  },
  {
    key: 'state-hooks',
    title: 'State & data hooks',
    files: [
      'src/stores/watchlist-store.ts', 'src/stores/theme-override-store.ts',
      'src/stores/index.ts', 'src/lib/query-client.ts',
      'src/hooks/use-card-detail.ts', 'src/hooks/use-card-price.ts',
      'src/hooks/use-card-search.ts', 'src/hooks/use-collapsing-header.ts',
      'src/hooks/use-news.ts', 'src/hooks/use-price-history.ts',
      'src/hooks/use-sealed.ts', 'src/hooks/use-trending.ts',
    ],
    focus:
      'Zustand stores and React Query hooks. Look for: persist/hydration races (reading state before hydration); selectors that return new objects each render causing infinite re-renders; missing/incorrect queryKeys causing stale or cross-card data; staleTime/gcTime mistakes; effects with wrong or missing deps; subscriptions/timers not cleaned up; mutations that do not invalidate.',
  },
  {
    key: 'screens-primary',
    title: 'Primary screens',
    files: [
      'app/(tabs)/index.tsx', 'app/(tabs)/search.tsx',
      'app/(tabs)/notifications.tsx', 'app/(tabs)/profile.tsx',
      'app/(tabs)/news.tsx', 'app/card/[id].tsx',
    ],
    focus:
      'Tab screens + card detail. Look for: crashes on undefined data before load; missing loading/empty/error states; key/grade state desync; effects firing on every render; list keyExtractor missing or non-unique; navigation params unvalidated; the card screen price/grade/alert wiring.',
  },
  {
    key: 'screens-secondary',
    title: 'Secondary screens',
    files: [
      'app/sealed/[id].tsx', 'app/set/[id].tsx', 'app/artist/[name].tsx',
      'app/settings.tsx', 'app/onboarding.tsx', 'app/_layout.tsx',
      'app/(tabs)/_layout.tsx', 'app/help.tsx', 'app/change-password.tsx',
    ],
    focus:
      'Detail/config screens + root layout. Look for: provider ordering bugs in _layout; route param handling that crashes on bad input; back-navigation that strands the user; settings writes that do not persist; onboarding that can be skipped into a broken state; the floating tab bar hit-testing.',
  },
  {
    key: 'components',
    title: 'Components',
    files: [
      'src/components/PriceChart.tsx', 'src/components/TrendingCarousel.tsx',
      'src/components/Touchable.tsx', 'src/components/SwipeToDelete.tsx',
      'src/components/ScreenBackground.tsx', 'src/components/CollapsingHeader.tsx',
      'src/components/ErrorBoundary.tsx', 'src/components/WatchlistFullModal.tsx',
      'src/components/Input.tsx', 'src/components/Button.tsx',
      'src/components/AnimatedListItem.tsx', 'src/components/CardFundamentals.tsx',
      'src/components/MarketDynamics.tsx', 'src/components/NewsCard.tsx',
    ],
    focus:
      'Reusable components, especially animated/gesture/SVG ones. Look for: Reanimated/gesture handlers that leak or read stale closures; SVG path math that divides by zero or breaks on empty/one-point data; FlatList perf (inline renderItem, missing memo); animations not paused on blur; ErrorBoundary not actually catching; forwardRef/controlled-input bugs.',
  },
  {
    key: 'utils-theme',
    title: 'Utils, theme & types',
    files: [
      'src/utils/format.ts', 'src/utils/haptics.ts', 'src/utils/safeGoBack.ts',
      'src/utils/withAlpha.ts', 'src/theme/ThemeProvider.tsx',
      'src/theme/tokens.ts', 'src/services/sentry.ts',
      'src/constants/grades.ts', 'src/constants/layout.ts',
      'src/constants/links.ts',
    ],
    focus:
      'Base layer used everywhere — a bug here is high-blast-radius. Look for: format/number helpers that throw or return NaN on edge inputs (null, 0, negative, huge); withAlpha producing invalid colors; safeGoBack edge cases; ThemeProvider light/dark resolution and color-scheme listener cleanup; Sentry init leaking PII or running in dev.',
  },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'one-line summary of the defect' },
          file: { type: 'string', description: 'repo-relative path' },
          line: { type: 'string', description: 'line number or range, e.g. "42" or "42-50"' },
          category: { type: 'string', enum: ['bug', 'security', 'reliability', 'performance'] },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          description: { type: 'string', description: 'what is wrong and the concrete scenario where it bites' },
          evidence: { type: 'string', description: 'the actual code snippet or behavior proving it, quoted from the file' },
          suggestedFix: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['title', 'file', 'line', 'category', 'severity', 'description', 'evidence', 'suggestedFix', 'confidence'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'refuted', 'uncertain'] },
    reasoning: { type: 'string', description: 'why — cite the actual code you read' },
    correctedSeverity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'none'] },
    falsePositiveReason: { type: 'string', description: 'if refuted, why the original finding was wrong (handled elsewhere, misread, etc.)' },
  },
  required: ['verdict', 'reasoning', 'correctedSeverity'],
}

function reviewPrompt(area) {
  return `You are a senior React Native / TypeScript reviewer auditing the CardPulse app (Expo SDK 54, RN 0.81 new arch, Zustand, React Query, Supabase auth, RevenueCat).

Review AREA: ${area.title}

Read these files in full and review EVERY function:
${area.files.map((f) => `  - ${f}`).join('\n')}

Focus for this area:
${area.focus}

Report only REAL defects: things that cause wrong behavior, crashes, security exposure, data corruption, leaks, or material performance loss. Each finding needs a concrete scenario where it bites and a quoted code snippet as evidence.

Do NOT report:
- style, naming, or formatting
- design-token lint violations (hardcoded colors/spacing) — a separate lint rule owns those
- speculative "could be cleaner" refactors with no behavioral consequence
- missing tests

Be precise with file paths and line numbers. If a file is clean, say nothing about it. Return your findings via the structured output tool. If you find nothing real, return an empty findings array.`
}

function verifyPrompt(f) {
  return `You are an adversarial verifier. Your job is to REFUTE the following code-review finding, not to agree with it. Default to "refuted" unless the code genuinely proves the defect real.

FINDING
  title: ${f.title}
  file: ${f.file}
  line: ${f.line}
  category: ${f.category}
  claimed severity: ${f.severity}
  description: ${f.description}
  evidence claimed: ${f.evidence}

Open ${f.file}, read the cited lines AND the surrounding context (imports, the whole function, any guard or handler elsewhere in the file or its callers). Then decide:
- "confirmed": the defect is real and bites in a realistic scenario. Give the corrected severity.
- "refuted": the finding misreads the code, the case is already handled, the input cannot actually occur, or the impact is nil. Explain why in falsePositiveReason.
- "uncertain": you cannot fully prove it either way from the code.

Cite the actual code you read in your reasoning. Be skeptical of high-severity claims especially.`
}

phase('Review')
const reviewed = await pipeline(
  AREAS,
  (area) =>
    agent(reviewPrompt(area), {
      label: `review:${area.key}`,
      phase: 'Review',
      schema: FINDINGS_SCHEMA,
    }).then((r) => ({ area, findings: (r && r.findings) || [] })),
  (res) => {
    if (!res || res.findings.length === 0) return { area: res ? res.area.key : null, verified: [] }
    return parallel(
      res.findings.map((f) => () =>
        agent(verifyPrompt(f), {
          label: `verify:${f.file}:${f.line}`,
          phase: 'Verify',
          schema: VERDICT_SCHEMA,
        })
          .then((v) => ({ ...f, area: res.area.key, verification: v }))
          // Resilience: if a verifier dies, keep the finding flagged
          // unverified rather than dropping it silently.
          .catch(() => ({ ...f, area: res.area.key, verification: { verdict: 'uncertain', reasoning: 'verifier failed', correctedSeverity: f.severity } })),
      ),
    ).then((verified) => ({ area: res.area.key, verified: verified.filter(Boolean) }))
  },
)

const all = reviewed.filter(Boolean).flatMap((r) => r.verified)
const confirmed = all.filter((f) => f.verification && f.verification.verdict === 'confirmed')
const uncertain = all.filter((f) => f.verification && f.verification.verdict === 'uncertain')
const refuted = all.filter((f) => f.verification && f.verification.verdict === 'refuted')

const sevRank = { critical: 0, high: 1, medium: 2, low: 3, none: 4 }
function effSev(f) {
  return (f.verification && f.verification.correctedSeverity) || f.severity
}
confirmed.sort((a, b) => (sevRank[effSev(a)] ?? 9) - (sevRank[effSev(b)] ?? 9))
uncertain.sort((a, b) => (sevRank[effSev(a)] ?? 9) - (sevRank[effSev(b)] ?? 9))

log(`Review complete: ${confirmed.length} confirmed, ${uncertain.length} uncertain, ${refuted.length} refuted (${all.length} total findings across ${AREAS.length} areas)`)

return {
  summary: {
    areasReviewed: AREAS.length,
    totalFindings: all.length,
    confirmed: confirmed.length,
    uncertain: uncertain.length,
    refuted: refuted.length,
  },
  confirmed: confirmed.map((f) => ({
    severity: effSev(f), category: f.category, area: f.area,
    file: f.file, line: f.line, title: f.title,
    description: f.description, suggestedFix: f.suggestedFix,
    verifierReasoning: f.verification.reasoning,
  })),
  uncertain: uncertain.map((f) => ({
    severity: effSev(f), category: f.category, area: f.area,
    file: f.file, line: f.line, title: f.title,
    description: f.description, suggestedFix: f.suggestedFix,
    verifierReasoning: f.verification.reasoning,
  })),
}
