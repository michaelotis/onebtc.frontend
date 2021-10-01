import { useStores } from '../../../../stores';
import { useObserver } from 'mobx-react';
import { Box } from 'grommet';
import { Text } from '../../../../components/Base';
import { formatWithSixDecimals } from '../../../../utils';
import React from 'react';

export const RedeemWithdrawModalContent: React.FC<{ redeemId: string }> = ({
  redeemId,
}) => {
  const { redeemPageStore } = useStores();

  const redeemInfo = redeemPageStore.getRedeemInfo(redeemId);

  return useObserver(() => (
    <Box gap="small" align="center">
      <Box align="center">
        <Text bold>Your Redeem request is being processed</Text>
      </Box>

      <Box align="center">
        <Text>
          You will receive&nbsp;
          <Text inline color="Orange500">
            {redeemInfo.totalReceived}
          </Text>
          &nbsp;BTC
        </Text>
        <Text color="#748695" size="small" inline>
          ≈ ${formatWithSixDecimals(redeemInfo.totalReceivedUsd)}
        </Text>
      </Box>
      <Box align="center" gap="xxsmall">
        <Text>BTC destination address</Text>
        <Box round="xxsmall" style={{ padding: '16px' }} border="all">
          <Text
            bold
            style={{ textAlign: 'center', overflowWrap: 'break-word' }}
          >
            {redeemInfo.bitcoinAddress}
          </Text>
        </Box>
      </Box>

      <Box alignSelf="start">
        <Text>
          <Text inline bold color="Red">
            Note:
          </Text>{' '}
          We will inform you when the BTC payment is executed. This typically
          takes only a few minutes but may sometimes take up to 6 hours.
        </Text>
      </Box>
    </Box>
  ));
};

RedeemWithdrawModalContent.displayName = 'RedeemWithdrawModalContent';