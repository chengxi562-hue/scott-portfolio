# Chengxi Editorial Medium

Local modified font for headings on Yi Chengxi's personal website.

- Family: `Chengxi Editorial`
- Style/weight: static `Medium`, CSS weight `500`; normal style
- File: `ChengxiEditorial-Medium.woff2` (188,876 bytes)
- Font license: SIL Open Font License 1.1; see [ChengxiEditorial-OFL.txt](ChengxiEditorial-OFL.txt).
- Original family: Noto Serif SC, Google Fonts official repository.
- Source font: [NotoSerifSC[wght].ttf](https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf)
- Original license: [OFL.txt](https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/OFL.txt)
- Prepared: 2026-09-23, with fontTools 4.60.2.

## Modifications and coverage

The official variable font was subset to the current public HTML files, `assets/languages.js`, and the explicitly supplied heading corpus, then instantiated at weight 500 and encoded as WOFF2. Primary family, full, unique, typographic and PostScript names were changed to Chengxi Editorial. No original author endorsement is implied. Original copyright, author and license metadata remain in the font.

At generation, 952 of 953 requested visible codepoints are covered. The only unsupported codepoint is U+21B3 (`↳`), a decorative empty-state arrow absent from the original font; retain normal CSS font fallback for it. Both “保持好奇，把想法做出来。” and “Stay curious. Make ideas real.” are fully covered. This is a site-specific subset, not a general CJK font. New copy must be checked before publishing.

## Original attribution

- Copyright: (c) 2017-2024 Adobe (http://www.adobe.com/).
- Original trademark notice: Noto is a trademark of Google Inc.
- Original manufacturer: Adobe
- Original designers: Ryoko NISHIZUKA 西塚涼子 (kana & ideographs); Frank Grießhammer (Latin, Greek & Cyrillic); Wenlong ZHANG 张文龙 (bopomofo); Sandoll Communications 산돌커뮤니케이션, Soohyun PARK 박수현, Yejin WE 위예진 & Donghoon HAN 한동훈 (hangul elements, letters & syllables)

## Reproduction

Local build script and source snapshot: `_dev/portfolio-20260923/type/`. These are local development materials and are not published. The script makes no network requests.

```sh
python3 _dev/portfolio-20260923/type/build_font.py --check
python3 _dev/portfolio-20260923/type/build_font.py
```

The check writes `coverage-check.json`, including current input hashes, missing source-supported characters, final names, weight and confirmation that variable-font tables are absent. The public font remains distributed under OFL 1.1.

- Original font SHA-256: `050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9`
- Generated WOFF2 SHA-256: `660da240f4800161c03352a3bef8129c0a4f57d81901880eed515b5a4318761a`
