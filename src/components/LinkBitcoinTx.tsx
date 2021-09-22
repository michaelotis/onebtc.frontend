import React from 'react';
import { cutText } from '../services/cutText';
import { config } from '../config';

interface Props {
  txHash: string;
  text?: string;
}

const LinkBitcoinTx: React.FC<Props> = ({ txHash = '', text }) => {
  return (
    <a
      target="_blank"
      rel="noreferrer"
      href={`${config.bitcoin.explorer.testnet.transaction}${txHash}`}
    >
      {text || cutText(txHash)}
    </a>
  );
};

export default LinkBitcoinTx;
