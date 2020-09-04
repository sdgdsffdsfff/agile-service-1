import React, { Component } from 'react';
import { Icon, Button } from 'choerodon-ui';
import Logs from './Logs';
import DataLog from './DataLog';

class DataLogs extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      user: {},
      expand: false,
    };
  }

  setUser(user) {
    this.setState({
      user,
    });
  }

  render() {
    const { expand, user } = this.state;
    const {
      datalogs, typeCode, createdById, creationDate,
    } = this.props;
    return (
      <div>
        {/* {
          datalogs.map((datalog, i) => (
            <DataLog
              key={datalog.id}
              i={i}
              // key={datalog.logId}
              datalog={datalog}
              typeCode={typeCode}
              origin={datalogs}
              expand={expand}
              user={user}
              callback={this.setUser.bind(this)}
            />
          ))
        } */}
        <Logs datalogs={datalogs} expand={expand} />
        {
          datalogs.length > 5 && !expand ? (
            <div style={{ marginTop: 5 }}>
              <Button className="leftBtn" funcType="flat" onClick={() => this.setState({ expand: true })}>
                <span>展开</span>
                <Icon type="baseline-arrow_right icon" style={{ marginRight: 2 }} />
              </Button>
            </div>
          ) : null
        }
        {
          datalogs.length > 5 && expand ? (
            <div style={{ marginTop: 5 }}>
              <Button className="leftBtn" funcType="flat" onClick={() => this.setState({ expand: false })}>
                <span>折叠</span>
                <Icon type="baseline-arrow_drop_up icon" style={{ marginRight: 2 }} />
              </Button>
            </div>
          ) : null
        }
      </div>
    );
  }
}

export default DataLogs;
