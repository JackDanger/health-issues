// @flow weak

import stories from '../data/stories';
import StoriesNavBar from '../components/StoriesNavBar';
import FiltersMenu from '../components/FiltersMenu';
import WorldMap from '../visualizations/WorldMap';
import LineChart from '../visualizations/LineChart';
import type { TrendsAPIRegionsList, TrendsAPIGraph  } from '../util/types';
import * as d3 from 'd3';
import log from 'loglevel';
import '../../sass/stories.scss';

export default class StoriesEpidemics {

  data: {
    storySection: string,
    currCase: number,
    geoIso: string,
    currMonth: number,
    mapData: Array<TrendsAPIRegionsList>,
    chartData: {
      [key: string]: Array<TrendsAPIGraph>,
    },
  };
  filtersMenu: HTMLElement;
  worldMap: WorldMap;
  lineChart: LineChart;
  slider: HTMLInputElement;
  copyContainer: HTMLElement;

  constructor(parentContainer: HTMLElement, storySection: string) {
    const self = this;
    const currCase = 0;
    const geoIso = stories[storySection].cases[currCase].geoList[0];
    const currMonth = 0;

    const elementsContainer = document.createElement('div');
    elementsContainer.classList.add('story-section');
    parentContainer.appendChild(elementsContainer);

    const mapDataPath = stories[storySection].cases[currCase].mapData;
    const chartDataPath = stories[storySection].cases[currCase].chartData;

    d3.json(mapDataPath, function(mapData) {
      d3.json(chartDataPath, function(chartData) {
        self.data = { storySection, currCase, mapData, chartData, geoIso, currMonth };
        self.createElements(elementsContainer);
      });
    });
  }

  loadNewCase(
    event: Event,
    self: StoriesEpidemics,
    elementsContainer: HTMLElement,
    currCase: number
  ) {
    const { storySection } = self.data;
    const mapDataPath = stories[storySection].cases[currCase].mapData;
    const chartDataPath = stories[storySection].cases[currCase].chartData;
    const geoIso = stories[storySection].cases[currCase].geoList[0];
    elementsContainer.querySelectorAll('p').forEach((e, i) => {
      i === currCase ? e.classList.add('active') : e.classList.remove('active')
    });

    d3.json(mapDataPath, function(mapData) {
      const currMonth = 0;
      self.slider.value = '0';
      self.slider.setAttribute('max', (mapData.length - 1).toString());

      d3.json(chartDataPath, function(chartData) {
        self.updateData({ currCase, mapData, chartData, geoIso, currMonth });
      });
    });
  }

  handleSliderChange(event, self: StoriesEpidemics) {
    const { value } = event.target;
    const currMonth = parseInt(value);
    self.updateData({ currMonth });
  }

  updateData(obj) {
    const { data } = this;
    Object.assign(data, obj);
    this.updateElements();
  }

  createElements(elementsContainer: HTMLElement) {
    const { storySection, currCase, mapData, chartData, geoIso, currMonth } = this.data;
    const { terms, geoList, copy } = stories[storySection].cases[
      currCase
    ];

    const sectionHeader = document.createElement('div');
    sectionHeader.classList.add('section-header');
    elementsContainer.appendChild(sectionHeader);

    let container = document.createElement('div');
    container.classList.add('container');
    sectionHeader.appendChild(container);

    const title = document.createElement('h3');
    title.innerHTML = stories[storySection].title;
    container.appendChild(title);

    const intro = document.createElement('p');
    intro.innerHTML = stories[storySection].intro;
    container.appendChild(intro);

    const storiesNavBar = new StoriesNavBar(
      elementsContainer,
      stories[storySection].cases.map(c => c.title),
      this,
      this.loadNewCase
    );

    const sectionBody = document.createElement('div');
    sectionBody.classList.add('section-body');
    elementsContainer.appendChild(sectionBody);

    container = document.createElement('div');
    container.classList.add('container');
    sectionBody.appendChild(container);

    this.filtersMenu = new FiltersMenu(
      container,
      terms,
      geoList,
      geoIso
    );

    const row = document.createElement('div');
    row.classList.add('row');
    container.appendChild(row);

    const chartsContainer = document.createElement('div');
    chartsContainer.classList.add('charts-container');
    row.appendChild(chartsContainer);

    let chartItem = document.createElement('div');
    chartItem.classList.add('chart-item');
    chartsContainer.appendChild(chartItem);
    this.worldMap = new WorldMap(chartItem, mapData[currMonth].regions);

    chartItem = document.createElement('div');
    chartItem.classList.add('chart-item');
    chartsContainer.appendChild(chartItem);
    this.lineChart = new LineChart(chartItem);

    this.slider = document.createElement('input');
    const { slider } = this;
    slider.setAttribute('type', 'range');
    slider.setAttribute('min', '0');
    slider.setAttribute('max', (mapData.length - 1).toString());
    slider.value = '0';
    const bindSliderChange = evt => this.handleSliderChange(evt, this);
    slider.addEventListener('input', bindSliderChange);
    chartsContainer.appendChild(slider);

    this.copyContainer = document.createElement('div');
    const { copyContainer } = this;
    copyContainer.classList.add('case-copy');
    for (const c of copy) {
      const p = document.createElement('p');
      p.innerHTML = c;
      copyContainer.appendChild(p);
    }
    row.appendChild(copyContainer);

    this.updateElements();
  }

  updateElements(self?: StoriesEpidemics) {
    if (!self) self = this;
    let { filtersMenu } = this;
    const { worldMap, lineChart, copyContainer } = self;
    const { storySection, currCase, mapData, chartData, geoIso, currMonth } = self.data;
    const { terms, geoList, chartType, copy } = stories[storySection].cases[currCase];
    log.info('EPIDEMIC');
    log.info(currCase);
    log.info(copy);
    log.info(geoIso);
    log.info(chartData);
    const parent = filtersMenu.parentElement;
    filtersMenu = new FiltersMenu(
      filtersMenu.parentElement,
      terms,
      geoList,
      geoIso
    );

    if (worldMap.worldFeatures) worldMap.updateData(mapData[currMonth].regions);
    lineChart.updateData(chartData[geoIso]);

    // copyContainer.innerHTML = '';
    // for (const c of copy) {
    //   const p = document.createElement('p');
    //   p.innerHTML = c;
    //   copyContainer.appendChild(p);
    // }
  }
}
