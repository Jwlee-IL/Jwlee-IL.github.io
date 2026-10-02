const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  WidthType, BorderStyle, ShadingType, AlignmentType, LevelFormat, VerticalAlign,
  ExternalHyperlink, HeadingLevel, Footer, PageNumber, TabStopType,
} = require('docx');

// _data/resume.yml 을 읽어 이력서 docx 를 만든다. PDF 변환은 export-pdf.ps1 이 Word로 한다.
const yaml = require('js-yaml');
const Y = yaml.load(fs.readFileSync(path.join(__dirname, '..', '..', '_data', 'resume.yml'), 'utf8'));
const DATA = {
  ...Y,
  public: true,
  skills: Y.skills.map((s) => [s.label, s.value]),
  education: Y.education.map((e) => [e.period, e.value]),
  misc: Y.misc.map((m) => [m.label, m.value]),
  links: Y.links.map((l) => [l.label, l.url]),
};
// 인적사항과 사진은 사이트와 같은 _data/profile.yml, assets/photo.jpg 를 쓴다
const F = yaml.load(fs.readFileSync(path.join(__dirname, '..', '..', '_data', 'profile.yml'), 'utf8'));
const PHOTO = path.join(__dirname, '..', '..', F.photo.replace(/^\//, ''));
DATA.profile = { ...DATA.profile, name: F.name, birth: F.name_en };
DATA.profileRows = F.rows.map((r) => [r.label, r.value]).concat([['웹사이트', Y.site]]);

// 웹과 같은 IBM Plex Sans KR. 고정 굵기(Regular·Bold) TTF가 설치돼 있어야 한다.
// 가변 글꼴(예: NotoSansKR-VF)은 Word가 PDF로 내보낼 때 글꼴 이름이 바뀌고 텍스트에서 띄어쓰기가 빠진다.
const FONT = 'IBM Plex Sans KR';
const PAGE_W = 11906, MARGIN = 1020;
const CW = PAGE_W - MARGIN * 2; // 9866
// 색은 웹(assets/style.css)의 --accent / --muted / --line 과 같다
const ACCENT = '0D6583';
const MUTED = '56636F';
const LINE = 'D3DADE';
const FILL = 'F2F5F8';

const thin = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const allThin = { top: thin, bottom: thin, left: thin, right: thin };
const noBorders = { top: none, bottom: none, left: none, right: none };

const run = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 19, bold: o.bold, color: o.color, italics: o.italics });
const para = (children, o = {}) => new Paragraph({
  children: Array.isArray(children) ? children : [children],
  spacing: { before: o.before ?? 0, after: o.after ?? 60, line: o.line ?? 300 },
  alignment: o.align, keepNext: o.keepNext, indent: o.indent,
});
const text = (t, o = {}) => para(run(t, o), o);
const bullet = (t, level = 0) => new Paragraph({
  children: typeof t === 'string' ? [run(t)] : t,
  numbering: { reference: 'bullets', level },
  spacing: { after: 40, line: 276 },
});
const link = (label, url) => new ExternalHyperlink({ link: url, children: [new TextRun({ text: label, font: FONT, size: 19, color: ACCENT })] });

const heading = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text: t, font: FONT, size: 26, bold: true, color: ACCENT })],
  spacing: { before: 260, after: 100 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
  keepNext: true,
});
const subheading = (t, right) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [
    new TextRun({ text: t, font: FONT, size: 21, bold: true, color: '1A1A1A' }),
    ...(right ? [new TextRun({ text: '   ' + right, font: FONT, size: 18, color: MUTED })] : []),
  ],
  spacing: { before: 200, after: 60 },
  keepNext: true,
});

const cell = (children, width, o = {}) => new TableCell({
  children: Array.isArray(children) ? children : [children],
  width: { size: width, type: WidthType.DXA },
  borders: o.borders || allThin,
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
  margins: { top: 45, bottom: 45, left: 140, right: 140 },
  verticalAlign: o.valign || VerticalAlign.CENTER,
  rowSpan: o.rowSpan, columnSpan: o.columnSpan,
});
const table = (widths, rows) => new Table({
  width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: widths,
  rows,
});
// label/value 목록: 표 대신 탭 정렬 문단. 라벨 폭만큼 내어쓰기해서 줄이 바뀌어도 값이 맞춰진다.
const kvList = (pairs, labelW = 1900) => pairs.map(([k, v]) => new Paragraph({
  children: [run(k, { bold: true, size: 18, color: ACCENT }), new TextRun({ text: '\t', font: FONT }), run(v)],
  tabStops: [{ type: TabStopType.LEFT, position: labelW }],
  indent: { left: labelW, hanging: labelW },
  spacing: { after: 70, line: 290 },
}));
// label/value table
const kvTable = (pairs, labelW = 1900) => table([labelW, CW - labelW], pairs.map(([k, v]) => new TableRow({
  children: [
    cell(text(k, { bold: true, after: 0 }), labelW, { fill: FILL }),
    cell(Array.isArray(v) ? v : text(v, { after: 0 }), CW - labelW),
  ],
})));

