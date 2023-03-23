/**
Copyright (c) 2022 ZOOMi Technologies Inc.

all rights reserved.

This source code is licensed under the license found in the
LICENSE file in the root directory of this source tree.
*/

/**
 * @class: OverviewComponent
 * purpose of this module is to view overall data of a project
 * @description:implemented all methods related to overview
 * @author: Pasan Nethsara
 */

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ChartDataSets, ChartType } from 'chart.js';
import moment from 'moment';
import { Color, Label } from 'ng2-charts';
import { DateRanges, Overview } from 'src/app/models/overview';
import { OverviewService } from 'src/app/services/overview.service';
import { ProjectDataService } from 'src/app/services/project-data.service';
import { SharedService } from 'src/app/services/shared.service';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
})
export class OverviewComponent implements OnInit {
  @ViewChild('scrollContent')
  scrollContent!: ElementRef; // scroll view annotated list element

  @ViewChild('scrollTop')
  public scrollTop!: ElementRef; // table inner scroll view element

  @ViewChild('scrollBottom')
  public scrollBottom!: ElementRef; // table outer scroll view element

  @ViewChild('boostListElem')
  public boostListElem!: ElementRef; // device list table element

  public lineChartType: ChartType = 'line'; // chart type
  lineChartData: any = [];
  lineChartLabels: any = [];
  lineChartOptions = {};
  lineChartColors: any[] = [{}];
  lineChartLegend = false;
  lineChartPlugins = [];

  tableWidth: number = 0; // width of table
  isTableScroll: boolean = false; // is table scrollable
  isScrollLoadEnable: boolean = false; // is scroll enable
  scrollheight: any = 0; // scroll height
  isDataLoaded: boolean = true; // device data loaded

  loading: boolean;
  chartLoading: boolean;
  selectedProjectId: string; //assign selected projectId
  overviewObj: Overview; //dashboard model
  yAxisData: Array<any>; //assign data to Y axis of the chart
  chartDateRange: number; //assign selected date range for the chart
  gradientFillChart: any; //to create gradiant color of the chart
  showGridLines: boolean; //show Y axis gridlines

  constructor(
    private _overviewService: OverviewService,
    public sharedService: SharedService,
    private _projectDataService: ProjectDataService
  ) {
    this.loading = false;
    this.chartLoading = false;
    this.selectedProjectId = '';
    this.overviewObj = new Overview();
    this.yAxisData = [];
    this.chartDateRange = DateRanges.month;
    this.showGridLines = true;

    this.sharedService.changeEmitted$.subscribe((projectId) => {
      this.selectedProjectId = projectId;
      this.getOverViewData(projectId);
    });
  }

  ngOnInit(): void {
    this.setDataOnRouteChange();
  }

  setDataOnRouteChange() {
    let projectId = this._projectDataService.getProjectDetails().id;
    if (projectId) {
      this.getOverViewData(projectId);
    }
  }

  getOverViewData(projectId: string) {
    this.selectedProjectId = projectId;
    this.getAnnotationStats();
    this.getAnnotationGraph();
  }

  /**
   * if screen width is smaller than device list table
   * active scroll bar to scroll table left or right
   */
  setTableWidth() {
    this.tableWidth = this.boostListElem.nativeElement.offsetWidth;

    let fullWidth = this.scrollBottom.nativeElement.offsetWidth;
    let scrollWidth = this.scrollBottom.nativeElement.scrollWidth;
    if (fullWidth < scrollWidth) {
      this.isTableScroll = true;
    } else {
      this.isTableScroll = false;
    }
  }

  /**
   * Calls when user scrolls device list table
   * device list paging control
   */
  onScroll() {
    const scrollContentUI: HTMLCanvasElement = this.scrollContent.nativeElement;
    let scrollFromBottom =
      scrollContentUI.scrollHeight -
      scrollContentUI.scrollTop -
      scrollContentUI.clientHeight;
    let offset = 350;

    if (scrollFromBottom >= offset) {
      this.isScrollLoadEnable = true;
    } else {
      this.isScrollLoadEnable = false;
    }
  }

