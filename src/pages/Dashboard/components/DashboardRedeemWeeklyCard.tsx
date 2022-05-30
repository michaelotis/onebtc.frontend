import { DashboardCardHead } from '../../../components/Dashboard/DashboardCardHead';
import { Text } from '../../../components/Base';
import { NavLink } from 'react-router-dom';
import { routes } from '../../../constants/routePaths';
import { DashboardCard } from '../../../components/Dashboard/DashboardCard';
import React from 'react';
import { useStores } from '../../../stores';
import { observer } from 'mobx-react';
import { DashboardCardBody } from '../../../components/Dashboard/DashboardCardBody';
import { DashboardCardFooter } from '../../../components/Dashboard/DashboardCardFooter';
import { DashboardRedeemWeeklyChart } from './DashboardRedeemWeeklyChart';

interface Props {}

export const DashboardRedeemWeeklyCard: React.FC<Props> = observer(() => {
  const { routing } = useStores();

  return (
    <DashboardCard>
      <DashboardCardHead>
        <Text>Redeem Weekly:</Text>
      </DashboardCardHead>
      <DashboardCardBody>
        <DashboardRedeemWeeklyChart />
      </DashboardCardBody>
      <DashboardCardFooter>
        <Text>
          <NavLink to={routing.generatePath(routes.dashboardIssue)}>
            View all issued
          </NavLink>
        </Text>
        <Text>
          <NavLink to={routing.generatePath(routes.dashboardRedeem)}>
            View all redeemed
          </NavLink>
        </Text>
      </DashboardCardFooter>
    </DashboardCard>
  );
});

DashboardRedeemWeeklyCard.displayName = 'DashboardRedeemWeeklyCard';
