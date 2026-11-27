const PROFILE = {
  name: "최미라",
  bio: "AI를 배우는 출판편집자",
  photo: "images/눈물은행 사물 - 눈물은행 통장.png",  // 프로필 사진 주소. 예: "images/me.jpg" (비우면 이름 첫 글자가 보여요)
  email: "schwatara@email.com",
};

// ---------- 소개 섹션 ----------
// 각 항목은 [이름, 오른쪽에 작게 보일 글자] 형태예요.
const ABOUT = [

  {
    title: "수강 과목",
    items: [["MBC AI 데이터 저널리즘 전문가 과정", "2026. 9-12"]]
  },

];

function showProfile() {
  document.getElementById("logo-name").textContent = PROFILE.name;
  document.getElementById("footer-name").textContent = PROFILE.name;
  document.getElementById("bio").textContent = PROFILE.bio;

  // 프로필 사진 (없으면 이름 첫 글자)
  const avatar = document.getElementById("avatar");
  if (PROFILE.photo) {
    avatar.innerHTML = `<img src="${PROFILE.photo}" alt="프로필 사진">`;
  } else {
    avatar.textContent = PROFILE.name[0];
  }

  // 소개 섹션 (사용 툴 / 수강 과목 / 관심 분야)
  let aboutHTML = "";
  for (const group of ABOUT) {
    let listHTML = "";
    for (const item of group.items) {
      listHTML += `<li>${item[0]} <span>${item[1]}</span></li>`;
    }
    aboutHTML += `
      <div>
        <h4>${group.title}</h4>
        <ul>${listHTML}</ul>
      </div>`;
  }
  document.getElementById("about-grid").innerHTML = aboutHTML;

  // 연락처
  document.getElementById("contact-list").innerHTML = `
    <span>이메일 ${PROFILE.email}</span>
    <button class="copy-button" id="copy-button">복사</button>`;

  // 복사 버튼 누르면 이메일 주소 복사
  const copyButton = document.getElementById("copy-button");
  copyButton.addEventListener("click", function () {
    navigator.clipboard.writeText(PROFILE.email)
      .then(function () {
        copyButton.textContent = "복사됨";
        setTimeout(function () { copyButton.textContent = "복사"; }, 1500);
      })
      .catch(function () {
        copyButton.textContent = "직접 복사해 주세요";
      });
  });
}


const reporterToggle = document.getElementById("reporter-toggle");
const reporterStatus = document.getElementById("reporter-status");
const reporterLabel = reporterToggle.querySelector("span");
let stopReporter;

function describeNearbyWork(x, y) {
  let nearestWork;
  let shortestDistance = Infinity;

  document.querySelectorAll("#card-grid [data-work-index]").forEach((card) => {
    const rect = card.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;

    const horizontalGap = Math.max(rect.left - x, x - rect.right, 0);
    const verticalGap = Math.max(rect.top - y, y - rect.bottom, 0);
    const distance = Math.hypot(horizontalGap, verticalGap);
    if (distance >= shortestDistance) return;

    shortestDistance = distance;
    nearestWork = works[Number(card.dataset.workIndex)];
  });

  if (!nearestWork) return "작품 목록 가까이를 클릭하면 과제를 소개할게요.";
  const intent = nearestWork.intent?.trim();
  const intro = intent || `${nearestWork.category} 과제예요.`;
  return `「${nearestWork.title}」. ${intro}`;
}

reporterToggle.addEventListener("click", async function () {
  if (stopReporter) {
    stopReporter();
    stopReporter = undefined;
    reporterLabel.textContent = "당최 아바타 켜기";
    reporterToggle.setAttribute("aria-pressed", "false");
    reporterStatus.hidden = true;
    return;
  }

  reporterToggle.disabled = true;
  reporterStatus.hidden = false;
  reporterStatus.textContent = "당최를 불러오는 중…";
  try {
    const { startReporter } = await import("./reporter.js");
    stopReporter = await startReporter(describeNearbyWork);
    reporterLabel.textContent = "당최 아바타 끄기";
    reporterToggle.setAttribute("aria-pressed", "true");
    reporterStatus.textContent = "화면의 빈 곳을 클릭해봐.";
  } catch {
    reporterStatus.textContent = "당최를 불러오지 못했어요. 다시 시도해 주세요.";
  } finally {
    reporterToggle.disabled = false;
  }
});

