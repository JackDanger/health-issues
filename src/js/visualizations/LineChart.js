// @flow weak

import type { TrendsAPIGraph } from '../util/types';
import { seasonalRatio, trendRatio } from '../util/constants';
import * as d3 from 'd3';
import log from 'loglevel';

export default class LineChart {

  data: {
    term: string,
    points: {date: Date, value: number}[]
  }[];
  parentContainer: HTMLElement;
  title: string;
  type: string;
  width: number;
  height: number;
  margin: { top: number, left: number, bottom: number, right: number };
  svg: () => {};

  constructor(parentContainer: HTMLElement, type?: string) {
    this.data = [];
    this.parentContainer = parentContainer;
    if (type) this.type = type;
    this.title = this.getTitle(this.type);
    this.margin = { top: 36, right: 4, bottom: 30, left: 36 };
    const size = this.getSize();
    this.width = size.width;
    this.height = size.height;
    this.createElements(parentContainer);
  }

  getSize() {
    const { parentContainer, margin, type } = this;
    const width = parentContainer.offsetWidth - (margin.left + margin.right);
    const baseHeight = type !== 'seasonal' ? width * trendRatio : width * seasonalRatio;
    const height = baseHeight - (margin.top + margin.bottom);
    return { width, height };
  }

  resizeChart() {
    const { margin, parentContainer } = this;
    const size = this.getSize();
    const { width, height } = size;
    this.width = width;
    this.height = height;
    this.svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);
  }

  updateData(data: TrendsAPIGraph[], type?: string, title? : string) {
    this.data = this.parseDates(data);
    if (type && type !== this.type) {
      this.type = type;
      this.resizeChart();
    }
    this.title = title ? title : this.getTitle(this.type);
    this.updateElements();
  }

  getTitle(type) {
    let title;
    switch (type) {
      case 'seasonal':
        title = 'Seasonal per year';
        break;
      case 'trend':
        title = 'Trend over time';
        break;
      default:
        title = 'Interest over time';
    }
    return title;
  }

  parseDates(data: TrendsAPIGraph[]) {
    const parseTime = d3.timeParse('%Y-%m-%d');
    return data.map((d, i) => {
      return {
        term: d.term,
        points: d.points.map((p, i) => {
          return { date: parseTime(p.date), value: p.value }
        })
      }
    });
  }

  createElements(parentContainer: HTMLElement) {
    const parentContainerSelection = d3.select(parentContainer);
    const { data, width, height, margin } = this;

    this.svg = parentContainerSelection.append('svg')
      .attr('class', 'chart-canvas');

    this.resizeChart();

    const chart = this.svg
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
      .attr('class', 'line-chart');

    chart.append('g')
      .attr('class', 'x axis');

    chart.append('g')
      .attr('class', 'y axis')
      .append('text')
      .attr('class', 'title')
      .attr('text-anchor', 'start')
      .attr('x', -margin.left)
      .attr('y', -margin.top/2);

    chart.append('g')
      .attr('class', 'time-series');
  }

  updateElements() {
    const { data, width, height, margin, svg, title, type } = this;
    const transitionDuration = 500;

    const x = d3.scaleTime()
      .range([0, width])
      .domain( d3.extent(data[0].points, function(p) { return p.date }) );

    let yMin, yMax;

    if (type === 'seasonal') {
      yMin = d3.min(data, function(d, i) { return d3.min(d.points, function(p) { return p.value; }); });
      yMax = d3.max(data, function(d, i) { return d3.max(d.points, function(p) { return p.value; }); });
      const maxRange = Math.abs(yMin) > Math.abs(yMax) ? yMin : yMax;
      yMin = maxRange > 20 ? -maxRange : -20;
      yMax = maxRange > 20 ? maxRange : 20;

    } else {
      yMin = 0;
      yMax = 100;
    }

    const y = d3.scaleLinear()
      .range([height, 0])
      .domain([yMin, yMax]);

    const xAxis = d3.axisBottom(x)
      .tickSize(0)
      .tickPadding(18);

    if (type === 'seasonal') {
      xAxis.tickFormat(d3.timeFormat('%b'));

    } else if (type === 'trend' || type === 'total')  {
      xAxis.tickFormat(d3.timeFormat('%Y'))
        .ticks(d3.timeYear.every(2));

    } else if (type === 'mixed') {
      xAxis.tickFormat(d3.timeFormat('%b %Y'))
      .ticks(d3.timeMonth.every(3));
    }

    const yAxis = d3.axisLeft(y)
      .tickSize(12)
      .ticks(type === 'seasonal' ? 5 : 3);

    const line = d3.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.value); });

    const chart = svg.select('.line-chart');

    chart.select('g.y')
      .transition()
      .duration(transitionDuration)
      .call(yAxis);

    chart.select('g.y .title')
      .text(title);

    chart.select('g.y')
      .selectAll('.tick text');

    chart.select('g.x')
      .transition()
      .duration(transitionDuration)
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis);

    if (type === 'seasonal') {
      chart.select('g.x path')
        .transition()
        .duration(transitionDuration)
        .style('transform', 'translate(0, -'+height/2+'px)');
    } else {
      chart.select('g.x path')
      .transition()
      .duration(transitionDuration)
      .style('transform', 'none');
    }

    const timeSeries = chart.selectAll('.time-series');

    const diseases = timeSeries.selectAll('.disease').data(data);

    const diseasesEnterUpdate = diseases.enter()
      .append('path')
      .attr('class', 'line disease')
      .merge(diseases)
      .transition()
      .duration(transitionDuration)
      .attr('d', function(d) {
        return line(d.points)
      });

    const diseasesExit = diseases.exit().remove();
  }
}
