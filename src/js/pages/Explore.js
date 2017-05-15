// @flow weak

// Components
import { LineChart } from '../visualizations/LineChart';
import { TrendsAPI } from '../api/TrendsAPI';
import { ShinyAPI } from '../api/ShinyAPI';

// Types
import type { Term, Geo, Filter, TrendsAPIGraph, TrendsAPITopQueries } from '../util/types'

// Data and Utils
import { arrayIsEqual } from '../util/util.js';
import { dummyData, terms, countries } from '../util/data.js';

// Libraries
import log from 'loglevel';
import selectize from 'selectize';
import $ from 'jquery';

//Styles
import 'selectize/dist/css/selectize.css';
import '../../sass/explore.scss';



export class Explore {

  data: {
    prevDiseases: Term[],
    diseases: Term[],
    prevGeo: Geo,
    geo: Geo,
    seasonal: TrendsAPIGraph[],
    trend: TrendsAPIGraph[],
    total: TrendsAPIGraph[],
    topQueries: TrendsAPITopQueries[],
    dataToR: string[],
    dataFromR: string,
    isMerged: boolean,
    isChanging: boolean,
    isLoading: boolean
  };

  diseaseSelect: selectize;
  geoSelect: selectize;

  loaderContainer: HTMLElement;
  confirmNav: HTMLElement;
  mergeButton: HTMLElement;
  topQueriesList: HTMLElement;

  seasonalChart: LineChart;
  trendChart: LineChart;

  trendsAPI: TrendsAPI;
  shinyAPI: ShinyAPI;

  constructor(parentContainer: HTMLElement, trendsAPI: TrendsAPI, filter?: Filter) {
    this.data = {
      prevDiseases: filter ? filter.terms : [],
      diseases: filter ? filter.terms : [],
      prevGeo: filter ? filter.geo : countries[0],
      geo: filter ? filter.geo : countries[0],
      seasonal: [],
      trend: [],
      total: [],
      topQueries: [],
      dataToR: [],
      dataFromR: '',      
      isMerged: false,
      isChanging: false,
      isLoading: false
    }
    const self = this;
    self.trendsAPI = trendsAPI;
    // self.trendsAPI = new TrendsAPI();
    // self.trendsAPI.setup(function(){
    //   if (filter) {
    //     self.getTrendsAPIGraph();
    //   }
    // });
    self.shinyAPI = new ShinyAPI();
    self.shinyAPI.addListeners(self, self.parseDataFromR);
    self.createElements(parentContainer);
  }

  handleSelectDiseaseChange(value: string[], self: Explore) {
    log.info('handleSelectDiseaseChange');
    const diseases = value.map(v => self.getDiseaseByEntity(v));
    this.updateData({diseases: diseases, isChanging: true});
    self.confirmNav.classList.remove('hidden');
  }

  handleSelectGeoChange(value: string, self: Explore) {
    log.info('handleSelectGeoChange');
    log.info(value);
    const name = this.getCountryByIso(value).name;
    this.updateData({geo: {iso: value, name: name, isChanging: true}});
    self.confirmNav.classList.remove('hidden');
  }

  getDiseaseByEntity(entity: string): Term {
    return terms.find(t => t.entity === entity);
  }

  getCountryByIso(iso: string): Geo {
    return countries.find(c => c.iso === iso);
  }

  cancelFilters(event, self) {
    log.info('cancelFilters');
    const { prevDiseases, prevGeo } = self.data;
    self.confirmNav.classList.add('hidden');
    self.updateData({ diseases: prevDiseases, geo: prevGeo, isChanging: false });
  }

  confirmFilters(event, self) {
    log.info('confirmFilters');
    const { diseases, geo } = self.data;
    self.confirmNav.classList.add('hidden');
    self.updateData({ prevDiseases: diseases, prevGeo: geo, isChanging: true, isLoading: true });
    self.getTrendsAPIGraph();
  }

  toggleChartMerge(event, self) {
    let { isMerged } = self.data;
    isMerged = isMerged ? false : true;
    this.seasonalChart.hide();
    this.updateData({ isMerged: isMerged, isChanging: true });
  }

  loadCurated(filter: Filter) {
    const { terms, geo } = filter;
    this.updateData({ prevDiseases: terms, diseases: terms, prevGeo: geo, geo: geo, isChanging: true, isLoading: true });
    this.confirmNav.classList.add('hidden');
    this.getTrendsAPIGraph();
  }