  /**
   * when scrolling left or right get scroll position value
   */
  onScrollTop() {
    this.scrollheight = this.scrollTop.nativeElement.scrollLeft;
  }

  /**
   * when scrolling left or right get scroll position value
   */
  onScrollBottom() {
    this.scrollheight = this.scrollBottom.nativeElement.scrollLeft;
  }

  /**
   * select date range for the chart
   */
  selectRange(range: number) {
    this.showGridLines = false;

    if (range == DateRanges.month) {
      this.chartDateRange = DateRanges.month;
      this.showGridLines = true;
    } else if (range == DateRanges.threeMonths) {
      this.chartDateRange = DateRanges.threeMonths;
    } else if (range == DateRanges.year) {
      this.chartDateRange = DateRanges.year;
    } else this.chartDateRange = DateRanges.all;

    this.getAnnotationGraph();
  }

  /**
   * get annotation stats from back-end and assign data to overview model
   */
  getAnnotationStats() {
    this.loading = true;
    this._overviewService.getAnnotationStats(this.selectedProjectId).subscribe(
      (response) => {
        this.loading = false;
        this.overviewObj.statsSummary = response.statsSummary;
        this.overviewObj.projectStats = response.projectStats;
      },
      (error) => {
        this.loading = false;
      }
    );
  }

  /**
   * get annotation stats from back-end and assign data to overview model
   */
  getAnnotationGraph() {
    this._overviewService
      .getAnnotationGraph(this.selectedProjectId, this.chartDateRange)
      .subscribe(
        (response) => {
          this.overviewObj.chartData = response;
          this.overviewObj.chartData.reverse();

          var dateObj1 = moment(
            this.overviewObj.chartData[0]?.date,
            'YYYY/MM/DD'
          );
          this.overviewObj.startDate = dateObj1.format('D MMMM, YYYY');

          var dateObj2 = moment(
            this.overviewObj.chartData[this.overviewObj.chartData.length - 1]
              ?.date,
            'YYYY/MM/DD'
          );
          this.overviewObj.endDate = dateObj2.format('D MMMM, YYYY');

          this.formatGraph();
        },
        (error) => {
          // this.chartLoading = false;
          // this.alert('Error', error.error.error.message);
        }
      );
  }

  /**
   * format graph data according to the date range
   */
  formatGraph() {
    this.yAxisData = [];

    for (let i = 0; i < this.overviewObj.chartData.length; i++)
      this.overviewObj.chartData[i].isShowLabel = false;

    if (this.chartDateRange == DateRanges.month) {
      for (let i = 0; i < this.overviewObj.chartData.length; i++) {
        this.overviewObj.chartData[i].isShowLabel = true;
        this.overviewObj.chartData[i].range = DateRanges.month;
      }
    } else if (this.chartDateRange == DateRanges.threeMonths) {
      for (let i = 0; i < this.overviewObj.chartData.length; i += 30) {
        this.overviewObj.chartData[i].isShowLabel = true;
        this.overviewObj.chartData[i].range = DateRanges.threeMonths;
      }
    } else if (this.chartDateRange == DateRanges.year) {
      for (let i = 0; i < this.overviewObj.chartData.length; i++) {
        this.overviewObj.chartData[i].isShowLabel = true;
        this.overviewObj.chartData[i].range = DateRanges.year;
      }
    } else if (this.chartDateRange == DateRanges.all) {
      for (let i = 0; i < this.overviewObj.chartData.length; i += 12) {
        this.overviewObj.chartData[i].isShowLabel = true;
        this.overviewObj.chartData[i].range = DateRanges.all;
      }
    }

    this.setChartGradient();
  }

