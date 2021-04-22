import { useEffect, useCallback, useState } from 'react';
import debounce from 'debounce';
import PubSub from 'pubsub-js';

export interface IUsePublishResponse {
  lastPublish: boolean;
  publish: () => void;
}

export interface IUsePublishParams {
  token: string;
  message: string;
  isAutomatic?: boolean;
  isInitialPublish?: boolean;
  isImmediate?: boolean;
  debounceMs?: number;
}

export const usePublish = ({
  token,
  message,
  isAutomatic = false,
  isInitialPublish = false,
  isImmediate = false,
  debounceMs = 300,
}: IUsePublishParams): IUsePublishResponse => {
  const [lastPublish, setLastPublish] = useState(false);

  const publish = useCallback(() => {
    const isPublished = PubSub.publish(token, message);

    setLastPublish(isPublished);
  }, [token, message]);

  useEffect(() => {
    if (isInitialPublish) {
      publish();
    }
  }, []);

  useEffect(() => {
    const debouncedPublished = debounce(publish, debounceMs, isImmediate);
    if (isAutomatic && message) {
      debouncedPublished();
    }
    return () => {
      debouncedPublished.clear();
    };
  }, [publish, isImmediate, isAutomatic, debounceMs]);

  return { lastPublish, publish };
};
