//copied from https://github.com/cmfcmf/docusaurus-search-local
import Mark from "mark.js";
import { useEffect, useState } from "react";
import { useLocation } from "@docusaurus/router";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { useHistory } from "@docusaurus/router";

export function HighlightSearchResults() {
  const location = useLocation();
  const history = useHistory();
  const {
    siteConfig: { baseUrl },
  } = useDocusaurusContext();

  const [highlightData, setHighlightData] = useState({ wordToHighlight: '', isTitleSuggestion: false , titleText: '' });

  useEffect(() => {
    if (
      !location.state?.highlightState ||
      location.state.highlightState.wordToHighlight.length === 0
    ) {
      return;
    }
    setHighlightData(location.state.highlightState);

    const { highlightState, ...state } = location.state;
    history.replace({
      ...location,
      state,
    });
  }, [location.state?.highlightState, history, location]);

  useEffect(() => {
    if (highlightData.wordToHighlight.length === 0) {
      return;
    }

    // Make sure to also adjust parse.js if you change the top element here.
    const root =  document.getElementsByTagName("article")[0] ?? document.getElementsByTagName("main")[0] ;
    if (!root) {
      return;
    }

    const mark = new Mark(root);
    const options = {
      ignoreJoiners: true,
    };
    mark.mark(highlightData.wordToHighlight , options);
    return () => mark.unmark(options);
  }, [highlightData, baseUrl]);

  return null;
}
