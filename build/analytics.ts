import { setup, defaultClient } from 'applicationinsights';

export function setupAnalytics() {
  setup(process.env.APPINSIGHTSCONNECTIONSTRING)
    .setAutoDependencyCorrelation(false)
    .setAutoCollectRequests(false)
    .setAutoCollectPerformance(false, false)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(false)
    .setAutoCollectConsole(false)
    .setUseDiskRetryCaching(false)
    .setSendLiveMetrics(false)
    .start();
}
export function trackEvent(
  analyticsInfo: AnalyticsInfo,
  error: string | null,
  success: boolean
) {
  if (
    !process.env.APPINSIGHTSCONNECTIONSTRING &&
    process.env.APPINSIGHTSCONNECTIONSTRING?.trim() != ''
  ) {
    console.warn('No App insights connection string found');
    return;
  }

  if (defaultClient == null || defaultClient == undefined) {
    setupAnalytics();
  }

  var properties: any = {
    name: analyticsInfo.name,
    url: analyticsInfo.url,
    platformId: analyticsInfo.platformId,
    correlationId: analyticsInfo.correlationId,
    platformIdVersion: analyticsInfo.platformIdVersion,
  };

  if (success) {
    defaultClient.trackEvent({
      name: 'AndroidPackageEvent',
      properties,
    });
  } else {
    properties.error = error;
    defaultClient.trackEvent({
      name: 'AndroidPackageFailureEvent',
      properties,
    });
  }
}

export type AnalyticsInfo = {
  url: string;
  name: string;
  packageId: string;
  platformId: string | null;
  platformIdVersion: string | null;
  correlationId: string | null;
};
