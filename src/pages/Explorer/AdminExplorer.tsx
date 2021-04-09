import * as React from 'react';
import { useEffect, useState } from 'react';
import { Box } from 'grommet';
import { BaseContainer, PageContainer } from 'components';
import { observer } from 'mobx-react-lite';
import { useStores } from 'stores';
import { Table } from 'components/Table';
import { Button, Text, TextInput } from 'components/Base';
import { getColumns } from './Common';
import { ExpandedRow } from './ExpandedRow';
import { Select } from '../../components/Base/components/Inputs/types';
import { Title } from '../../components/Base/components/Title';
import {
  ACTION_TYPE,
  EXCHANGE_MODE,
  IOperation,
  NETWORK_TYPE,
  STATUS,
  TOKEN,
} from '../../stores/interfaces';
import { AuthWarning } from '../../components/AuthWarning';

export const isStuckOperation = (o: IOperation) => {
  if (o.status === STATUS.IN_PROGRESS || o.status === STATUS.WAITING) {
    let actionType: ACTION_TYPE;

    switch (o.token) {
      case TOKEN.ONE:
        actionType =
          o.type === EXCHANGE_MODE.ETH_TO_ONE
            ? ACTION_TYPE.unlockHRC20Token
            : ACTION_TYPE.mintHRC20Token;
        break;

      default:
        actionType =
          o.type === EXCHANGE_MODE.ETH_TO_ONE
            ? ACTION_TYPE.mintToken
            : ACTION_TYPE.unlockToken;
        break;
    }

    const action = o.actions.find(a => a.type === actionType);

    if (
      action &&
      action.timestamp &&
      (Date.now() - action.timestamp * 1000) / (1000 * 60) > 21
    ) {
      return true;
    }
  }

  return false;
};

export const AdminExplorer = observer((props: any) => {
  const { operations, user, tokens, actionModals } = useStores();
  const [manager, setManager] = useState('');

  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [columns, setColumns] = useState(getColumns({ user }));

  useEffect(() => {
    tokens.init();
    tokens.fetch();
    operations.init();
  }, [operations, tokens]);

  useEffect(() => {
    setColumns(getColumns({ user }, manager));
  }, [
    user.oneRate,
    user.ethRate,
    tokens.data,
    tokens.fetchStatus,
    user,
    manager,
  ]);

  useEffect(() => {
    actionModals.open(
      () => {
        const [value, onChange] = useState('');

        return (
          <Box pad="large" gap="20px">
            <Text>Set Admin Password</Text>
            <TextInput value={value} onChange={onChange} />
            <Button
              size="large"
              onClick={() => {
                setManager(value);
                actionModals.closeLastModal();
              }}
            >
              Save
            </Button>
          </Box>
        );
      },
      {
        title: 'Set Admin Password',
        applyText: '',
        closeText: '',
        noValidation: true,
        width: '500px',
        showOther: true,
        onApply: () => {
          return Promise.resolve();
        },
      },
    );
  }, []);

  const onChangeDataFlow = (props: any) => {
    operations.onChangeDataFlow(props);
  };

  return (
    <BaseContainer>
      <PageContainer>
        <Box
          direction="column"
          align="center"
          margin={{ top: 'xlarge' }}
          gap="20px"
        >
          <Title size="large">Admin explorer</Title>
        </Box>
        <Box
          direction="row"
          wrap={true}
          fill={true}
          justify="center"
          align="start"
          margin={{ top: 'medium' }}
        >
          <Box
            direction="row"
            justify="between"
            margin={{ bottom: 'small' }}
            gap="20px"
          >
            <Box direction="column" style={{ width: 300 }} gap="5px">
              <Text>Type:</Text>
              <Select
                size="full"
                options={[
                  { text: 'ALL', value: null },
                  { text: 'ETH -> HMY', value: EXCHANGE_MODE.ETH_TO_ONE },
                  { text: 'HMY -> ETH', value: EXCHANGE_MODE.ONE_TO_ETH },
                ]}
                onChange={value => {
                  operations.onChangeDataFlow({
                    filters: { type: value },
                  });
                }}
              />
            </Box>

            <Box direction="column" style={{ width: 300 }} gap="5px">
              <Text>Operation STATUS:</Text>
              <Select
                size="full"
                options={[
                  { text: 'ALL', value: null },
                  { text: STATUS.SUCCESS, value: STATUS.SUCCESS },
                  { text: STATUS.IN_PROGRESS, value: STATUS.IN_PROGRESS },
                  { text: STATUS.WAITING, value: STATUS.WAITING },
                  { text: STATUS.ERROR, value: STATUS.ERROR },
                  { text: STATUS.CANCELED, value: STATUS.CANCELED },
                ]}
                onChange={value => {
                  operations.onChangeDataFlow({
                    filters: { status: value },
                  });
                }}
              />
            </Box>

            <Box direction="column" style={{ width: 300 }} gap="5px">
              <Text>Token type:</Text>
              <Select
                size="full"
                options={[
                  { text: 'ALL', value: null },
                  { text: TOKEN.ERC20, value: TOKEN.ERC20 },
                  { text: TOKEN.BUSD, value: TOKEN.BUSD },
                  { text: TOKEN.LINK, value: TOKEN.LINK },
                  { text: TOKEN.HRC20, value: TOKEN.HRC20 },
                  { text: TOKEN.ERC721, value: TOKEN.ERC721 },
                  { text: TOKEN.ONE, value: TOKEN.ONE },
                  { text: TOKEN.ETH, value: TOKEN.ETH },
                ]}
                onChange={value => {
                  operations.onChangeDataFlow({
                    filters: { token: value },
                  });
                }}
              />
            </Box>

            <Box direction="column" style={{ width: 300 }} gap="5px">
              <Text>Network:</Text>
              <Select
                size="full"
                options={[
                  { text: 'ALL', value: null },
                  { text: NETWORK_TYPE.BINANCE, value: NETWORK_TYPE.BINANCE },
                  { text: NETWORK_TYPE.ETHEREUM, value: NETWORK_TYPE.ETHEREUM },
                ]}
                onChange={value => {
                  operations.onChangeDataFlow({
                    filters: { network: value },
                  });
                }}
              />
            </Box>
          </Box>
          <Table
            data={operations.data}
            columns={columns}
            isPending={operations.isPending}
            dataLayerConfig={operations.dataFlow}
            onChangeDataFlow={onChangeDataFlow}
            onRowClicked={() => {}}
            tableParams={{
              rowKey: (data: any) => data.id,
              rowClassName: (data: IOperation) =>
                isStuckOperation(data) ? 'stuckOperation' : '',
              expandable: {
                expandedRowKeys,
                onExpandedRowsChange: setExpandedRowKeys,
                expandedRowRender: (data: any) => <ExpandedRow data={data} />,
                expandRowByClick: true,
              },
            }}
          />
        </Box>
      </PageContainer>
    </BaseContainer>
  );
});
