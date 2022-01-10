import { StoreConstructor } from '../../stores/core/StoreConstructor';
import { action, computed, get, observable } from 'mobx';
import { getOneBTCClient } from 'services/oneBtcClient';
import {
  bitcoinToSatoshi,
  satoshiToBitcoin,
  btcAddressBech32ToHex,
} from '../../services/bitcoin';
import { RedeemWithdrawModal } from './components/RedeemWithdrawModal/RedeemWithdrawModal';
import { RedeemDetailsModal } from './components/RedeemDetailsModal/RedeemDetailsModal';
import { RedeemConfirmModal } from './components/RedeemConfirmModal';
import { dashboardClient } from '../../modules/dashboard/dashboardClient';
import { IRedeem, IVault } from '../../modules/dashboard/dashboardTypes';
import { retry } from '../../utils';
import { UITransactionStatus } from '../../modules/uiTransaction/UITransactionsStore';
import { VaultStore } from '../../stores/VaultStore';
import { RedeemCanceledModal } from './components/RedeemCanceledModal';

export interface IDefaultForm {
  oneBTCAmount: string;
  totalReceive: number;
  bitcoinAddress: string;
  vaultId: string;
}

export class RedeemPageStore extends StoreConstructor {
  defaultForm: IDefaultForm = {
    oneBTCAmount: '0.0001',
    bitcoinAddress: '',
    totalReceive: 0,
    vaultId: '',
  };

  @observable redeemMap: Record<string, IRedeem> = {};

  @observable status: 'init' | 'pending' | 'success' | 'cancel' | 'error' =
    'init';

  @observable form = this.defaultForm;
  @observable _vaultList: IVault[] = [];

  @computed
  get bridgeFee() {
    return (Number(this.form.oneBTCAmount) * 2) / 1000;
  }

  @computed
  get totalReceived() {
    return Number(this.form.oneBTCAmount) - this.bridgeFee;
  }

  @action.bound
  public async loadVaults() {
    const response = await dashboardClient.loadVaultList({ size: 50, page: 0 });
    this._vaultList = response.content;
  }

  @get
  public get vaultList() {
    return this._vaultList.filter(vault => parseInt(vault.collateral, 10) > 0);
  }

  @get
  public get vaultActiveList() {
    return this.vaultList.filter(VaultStore.isVaultOnline);
  }

  public getVault(vaultId: string) {
    return this._vaultList.find(vault => vault.id === vaultId);
  }

  @action.bound
  public async executeRedeem(redeemId: string, btcTxHash: string) {
    this.status = 'pending';

    const redeemUiTx = this.stores.uiTransactionsStore.create(undefined, {
      titles: {
        [UITransactionStatus.WAITING_SIGN_IN]:
          'Waiting for user to sign execute redeem request',
        [UITransactionStatus.PROGRESS]:
          'Waiting for execute redeem transaction to confirm',
      },
    });
    redeemUiTx.setStatusProgress();
    redeemUiTx.showModal();
    try {
      const redeem = this.stores.redeemStore.getRedeemInfo(redeemId);

      const address = this.stores.user.address;

      const hmyClient = await getOneBTCClient(this.stores.user.sessionType);

      redeemUiTx.setStatusWaitingSignIn();

      const result = await hmyClient.executeRedeem(
        address,
        redeem.redeemId,
        btcTxHash,
        txHash => {
          redeemUiTx.setTxHash(txHash);
          redeemUiTx.setStatusProgress();
        },
      );
      redeemUiTx.hideModal();
      redeemUiTx.setStatusSuccess();

      this.stores.actionModals.open(RedeemConfirmModal, {
        initData: {
          total: satoshiToBitcoin(redeem.totalReceived),
          txHash: result.transactionHash,
        },
        applyText: '',
        closeText: '',
        noValidation: true,
        width: '320px',
        showOther: true,
        onApply: () => {
          return Promise.resolve();
        },
      });
      this.status = 'success';
      console.log('### execute issuePageStore finished');
    } catch (err) {
      console.log('### err mock execute issuePageStore error', err);
      this.status = 'error';
      redeemUiTx.setError(err);
      redeemUiTx.setStatusFail();
    }
  }