// ---------- Header block ----------
// 사진 | 이름 + 인적사항(아이콘, 테두리 없는 2열). 오른쪽 블록 높이를 사진 높이에 맞춘다.
// 아이콘은 icons/make-icons.py 로 만든 PNG (Lucide 선 아이콘).
const P = DATA.profile;
const withPhoto = fs.existsSync(PHOTO);
const PHOTO_PX = { w: 135, h: 173 };
const photoW = withPhoto ? Math.round(PHOTO_PX.w * 15) + 260 : 0; // px → twip(×15) + 여백
const infoW = CW - photoW;
const rowsBy = Object.fromEntries(DATA.profileRows);
const ICON = (name) => new ImageRun({ type: 'png', data: fs.readFileSync(path.join(__dirname, 'icons', name + '.png')), transformation: { width: 13, height: 13 } });
const factLine = { style: BorderStyle.SINGLE, size: 2, color: 'E3E7EB' };
const factBorders = { top: none, left: none, right: none, bottom: factLine };
const iconW = 360, valW = infoW / 2 - iconW;
const PAD = 26;
const factCell = (children, w, o = {}) => new TableCell({
  children: [para(children, { after: 0, line: 260 })],
  width: { size: w, type: WidthType.DXA },
  borders: factBorders,
  margins: { top: PAD, bottom: PAD, left: o.icon && o.second ? 200 : 0, right: o.icon ? 0 : 80 },
  verticalAlign: VerticalAlign.CENTER,
  columnSpan: o.span,
});
const fact = (icon, label, second) => [
  factCell(ICON(icon), iconW + (second ? 200 : 0), { icon: true, second }),
  factCell(run(rowsBy[label] || '', { size: 18 }), valW - (second ? 200 : 0)),
];
const pairRow = (l, r) => new TableRow({ children: [...fact(...l), ...fact(...r, true)] });
const fullRow = (icon, label) => new TableRow({ children: [
  factCell(ICON(icon), iconW, { icon: true }),
  factCell(run(rowsBy[label] || '', { size: 18 }), infoW - iconW, { span: 3 }),
] });
const facts = new Table({
  width: { size: infoW, type: WidthType.DXA },
  columnWidths: [iconW, valW, iconW + 200, valW - 200],
  rows: [
    pairRow(['birth', '생년'], ['career', '경력']),
    pairRow(['email', '이메일'], ['address', '주소']),
    fullRow('education', '학력'),
    pairRow(['military', '병역'], ['web', '웹사이트']),
  ],
});
const infoChildren = [
  para([run(P.name, { size: 44, bold: true, color: '1A1A1A' }), run('   ' + (P.birth || ''), { size: 22, color: MUTED })], { after: 80, line: 276 }),
  facts,
];
const header = new Table({
  width: { size: CW, type: WidthType.DXA },
  columnWidths: withPhoto ? [photoW, infoW] : [CW],
  borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
  rows: [new TableRow({ children: [
    ...(withPhoto ? [new TableCell({
      children: [para(new ImageRun({ type: 'jpg', data: fs.readFileSync(PHOTO), transformation: { width: PHOTO_PX.w, height: PHOTO_PX.h } }), { after: 0, line: 240 })],
      width: { size: photoW, type: WidthType.DXA }, borders: noBorders,
      margins: { top: 0, bottom: 0, left: 0, right: 260 }, verticalAlign: VerticalAlign.TOP,
    })] : []),
    new TableCell({
      children: infoChildren, width: { size: infoW, type: WidthType.DXA }, borders: noBorders,
      margins: { top: 0, bottom: 0, left: 0, right: 0 }, verticalAlign: VerticalAlign.TOP,
    }),
  ] })],
});

// ---------- Build body ----------
const body = [];
body.push(header);

body.push(heading('요약'));
DATA.summary.forEach((s) => body.push(text(s, { after: 80 })));

body.push(heading('핵심 기술'));
body.push(...kvList(DATA.skills));

