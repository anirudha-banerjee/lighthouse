/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview The entry point for rendering the Lighthouse report for the HTML file created by ReportGenerator.
 * The renderer code is bundled and injected into the report HTML along with the JSON report.
 */

import {render, FunctionComponent} from 'preact';

/* global window document location */

function getCurrentLhr():number|null {
  const searchParams = new URLSearchParams(location.search);
  const step = searchParams.get('step');
  if (step === null) return null;
  return Number(step);
}

// eslint-disable-next-line no-undef
const Report:FunctionComponent<{lhr: LH.Result}> = ({lhr}) => {
  // TODO(FR-COMPAT): Render an actual report here.
  return (
    <div>
      <h1>{lhr.finalUrl}</h1>
      {
        Object.values(lhr.categories).map((category) =>
          <h2>{category.id}: {category.score}</h2>
        )
      }
    </div>
  );
};

const Hbar:FunctionComponent = () => {
  return <div className="Hbar"></div>;
};

const SidebarSummary:FunctionComponent = () => {
  const isCurrent = getCurrentLhr() === null;
  const url = new URL(location.href);
  url.searchParams.delete('step');
  return (
    <a
      href={url.href}
      className={`SidebarSummary ${isCurrent ? 'Sidebar_current' : undefined}`}
    >Summary</a>
  );
};

const SidebarFlowStep:FunctionComponent<{
  // eslint-disable-next-line no-undef
  mode: LH.Gatherer.GatherMode,
  href: string,
  label: string,
  hideTopLine: boolean,
  hideBottomLine: boolean,
  row: number,
  current: boolean,
}> = ({href, label, mode, row, hideTopLine, hideBottomLine, current}) => {
  return (
    <>
      <a
        className={`SidebarFlowStep_link ${current ? 'Sidebar_current' : ''}`}
        href={href} style={{gridRow: row}}
      />
      <div className="SidebarFlowStep_icon" style={{gridRow: row}}>
        <div
          className="SidebarFlowStep_icon_line"
          style={hideTopLine ? {background: 'transparent'} : undefined}
        />
        <div className={`SidebarFlowStep_icon_mode ${mode}`}></div>
        <div
          className="SidebarFlowStep_icon_line"
          style={hideBottomLine ? {background: 'transparent'} : undefined}
        />
      </div>
      <div className="SidebarFlowStep_label" style={{gridRow: row}}>{label}</div>
    </>
  );
};

const SidebarFlow:FunctionComponent<{steps: number}> = ({children}) => {
  return (
    <div className="SidebarFlow">
      {children}
    </div>
  );
};

const SidebarSection:FunctionComponent<{title: string}> = ({children, title}) => {
  return (
    <div className="SidebarSection">
      <div className="SidebarSection_title">{title}</div>
      <div className="SidebarSection_content">
        {children}
      </div>
    </div>
  );
};

// eslint-disable-next-line no-undef
const Sidebar:FunctionComponent<{flow: LH.FlowResult}> = ({flow}) => {
  let numNavigation = 1;
  let numTimespan = 1;
  let numSnapshot = 1;
  const links = flow.lhrs.map((lhr, index) => {
    let name = '?';
    switch (lhr.gatherMode) {
      case 'navigation':
        name = `Navigation ${numNavigation++}`;
        break;
      case 'timespan':
        name = `Timespan ${numTimespan++}`;
        break;
      case 'snapshot':
        name = `Snapshot ${numSnapshot++}`;
        break;
    }
    const url = new URL(location.href);
    url.searchParams.set('step', String(index));
    const current = getCurrentLhr();
    return (
      <SidebarFlowStep
        mode={lhr.gatherMode}
        href={url.href}
        label={name}
        row={index + 1}
        hideTopLine={index === 0}
        hideBottomLine={index === flow.lhrs.length - 1}
        current={index === current}
      />
    );
  });
  return (
    <div className="Sidebar">
      <SidebarSection title="USER FLOW">
        <Hbar/>
        <SidebarSummary/>
        <Hbar/>
        <SidebarFlow steps={links.length}>
          {links}
        </SidebarFlow>
      </SidebarSection>
    </div>
  );
};

// eslint-disable-next-line no-undef
const App:FunctionComponent<{flow: LH.FlowResult}> = ({flow}) => {
  const current = getCurrentLhr();
  return (
    <div className="App">
      <Sidebar flow={flow}/>
      {
        current === null ?
          <h1>Summary</h1> :
          <Report lhr={flow.lhrs[current]}/>
      }
    </div>
  );
};

// Used by standalone-flow.html
function __initLighthouseFlowReport__() {
  render(
    // @ts-expect-error
    <App flow={window.__LIGHTHOUSE_JSON__} />,
    // @ts-expect-error
    document.body.querySelector('main')
  );
}

// @ts-expect-error
window.__initLighthouseFlowReport__ = __initLighthouseFlowReport__;
