/* eslint-disable react/sort-comp */
/* eslint-disable react/destructuring-assignment */
import React, { Component, createRef } from 'react';
import { observer } from 'mobx-react';
import echarts from 'echarts/lib/echarts';
import ReactEchartsCore from 'echarts-for-react/lib/core';
import 'echarts/lib/chart/pie';
import 'echarts/lib/component/tooltip';
import 'echarts/lib/component/title';
import 'echarts/lib/component/legend';
import {
  Page, Header, Content, stores, axios, Breadcrumb,
} from '@choerodon/boot';
import {
  Button, Select, Icon, Spin, Tooltip,
} from 'choerodon-ui';
import './pie.less';
import { sprintApi, versionApi } from '@/api';
import to, { linkUrl } from '@/utils/to';
import LINK_URL from '@/constants/LINK_URL';
import SwitchChart from '../../Component/switchChart';
import PieChartStore from '../../../../stores/project/pieChart/PieChartStore';
import NoDataComponent from '../../Component/noData';
import pic from '../../../../assets/image/emptyChart.svg';

const { Option } = Select;
@observer
class PieChart extends Component {
  constructor(props) {
    super(props);
    this.state = {
      type: '',
      sprints: [],
      versions: [],
      chooseDimension: '',
      chooseId: '',
    };
    this.otherTooltipRef = createRef();
  }

  componentDidMount = async () => {
    const type = this.getSelectDefaultValue();
    await PieChartStore.getPieDatas(type);
    await axios.all([
      sprintApi.loadSprints(['started', 'closed']),
      versionApi.loadNamesByStatus(),
    ])
      .then(axios.spread((sprints, versions) => {
        this.setState({
          sprints,
          versions,
        });
      }));
  }

  getSelectDefaultValue = () => {
    const { location: { pathname } } = this.props;
    const quaryLinks = [
      { title: '经办人', value: 'assignee' },
      { title: '问题类型', value: 'typeCode' },
      { title: '优先级', value: 'priority' },
      { title: '状态', value: 'status' },
      { title: '史诗', value: 'epic' },
    ];
    const quaryLink = pathname.slice(pathname.lastIndexOf('/') + 1, pathname.length);
    if (quaryLinks.filter((item) => item.value === quaryLink).length === 0) {
      this.setState({
        type: 'assignee',
      });
      return 'assignee';
    }
    this.setState({
      type: quaryLink,
    });
    return quaryLink;
  }