const categories = [
  { id: "video", label: "AI 영상·콘텐츠", featured: "숫자로 보는 2026 아이치·나고야 아시안 게임" },
  { id: "apps", label: "웹앱·자동화", featured: "오늘의 록 — TODAY'S ROCK" },
  { id: "publishing", label: "편집·웹 프로젝트", featured: "최미라의 출판편집 포트폴리오" },
  { id: "journalism", label: "데이터 저널리즘", featured: "서울 교통안전 라이브" },
];

let works = [];

function categoryFor(work) {
  if (work.title === "서울 교통안전 라이브") return "journalism";
  if (work.category === "AI영상") return "video";
  if (work.category === "웹사이트") return "publishing";
  return "apps";
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function makeWorkImage(src, eager = false) {
  const image = element("img");
  image.src = src;
  image.alt = "";
  image.loading = eager ? "eager" : "lazy";
  return image;
}

function makeWorkDetails(work) {
  const panel = element("div", "", "work-details");
  const media = work.youtube
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(work.youtube)}`
    : work.embed;

  if (media) {
    const video = element("iframe");
    video.src = media;
    video.title = work.title;
    video.allowFullscreen = true;
    panel.append(video);
  }
  for (const src of (work.images || []).slice(1)) {
    panel.append(makeWorkImage(src));
  }
  if (work.process?.trim()) {
    panel.append(element("h4", "작업 과정"), element("p", work.process));
  }
  if (work.features) {
    const features = Array.isArray(work.features) ? work.features.join("\n") : work.features;
    panel.append(element("h4", "주요 기능"), element("p", features));
  }
  if (work.tools) panel.append(element("p", work.tools, "work-meta"));

  const links = element("div", "", "work-links");
  for (const [label, url] of [["체험하기 ↗", work.app], ["원본 보기 ↗", work.file]]) {
    if (!url || url === "미공개") continue;
    const link = element("a", label);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    links.append(link);
  }
  panel.append(links);
  return panel;
}

function renderWork(work, featured = false) {
  const article = element("article", "", featured ? "work-card featured-work" : "work-card");
  article.dataset.workIndex = works.indexOf(work);
  const cover = work.images?.[0];
  if (cover) article.append(makeWorkImage(cover));
  const copy = element("div", "", "work-copy");
  copy.append(element("p", [work.category, work.date].filter(Boolean).join(" · "), "work-meta"));
  copy.append(element("h3", work.title));
  if (work.intent) copy.append(element("p", work.intent));

  const details = element("details");
  details.append(element("summary", "작품 상세"));
  details.addEventListener("toggle", () => {
    if (details.open) details.append(makeWorkDetails(work));
    else details.querySelector(".work-details")?.remove();
  });
  copy.append(details);
  article.append(copy);
  return article;
}

function renderWorks() {
  const grid = document.getElementById("card-grid");
  const nav = document.getElementById("work-nav");
  grid.replaceChildren();
  const sections = [];

  for (const category of categories) {
    const group = works.filter((work) => categoryFor(work) === category.id);
    if (group.length === 0) continue;

    const section = element("section", "", "work-section");
    section.id = category.id;
    sections.push(section);
    const label = element("h2", category.label);
    section.append(label);

    const link = element("a", category.label);
    link.href = `#${category.id}`;
    nav.append(link);

    const featured = group.find((work) => work.title === category.featured) || group[0];
    section.append(renderWork(featured, true));

    const collection = element("div", "", "work-collection");
    group.filter((work) => work !== featured).forEach((work) => collection.append(renderWork(work)));
    if (collection.childElementCount) section.append(collection);
    grid.append(section);
  }

  const spotlight = works.find((work) => work.title === "오늘의 록 — TODAY'S ROCK");
  if (spotlight?.images?.[0]) {
    document.getElementById("hero-image").src = spotlight.images[0];
    document.getElementById("hero-caption").textContent = spotlight.title;
    document.getElementById("hero-feature").hidden = false;
  }

  function updateNavigation() {
    const active = sections.findLast((section) => section.getBoundingClientRect().top <= 180)
      || sections[0];
    for (const link of nav.children) {
      if (active && link.hash === `#${active.id}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }
  window.addEventListener("scroll", updateNavigation, { passive: true });
  updateNavigation();
}

showProfile();
fetch("data.json")
  .then((response) => {
    if (!response.ok) throw new Error("작품 목록 요청 실패");
    return response.json();
  })
  .then((data) => {
    works = data;
    renderWorks();
  })
  .catch(() => {
    document.querySelector("#card-grid [role='status']").textContent =
      "작품 목록을 불러오지 못했어요. 페이지를 새로고침해 주세요.";
  });
