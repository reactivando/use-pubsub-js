import PubSub from "pubsub-js";
import { useSubscribe } from "./useSubscribe";
import { renderHook, act } from "@testing-library/react-hooks";

jest.useFakeTimers("modern");

const token = "test";
const message = "message";

const publish = () => PubSub.publish(token, message);

describe("useSubscribe", () => {
  afterEach(() => {
    jest.clearAllTimers();
    PubSub.clearAllSubscriptions();
  });

  it("should receive a published message", () => {
    expect.assertions(2);

    const handler = jest.fn();

    renderHook(() => useSubscribe({ token, handler }));

    const isPublished = publish();

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(handler).toBeCalledTimes(1);
    expect(isPublished).toBe(true);
  });
  it("should unsubscribe when isUnsubscribe is changed to true", () => {
    expect.assertions(4);

    const handler = jest.fn();
    let isUnsubscribe = false;

    const { rerender } = renderHook(() =>
      useSubscribe({ token, handler, isUnsubscribe })
    );

    const isPublished = publish();

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(handler).toBeCalledTimes(1);
    expect(isPublished).toBe(true);

    isUnsubscribe = true;
    rerender();

    const isPublishedChanged = publish();

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(handler).toBeCalledTimes(1);
    expect(isPublishedChanged).toBe(false);
  });
  it("should unsubscribe when invoke unsubscribe function", () => {
    expect.assertions(4);

    const handler = jest.fn();

    const { result } = renderHook(() => useSubscribe({ token, handler }));

    const isPublished = publish();

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(handler).toBeCalledTimes(1);
    expect(isPublished).toBe(true);

    result.current.unsubscribe();

    const isPublishedChanged = publish();

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(handler).toBeCalledTimes(1);
    expect(isPublishedChanged).toBe(false);
  });
  it("should unsubscribe when hook is unmounted", () => {
    expect.assertions(4);

    const handler = jest.fn();

    const { unmount } = renderHook(() => useSubscribe({ token, handler }));

    const isPublished = publish();

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(handler).toBeCalledTimes(1);
    expect(isPublished).toBe(true);

    unmount();

    const isPublishedChanged = publish();

    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(handler).toBeCalledTimes(1);
    expect(isPublishedChanged).toBe(false);
  });
});