// 과제 한 줄: 제목 · 상태 — 내용 (인적사항 표에 있는 학력·병역·웹사이트, 경력기술서와 겹치는 경력 요약 표는 두지 않는다)
const projectLine = (p) => bullet([
  run(p.title, { bold: true }),
  ...(p.meta ? [run('  ' + p.meta, { size: 17, color: MUTED })] : []),
  run('  —  ' + p.bullets.join(' / ')),
]);

body.push(heading('경력'));
DATA.careers.forEach((c) => {
  body.push(new Paragraph({
    children: [run(c.company, { size: 23, bold: true, color: '1A1A1A' }), run('   ' + c.position + ' · ' + c.role + '  |  ' + c.period, { color: MUTED })],
    spacing: { before: 200, after: 60 }, keepNext: true,
  }));
  if (c.overview) body.push(text(c.overview, { after: 60 }));
  c.projects.forEach((p) => body.push(projectLine(p)));
});

body.push(heading('특허 · 인증'));
// 항목마다 한 줄: 이름 · 번호 — 설명
DATA.patents.forEach((p) => body.push(bullet([
  run(p.title, { bold: true }),
  run('  ' + p.id, { size: 17, color: MUTED }),
  ...(p.desc ? [run('  —  ' + p.desc)] : []),
])));

body.push(heading('개인 프로젝트'));
DATA.personal.forEach((p) => body.push(projectLine(p)));

const lang = DATA.misc.filter(([k]) => k !== '병역');
if (lang.length) {
  body.push(heading('어학'));
  body.push(...kvList(lang));
}

if (DATA.wish) {
  body.push(heading('희망근무조건'));
  body.push(...kvList(DATA.wish));
}

if (DATA.intro && DATA.intro.length) body.push(heading('자기소개서'));
(DATA.intro || []).forEach((s) => {
  body.push(subheading(s.title));
  s.paras.forEach((t) => body.push(text(t, { after: 100, line: 320 })));
});

if (DATA.coverLetter) {
  body.push(heading('Cover Letter'));
  DATA.coverLetter.forEach((t) => body.push(text(t, { after: 100, line: 320 })));
}

if (!DATA.public) {
  body.push(para(run('위의 모든 기재사항은 사실과 다름없음을 확인합니다.', { size: 21 }), { align: AlignmentType.CENTER, before: 480, after: 80 }));
  body.push(para(run('작성자 : ' + P.name, { size: 21 }), { align: AlignmentType.RIGHT }));
}

const doc = new Document({
  creator: P.name,
  title: '이력서 - ' + P.name,
  styles: { default: { document: { run: { font: FONT, size: 19 } } } },
  numbering: { config: [{ reference: 'bullets', levels: [
    { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } },
    { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 240 } } } },
  ] }] },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED }),
      new TextRun({ text: ' / ', font: FONT, size: 16, color: MUTED }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED }),
    ] })] }) },
    children: body,
  }],
});

// Word의 '한글과 숫자/영문 사이 간격 자동 조절'을 끈다("1991 년"처럼 띄어 보이는 것 방지).
// docx 라이브러리에 옵션이 없어 styles.xml 의 기본 문단 속성에 직접 넣는다.
const JSZip = require('jszip');
Packer.toBuffer(doc)
  .then((buf) => JSZip.loadAsync(buf))
  .then(async (zip) => {
    const f = 'word/styles.xml';
    let xml = await zip.file(f).async('string');
    const off = '<w:autoSpaceDE w:val="0"/><w:autoSpaceDN w:val="0"/>';
    if (/<w:pPrDefault>\s*<w:pPr>/.test(xml)) xml = xml.replace(/(<w:pPrDefault>\s*<w:pPr>)/, '$1' + off);
    else if (xml.includes('<w:pPrDefault/>')) xml = xml.replace('<w:pPrDefault/>', '<w:pPrDefault><w:pPr>' + off + '</w:pPr></w:pPrDefault>');
    else if (xml.includes('<w:docDefaults>')) xml = xml.replace('<w:docDefaults>', '<w:docDefaults><w:pPrDefault><w:pPr>' + off + '</w:pPr></w:pPrDefault>');
    else throw new Error('styles.xml 에 docDefaults 가 없습니다');
    zip.file(f, xml);
    return zip.generateAsync({ type: 'nodebuffer' });
  })
  .then((buf) => { fs.writeFileSync(path.resolve(process.argv[2] || path.join(__dirname, 'resume.docx')), buf); console.log('written'); });
