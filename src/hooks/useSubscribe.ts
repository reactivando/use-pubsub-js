import { useEffect, useCallback } from "react";
import PubSub from "pubsub-js";

type Handler = () => void;

export interface IUseSubscriptionResponse {
  unsubscribe: Handler;
}

export interface IUseSubscriptionParams {
  token: string;
  handler: Handler;
  isUnsubscribe?: boolean;
}

export type UseSubscribe = (params: IUseSubscriptionParams) => IUseSubscriptionResponse;
export const useSubscribe: UseSubscribe = ({
  token,
  handler,
  isUnsubscribe = false,
}) => {
  const unsubscribe = useCallback(() => {
    PubSub.unsubscribe(token);
  }, [token]);

  useEffect(() => {
    PubSub.subscribe(token, handler);

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isUnsubscribe) {
      unsubscribe();
    }
  }, [isUnsubscribe]);

  return { unsubscribe };
};
