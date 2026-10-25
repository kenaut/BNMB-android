import { toFurigana } from "../domain/furigana";

interface RubyTextProps {
  kanji: string;
  kana: string;
}

/**
 * 统一的振假名渲染：汉字上方标假名（<ruby>/<rt>），
 * 纯假名部分原样输出、不重复标注。
 */
export default function RubyText({ kanji, kana }: RubyTextProps) {
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
