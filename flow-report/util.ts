/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {createContext} from 'preact';
import {useContext, useEffect, useState} from 'preact/hooks';

export const FlowResultContext = createContext<LH.FlowResult|undefined>(undefined);

export function useFlowResult(): LH.FlowResult {
  // Expect this to always be called within a valid context provider.
  // Cast to LH.FlowResult to prevent extra type handling.
  return useContext(FlowResultContext) as LH.FlowResult;
}

export function useLocale(): LH.Locale {
  const flowResult = useFlowResult();
  return flowResult.lhrs[0].configSettings.locale;
}

export function useCurrentLhr(): {value: LH.Result, index: number}|null {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    function hashListener() {
      setHash(location.hash);
    }
    window.addEventListener('hashchange', hashListener);
    return () => window.removeEventListener('hashchange', hashListener);
  }, []);

  if (!hash) return null;

  const index = Number(hash.substr(1));
  if (!Number.isFinite(index)) {
    console.warn(`Invalid hash index: ${hash}`);
    return null;
  }

  const flowResult = useFlowResult();
  const value = flowResult.lhrs[index];
  if (!value) {
    console.warn(`No LHR at index ${index}`);
    return null;
  }

  return {value, index};
}

export function classNames(...args: Array<string|undefined|Record<string, boolean>>): string {
  const classes = [];
  for (const arg of args) {
    if (!arg) continue;

    if (typeof arg === 'string') {
      classes.push(arg);
      continue;
    }

    const applicableClasses = Object.entries(arg)
      .filter(([_, shouldApply]) => shouldApply)
      .map(([className]) => className);
    classes.push(...applicableClasses);
  }

  return classes.join(' ');
}