  getTrendsAPIGraph(){
    log.info('getTrendsAPIGraph');
    const { diseases, geo } = this.data;
    let total = [];
    const self = this;

    self.trendsAPI.getGraph({terms: diseases, geo: geo}, function(val){
      log.info('From Google Trends: ', val);
      const total = val.lines.map((l, i) => {
        return { term: diseases[i].name, points: l.points}
      });
      self.updateData({ total: total, seasonal: [], trend: [] });
      self.parseDataToR();
    });
  }

  getTrendsAPITopQueries(){
    log.info('getTrendsAPITopQueries');
    const { diseases, geo } = this.data;
    let { topQueries } = this.data;
    const index = topQueries.length;
    const self = this;

    self.trendsAPI.getTopQueries({terms: diseases, geo: geo}, index, function(val){
      log.info('From Google Trends: ', val);
      topQueries = topQueries.concat(val);
      self.updateData({topQueries});
      if (topQueries.length < diseases.length) {
        self.getTrendsAPITopQueries();
      }
    });
  }  

  parseDataToR() {
    log.info('parseDataToR');
    const { dataToR, dataFromR, total, seasonal } = this.data;
    const { shinyAPI } = this;
    const index = seasonal.length;

    // const newDataToR = total[index].points.map((p, i) => p.date+','+p.value);
    // if (arrayIsEqual(dataToR, newDataToR)) {
    //   this.parseDataFromR(this, dataFromR);
    // } else {
    //   this.updateData({ dataToR: newDataToR });
    //   shinyAPI.updateData(newDataToR);
    // }
    this.parseDataFromR(this, dummyData[index]);
  }

  parseDataFromR(explore, dataFromR) {
    log.info('parseDataFromR');
    const self = explore;
    const { total, diseases, isLoading } = self.data;
    let { seasonal, trend } = self.data;
    const index = seasonal.length;

    const currSeasonalString = dataFromR.substring(
      dataFromR.indexOf('seasonal:') + 'seasonal:'.length + 1,
      dataFromR.indexOf('trend:'));
    const currSeasonal = (currSeasonalString.split(','))
      .slice(0, 13)
      .map((n, i) => {
        return{
          date: total[0].points[i].date,
          value: (Math.round(Number(n.trim())*100))/100
        }
      });
    seasonal.push({ term: diseases[index].name, points: currSeasonal });

    const currTrendString = dataFromR.substring(
      dataFromR.indexOf('trend:') + 'trend:'.length + 1,
      dataFromR.length);
    const currTrend = (currTrendString.split(','))
      .map((n, i) => {
        return{
          date: total[0].points[i].date,
          value: Math.round(Number(n.trim()))
        }
      });
    trend.push({ term: diseases[index].name, points: currTrend });

    self.updateData({ seasonal: seasonal, trend: trend, dataFromR: dataFromR });

    if (seasonal.length === total.length) {
      self.updateData({ topQueries: [], isLoading: false });      
      this.getTrendsAPITopQueries();
    } else {
      self.parseDataToR();
    }
  }

