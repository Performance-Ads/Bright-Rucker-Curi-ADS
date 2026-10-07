export const additiveFields = ['spend', 'impressions', 'clicks', 'linkClicks', 'landingPageViews', 'leads'];

export function sumReported(rows, field) {
  const values = rows.map(row => row[field]).filter(Number.isFinite);
  return { value: values.length ? values.reduce((sum, value) => sum + value, 0) : null,
    partial: values.length > 0 && values.length < rows.length, reportedRows: values.length, totalRows: rows.length };
}

export function aggregate(rows) {
  const result = { partial: {} };
  for (const field of additiveFields) {
    const metric = sumReported(rows, field);
    result[field] = metric.value;
    result.partial[field] = metric.partial;
  }
  result.linkCtr = ratio(result.linkClicks, result.impressions);
  result.linkCpc = ratio(result.spend, result.linkClicks);
  result.cpl = !result.partial.leads ? ratio(result.spend, result.leads) : null;
  result.pageViewRate = !result.partial.landingPageViews ? ratio(result.landingPageViews, result.linkClicks) : null;
  return result;
}

export function ratio(numerator, denominator) {
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0 ? numerator / denominator : null;
}

export function filterRows(rows, dateRange = 'all', adsetId = 'all', campaignId = 'all') {
  const range = dateRange && dateRange !== 'all' ? dateRange.split('..').sort() : [];
  const start = range[0];
  const end = range[1] || start;
  return rows.filter(row => (!start || row.date >= start && row.date <= end)
    && (!adsetId || adsetId === 'all' || String(row.adsetId) === String(adsetId))
    && (!campaignId || campaignId === 'all' || String(row.campaignId) === String(campaignId)));
}

export function groupMetrics(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
  }
  return [...groups].map(([value, records]) => ({ [key]: value, ...aggregate(records) }));
}

export function resolveScope(queries, dateRange = 'all', adsetId = 'all', campaignId = 'all') {
  const queryId = adsetId && adsetId !== 'all' ? 'meta_adset_daily' : campaignId && campaignId !== 'all' ? 'meta_campaign_daily' : 'meta_daily';
  const sourceRows = filterRows(queries[queryId]?.rows || [], dateRange, adsetId, campaignId);
  return { queryId, sourceRows, totals: aggregate(sourceRows),
    daily: groupMetrics(sourceRows, 'date').sort((a, b) => a.date.localeCompare(b.date)),
    audiences: filterRows(queries.meta_adset_daily?.rows || [], dateRange, adsetId, campaignId),
    campaigns: filterRows(queries.meta_campaign_daily?.rows || [], dateRange, 'all', campaignId),
    ads: filterRows(queries.meta_ad_daily?.rows || [], dateRange, adsetId, campaignId) };
}

export function isFullScope(dateRange, adsetId, period) {
  if (adsetId && adsetId !== 'all') return false;
  if (!dateRange || dateRange === 'all') return true;
  const [start, end = start] = dateRange.split('..').sort();
  return Boolean(period?.since && period?.until && start <= period.since && end >= period.until);
}

export function csvText(rows, fields) {
  const cell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return '\uFEFF' + [fields.map(cell).join(';'), ...rows.map(row => fields.map(field => cell(row[field])).join(';'))].join('\r\n');
}
