/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRequest = require('./network-request.js');
const EventEmitter = require('events').EventEmitter;

/** @typedef {'requeststarted'|'requestloaded'} NetworkRecorderEvent */

class NetworkRecorder extends EventEmitter {
  /**
   * Creates an instance of NetworkRecorder.
   */
  constructor() {
    super();

    /** @type {NetworkRequest[]} */
    this._records = [];
    /** @type {Map<string, NetworkRequest>} */
    this._recordsById = new Map();
    /** @type {string|null|undefined} */
    this._mainSessionId = null;
  }

  /**
   * Returns the array of raw network request data without finalizing the initiator and
   * redirect chain.
   * @return {Array<NetworkRequest>}
   */
  getRawRecords() {
    return Array.from(this._records);
  }

  /**
   * @param {NetworkRecorderEvent} event
   * @param {*} listener
   */
  on(event, listener) {
    return super.on(event, listener);
  }

  /**
   * @param {NetworkRecorderEvent} event
   * @param {*} listener
   */
  once(event, listener) {
    return super.once(event, listener);
  }

  /**
   * Listener for the DevTools SDK NetworkManager's RequestStarted event, which includes both
   * web socket and normal request creation.
   * @param {NetworkRequest} request
   * @private
   */
  onRequestStarted(request) {
    this._records.push(request);
    this._recordsById.set(request.requestId, request);

    this.emit('requeststarted', request);
  }

  /**
   * Listener for the DevTools SDK NetworkManager's RequestFinished event, which includes
   * request finish, failure, and redirect, as well as the closing of web sockets.
   * @param {NetworkRequest} request
   * @private
   */
  onRequestFinished(request) {
    this.emit('requestloaded', request);
  }

  // The below methods proxy network data into the NetworkRequest object which mimics the
  // DevTools SDK network layer.

  /**
   * @param {{params: LH.Crdp.Network.RequestWillBeSentEvent, sessionId?: string}} event
   */
  onRequestWillBeSent(event) {
    const data = event.params;
    const originalRequest = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    // This is a simple new request, create the NetworkRequest object and finish.
    if (!originalRequest) {
      const request = new NetworkRequest();
      request.onRequestWillBeSent(data);
      request.sessionId = event.sessionId;
      this.onRequestStarted(request);
      return;
    }

    // TODO: beacon to Sentry, https://github.com/GoogleChrome/lighthouse/issues/7041
    if (!data.redirectResponse) {
      return;
    }

    // On redirect, another requestWillBeSent message is fired for the same requestId.
    // Update/finish the previous network request and create a new one for the redirect.
    const modifiedData = {
      ...data,
      // Copy over the initiator as well to match DevTools behavior
      initiator: originalRequest.initiator,
      requestId: `${originalRequest.requestId}:redirect`,
    };
    const redirectedRequest = new NetworkRequest();

    redirectedRequest.onRequestWillBeSent(modifiedData);
    originalRequest.onRedirectResponse(data);

    originalRequest.redirectDestination = redirectedRequest;
    redirectedRequest.redirectSource = originalRequest;

    // Start the redirect request before finishing the original so we don't get erroneous quiet periods
    this.onRequestStarted(redirectedRequest);
    this.onRequestFinished(originalRequest);
  }

  /**
   * @param {{params: LH.Crdp.Network.RequestServedFromCacheEvent, sessionId?: string}} event
   */
  onRequestServedFromCache(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onRequestServedFromCache();
  }

  /**
   * @param {{params: LH.Crdp.Network.ResponseReceivedEvent, sessionId?: string}} event
   */
  onResponseReceived(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onResponseReceived(data);
  }

  /**
   * @param {{params: LH.Crdp.Network.DataReceivedEvent, sessionId?: string}} event
   */
  onDataReceived(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onDataReceived(data);
  }

  /**
   * @param {{params: LH.Crdp.Network.LoadingFinishedEvent, sessionId?: string}} event
   */
  onLoadingFinished(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onLoadingFinished(data);
    this.onRequestFinished(request);
  }

  /**
   * @param {{params: LH.Crdp.Network.LoadingFailedEvent, sessionId?: string}} event
   */
  onLoadingFailed(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onLoadingFailed(data);
    this.onRequestFinished(request);
  }

  /**
   * @param {{params: LH.Crdp.Network.ResourceChangedPriorityEvent, sessionId?: string}} event
   */
  onResourceChangedPriority(event) {
    const data = event.params;
    const request = this._findRealRequestAndSetSession(data.requestId, event.sessionId);
    if (!request) return;
    request.onResourceChangedPriority(data);
  }

  /**
   * Routes network events to their handlers, so we can construct networkRecords
   * @param {LH.Protocol.RawEventMessage} event
   */
  dispatch(event) {
    switch (event.method) {
      case 'Network.requestWillBeSent': return this.onRequestWillBeSent(event);
      case 'Network.requestServedFromCache': return this.onRequestServedFromCache(event);
      case 'Network.responseReceived': return this.onResponseReceived(event);
      case 'Network.dataReceived': return this.onDataReceived(event);
      case 'Network.loadingFinished': return this.onLoadingFinished(event);
      case 'Network.loadingFailed': return this.onLoadingFailed(event);
      case 'Network.resourceChangedPriority': return this.onResourceChangedPriority(event);
      default: return;
    }
  }

