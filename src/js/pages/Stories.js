// @flow weak

import StoriesLineCharts from '../containers/StoriesLineCharts';
import StoriesEpidemics from '../containers/StoriesEpidemics';
import StoriesRanking from '../containers/StoriesRanking';
import LineChart from '../visualizations/LineChart';
import * as d3 from 'd3';
import log from 'loglevel';
import '../../sass/stories.scss';

export default class Stories {

  constructor(parentContainer: HTMLElement) {
    this.createElements(parentContainer);
  }

  createElements(parentContainer: HTMLElement) {

    const elementsContainer = document.createElement('div');
    elementsContainer.id = 'stories';
    elementsContainer.classList.add('page');
    parentContainer.appendChild(elementsContainer);

    const stickyHeader = document.createElement('div');
    stickyHeader.classList.add('sticky-header');
    stickyHeader.innerHTML = "Stories";
    elementsContainer.appendChild(stickyHeader);

    const storiesSeasonal = new StoriesLineCharts(elementsContainer, 'seasonal');
    const storiesHolidays = new StoriesLineCharts(elementsContainer, 'holidays');
    const storiesMedia = new StoriesLineCharts(elementsContainer, 'media');
    const storiesEpidemics = new StoriesEpidemics(elementsContainer, 'epidemics');
    const storiesRanking = new StoriesRanking(elementsContainer);
  }
}
