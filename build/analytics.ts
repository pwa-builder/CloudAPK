import { setup, defaultClient } from 'applicationinsights';

enum AppInsightsStatus {
  ENABLED = 1,
  DISABLED = 0,
  DEFAULT = -1,
}

var appInsightsStatus: AppInsightsStatus = AppInsightsStatus.DEFAULT;
export function setupAnalytics() {
  try {
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
    appInsightsStatus = AppInsightsStatus.ENABLED;
    console.log('App insights enabled successfully');
  } catch (e) {
    appInsightsStatus = AppInsightsStatus.DISABLED;
    console.warn("App insights couldn't be enabled", e);
  }
}

export function trackEvent(
  analyticsInfo: AnalyticsInfo,
  error: string | null,
  success: boolean
) {
  if (appInsightsStatus == AppInsightsStatus.DEFAULT) {
    setupAnalytics();
  }
  if (
    defaultClient == null ||
    defaultClient == undefined ||
    appInsightsStatus == AppInsightsStatus.DISABLED
  ) {
    return;
  }

  var properties: any = {
    name: analyticsInfo.name,
    url: analyticsInfo.url,
    platformId: analyticsInfo.platformId,
    correlationId: analyticsInfo.correlationId,
    platformIdVersion: analyticsInfo.platformIdVersion,
  };

  try {
    if (success) {
      defaultClient.trackEvent({
        name: 'AndroidPackageEvent',
        properties: properties,
      });
    } else {
      properties.error = error;
      defaultClient.trackEvent({
        name: 'AndroidPackageFailureEvent',
        properties: properties,
      });
    }
  } catch (e) {
    console.error(e);
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
