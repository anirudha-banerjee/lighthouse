/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview Expected Lighthouse audit values for various sites with stable(ish) PWA results. */

const pwaDetailsExpectations = require('./pwa-expectations-details.js');

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results for airhorner.com.
 */
const airhorner = {
  lhr: {
    requestedUrl: 'https://airhorner.com',
    finalUrl: 'https://airhorner.com/',
    audits: {
      'redirects-http': {
        score: 1,
      },
      'service-worker': {
        score: 1,
      },
      'viewport': {
        score: 1,
      },
      'installable-manifest': {
        score: 1,
        details: {items: [], debugData: {manifestUrl: 'https://airhorner.com/manifest.json'}},
      },
      'splash-screen': {
        score: 1,
        details: {items: [pwaDetailsExpectations]},
      },
      'themed-omnibox': {
        score: 1,
        details: {items: [{...pwaDetailsExpectations, themeColor: '#2196F3'}]},
      },
      'content-width': {
        score: 1,
      },
      'apple-touch-icon': {
        score: 1,
      },

      // "manual" audits. Just verify in the results.
      'pwa-cross-browser': {
        score: null,
        scoreDisplayMode: 'manual',
      },
      'pwa-page-transitions': {
        score: null,
        scoreDisplayMode: 'manual',
      },
      'pwa-each-page-has-url': {
        score: null,
        scoreDisplayMode: 'manual',
      },
    },
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results for chromestatus.com.
 */
const chromestatus = {
  lhr: {
    requestedUrl: 'https://www.chromestatus.com/features',
    finalUrl: 'https://www.chromestatus.com/features',
    audits: {
      'redirects-http': {
        score: 1,
      },
      'service-worker': {
        score: 0,
      },
      'viewport': {
        score: 1,
      },
      'installable-manifest': {
        score: 0,
        details: {items: [{reason: 'No manifest was fetched'}]},
      },
      'splash-screen': {
        score: 0,
      },
      'themed-omnibox': {
        score: 0,
      },
      'content-width': {
        score: 1,
      },
      'apple-touch-icon': {
        score: 1,
      },

      // "manual" audits. Just verify in the results.
      'pwa-cross-browser': {
        score: null,
        scoreDisplayMode: 'manual',
      },
      'pwa-page-transitions': {
        score: null,
        scoreDisplayMode: 'manual',
      },
      'pwa-each-page-has-url': {
        score: null,
        scoreDisplayMode: 'manual',
      },
    },
  },
};

module.exports = {
  airhorner,
  chromestatus,
};