  public async openRedeemWithdrawModal(redeemId: string) {
    await this.stores.redeemStore.loadRedeem(redeemId);
    this.stores.actionModals.open(RedeemWithdrawModal, {
      applyText: 'View Progress',
      closeText: 'Close',
      initData: {
        redeemId,
      },
      noValidation: true,
      width: '500px',
      showOther: true,
      onApply: () => {
        this.openRedeemDetailsModal(redeemId);
        this.stores.routing.gotToRedeemModal(redeemId, 'details');
        return Promise.resolve();
      },
      onClose: () => {
        return Promise.resolve();
      },
    });
  }

  @action.bound
  public async openRedeemDetailsModal(redeemId: string, onClose?: () => void) {
    await this.stores.redeemStore.loadRedeem(redeemId);

    this.stores.actionModals.open(RedeemDetailsModal, {
      applyText: '',
      closeText: 'Close',
      initData: {
        redeemId,
      },
      noValidation: true,
      width: '80%',
      showOther: true,
      onApply: () => {
        return Promise.resolve();
      },
      onClose: () => {
        if (onClose) {
          onClose();
        }
        return Promise.resolve();
      },
    });

    return true;
  }

  @action.bound
  public async createRedeem() {
    if (!this.stores.user.isAuthorized) {
      this.stores.user.openConnectWalletModal();
      return;
    }
    this.status = 'pending';

    const redeemUiTx = this.stores.uiTransactionsStore.create(undefined, {
      titles: {
        [UITransactionStatus.WAITING_SIGN_IN]:
          'Waiting for user to sign request redeem request',
        [UITransactionStatus.PROGRESS]:
          'Waiting for confirmation of redeem request',
      },
    });

    redeemUiTx.setStatusWaitingSignIn();
    redeemUiTx.showModal();
    try {
      const hmyClient = await getOneBTCClient(this.stores.user.sessionType);

      const redeemAmount = bitcoinToSatoshi(this.form.oneBTCAmount);
      const btcAddress = this.form.bitcoinAddress;
      const vaultId = this.form.vaultId;

      const _btcAddress = btcAddressBech32ToHex(btcAddress);

      const redeemRequest = await hmyClient.requestRedeem(
        redeemAmount,
        _btcAddress,
        vaultId,
        txHash => {
          redeemUiTx.setTxHash(txHash);
          redeemUiTx.setStatusProgress();
        },
      );

      const redeem = await retry(
        () => this.stores.redeemStore.loadRedeem(redeemRequest.redeem_id),
        result => !!result,
      );

      this.stores.routing.gotToRedeemModal(redeem.id, 'withdraw');

      redeemUiTx.setStatusSuccess();
      redeemUiTx.hideModal();
      this.status = 'success';
    } catch (err) {
      redeemUiTx.setError(err);
      redeemUiTx.setStatusFail();
      console.log('### Error during create issuePageStore', err);
      this.status = 'error';
    }
  }

  @action
  async cancelIssue(redeemId: string) {
    const uiTx = this.stores.uiTransactionsStore.create();
    uiTx.setStatusWaitingSignIn();
    uiTx.showModal();

    try {
      const hmyClient = await getOneBTCClient(this.stores.user.sessionType);

      const redeemInfo = this.stores.redeemStore.getRedeemInfo(redeemId);

      await hmyClient.cancelRedeem(redeemInfo.requester, redeemId, txHash => {
        uiTx.setTxHash(txHash);
        uiTx.setStatusProgress();
      });

      uiTx.hideModal();
      this.stores.actionModals.open(RedeemCanceledModal, {
        initData: {},
        applyText: '',
        closeText: '',
        noValidation: true,
        width: '320px',
        showOther: true,
        onApply: () => {
          return Promise.resolve();
        },
      });
    } catch (err) {
      console.log('### err execute cancelRedeem error', err);
      this.status = 'error';
      uiTx.setStatusFail();
    }
  }
}
