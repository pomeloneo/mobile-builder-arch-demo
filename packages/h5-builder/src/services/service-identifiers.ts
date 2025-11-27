import { createDecorator } from '../bedrock/di/index.common';
import type { HttpService } from './http.service';
import type { TrackerService } from './tracker.service';
import type { BridgeService } from './bridge.service';
import type { PageContextService } from './context.service';

/**
 * Service identifiers for dependency injection
 * These are used with the new DI system instead of class references
 */

export const IHttpService = createDecorator<HttpService>('httpService');
export const ITrackerService = createDecorator<TrackerService>('trackerService');
export const IBridgeService = createDecorator<BridgeService>('bridgeService');
export const IPageContextService = createDecorator<PageContextService>('pageContextService');
