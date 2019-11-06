import React, {
  useState, useEffect, 
} from 'react';
import {
  Form, Input, Select, message, Button,
} from 'choerodon-ui';
import {
  Content, stores, axios, Choerodon, 
} from '@choerodon/boot';
import _ from 'lodash';
import UserHead from '../../../../components/UserHead';
import { getUsers, getUser } from '../../../../api/CommonApi';
import { loadComponent, updateComponent } from '../../../../api/ComponentApi';
import './component.less';

const { Option } = Select;
const { AppState } = stores;
const FormItem = Form.Item;
let sign = false;

const EditComponent = (props) => {
  const { modal } = props;
  const [originUsers, setOriginUsers] = useState([]);
  const [selectLoading, setSelectLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [component, setComponent] = useState({});
  const [defaultAssigneeRole, setDefaultAssigneeRole] = useState(undefined);
  const [description, setDescription] = useState(undefined);
  const [managerId, setManagerId] = useState(undefined);
  const [name, setName] = useState(undefined);
  const [page, setPage] = useState(1);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [input, setInput] = useState('');

  const { getFieldDecorator, getFieldsValue } = props.form;

  const handleOk = () => {
    props.form.validateFields((err, values, modify) => {
      if (!err && modify) {
        const {
          defaultAssigneeRole, description, managerId, name,
        } = values;
        const editComponent = {
          objectVersionNumber: component.objectVersionNumber,
          componentId: component.componentId,
          defaultAssigneeRole,
          description,
          managerId: managerId ? JSON.parse(managerId).id || 0 : 0,
          name: name.trim(),
        };
        setCreateLoading(true);
        updateComponent(component.componentId, editComponent)
          .then((res) => {
            setCreateLoading(false);
            props.modal.close();
            props.onOk();
          })
          .catch((error) => {
            setCreateLoading(false);
            Choerodon.prompt('修改模块失败');
          });
      }
    });
    return false;
  };
  modal.handleOk(handleOk); 
  const debounceFilterIssues = _.debounce((text) => {
    setSelectLoading(true);
    setPage(1);
    getUsers(text, undefined, page).then((res) => {
      setSelectLoading(false);
      setInput(text);
      setPage(1);
      setOriginUsers(res.list.filter(u => u.enabled));
      setCanLoadMore(res.hasNextPage);
    });
  }, 500);

  const onFilterChange = (input) => {
    if (!sign) {
      setSelectLoading(true);
      getUsers(input, undefined, page).then((res) => {
        setInput(input);
        setOriginUsers(res.list.filter(u => u.enabled));
        setCanLoadMore(res.hasNextPage);
        setSelectLoading(false);
      });
      sign = true;
    } else {
      debounceFilterIssues(input, undefined, page);
    }
  };

  const loadUser = (managerId) => {
    getUser(managerId).then((res) => {
      setManagerId(JSON.stringify(res.list[0]));
      setOriginUsers(res.list.length ? [res.list[0]] : []);
    });
  };

  const localLoadComponent = (componentId) => {
    loadComponent(componentId)
      .then((res) => {
        const {
          defaultAssigneeRole, description, managerId, name,
        } = res;
        setDefaultAssigneeRole(defaultAssigneeRole);
        setDescription(description);
        setManagerId(managerId || undefined);
        setName(name);
        setComponent(res);
        if (managerId) {
          loadUser(managerId);
        }
      });
  };


  const checkComponentNameRepeat = (rule, value, callback) => {
    if (value && value.trim() && value.trim() !== name) {
      axios.get(`/agile/v1/projects/${AppState.currentMenuType.id}/component/check_name?componentName=${value}`)
        .then((res) => {
          if (res) {
            callback('模块名称重复');
          } else {
            callback();
          }
        });
    } else {
      callback();
    }
  };

  const loadMoreUsers = (e) => {
    e.preventDefault();
    setSelectLoading(true);
    getUsers(input, undefined, page + 1).then((res) => {
      setOriginUsers([...originUsers, ...res.list.filter(u => u.enabled)]);
      setSelectLoading(false);
      setCanLoadMore(res.hasNextPage);
      setPage(page + 1);
    })
      .catch((e) => { setSelectLoading(true); });
  };

  const getFirst = (str) => {
    if (!str) {
      return '';
    }
    const re = /[\u4E00-\u9FA5]/g;
    for (let i = 0, len = str.length; i < len; i += 1) {
      if (re.test(str[i])) {
        return str[i];
      }
    }
    return str[0];
  };

  useEffect(() => localLoadComponent(props.componentId), []);

  return (
    <Content
      style={{
        padding: 0,
      }}
      className="c7n-component-component"
    >
      <Form>
        <FormItem style={{ marginBottom: 20 }}>
          {getFieldDecorator('name', {
            initialValue: name,
            rules: [{
              required: true,
              message: '模块名称必填',
              whitespace: true,
            }, {
              validator: checkComponentNameRepeat,
            }],
          })(
            <Input label="模块名称" maxLength={10} />,
          )}
        </FormItem>
        <FormItem style={{ marginBottom: 20 }}>
          {getFieldDecorator('description', {
            initialValue: description,
          })(
            <Input label="模块描述" autosize maxLength={30} />,
          )}
        </FormItem>
        <FormItem style={{ marginBottom: 20 }}>
          {getFieldDecorator('defaultAssigneeRole', {
            initialValue: defaultAssigneeRole,
            rules: [{
              required: true,
              message: '默认经办人必填',
            }],
          })(
            <Select label="默认经办人">
              {['模块负责人', '无'].map(defaultAssigneeRole => (
                <Option key={defaultAssigneeRole} value={defaultAssigneeRole}>
                  {defaultAssigneeRole}
                </Option>
              ))}
            </Select>,
          )}
        </FormItem>

        {
          getFieldsValue(['defaultAssigneeRole']).defaultAssigneeRole && getFieldsValue(['defaultAssigneeRole']).defaultAssigneeRole === '模块负责人' && (
            <FormItem style={{ marginBottom: 20 }}>
              {getFieldDecorator('managerId', {
                initialValue: managerId,
              })(
                <Select
                  label="负责人"
                  loading={selectLoading}
                  allowClear
                  filter
                  onFilterChange={onFilterChange}
                  dropdownClassName="hidden-text hidden-label"
                // getPopupContainer={trigger => (trigger.parentNode)}
                >
                  {originUsers.map(user => (
                    <Option key={JSON.stringify(user)} value={JSON.stringify(user)}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px' }}>
                        <UserHead
                          user={{
                            id: user.id,
                            loginName: user.loginName,
                            realName: user.realName,
                            avatar: user.imageUrl,
                          }}
                        />
                      </div>
                    </Option>
                  ))}
                  {
                    canLoadMore && (
                      <Option key="loadMore" disabled className="loadMore-option">
                        <Button type="primary" onClick={loadMoreUsers} className="option-btn">更多</Button>
                      </Option>
                    )
                  }
                </Select>,
              )}
            </FormItem>
          )
        }
      </Form>
    </Content>
  );
};

export default Form.create()(EditComponent);