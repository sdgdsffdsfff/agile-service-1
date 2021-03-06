import React, { useEffect, useRef } from 'react';
import {
  TextField, Select, DatePicker, TimePicker, DateTimePicker, NumberField, TextArea, UrlField, DataSet,
} from 'choerodon-ui/pro';
import { toJS } from 'mobx';
import { find } from 'lodash';
import SelectUser from '@/components/select/select-user';
import SelectSprint from '@/components/select/select-sprint';
import SelectIssueType from '@/components/select/select-issue-type';
import SelectEpic from '@/components/select/select-epic';
import SelectPriority from '@/components/select/select-priority';
import SelectLabel from '@/components/select/select-label';
import SelectComponent from '@/components/select/select-component';
import SelectVersion from '@/components/select/select-version';
import { SelectProps } from 'choerodon-ui/pro/lib/select/Select';
import { IChosenFieldField } from '@/components/chose-field/types';
import SelectSubProject from '@/components/select/select-sub-project';
import { DatePickerProps } from 'choerodon-ui/pro/lib/date-picker/DatePicker';
import { ISprint, User } from '@/common/types';
import SelectStatus from './field/StatusField';
import FeatureProjectField from './field/FeatureProjectField';
import PIField from './field/pi-field';
import QuickFilterField from './field/quick-filter-field';
import { useIssueFilterFormStore } from '../stores';

const { Option } = Select;
const singleList = ['radio', 'single'];
const userMaps = new Map<string, User>();
const stacks = new Array<string>();
const finishStack = new Array<string>();
export default function renderField<T extends Partial<SelectProps>>(field: IChosenFieldField, otherComponentProps: T | Partial<DatePickerProps>, { dataSet }: {
  dataSet: DataSet,
}) {
  const {
    code, fieldType, name, fieldOptions, value, id,
  } = field;
  const defaultValue = toJS(value);
  if (!id) {
    switch (code) {
      case 'sprint':
      case 'sprintList':
        return (
          <SelectSprint
            name={code}
            statusList={[]}
            isProgram={code === 'sprintList'}
            multiple
            afterLoad={code === 'sprintList' ? () => { } : (sprints: any) => {
              if (!dataSet.current?.getState(`init_${code}`) && !defaultValue && Array.isArray(sprints) && sprints.length > 0) {
                const data = find<any>(sprints, { statusCode: 'started' }) ?? sprints[0];
                dataSet.current?.set(field.code, [data.sprintId]);
                dataSet.current?.setState(`init_${code}`, true);
              }
            }}
            hasUnassign
            selectSprints={value}
            {...otherComponentProps}
          />
        );
      case 'statusId':
      case 'statusList':
        return <SelectStatus name={code} isProgram={code === 'statusList'} multiple {...otherComponentProps} />;
      case 'issueTypeId':
      case 'issueTypeList':
        return <SelectIssueType name={code} isProgram={code === 'issueTypeList'} filterList={code === 'issueTypeList' ? [] : undefined} multiple {...otherComponentProps} />;
      case 'epic':
      case 'epicList':
        // @ts-ignore
        return <SelectEpic name={code} isProgram={code === 'epicList'} multiple {...otherComponentProps} />;
      case 'priorityId':
        // @ts-ignore
        return <SelectPriority name={code} multiple {...otherComponentProps} />;
      case 'label':
        // @ts-ignore
        return <SelectLabel name={code} multiple valueField="labelId" {...otherComponentProps} />;
      case 'component':
        // @ts-ignore
        return <SelectComponent name={code} valueField="componentId" multiple {...otherComponentProps} />;
      case 'version':
        // @ts-ignore
        return <SelectVersion name={code} valueField="versionId" {...otherComponentProps} />;
      case 'feature': {
        // @ts-ignore
        return <FeatureProjectField name={code} multiple featureIds={defaultValue} {...otherComponentProps} />;// label={name} style={{ width: '100%' }}
      }
      case 'teamProjectList': {
        return <SelectSubProject name={code} multiple {...otherComponentProps} />;// label={name} style={{ width: '100%' }}
      }
      case 'piList': {
        return (
          <PIField
            name={code}
            multiple
            afterLoad={(piList) => {
              if (!dataSet.current?.getState(`init_${code}`) && !defaultValue && Array.isArray(piList) && piList.length > 0) {
                const data = find(piList, { statusCode: 'doing' }) ?? piList[0];
                dataSet.current?.set(field.code, [data.id]);
                dataSet.current?.setState(`init_${code}`, true);
              }
            }}
            {...otherComponentProps}
          />
        );// label={name} style={{ width: '100%' }}
      }
      case 'quickFilterIds': {
        return <QuickFilterField name={code} multiple {...otherComponentProps} />;
      }
      default:
        break;
    }
  }

  switch (fieldType) {
    case 'time': {
      return (
        <TimePicker
          label={name}
          name={code}
          style={{ width: '100%' }}
          {...otherComponentProps}

        />
      );
    }

    case 'datetime':
      return (
        <DateTimePicker
          name={code}
          label={name}
          style={{ width: '100%' }}
          {...otherComponentProps}
        />
      );
    case 'date':
      return (
        <DatePicker
          name={code}
          label={name}
          style={{ width: '100%' }}
          {...otherComponentProps}
        />
      );
    case 'number':
      return (
        <div>
          <NumberField
            name={code}
            label={name}
            style={{ width: '100%' }}
          // step={isCheck ? 0.1 : 1}
          />
        </div>
      );
    case 'input':
      return (
        <TextField
          name={code}
          maxLength={100}
          label={name}
          style={{ width: '100%' }}
        />
      );
    case 'text':
      return (
        <TextArea
          name={code}
          rows={3}
          maxLength={255}
          label={name}
          style={{ width: '100%' }}
        />
      );
    case 'url':
      return (
        <UrlField
          label={name}
          name={code}
        />
      );
    case 'radio': case 'single': case 'checkbox': case 'multiple':
      return (
        <Select
          name={code}
          label={name}
          style={{ width: '100%' }}
          multiple
        >
          {fieldOptions
            && fieldOptions.length > 0
            && fieldOptions.map((item) => {
              return (
                <Option
                  value={item.id}
                  key={item.id}
                >
                  {item.value}
                </Option>
              );
              return [];
            })}
        </Select>
      );
    case 'member':
    {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { noMemberLoadFinish, setNoMemberLoadFinish } = useIssueFilterFormStore();
      return (
        <SelectUser
          label="user"
          multiple
            // @ts-ignore
            // request={(({ filter, page }) => userApi.getAllInProject(filter, page).then((res) => {
            //   if (res.list && Array.isArray(res.list)) {
            //   }
            // }))} value.map((item: string) => (String(item)))
          autoQueryConfig={defaultValue ? {
            selectedUserIds: defaultValue.map((item:any) => String(item)),
            userMaps,
            finishStack,
            taskStacks: stacks,
            forceRefresh: noMemberLoadFinish,
            events: { onFinish: () => setNoMemberLoadFinish(true) },
          } : undefined}
          style={{ width: '100%' }}
          name={code}
          {...otherComponentProps}
        />
      );
    }
    default:
      return null;
  }
}