  /**
   * Redirected requests all have identical requestIds over the protocol. Once a request has been
   * redirected all future messages referrencing that requestId are about the new destination, not
   * the original. This method is a helper for finding the real request object to which the current
   * message is referring.
   *
   * @param {string} requestId
   * @param {string|undefined} sessionId
   * @return {NetworkRequest|undefined}
   */
  _findRealRequestAndSetSession(requestId, sessionId) {
    // The very first sessionId processed is always the main sessionId. In all but DevTools,
    // this sessionId is undefined. However, in DevTools the main Lighthouse protocol connection
    // does send events with sessionId set to a string, because of how DevTools routes the protocol
    // to Lighthouse.
    // Many places in Lighthouse use `record.sessionId === undefined` to mean that the session is not
    // an OOPIF. To maintain this property, we intercept sessionId here and set it to undefined if
    // it matches the first value seen.
    if (this._mainSessionId === null) {
      this._mainSessionId = sessionId;
    }
    if (this._mainSessionId === sessionId) {
      sessionId = undefined;
    }

    let request = this._recordsById.get(requestId);
    if (!request || !request.isValid) return undefined;

    while (request.redirectDestination) {
      request = request.redirectDestination;
    }

    request.setSession(sessionId);

    return request;
  }

  /**
   * @param {NetworkRequest} record The record to find the initiator of
   * @param {Map<string, NetworkRequest[]>} recordsByURL
   * @return {NetworkRequest|null}
   * @private
   */
  static _chooseInitiatorRequest(record, recordsByURL) {
    if (record.redirectSource) {
      return record.redirectSource;
    }
    const stackFrames = (record.initiator.stack && record.initiator.stack.callFrames) || [];
    const initiatorURL = record.initiator.url || (stackFrames[0] && stackFrames[0].url);

    let candidates = recordsByURL.get(initiatorURL) || [];
    // The initiator must come before the initiated request.
    candidates = candidates.filter(cand => cand.responseReceivedTime <= record.startTime);
    if (candidates.length > 1) {
      // Disambiguate based on prefetch. Prefetch requests have type 'Other' and cannot
      // initiate requests, so we drop them here.
      const nonPrefetchCandidates = candidates.filter(
          cand => cand.resourceType !== NetworkRequest.TYPES.Other);
      if (nonPrefetchCandidates.length) {
        candidates = nonPrefetchCandidates;
      }
    }
    if (candidates.length > 1) {
      // Disambiguate based on frame. It's likely that the initiator comes from the same frame.
      const sameFrameCandidates = candidates.filter(cand => cand.frameId === record.frameId);
      if (sameFrameCandidates.length) {
        candidates = sameFrameCandidates;
      }
    }
    if (candidates.length > 1 && record.initiator.type === 'parser') {
      // Filter to just Documents when initiator type is parser.
      const documentCandidates = candidates.filter(cand =>
        cand.resourceType === NetworkRequest.TYPES.Document);
      if (documentCandidates.length) {
        candidates = documentCandidates;
      }
    }

    // Only return an initiator if the result is unambiguous.
    return candidates.length === 1 ? candidates[0] : null;
  }

  /**
   * Construct network records from a log of devtools protocol messages.
   * @param {LH.DevtoolsLog} devtoolsLog
   * @return {Array<LH.Artifacts.NetworkRequest>}
   */
  static recordsFromLogs(devtoolsLog) {
    const networkRecorder = new NetworkRecorder();
    // playback all the devtools messages to recreate network records
    devtoolsLog.forEach(message => networkRecorder.dispatch(message));

    // get out the list of records & filter out invalid records
    const records = networkRecorder.getRawRecords().filter(record => record.isValid);

    /** @type {Map<string, NetworkRequest[]>} */
    const recordsByURL = new Map();
    for (const record of records) {
      const records = recordsByURL.get(record.url) || [];
      records.push(record);
      recordsByURL.set(record.url, records);
    }

    // set the initiatorRequest and redirects array
    for (const record of records) {
      const initiatorRequest = NetworkRecorder._chooseInitiatorRequest(record, recordsByURL);
      if (initiatorRequest) {
        record.setInitiatorRequest(initiatorRequest);
      }

      let finalRecord = record;
      while (finalRecord.redirectDestination) finalRecord = finalRecord.redirectDestination;
      if (finalRecord === record || finalRecord.redirects) continue;

      const redirects = [];
      for (
        let redirect = finalRecord.redirectSource;
        redirect;
        redirect = redirect.redirectSource
      ) {
        redirects.unshift(redirect);
      }

      finalRecord.redirects = redirects;
    }

    return records;
  }
}

module.exports = NetworkRecorder;
