import { StoreConstructor } from '../../stores/core/StoreConstructor';
import { action, computed, observable } from 'mobx';
import { getOneBTCClient } from 'services/oneBtcClient';
import { IssueDepositModal } from './components/IssueDepositModal/IssueDepositModal';
import { IssueDetailsModal } from './components/IssueDetailsModal/IssueDetailsModal';
import { IssueConfirmModal } from './components/IssueConfirmModal';
import { guid } from '../../utils';
import { UITransaction } from '../../modules/uiTransaction/UITransactionsStore';
import {
  bitcoinToSatoshi,
  satoshiToBitcoin,
  walletHexToBase58,
  walletHexToBech32,
} from '../../services/bitcoin';
import { IssueDetails } from 'onebtc.sdk/lib/blockchain/hmy/types';
import BtcRelayClient from '../../modules/btcRelay/btcRelayClient';
import { IVault } from '../../modules/btcRelay/btcRelayTypes';

export interface ITransaction {
  amount: string;
  vaultId: string;
}

export class IssuePageStore extends StoreConstructor {
  defaultForm: ITransaction = {
    amount: '0.0001',
    vaultId: '0xFbE0741bC1B52dD723A6bfA145E0a15803AC9581',
  };

  @observable issuesMap: {
    [key: string]: {
      status: string;
      issueAmount: number;
      vaultId: string;
      issueEvent: IssueDetails;
      btcBase58Address: string;
      btcAddress: string;
    };
  } = {};

  @observable status: 'init' | 'pending' | 'success' | 'cancel' | 'error' =
    'init';

  @observable form = this.defaultForm;
  @observable vaultList: IVault[] = [];

  @computed
  get bridgeFee() {
    return (Number(this.form.amount) * 2) / 1000;
  }

  @computed
  get totalReceive() {
    return Number(this.form.amount) - this.bridgeFee;
  }

  @action.bound
  createUiTx(progressModalId: string): UITransaction {
    return this.stores.uiTransactionsStore.create(progressModalId);
  }

