package io.choerodon.agile.app.service.impl;

import java.math.BigDecimal;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import com.alibaba.fastjson.JSONObject;
import io.choerodon.agile.api.vo.*;
import io.choerodon.agile.app.assembler.IssueAssembler;
import io.choerodon.agile.app.service.ProjectOverviewService;
import io.choerodon.agile.app.service.ReportService;
import io.choerodon.agile.app.service.UserService;
import io.choerodon.agile.infra.dto.DataLogDTO;
import io.choerodon.agile.infra.dto.SprintDTO;
import io.choerodon.agile.infra.dto.WorkLogDTO;
import io.choerodon.agile.infra.enums.InitIssueType;
import io.choerodon.agile.infra.mapper.*;
import io.choerodon.agile.infra.utils.DateUtil;
import io.choerodon.core.oauth.DetailsHelper;
import org.hzero.core.base.BaseConstants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * @author jiaxu.cui@hand-china.com 2020/6/29 下午3:51
 */
@Service
@Transactional(rollbackFor = Exception.class)
public class ProjectOverviewServiceImpl implements ProjectOverviewService {
    @Autowired
    private UserService userService;
    @Autowired
    private ReportService reportService;
    @Autowired
    private SprintMapper sprintMapper;
    @Autowired
    private IssueMapper issueMapper;
    @Autowired
    private IssueAssembler issueAssembler;
    @Autowired
    private WorkLogMapper workLogMapper;
    @Autowired
    private DataLogMapper dataLogMapper;
    @Autowired
    private WorkCalendarRefMapper workCalendarRefMapper;
    @Autowired
    private DateUtil dateUtil;

    @Override
    @SuppressWarnings("unchecked")
    public UncompletedCountVO selectUncompletedBySprint(Long projectId, Long sprintId) {
        UncompletedCountVO uncompletedCount = new UncompletedCountVO();
        JSONObject jObject;
        jObject = reportService.queryBurnDownCoordinate(projectId, sprintId, ReportServiceImpl.STORY_POINTS);
        uncompletedCount.setStoryPoints(Optional.ofNullable(jObject.get(ReportServiceImpl.COORDINATE))
                .map(map -> ((TreeMap<String, BigDecimal>)map).lastEntry())
                .map(Map.Entry::getValue).orElse(BigDecimal.ZERO));
        jObject = reportService.queryBurnDownCoordinate(projectId, sprintId, ReportServiceImpl.REMAINING_ESTIMATED_TIME);
        uncompletedCount.setRemainingEstimatedTime(Optional.ofNullable(jObject.get(ReportServiceImpl.COORDINATE))
                .map(map -> ((TreeMap<String, BigDecimal>)map).lastEntry())
                .map(Map.Entry::getValue).orElse(BigDecimal.ZERO));
        jObject = reportService.queryBurnDownCoordinate(projectId, sprintId, ReportServiceImpl.ISSUE_COUNT);
        uncompletedCount.setIssueCount(Optional.ofNullable(jObject.get(ReportServiceImpl.COORDINATE))
                .map(map -> ((TreeMap<String, BigDecimal>)map).lastEntry())
                .map(Map.Entry::getValue).orElse(BigDecimal.ZERO));
        SprintDTO sprint = safeSelectSprint(projectId, sprintId);
        if (Objects.isNull(sprint)) {
            return uncompletedCount;
        }
        if (sprint.getEndDate() != null) {
            uncompletedCount.setRemainingDays(dateUtil.getDaysBetweenDifferentDate(new Date(), sprint.getEndDate(),
                    workCalendarRefMapper.queryHolidayBySprintIdAndProjectId(sprint.getSprintId(), sprint.getProjectId()),
                    workCalendarRefMapper.queryWorkBySprintIdAndProjectId(sprint.getSprintId(), sprint.getProjectId()), DetailsHelper.getUserDetails().getTenantId()));

        uncompletedCount.setTotalDays(dateUtil.getDaysBetweenDifferentDate(sprint.getStartDate(), sprint.getEndDate(),
                workCalendarRefMapper.queryHolidayBySprintIdAndProjectId(sprint.getSprintId(), sprint.getProjectId()),
                workCalendarRefMapper.queryWorkBySprintIdAndProjectId(sprint.getSprintId(), sprint.getProjectId()), DetailsHelper.getUserDetails().getTenantId()));
        }
        return uncompletedCount;
    }

    @Override
    public List<IssueCompletedStatusVO> selectIssueCountBysprint(Long projectId, Long sprintId) {
        List<IssueOverviewVO> issueList = selectIssueBysprint(projectId, sprintId);
        List<IssueOverviewVO> bugList = issueList.stream()
                .filter(bug -> InitIssueType.BUG.getTypeCode().equals(bug.getTypeCode()))
                .collect(Collectors.toList());
        // 优先排序set
        Set<Long> priority = issueList.stream().map(IssueOverviewVO::getAssigneeId).collect(Collectors.toSet());
        priority.addAll(issueList.stream().map(IssueOverviewVO::getReporterId).collect(Collectors.toSet()));
        priority.remove(null);
        // issueDTO转换IssueCountVO
        return issueAssembler.issueDTOToIssueCountVO(bugList, priority);
    }

    @Override
    public SprintStatisticsVO selectSprintStatistics(Long projectId, Long sprintId) {
        List<IssueOverviewVO> issueList = selectIssueBysprint(projectId, sprintId);
        return issueAssembler.issueDTOToSprintStatisticsVO(issueList);
    }

    @Override
    public List<OneJobVO> selectOneJobsBysprint(Long projectId, Long sprintId) {
        SprintDTO sprint = safeSelectSprint(projectId,sprintId);
        if (Objects.isNull(sprint.getActualEndDate())){
            sprint.setActualEndDate(new Date());
        }
        List<IssueOverviewVO> issueList = selectIssueBysprint(projectId, sprintId);
        List<WorkLogDTO> workLogList = workLogMapper.selectWorkTimeBySpring(projectId, sprintId,
                sprint.getStartDate(), sprint.getActualEndDate());
        List<DataLogDTO> dataLogList = dataLogMapper.selectResolutionIssueBySprint(projectId,
                issueList.stream().map(IssueOverviewVO::getIssueId).collect(Collectors.toSet()),
                sprint.getStartDate(), sprint.getActualEndDate());

        return issueAssembler.issueToOneJob(issueList, workLogList, dataLogList);
    }

    private List<IssueOverviewVO> selectIssueBysprint(Long projectId, Long sprintId) {
        Set<String> statusSet = new HashSet<>();
        statusSet.add(InitIssueType.BUG.getTypeCode());
        statusSet.add(InitIssueType.TASK.getTypeCode());
        statusSet.add(InitIssueType.SUB_TASK.getTypeCode());
        statusSet.add(InitIssueType.STORY.getTypeCode());
        return Optional.ofNullable(issueMapper.selectIssueBysprint(projectId, sprintId, statusSet))
                .orElse(Collections.emptyList());
    }


    private SprintDTO safeSelectSprint(Long projectId, Long sprintId) {
        SprintDTO sprint = new SprintDTO();
        sprint.setProjectId(projectId);
        sprint.setSprintId(sprintId);
        sprint = sprintMapper.selectOne(sprint);
        return sprint;
    }

}
