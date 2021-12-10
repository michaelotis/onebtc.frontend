import React, { useCallback, useMemo } from 'react';
import { useVaultWatcher } from '../../../hooks/useVaultWatcher';
import { useStores } from '../../../stores';
import { observer } from 'mobx-react';
import { Box } from 'grommet';
import { Button, Divider, Loader, Title } from '../../../components/Base';
import { Paper } from '../../../components/Paper';
import { VaultInfo } from '../../../pages/DashboardVaultDetails/components/VaultInfo';
import { VaultIssuedChart } from '../../../pages/DashboardVaultDetails/components/VaultIssuedChart/VaultIssuedChart';
import { VaultLogs } from '../../../pages/DashboardVaultDetails/components/VaultLogs';
import { VaultAppLayout } from '../../components/Layouts/VaultAppLayout';

interface Props {}

export const VaultDetailsPage: React.FC<Props> = observer(() => {
  const { vaultStore, user, dashboardVaultDetailsStore } = useStores();
  const { vaultAppStore } = useStores().vaultApp;
  const vaultId = vaultAppStore.vaultId;

  useVaultWatcher({ vaultId });

  const handleClickManage = useCallback(() => {
    dashboardVaultDetailsStore.openManageModal(vaultId);
  }, [dashboardVaultDetailsStore, vaultId]);

  const vault = vaultStore.getEntity(vaultId);

  const isOwner = useMemo(() => {
    if (!vault || !user.address) {
      return false;
    }

    return vault.id.toLowerCase() === user.address.toLowerCase();
  }, [vault, user]);

  if (!vault) {
    return (
      <VaultAppLayout>
        <Loader />
      </VaultAppLayout>
    );
  }

  return (
    <VaultAppLayout>
      <Box gap="medium">
        <Box gap="small">
          <Box direction="row" align="center">
            <Box basis="1/3">&nbsp;</Box>
            <Box basis="1/3">
              <Title align="center">Vault Details</Title>
            </Box>
            <Box basis="1/3" align="end">
              {isOwner && (
                <Button transparent size="small" onClick={handleClickManage}>
                  Manage
                </Button>
              )}
            </Box>
          </Box>
          <Divider colorful fullwidth />
        </Box>
        <Box gap="medium">
          <Box
            direction="row-responsive"
            responsive
            gap="medium"
            alignContent="stretch"
          >
            <Box basis="1/2">
              <Paper pad="medium">
                {vault && <VaultInfo vaultId={vaultId} />}
              </Paper>
            </Box>
            <Box basis="1/2">
              <Paper pad="medium">
                <VaultIssuedChart />
              </Paper>
            </Box>
          </Box>
        </Box>
        <Box>
          <VaultLogs vaultId={vaultId} />
        </Box>
      </Box>
    </VaultAppLayout>
  );
});

VaultDetailsPage.displayName = 'VaultDetailsPage';