  createElements(parentContainer: HTMLElement) {

    const elementsContainer = document.createElement('div');
    elementsContainer.id = 'explore';
    elementsContainer.classList.add('page');
    parentContainer.appendChild(elementsContainer);


    // Loader
    this.loaderContainer = document.createElement('div');
    const { loaderContainer } = this;
    loaderContainer.id = 'loader-container';
    loaderContainer.style.top = elementsContainer.offsetTop + 'px';
    loaderContainer.style.left = elementsContainer.offsetLeft + 'px';
    const loader = document.createElement('span');
    loader.classList.add('loader');
    loaderContainer.appendChild(loader);
    elementsContainer.appendChild(loaderContainer);


    // filtersMenu
    const filtersMenu = document.createElement('div');
    filtersMenu.id = 'filters-menu'
    elementsContainer.appendChild(filtersMenu);

      const text1 = document.createElement('span');
      text1.innerHTML = 'Search interest for ';
      filtersMenu.appendChild(text1);


      // Diseases
      const diseaseSelect = document.createElement('select');
      diseaseSelect.id = 'disease-select';
      terms.forEach((d, i) => {
        const option = document.createElement('option');
        option.setAttribute('value', d.entity);
        option.setAttribute('key', i);
        option.innerHTML = d.name;
        diseaseSelect.appendChild(option);
      });
      let bindHandleChange = value => this.handleSelectDiseaseChange(value, this);
      filtersMenu.appendChild(diseaseSelect);
      const diseaseSelectize = $(diseaseSelect).selectize({
        maxItems: 3,
        onChange: bindHandleChange,
        placeholder: 'Select'
      });
      this.diseaseSelect = diseaseSelectize[0].selectize;


      const text2 = document.createElement('span');
      text2.innerHTML = ' in the ';
      filtersMenu.appendChild(text2);


      // Geo
      const geoSelect = document.createElement('select');
      geoSelect.id = 'geo-select';
      geoSelect.name = 'geo-select';
      countries.forEach((c, i) => {
        const option = document.createElement('option');
        option.setAttribute('value', c.iso);
        option.innerHTML = c.name;
        geoSelect.appendChild(option);
      });
      bindHandleChange = value => this.handleSelectGeoChange(value, this);
      filtersMenu.appendChild(geoSelect);
      const geoSelectize = $(geoSelect).selectize({
        maxItems: 1,
        onChange: bindHandleChange
      });
      this.geoSelect = geoSelectize[0].selectize;


      // Cancel / Done
      this.confirmNav = document.createElement('div');
      const { confirmNav } = this;
      confirmNav.id = 'confirm-nav';
      confirmNav.classList.add('hidden');

      const cancelButton = document.createElement('button');
      cancelButton.innerHTML = 'Cancel';
      bindHandleChange = evt => this.cancelFilters(evt, this);
      cancelButton.addEventListener('click', bindHandleChange);
      confirmNav.appendChild(cancelButton);

      const doneButton = document.createElement('button');
      doneButton.innerHTML = 'Done';
      bindHandleChange = evt => this.confirmFilters(evt, this);
      doneButton.addEventListener('click', bindHandleChange);
      confirmNav.appendChild(doneButton);

      filtersMenu.appendChild(confirmNav);
    // End filtersMenu

    // Charts
    const chartsContainer = document.createElement('div');
    chartsContainer.classList.add('charts-container');
    elementsContainer.appendChild(chartsContainer);
    
    let chartItem = document.createElement('div');
    chartItem.classList.add('chart-item');
    chartsContainer.appendChild(chartItem);
    this.seasonalChart = new LineChart(chartItem, 'seasonal');
    
    const chartToggleBar = document.createElement('div');
    chartToggleBar.classList.add('chart-toggle-bar');
    chartsContainer.appendChild(chartToggleBar);

    chartItem = document.createElement('div');
    chartItem.classList.add('chart-item');
    chartsContainer.appendChild(chartItem);
    this.trendChart = new LineChart(chartItem, 'trend');

    // Merge
    this.mergeButton = document.createElement('button');
    const { mergeButton } = this;
    mergeButton.innerHTML = 'Merge Charts';
    bindHandleChange = evt => this.toggleChartMerge(evt, this);
    mergeButton.addEventListener('click', bindHandleChange);
    elementsContainer.appendChild(mergeButton);

    this.topQueriesList = document.createElement('div');
    const { topQueriesList } = this;
    topQueriesList.classList.add('top-queries-list');
    elementsContainer.appendChild(topQueriesList);

    this.updateElements();
  }

  updateData(obj) {
    let { data } = this;
    for (const key in obj) {
      data[key] = obj[key];
    }
    this.data = data;
    log.info(this.data);
    this.updateElements();
  }

  updateElements() {
    log.info('updateElements');
    const { data, loaderContainer, diseaseSelect, geoSelect, mergeButton, seasonalChart, trendChart, topQueriesList } = this;
    const { diseases, geo, seasonal, trend, total, topQueries, isMerged, isChanging, isLoading } = data;

    if (isLoading) {
      loaderContainer.classList.remove('hidden');
    } else {
      loaderContainer.classList.add('hidden');
    }

    diseaseSelect.setValue(diseases.map(d => d.entity), true);
    geoSelect.setValue(geo.iso, true);

    mergeButton.innerHTML = isMerged ? 'Split Charts' : 'Merge Charts';

    if(isChanging && !isLoading && seasonal.length > 0 && trend.length > 0 && total.length > 0) {
      seasonalChart.updateData(seasonal);
      isMerged ? trendChart.updateData(total) : trendChart.updateData(trend);
      this.updateData({ isChanging: false });
    }

    topQueriesList.innerHTML = '';
    for(let i = 0; i < topQueries.length; i++) {
      if (topQueries[i].item) {
        const listContainer = document.createElement('div');
        listContainer.classList.add('list-container');
        topQueriesList.appendChild(listContainer);

        const term = document.createElement('p');
        term.innerHTML = diseases[i].name;
        listContainer.appendChild(term);

        const list = document.createElement('ul');
        listContainer.appendChild(list);

        for(const q of topQueries[i].item) {
          const listItem = document.createElement('li');
          listItem.innerHTML = q.title;
          list.appendChild(listItem);
        }
      }
    }    
  }
}

