  setChartGradient(){
    var canvas: any = document.getElementById('chartLine');
    var ctx = canvas.getContext('2d');
    this.gradientFillChart = ctx.createLinearGradient(0, 0, 800, 0);
    this.gradientFillChart.addColorStop(0, 'rgb(225, 124, 253, 0.28)');
    this.gradientFillChart.addColorStop(0.4, 'rgb(113, 102, 249, 0.28)');
    this.gradientFillChart.addColorStop(0.5, 'rgb(113, 102, 249, 0.28)');
    this.gradientFillChart.addColorStop(0.6, 'rgb(113, 102, 249, 0.28');
    this.gradientFillChart.addColorStop(1, 'rgb(76, 215, 246, 0.28)');

    this.lineChartColors = [
      {
        borderColor: '#4CD7F6',
        backgroundColor: this.gradientFillChart,
        borderWidth: 4,
        pointHoverBackgroundColor: '#7166F9',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 1,
        pointHoverRadius: 10,
        pointRadius: 0,
        borderCapStyle: 'round',
        hoverBorderColor: '#32CCCE',
        hoverBorderWidth: 9,
      },
    ];
    this.setChartOptions();
  }

  /**
   * Set line chart configurations
   */
  setChartOptions() {

    this.yAxisData = this.overviewObj.chartData.map(value => value.count);
    this.lineChartData = [{ data: this.yAxisData, label: 'Annotations' }];
    this.lineChartLabels = this.overviewObj.chartData;

    this.lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      legend:{
        display:false,
      },
      scales: {
        xAxes: [
          {
            ticks: {
              fontColor: '#A4A6AF',
              fontSize: 12,
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
              callback: function (value: any, index: any, values: any) {
                var dateObj = moment(value.date, 'YYYY/MM/DD');

                if (value.range == DateRanges.month) {
                  if (value.isShowLabel == true) {
                    var date = dateObj.format('D');
                    return date;
                  } else return '';
                } else if (
                  value.range == DateRanges.threeMonths ||
                  value.range == DateRanges.year
                ) {
                  if (value.isShowLabel == true) {
                    var date = dateObj.format('MMM YYYY');
                    return date;
                  } else return '';
                } else if (value.range == DateRanges.all) {
                  if (value.isShowLabel == true) {
                    var date = dateObj.format('YYYY');
                    return date;
                  } else return '';
                } else return '';
              },
            },
            gridLines: {
              drawOnChartArea: this.showGridLines,
            },
          },
        ],
        yAxes: [
          {
            ticks: {
              fontColor: '#A4A6AF',
              fontSize: 12,
              maxTicksLimit: 5,
              callback: function (value: any) {
                var ranges = [
                  { divider: 1e6, suffix: 'M' },
                  { divider: 1e3, suffix: 'k' },
                ];
                function formatNumber(n: any) {
                  for (var i = 0; i < ranges.length; i++) {
                    if (n >= ranges[i].divider) {
                      return (
                        (n / ranges[i].divider).toString() + ranges[i].suffix
                      );
                    }
                  }
                  return n;
                }
                return formatNumber(value);
              },
            },
            gridLines: {
              drawOnChartArea: false,
            },
          },
        ],
      },
      tooltips: {
        mode: 'index',
        intersect: false,
        bodyFontColor: '#4CD7F6',
        bodyFontStyle: 'bold',
        backgroundColor: '#191919',
        titleFontColor: '#EBEBEB',
        titleFontSize: 10,
        titleFontStyle: 'normal',
        xPadding: 20,
        yPadding: 20,
        cornerRadius: 10,
        displayColors: false,
        borderWidth: 1,
        callbacks: {
          label: function (tooltipItem: any, data: any) {
            return tooltipItem.value + ' Annotations';
          },

          title: function (tooltipItem: any, data: any) {
            var dateObj = moment(tooltipItem[0].xLabel.date, 'YYYY/MM/DD');

            if (tooltipItem[0].xLabel.range == DateRanges.year) {
              var date = dateObj.format('MMMM, YYYY');
              return date;
            } else {
              var date = dateObj.format('DD MMMM, YYYY');
              return date;
            }
          },
        },
      },
      elements: {
        point: {
          borderColor: 'rgb(50, 204, 206, 1)',
          hitRadius: 30,
        },
      },
    };
  }
}
