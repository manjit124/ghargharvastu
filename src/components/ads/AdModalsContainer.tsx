import React from 'react';
import { InterstitialAdModal } from './InterstitialAdModal';
import { RewardedAdModal } from './RewardedAdModal';

export const AdModalsContainer: React.FC = () => {
  return (
    <>
      <InterstitialAdModal />
      <RewardedAdModal />
    </>
  );
};
