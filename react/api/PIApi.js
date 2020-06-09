import { stores, axios } from '@choerodon/boot';

const { AppState } = stores;

// eslint-disable-next-line import/prefer-default-export
export function changeIssuePI(issueId, sourceId, destinationId) {
  return axios.post(`agile/v1/projects/${AppState.currentMenuType.id}/pi/to_pi/${destinationId}`, {
    before: false,
    issueIds: [issueId],
    outsetIssueId: 0,
    rankIndex: 0,
    currentPiId: sourceId,
  });
}