  @action.bound
  async executeIssue(transactionHash: string, btcTransactionHash: string) {
    console.log('### executeIssue');
    this.status = 'pending';

    const uiTxId = guid();

    const issueUiTx = this.createUiTx(uiTxId);
    issueUiTx.setStatusWaitingSignIn();
    issueUiTx.showModal();
    try {
      const issue = this.issuesMap[transactionHash];

      const address = this.stores.user.address;

      const hmyClient = await getOneBTCClient(this.stores.user.sessionType);
      hmyClient.setUseMathWallet(true);

      console.log('### run execute issuePageStore');

      const result = await hmyClient.methods.executeIssue(
        address,
        // @ts-ignore
        issue.issueEvent.issue_id,
        btcTransactionHash,
        txHash => {
          issueUiTx.setTxHash(txHash);
          issueUiTx.setStatusProgress();
        },
      );
      console.log('### execute issuePageStore success');

      issueUiTx.setStatusSuccess();
      issueUiTx.hideModal();

      this.stores.actionModals.open(IssueConfirmModal, {
        initData: {
          total: satoshiToBitcoin(issue.issueEvent.amount),
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
      issueUiTx.setStatusFail();
    }
  }

  public getIssueInfo(issueTxHash: string) {
    const issue = this.issuesMap[issueTxHash];
    const issueEvent = issue.issueEvent;
    const sendAmount =
      (Number(issueEvent.amount) + Number(issueEvent.fee)) / 1e8;

    const totalReceived = Number(issue.issueEvent.amount) / 1e8;
    return {
      sendAmount,
      issueEvent: issue.issueEvent,
      sendUsdAmount: sendAmount * this.stores.user.btcRate,
      issueId: issue.issueEvent.issue_id,
      vaultId: issue.issueEvent.vault_id,
      bitcoinAddress: issue.btcAddress,
      bridgeFee: Number(issue.issueEvent.fee) / 1e8,
      totalReceived: totalReceived,
      totalReceivedUsd: totalReceived * this.stores.user.btcRate,
      requester: issueEvent.requester,
    };
  }

  @action.bound
  public openTransactionModal(transactionHash: string) {
    this.stores.actionModals.open(IssueDetailsModal, {
      initData: {
        transactionHash,
      },
      applyText: '',
      closeText: 'Close',
      noValidation: true,
      width: '80%',
      showOther: false,
      onApply: () => {
        this.stores.routing.goToIssue();
        return Promise.resolve();
      },
      onClose: () => {
        this.stores.routing.goToIssue();
        return Promise.resolve();
      },
    });
  }

  @action.bound
  public openDepositModal(transactionHash: string) {
    this.stores.actionModals.open(IssueDepositModal, {
      applyText: 'I have made the payment',
      closeText: 'Close',
      initData: {
        transactionHash,
      },
      noValidation: true,
      width: '500px',
      showOther: false,
      onApply: () => {
        this.stores.routing.goToIssueModal(transactionHash, 'details');
        return Promise.resolve();
      },
      onClose: () => {
        this.status = 'cancel';
        this.stores.routing.goToIssue();
        return Promise.resolve();
      },
    });
  }

  public async loadVaults() {
    const response = await BtcRelayClient.loadVaultList({ size: 10, page: 0 });
    this.vaultList = response.content;
  }

  @action.bound
  public async loadIssueDetails(txHash: string) {
    try {
      const hmyClient = await getOneBTCClient(this.stores.user.sessionType);

      const issueDetails = await hmyClient.methods.getIssueDetails(txHash);

      if (!issueDetails) {
        return;
      }

      const address = this.stores.user.address;

      const status = await hmyClient.methods
        .getIssueStatus(address, issueDetails.issue_id)
        .catch(err => {
          console.log('### err', err);
        });

      this.issuesMap[txHash] = {
        status: status || '',
        issueAmount: Number(issueDetails.amount),
        vaultId: issueDetails.vault_id,
        issueEvent: issueDetails,
        btcBase58Address: walletHexToBase58(issueDetails.btc_address),
        btcAddress: walletHexToBech32(issueDetails.btc_address),
      };
    } catch (err) {
      console.log('### err', err);
    }
  }

  @action.bound
  public async createIssue() {
    this.status = 'pending';
    const uiTxId = guid();
    const issueUiTx = this.createUiTx(uiTxId);
    issueUiTx.showModal();

    try {
      const hmyClient = await getOneBTCClient(this.stores.user.sessionType);

      const vaultId = this.form.vaultId;
      hmyClient.setUseOneWallet(true);
      const issueAmount = bitcoinToSatoshi(this.form.amount);

      console.log('### Request Issue');

      // switch status: waiting for sign in
      issueUiTx.setStatusWaitingSignIn();

      const issueRequest = await hmyClient.methods.requestIssue(
        issueAmount,
        vaultId,
        txHash => {
          issueUiTx.setTxHash(txHash);
          issueUiTx.setStatusProgress();
        },
      );

      console.log('### GetIssueDetails');
      issueUiTx.setStatusProgress();

      const issueEvent = await hmyClient.methods.getIssueDetails(
        issueRequest.transactionHash,
      );

      if (!issueEvent) {
        throw new Error("Can't found issue details");
      }

      // add transaction data: issueId
      issueUiTx.setIssueId(issueEvent.issue_id);

      const btcAddress = walletHexToBech32(issueEvent.btc_address);
      const btcBase58Address = walletHexToBase58(issueEvent.btc_address);
      console.log('### issueRequest', issueRequest);
      console.log('### issueEvent', issueEvent);
      console.log('### btcBase58Address', btcBase58Address);
      console.log('### btcAddress', btcAddress);

      this.issuesMap[issueRequest.transactionHash] = {
        status: '0',
        issueAmount,
        vaultId,
        issueEvent,
        btcBase58Address,
        btcAddress,
      };

      issueUiTx.setStatusSuccess();
      issueUiTx.hideModal();

      this.stores.routing.goToIssueModal(
        issueRequest.transactionHash,
        'deposit',
      );

      this.status = 'success';
    } catch (err) {
      issueUiTx.setStatusFail();
      issueUiTx.setError(err.message);
      // user: Error: MetaMask Tx Signature: User denied transaction signature.
      if (err.code === 4001) {
        issueUiTx.hideModal();
      }
      console.log('### Error during create issuePageStore', err);
      this.status = 'error';
    }
  }
}
