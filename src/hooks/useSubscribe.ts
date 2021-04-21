import { useEffect, useCallback } from "react";
import PubSub from "pubsub-js";

type Handler = () => void;

interface IResponse {
  unsubscribe: Handler;
}

interface IParams {
  token: string;
  handler: Handler;
  isUnsubscribe?: boolean;
}

type UseSubscribe = ({ token, handler, isUnsubscribe }: IParams) => IResponse;
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
