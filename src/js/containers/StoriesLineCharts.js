// @flow weak

import stories from '../data/stories';
import StoriesNavBar from '../components/StoriesNavBar';
import FiltersMenu from '../components/FiltersMenu';
import LineChart from '../visualizations/LineChart';
import type { Term, Geo, TrendsAPIGraph } from '../util/types';
import * as d3 from 'd3';
import log from 'loglevel';
// import '../../sass/stories.scss';

export default class StoriesLineCharts {
  data: {
    storySection: string,
    currCase: number,
    geoIso: string,
    chartData: {
      [key: string]: TrendsAPIGraph[]
    },
  };
  filtersMenu: HTMLElement;
  chart: LineChart;
  copyContainer: HTMLElement;

  constructor(parentContainer: HTMLElement, storySection: string) {
    const self = this;
    const currCase = 0;
    const geoIso = stories[storySection].cases[currCase].geoList[0];
    d3.json(stories[storySection].cases[currCase].data, function(chartData) {
      self.data = { storySection, currCase, chartData, geoIso };
      self.createElements(parentContainer);
    });
  }

  loadNewCase(event: Event, self: StoriesLineCharts, currCase: number) {
    const { storySection } = self.data;
    const path = stories[storySection].cases[currCase].data;
    const geoIso = stories[storySection].cases[currCase].geoList[0];
    d3.json(path, function(chartData) {
      self.updateData({ currCase, chartData, geoIso });
    });
  }

  changeGeo(geoIso: string, self: StoriesLineCharts) {
    self.updateData({ geoIso });
  }

  updateData(obj) {
    const { data } = this;
    Object.assign(data, obj);
    this.updateElements();
  }

  createElements(parentContainer: HTMLElement) {
    const { storySection, currCase, chartData, geoIso } = this.data;
    const { terms, geoList, chartType, copy } = stories[storySection].cases[currCase];

    const elementsContainer = document.createElement('div');
    elementsContainer.classList.add('story-section');
    parentContainer.appendChild(elementsContainer);

    const sectionHeader = document.createElement('div');
    sectionHeader.classList.add('section-header');
    elementsContainer.appendChild(sectionHeader);

      const title = document.createElement('h1');
      title.innerHTML = stories[storySection].title;
      sectionHeader.appendChild(title);

      const intro = document.createElement('p');
      intro.innerHTML = stories[storySection].intro;
      sectionHeader.appendChild(intro);

    const sectionBody = document.createElement('div');
    sectionBody.classList.add('section-body');
    elementsContainer.appendChild(sectionBody);

      const storiesNavBar = new StoriesNavBar(
        sectionBody,
        stories[storySection].cases.map(c => c.title),
        this,
        this.loadNewCase,
      );

      this.filtersMenu = new FiltersMenu(
        sectionBody,
        terms,
        geoList,
        geoIso,
        this,
        this.changeGeo,
      );

      const chartsContainer = document.createElement('div');
      chartsContainer.classList.add('charts-container');
      sectionBody.appendChild(chartsContainer);

        const chartItem = document.createElement('div');
        chartItem.classList.add('chart-item');
        chartsContainer.appendChild(chartItem);
        this.chart = new LineChart(chartItem, chartType);

    this.copyContainer = document.createElement('div');
    const { copyContainer } = this;
    copyContainer.classList.add('case-copy');
    for(const c of copy) {
      const p = document.createElement('p');
      p.innerHTML = c;
      copyContainer.appendChild(p);
    }
    sectionBody.appendChild(copyContainer);

    this.updateElements();
  }

  updateElements() {
    let { filtersMenu } = this;
    const { chart, copyContainer } = this;
    const { storySection, currCase, chartData, geoIso } = this.data;
    const { terms, geoList, chartType, copy } = stories[storySection].cases[currCase];
    const parent = filtersMenu.parentElement;
    filtersMenu = new FiltersMenu(
      filtersMenu.parentElement,
      terms,
      geoList,
      geoIso,
      this,
      this.changeGeo,
    );

    chart.updateData(chartData[geoIso], chartType);

    copyContainer.innerHTML = '';
    for(const c of copy) {
      const p = document.createElement('p');
      p.innerHTML = c;
      copyContainer.appendChild(p);
    }
  }
}
