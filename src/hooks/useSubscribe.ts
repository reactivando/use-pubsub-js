import { useEffect, useCallback } from 'react';
import PubSub from 'pubsub-js';

export interface IUseSubscriptionResponse {
  unsubscribe: () => void;
  resubscribe: () => void;
}

export interface IUseSubscriptionParams {
  token: string | Symbol;
  handler: () => void;
  isUnsubscribe?: boolean;
}

export const useSubscribe = ({
  token,
  handler,
  isUnsubscribe = false,
}: IUseSubscriptionParams): IUseSubscriptionResponse => {
  const unsubscribe = useCallback(() => {
    PubSub.unsubscribe(token);
  }, [token]);

  const resubscribe = useCallback(() => {
    PubSub.unsubscribe(token);

    PubSub.subscribe(token, handler);
  }, [token, handler]);

  useEffect(() => {
    if (isUnsubscribe) {
      unsubscribe();
    } else {
      PubSub.subscribe(token, handler);
    }

    return () => {
      unsubscribe();
    };
  }, [isUnsubscribe]);

  return { unsubscribe, resubscribe };
};
