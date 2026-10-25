import { useRef } from "react";

/**
 * 兼容日语 IME 的 Enter 处理。
 *
 * 仅靠 KeyboardEvent.isComposing 不可靠：在 Firefox / 部分 Linux 输入法下，
 * 「确认候选词」的 Enter 的 keydown 紧随 compositionend 派发，此时
 * isComposing 已是 false。这里在 compositionend 后用 setTimeout(0)
 * 延迟清除组词标志，吞掉同一事件循环中的确认 Enter。
 */
export function useImeEnter(onEnter: () => void) {
  const composingRef = useRef(false);

  return {
    compositionProps: {
      onCompositionStart: () => {
        composingRef.current = true;
      },
      onCompositionEnd: () => {
        window.setTimeout(() => {
          composingRef.current = false;
        }, 0);
      },
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      if (e.nativeEvent.isComposing || composingRef.current) return;
      e.preventDefault();
      onEnter();
    },
  };
}
