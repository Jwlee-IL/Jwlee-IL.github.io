# jwlee-il.github.io

이정우의 포트폴리오와 이력서를 올리는 GitHub Pages 사이트입니다. 테마 없이 자체 레이아웃으로 Jekyll이 빌드합니다.

## 내용을 고치려면

| 고칠 것 | 파일 |
|---|---|
| 포트폴리오 문구, 프로젝트 목록 | `_data/portfolio.yml` |
| 포트폴리오의 구조도·표 | `_includes/figures/*.html` (`portfolio.yml`의 `figure` 항목이 파일 이름을 가리킴) |
| 이력서 내용 | `_data/resume.yml` |
| 디자인 | `assets/style.css`, `_layouts/default.html` |

프로젝트 블록(`blocks`)은 적힌 순서대로 그려집니다. 쓸 수 있는 종류는 `summary`, `bullets`, `note`, `figure`, `scale`입니다.

## 이력서 PDF 다시 만들기

`_data/resume.yml`을 고친 뒤 PDF도 맞추려면 (Node.js, Microsoft Word, IBM Plex Sans KR 필요):

글꼴은 [Google Fonts](https://fonts.google.com/specimen/IBM+Plex+Sans+KR)의 고정 굵기 TTF(Regular, Bold)를 설치합니다. 가변 글꼴(`*-VF.ttf`)을 쓰면 Word가 만든 PDF에서 복사·검색할 때 띄어쓰기가 빠집니다.

```powershell
cd tools/resume-pdf
npm install        # 처음 한 번
./export-pdf.ps1   # 저장소 루트의 resume.pdf 를 덮어씀
```

머리의 인적사항 아이콘은 `tools/resume-pdf/icons/*.png`입니다. 모양은 [Lucide](https://lucide.dev)(ISC 라이선스) 선 아이콘이고, 색이나 모양을 바꾸려면 `icons/make-icons.py`를 고쳐 다시 실행합니다(`pip install pymupdf` 필요).

## 포트폴리오 PDF 만들기

`portfolio-print.html`은 A4 인쇄 전용 페이지입니다(메뉴에 없고 검색 제외). 1쪽은 요약, 2쪽부터 상세이며 같은 `_data`를 씁니다.

```powershell
./tools/portfolio-pdf/export-pdf.ps1          # 저장소 루트의 portfolio.pdf 를 덮어씀
./tools/portfolio-pdf/export-pdf.ps1 -Out D:\portfolio.pdf
```

## 로컬에서 미리 보기

```powershell
jekyll serve
```

GitHub Pages는 Jekyll 3.10으로 빌드하므로 Jekyll 4 전용 기능은 쓰지 않습니다.
