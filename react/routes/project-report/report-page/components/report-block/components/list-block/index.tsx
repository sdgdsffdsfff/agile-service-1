import React, {
  useEffect, useState, useMemo, useCallback, useRef,
} from 'react';
import { Spin } from 'choerodon-ui';
import { axios } from '@choerodon/boot';
import { find } from 'lodash';
import { IReportListBlock } from '@/routes/project-report/report-page/store';
import { Issue, IFoundationHeader } from '@/common/types';
import { getProjectId, getOrganizationId } from '@/utils/common';
import { fieldApi } from '@/api';
import UserHead from '@/components/UserHead';
import { useTaskContext } from '@/routes/project-report/report-preview/taskContext';
import Table from './table';
import { flat2tree, getColumnByName } from './utils';

interface Props {
  data: IReportListBlock
}
const ListBlock: React.FC<Props> = ({
  data: {
    searchVO, colList, type, key,
  },
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<IFoundationHeader[]>([]);
  const dataRef = useRef([]);
  const { register, finish } = useTaskContext();
  register(`${type}-${key}`);
  const onFinish = useCallback(() => {
    finish(`${type}-${key}`);
  }, [finish, key, type]);
  const loadData = useCallback(async (page = 1) => {
    if (page === 1) {
      dataRef.current = [];
    }
    const res = await axios({
      url: `/agile/v1/projects/${getProjectId()}/issues/include_sub`,
      method: 'post',
      params: {
        page,
        size: 10,
        organizationId: getOrganizationId(),
      },
      data: searchVO,
      // data: {
      //   advancedSearchArgs: {},
      //   otherArgs: {
      //     customField: {
      //       option: [], date: [], date_hms: [], number: [], string: [], text: [],
      //     },
      //   },
      //   searchArgs: {},
      // },
    });
    dataRef.current = dataRef.current.concat(res.list);
    const hasNextPage = res.list.length > 0;
    if (hasNextPage) {
      loadData(page + 1);
    } else {
      setData(dataRef.current);
      setLoading(false);
      setTimeout(onFinish);
    }
  }, [onFinish, searchVO]);
  const loadFields = useCallback(async () => {
    const Fields = await fieldApi.getFoundationHeader();
    setFields(Fields);
    loadData();
  }, [loadData]);
  useEffect(() => {
    setLoading(true);
    loadFields();
  }, [loadFields]);
  const treeData = useMemo(() => flat2tree(data, { idKey: 'issueId' }), [data]);
  const columns = colList.map((name) => {
    const column = getColumnByName(name);
    if (column) {
      return column;
    }
    const field = find(fields, { code: name });
    return {
      title: field?.title || '',
      dataIndex: name,
      render: (issue: Issue) => {
        const { fieldType, code } = (field || {}) as IFoundationHeader;
        const value = issue.foundationFieldValue[code];
        if (fieldType === 'member') {
          return value && value.realName;
        }
        return (
          <span>{value || ''}</span>
        );
      },
    };
  });
  return (
    <div style={{ padding: '10px 26px' }}>
      <Spin spinning={loading}>
        <Table<Issue>
          data={treeData}
          primaryKey="issueId"
          columns={columns}
        />
        {!loading && treeData.length === 0 && <div style={{ textAlign: 'center' }}>暂无数据</div>}
      </Spin>
    </div>
  );
};

export default ListBlock;
