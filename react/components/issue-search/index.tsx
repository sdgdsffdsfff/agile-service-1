import React, {
  useEffect, useMemo,
} from 'react';
import { observer } from 'mobx-react-lite';
import SearchArea from './SearchArea';
import IssueSearchContext from './context';
import IssueSearchStore, { IssueSearchStoreProps } from './store';
import './index.less';

export interface IssueSearchProps {
  store: IssueSearchStore
  onClear: () => void
  onClickSaveFilter: () => void
  urlFilter?: string
  onChange: () => void
}
export function useIssueSearchStore(props: IssueSearchStoreProps) {
  const store = useMemo(() => new IssueSearchStore(props), []);
  return store;
}
export { IssueSearchStore };
const IssueSearch: React.FC<IssueSearchProps> = ({
  urlFilter, onClear, onClickSaveFilter, store, onChange,
}) => {
  store.setQuery(onChange);
  useEffect(() => {
    store.initChosenFields();
    store.loadMyFilterList();
    store.loadCustomFields();
  }, [store]);

  return (
    <IssueSearchContext.Provider
      value={{
        store,
        urlFilter,
        onClear,
        onClickSaveFilter,
      }}
    >
      <SearchArea />
    </IssueSearchContext.Provider>
  );
};
export default observer(IssueSearch);
