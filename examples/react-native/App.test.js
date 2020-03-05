

// monkey-patch
// @link https://github.com/mysticatea/abort-controller/issues/7#issuecomment-380594899
jest.mock("event-target-shim", () => ({
  EventTarget: () => "EventTarget",
  defineEventAttribute: () => "defineEventAttribute"
}));
jest.mock(
  "abort-controller",
  () =>
    class AbortController {
      abort() { }
    }
);

import React from 'react';

import App from './App';

import renderer from 'react-test-renderer';



it('renders without crashing', () => {
  const rendered = renderer.create(<App />).toJSON();
  expect(rendered).toBeTruthy();
});