  getOption() {
    const { colors } = PieChartStore;
    const datas = PieChartStore.pieData;
    return {
      color: colors,
      tooltip: {
        trigger: 'item',
        formatter: (value) => {
          if (value.data.name !== '其它') {
            if (this.otherTooltipRef && this.otherTooltipRef.current) {
              this.otherTooltipRef.current.style.display = 'none';
            }
            return `<div><span>问题：${value.data.value} 个</span><br/><span>百分比：${(value.data.percent.toFixed(2))}%</span></div>`;
          }
          if (this.otherTooltipRef && this.otherTooltipRef.current) {
            this.otherTooltipRef.current.style.display = 'block';
            const otherTooptipItem = document.getElementsByClassName('pie-otherTooptip-item-percent');
            let opacity = 0.9;
            for (let i = 0; i < otherTooptipItem.length; i += 1) {
              opacity = 1 - i * 0.1 > 0 ? 1 - i * 0.1 : 0.9;
              otherTooptipItem[i].style.backgroundColor = `rgba(250,211,82,${opacity})`;
            }
          }
          return '';
        },
        padding: 10,
        textStyle: {
          color: '#000',
          fontSize: 12,
          lineHeight: 20,
        },
        extraCssText: 'background: #FFFFFF;\n'
          + 'border: 1px solid #DDDDDD;\n'
          + 'box-shadow: 0 2px 4px 0 rgba(0,0,0,0.20);\n'
          + 'border-radius: 0',
      },
      series: [
        {
          name: '',
          type: 'pie',
          startAngle: 245,
          center: ['50%', '47%'],
          data: datas,
          label: {
            color: 'rgba(0,0,0,0.65)',
            position: 'outside',

            formatter: (value) => {
              if (value.data.name === null) {
                return '未分配';
              }
              return value.data.name;
            },
          },
          itemStyle: {
            normal: {
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          },
        },
      ],
    };
  }

  handelRefresh = () => {
    this.setState({
      type: 'assignee',
      chooseDimension: '',
      chooseId: '',
    }, () => {
      PieChartStore.getPieDatas(this.state.type);
    });
  };

  changeType = (value, option) => {
    this.setState({
      type: value,
      chooseDimension: '',

    });
    PieChartStore.getPieDatas(value);
  };

  compare(pro) {
    return function (obj1, obj2) {
      const val1 = obj1[pro];
      const val2 = obj2[pro];
      if (val1 < val2) {
        return 1;
      } if (val1 > val2) {
        return -1;
      }
      return 0;
    };
  }

  getCurrentChoose() {
    const {
      chooseDimension, chooseId,
    } = this.state;
    const CHOOSEQUERY = {
      sprint: { paramChoose: 'sprint', paramCurrentSprint: chooseId },
      version: { paramChoose: 'version', paramCurrentVersion: chooseId },
    };
    return chooseDimension ? CHOOSEQUERY[chooseDimension] : ({});
  }

  handleLinkToIssue(item) {
    const {
      type, chooseDimension, sprints, versions, chooseId,
    } = this.state;
    const { typeName, name } = item;
    const queryObj = this.getCurrentChoose();
    let paramName = name || '未分配';
    if (chooseDimension === 'sprint') {
      paramName += `、冲刺为${sprints.find((sprintItem) => sprintItem.sprintId === chooseId).sprintName}`;
    }

    if (chooseDimension === 'version') {
      paramName += `、版本为${versions.find((versionItem) => versionItem.versionId === chooseId).name}`;
    }

    paramName += '下的问题';
    let paramType = type;
    if (type === 'typeCode') {
      paramType = 'issueTypeId';
    } else if (type === 'priority') {
      paramType = 'priorityId';
    } else if (type === 'status') {
      paramType = 'statusId';
    } else if (type === 'assignee') {
      paramType = 'assigneeId';
    }
    to(LINK_URL.workListIssue, {
      params: {
        paramName,
        paramType,
        paramId: typeName === null ? '0' : typeName,
        ...queryObj,
      },
    });
  }

  renderOtherTooltip = () => {
    const sourceData = PieChartStore.getSourceData;
    const otherDates = sourceData.filter((item) => item.percent < 2).sort(this.compare('percent'));
    if (otherDates && otherDates.length > 0) {
      if (otherDates.length <= 6) {
        return (
          otherDates.map((item) => (
            <div className="pie-otherTooptip-item">
              <p className="pie-otherTooptip-item-percent">
                <span>{`${item.percent.toFixed(2)}%`}</span>
              </p>
              <p>
                <Tooltip title={item.name} placement="bottom">
                  <span>{item.realName ? item.realName : item.name}</span>
                </Tooltip>
              </p>
            </div>
          ))
        );
      }
      return (
        <>
          {otherDates.slice(0, 6).map((item) => (
            <div className="pie-otherTooptip-item">
              <p className="pie-otherTooptip-item-percent">
                <span>{`${item.percent.toFixed(2)}%`}</span>
              </p>
              <p>
                <Tooltip title={item.name} placement="bottom">
                  <span>{item.realName ? item.realName : item.name}</span>
                </Tooltip>
              </p>
            </div>
          ))}
          <div className="pie-otherTooptip-item">
            <span className="pie-otherTooptip-item-ignore">...</span>
          </div>
        </>
      );
    }
    return '';
  }

  renderChooseDimension = () => {
    const {
      sprints, versions, chooseDimension, chooseId,
    } = this.state;
    const chooseVersion = versions.find((item) => item.versionId === chooseId);
    const chooseSprint = sprints.find((item) => item.sprintId === chooseId);

    return (
      <div>
        <Select
          className="c7n-pieChart-filter-item"
          style={{ minWidth: 200 }}
          value={chooseDimension === 'version' ? chooseVersion && chooseVersion.name : chooseSprint && chooseSprint.sprintName}
          onChange={this.handleChooseIdChange}
          allowClear
        >
          {
            chooseDimension === 'version' && versions.map((item) => (
              <Option key={item.versionId} value={item.versionId}>{item.name}</Option>
            ))
          }
          {
            chooseDimension === 'sprint' && sprints.map((item) => (
              <Option key={item.sprintId} value={item.sprintId}>
                {item.sprintName}
              </Option>
            ))
          }
        </Select>
      </div>
    );
  }

  handleChooseDimensionChange = (chooseDimension) => {
    const { type, sprints, versions } = this.state;
    this.setState({
      chooseDimension,
      chooseId: chooseDimension === 'version' ? versions[0] && versions[0].versionId : sprints[0] && sprints[0].sprintId,
    });
    PieChartStore.getPieDatas(type, chooseDimension === 'sprint' ? sprints[0] && sprints[0].sprintId : '', chooseDimension === 'version' ? versions[0] && versions[0].versionId : '');
  }

  handleChooseIdChange = (chooseValue) => {
    const { type, chooseDimension } = this.state;
    this.setState({
      chooseId: chooseValue,
    });
    PieChartStore.getPieDatas(type, chooseDimension === 'sprint' ? chooseValue : '', chooseDimension === 'version' ? chooseValue : '');
  }

  render() {
    const {
      type, chooseDimension,
    } = this.state;
    const data = PieChartStore.getPieData;
    const sourceData = PieChartStore.getSourceData;
    const colors = PieChartStore.getColors;
    const types = [
      { title: '经办人', value: 'assignee' },
      { title: '模块', value: 'component' },
      { title: '问题类型', value: 'typeCode' },
      { title: '版本', value: 'version' },
      { title: '优先级', value: 'priority' },
      { title: '状态', value: 'status' },
      { title: '冲刺', value: 'sprint' },
      { title: '史诗', value: 'epic' },
      { title: '标签', value: 'label' },
    ];

    let chooseDimensionType = [
      {
        key: 'sprint',
        name: '冲刺',
      }, {
        key: 'version',
        name: '版本',
      },
    ];

    if (type === 'sprint') {
      chooseDimensionType = [
        {
          key: 'version',
          name: '版本',
        },
      ];
    }

    if (type === 'version') {
      chooseDimensionType = [
        {
          key: 'sprint',
          name: '冲刺',
        },
      ];
    }

    return (
      <Page className="pie-chart" service={['choerodon.code.project.operation.chart.ps.choerodon.code.project.operation.chart.ps.piechart']}>
        <Header
          title="统计图"
          backPath={linkUrl(LINK_URL.report)}
        >
          <SwitchChart
            current="pieReport"
          />
          <Button onClick={this.handelRefresh}>
            <Icon type="refresh" />
            刷新
          </Button>
        </Header>
        <Breadcrumb title="统计图" />
        <Content>
          <Spin spinning={PieChartStore.pieLoading}>
            <div className="c7n-pieChart-filter">
              <Select
                className="c7n-pieChart-filter-item"
                getPopupContainer={(triggerNode) => triggerNode.parentNode}
                defaultValue={type}
                value={type}
                label="统计类型"
                onChange={this.changeType}
              >
                {
                  types.map((item) => (
                    <Option value={item.value} key={item.title}>{item.title}</Option>
                  ))
                }
              </Select>
              <Select
                className="c7n-pieChart-filter-item"
                style={{ minWidth: 70 }}
                label="选择维度"
                defaultValue={chooseDimensionType[0].name}
                value={chooseDimensionType
                  .find((item) => item.key === chooseDimension)
                  && chooseDimensionType.find((item) => item.key === chooseDimension).name}
                onChange={this.handleChooseDimensionChange}
                allowClear
              >
                {
                  chooseDimensionType.map((item) => (
                    <Option
                      key={item.key}
                      value={item.key}
                    >
                      {item.name}
                    </Option>
                  ))
                }
              </Select>
              {
                chooseDimension ? this.renderChooseDimension() : ''
              }
            </div>

            {data.length ? (
              <>
                <div style={{
                  display: 'flex', justifyContent: 'flex-start', alignItems: 'center',
                }}
                >
                  <ReactEchartsCore
                    style={{ width: '58%', height: 500 }}
                    echarts={echarts}
                    option={this.getOption()}
                  />

                  <div className="pie-otherTooltip" ref={this.otherTooltipRef} style={{ display: 'none' }}>
                    <div className="pie-otherTooltip-wrap" />
                    <div className="pie-otherTooltip-item-wrap">
                      {this.renderOtherTooltip()}
                    </div>

                  </div>
                  <div className="pie-title">
                    <p className="pie-legend-title">数据统计</p>
                    <table>
                      <thead>
                        <tr>
                          <td style={{ width: '158px' }}>{(types.find((item) => item.value === type) || {}).title}</td>
                          <td style={{ width: '62px' }}>问题</td>
                          <td style={{ paddingRight: 35 }}>百分比</td>
                        </tr>
                      </thead>
                    </table>
                    <table className="pie-legend-tbody">
                      {
                      sourceData.map((item, index) => (
                        <tr>
                          <td style={{ width: '158px' }}>
                            <div className="pie-legend-icon" style={{ background: colors[index] }} />
                            <Tooltip title={item && item.name}>
                              <div className="pie-legend-text">{item.name ? (item.realName || item.name) : '未分配'}</div>
                            </Tooltip>
                          </td>
                          <td style={{ width: '62px' }}>
                            <a
                              role="none"
                              onClick={this.handleLinkToIssue.bind(this, item)}
                            >
                              {item.value}
                            </a>
                          </td>
                          <td style={{ width: '62px', paddingRight: 15 }}>{`${(item.percent).toFixed(2)}%`}</td>
                        </tr>
                      ))
                    }
                    </table>
                  </div>
                </div>
              </>
            ) : <NoDataComponent title="问题" links={[{ name: '问题管理', link: LINK_URL.workListIssue }]} img={pic} />}
          </Spin>

        </Content>
      </Page>
    );
  }
}

export default PieChart;
