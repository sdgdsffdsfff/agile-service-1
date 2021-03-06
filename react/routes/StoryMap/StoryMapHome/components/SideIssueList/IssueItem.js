import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { observer } from 'mobx-react';
import { Tooltip } from 'choerodon-ui';
import { find } from 'lodash';
import { DragSource } from 'react-dnd';
import { storyMapApi } from '@/api';
import { linkUrl } from '@/utils/to';
import LINK_URL from '@/constants/LINK_URL';
import TypeTag from '../../../../../components/TypeTag';
import StoryMapStore from '../../../../../stores/project/StoryMap/StoryMapStore';

import './IssueItem.less';

const preFix = 'c7nagile-SideIssueList-IssueItem';
@observer
class IssueItem extends Component {
  render() {
    const {
      issue, connectDragSource,
    } = this.props;
    const {
      issueTypeVO, summary, issueNum, issueId,
    } = issue;
    // const opacity = isDragging ? 0 : 1;
    return (
      connectDragSource(
        <div className={preFix}>
          <TypeTag data={issueTypeVO} />
          <Link
            target="_blank"
            to={`${linkUrl(LINK_URL.workListIssue, {
              params: {
                paramIssueId: issueId,
                paramName: issueNum,
              },
            })}`}
            className="primary"
            style={{ margin: '0 10px' }}
          >
            {issueNum}

          </Link>
          <div className={`${preFix}-summary`}>
            <Tooltip title={summary}>
              {summary}
            </Tooltip>
          </div>
        </div>,
      )
    );
  }
}

IssueItem.propTypes = {

};

export default DragSource(
  'story',
  {
    beginDrag: (props) => ({
      type: 'side',
      issue: props.issue,
    }),
    endDrag(props, monitor) {
      const source = monitor.getItem();
      const dropResult = monitor.getDropResult();
      if (dropResult) {
        const {
          epic: { issueId: targetEpicId },
          feature: { issueId: targetFeatureId }, version,
        } = dropResult;
        const { versionId: targetVersionId } = version || {};
        const { issue: { issueId, storyMapVersionVOList } } = source;
        const storyMapDragVO = {
          versionIssueIds: [],
          versionId: 0, // 要关联的版本id
          epicId: targetEpicId, // 要关联的史诗id
          versionIssueRelVOList: [],
          // 问题id列表，移动到史诗，配合epicId使用
          epicIssueIds: [issueId],
          featureId: 0, // 要关联的特性id
          // 问题id列表，移动到特性，配合featureId使用
          featureIssueIds: [],
        };
        if (targetFeatureId && targetFeatureId !== 'none') {
          storyMapDragVO.featureId = targetFeatureId;
          storyMapDragVO.featureIssueIds = [issueId];
        }
        if (targetVersionId && !find(storyMapVersionVOList, { versionId: targetVersionId }) && targetVersionId !== 'none') {
          storyMapDragVO.versionId = targetVersionId;
          storyMapDragVO.versionIssueIds = [issueId];
        }
        if (targetVersionId === 'none' && storyMapVersionVOList.length > 0) {
          storyMapDragVO.versionIssueRelVOList = storyMapVersionVOList
            .map((v) => ({ ...v, issueId }));
        }
        // console.log(storyMapDragVO);
        storyMapApi.move(storyMapDragVO).then(() => {
          // StoryMapStore.removeStoryFromStoryMap(story);
          StoryMapStore.getStoryMap();
          StoryMapStore.loadIssueList();
        });
      }
    },
  },
  (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  }),
)(IssueItem);
