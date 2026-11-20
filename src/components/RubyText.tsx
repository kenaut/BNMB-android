import { toFurigana } from "../domain/furigana";

interface RubyTextProps {
  kanji: string;
  kana: string;
  /** 是否显示振假名（做题偏好可关闭），关闭时只显示汉字表记 */
  showReading?: boolean;
}

/**
 * 统一的振假名渲染：汉字上方标假名（<ruby>/<rt>），
 * 纯假名部分原样输出、不重复标注。
 */
export default function RubyText({ kanji, kana, showReading = true }: RubyTextProps) {
  if (!showReading) return <>{kanji}</>;
  return (
    <>
      {toFurigana(kanji, kana).map((seg, i) =>
        seg.reading ? (
          <ruby key={i}>
            {seg.text}
            <rt>{seg.reading}</rt>
          </ruby>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
