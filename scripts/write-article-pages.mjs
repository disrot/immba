import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const childFooter = () => `    <footer class="site-footer" id="contact">
      <div class="container footer-grid">
        <div>
          <p class="logo footer-logo">
            <img class="logo-img" src="../images/logo.jpg" alt="" width="48" height="48" />
            <span class="logo-text">
              <strong data-i18n="brand.short">imMBA</strong>
              <small data-i18n="nav.college">College of Management</small>
            </span>
          </p>
          <p>
            <span data-i18n="footer.program">MBA Program in International Management</span><br />
            <span data-i18n="footer.university">Fu Jen Catholic University</span>
          </p>
          <p data-i18n="footer.office">Office LM208-1</p>
          <p data-i18n="footer.address">No. 510, Zhongzheng Rd., Xinzhuang Dist., New Taipei City 24205, Taiwan</p>
          <p>
            <span data-i18n="footer.tel">Tel:</span> <a href="tel:+886229052750">+886-2-2905-2750</a> ·
            <span data-i18n="footer.ms">Ms. Chang</span>
          </p>
          <p>
            <span data-i18n="footer.email">Email:</span>
            <a href="mailto:imMBA@mail.fju.edu.tw">imMBA@mail.fju.edu.tw</a>
          </p>
        </div>
        <div class="footer-nav">
          <div>
            <h2 data-i18n="footer.explore">Explore</h2>
            <ul class="footer-links">
              <li><a href="../index.html#intro" data-i18n="nav.about">About</a></li>
              <li><a href="../index.html#admissions" data-i18n="nav.admissions">Admissions</a></li>
              <li><a href="../index.html#curriculum" data-i18n="nav.courses">Courses</a></li>
              <li><a href="../index.html#faculty" data-i18n="nav.faculty">Faculty</a></li>
              <li>
                <a
                  href="https://www.management.fju.edu.tw/esubweb/immbaengindex/"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-i18n="notice.official"
                  >Official imMBA website</a
                >
              </li>
            </ul>
          </div>
          <div>
            <h2 data-i18n="footer.visit">Visit &amp; contact</h2>
            <ul class="footer-links">
              <li><a href="../index.html#downloads" data-i18n="nav.downloads">Downloads</a></li>
              <li><a href="../index.html#marketplace" data-i18n="nav.marketplace">Marketplace</a></li>
              <li><a href="../index.html#announcements" data-i18n="nav.highlights">Highlights</a></li>
            </ul>
          </div>
          <div>
            <h2 data-i18n="footer.connect">Connect</h2>
            <ul class="social-links">
              <li>
                <a
                  href="https://www.facebook.com/management.fju.edu.tw/"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-i18n="footer.fb"
                  >College of Management on Facebook</a
                >
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/school/fu-jen-catholic-university/"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-i18n="footer.li"
                  >Fu Jen on LinkedIn</a
                >
              </li>
              <li>
                <a href="https://www.fju.edu.tw/" target="_blank" rel="noopener noreferrer" data-i18n="footer.home"
                  >University home</a
                >
              </li>
              <li>
                <a href="https://isc.oie.fju.edu.tw/" target="_blank" rel="noopener noreferrer" data-i18n="footer.isc"
                  >International Student Center</a
                >
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div class="container footer-legal">
        <p>© <span data-year></span> <span data-i18n="footer.copy">Fu Jen Catholic University. All rights reserved.</span></p>
        <p>
          <a href="https://www.fju.edu.tw/" target="_blank" rel="noopener noreferrer" data-i18n="footer.privacy">Privacy</a>
          ·
          <a href="https://www.fju.edu.tw/" target="_blank" rel="noopener noreferrer" data-i18n="footer.legal">Legal</a>
          ·
          <a href="https://www.management.fju.edu.tw/" target="_blank" rel="noopener noreferrer" data-i18n="nav.college"
            >College of Management</a
          >
        </p>
      </div>
    </footer>`;

const renderBlock = (block) => {
  if (block.type === "p") {
    const cls = block.className ? ` class="${block.className}"` : "";
    return `            <p${cls} data-i18n="${block.key}">${esc(block.text)}</p>`;
  }
  if (block.type === "link") {
    return `            <p>
              <a href="${esc(block.href)}" target="_blank" rel="noopener noreferrer">${esc(block.text)}</a>
            </p>`;
  }
  if (block.type === "image") {
    return `            <figure class="article-figure">
              <img src="${esc(block.src)}" alt="" width="${block.width || 500}" height="${block.height || 500}" />
            </figure>`;
  }
  return "";
};

const pages = [
  {
    file: "announcements/spring-2027.html",
    kind: "announcement",
    hash: "announcements",
    titleKey: "news.n1.title",
    title: "Spring 2027, apply NOW!! (Sep 14 - Oct 14) - This track is open to international students only",
    descKey: "news.n1.body",
    date: "2026-08-19",
    dateLabel: "2026/08/19",
    blocks: [
      { type: "p", key: "news.n1.p1", text: "Spring 2027", className: "article-kicker" },
      { type: "p", key: "news.n1.p2", text: "★ When to apply: Sep 14 - Oct 14" },
      { type: "p", key: "news.n1.p3", text: "★ How to apply: Apply online and submit required documents." },
      { type: "p", key: "news.n1.p4", text: "★ Required Documents" },
      { type: "p", key: "news.n1.d1", text: "1.The certificate or diploma of your highest degree" },
      { type: "p", key: "news.n1.d2", text: "2.Complete academic transcripts issued by your school for each year of study" },
      { type: "p", key: "news.n1.d3", text: "3.A financial statement showing that you have sufficient funds to study in Taiwan" },
      { type: "p", key: "news.n1.d4", text: "4.Receipt for application fee" },
      { type: "p", key: "news.n1.d5", text: "5.Verification of nationality" },
      { type: "p", key: "news.n1.d6", text: "6.Declaration Form: Download the form from the application system" },
      { type: "p", key: "news.n1.d7", text: "7.Two recommendation letters" },
      { type: "p", key: "news.n1.d8", text: "8.Transcript of English Proficiency" },
      { type: "p", key: "news.n1.d9", text: "9.A biography with a study plan" },
      { type: "p", key: "news.n1.d10", text: "10.Any other materials which may contribute to the application for admission" },
      { type: "p", key: "news.n1.p5", text: "For more detailed information:" },
      {
        type: "link",
        href: "http://www.management.fju.edu.tw/esubweb/immbaengindex/enroll.php?IID=3",
        text: "http://www.management.fju.edu.tw/esubweb/immbaengindex/enroll.php?IID=3",
      },
    ],
    cta: true,
  },
  {
    file: "announcements/two-years.html",
    kind: "announcement",
    hash: "announcements",
    titleKey: "news.n2.title",
    title: "【How much is possible in two years?】",
    descKey: "news.n2.body",
    date: "2026-09-08",
    dateLabel: "2026/09/08",
    blocks: [
      {
        type: "p",
        key: "news.n2.p1",
        text: "If you're choosing a graduate program, you may be looking for more than just a master's degree.",
      },
      {
        type: "p",
        key: "news.n2.p2",
        text: "International Management MBA (imMBA) offers a fully English-taught environment where you study with students from around the world, gain cross-cultural experience, and build an international network. You'll also have opportunities to study abroad and explore more possibilities.",
      },
      {
        type: "p",
        key: "news.n2.p3",
        text: "What is imMBA all about? Who is it for? What opportunities does it offer?",
      },
      {
        type: "p",
        key: "news.n2.p4",
        text: "Join us on September 29 and discover where imMBA could take you.",
      },
      {
        type: "p",
        key: "news.n2.p5",
        text: "Fu Jen imMBA 2027 Admissions Information Session",
        className: "article-callout",
      },
      {
        type: "p",
        key: "news.n2.p6",
        text: "September 29 (Tue.)｜12:10 PM｜LM202 Meeting Room",
        className: "article-callout",
      },
      {
        type: "p",
        key: "news.n2.p7",
        text: "Registration opens on September 14 (Mon.). Stay tuned!",
      },
      { type: "p", key: "news.n2.p8", text: "Your future starts with imMBA." },
      { type: "p", key: "news.n2.tags", text: "#FJCU_imMBA #Dual_Master_Degree", className: "article-tags" },
      { type: "image", src: "../images/posts/0908.jpg", width: 500, height: 500 },
    ],
  },
  {
    file: "announcements/ai-product.html",
    kind: "announcement",
    hash: "announcements",
    titleKey: "news.n3.title",
    title: "【90 Seconds with the Professor｜AI × Product】",
    descKey: "news.n3.body",
    date: "2026-09-02",
    dateLabel: "2026/09/02",
    blocks: [
      { type: "p", key: "news.n3.p1", text: "What is AI-Assisted Digital Product Development all about?" },
      {
        type: "p",
        key: "news.n3.p2",
        text: "Starting with a business idea, how can AI support the development of a digital product? And what skills can business students gain from this course?",
      },
      {
        type: "p",
        key: "news.n3.p3",
        text: "In just 90 seconds, our professor introduces the course and gives you a quick look at the key ideas behind AI × Product.",
      },
      { type: "p", key: "news.n3.p4", text: "90 seconds—let's hear from the professor." },
      {
        type: "link",
        href: "https://www.facebook.com/profile.php?id=61579964994616",
        text: "https://www.facebook.com/profile.php?id=61579964994616",
      },
      { type: "p", key: "news.n3.tags", text: "#FJCU_imMBA #dual_master_degree", className: "article-tags" },
      { type: "image", src: "../images/posts/0901.jpg", width: 500, height: 407 },
    ],
  },
  {
    file: "announcements/data-analytics.html",
    kind: "announcement",
    hash: "announcements",
    titleKey: "news.n4.title",
    title: "【New Course Spotlight｜Data Analytics for International Business】",
    descKey: "news.n4.body",
    date: "2026-08-26",
    dateLabel: "2026/08/26",
    blocks: [
      {
        type: "p",
        key: "news.n4.p1",
        text: "Last week, we explored AI × Product. This week, we look at AI × Data and how data supports better business decisions.",
      },
      {
        type: "p",
        key: "news.n4.p2",
        text: "In the AI era, identifying problems, spotting trends, and making data-informed decisions are becoming essential skills for business professionals.",
      },
      {
        type: "p",
        key: "news.n4.p3",
        text: "This academic year, Fu Jen imMBA introduces Data Analytics for International Business, covering data visualization, statistical analysis, and machine learning through real-world business applications.",
      },
      {
        type: "p",
        key: "news.n4.p4",
        text: "From AI × Product to AI × Data, these two new courses respond to the changes brought by AI from different angles, helping business students build the skills to solve problems and make better decisions.",
      },
      { type: "p", key: "news.n4.tags", text: "#FJCU_imMBA #dual_master_degree", className: "article-tags" },
      { type: "image", src: "../images/posts/2026-08-25.png", width: 500, height: 420 },
    ],
  },
  {
    file: "announcements/iqs.html",
    kind: "announcement",
    hash: "announcements",
    titleKey: "news.n5.title",
    title: "【Partner Spotlight | IQS School of Management】",
    descKey: "news.n5.body",
    date: "2026-07-29",
    dateLabel: "2026/07/29",
    blocks: [
      {
        type: "p",
        key: "news.n5.p1",
        text: "When people think of Spain, Barcelona is often known for its architecture and vibrant culture. For business students, it is also one of Europe's leading hubs for innovation and entrepreneurship.",
      },
      {
        type: "p",
        key: "news.n5.p2",
        text: "Located in Barcelona, IQS School of Management is part of IQS, a founding member of Universitat Ramon Llull, and one of the dual-degree partners of Fu Jen imMBA. Founded in 1905, IQS School of Management is AACSB-accredited and is recognized for integrating management, technology, and innovation.",
      },
      {
        type: "p",
        key: "news.n5.p3",
        text: "Through the imMBA 1+1 Dual Master's Degree Program, students may spend their second year at IQS, choosing between the Master in Industrial Business Management and the Master in International Marketing in a Digital Environment. Upon meeting the graduation requirements of both institutions, students earn master's degrees from both universities. Under the partnership agreement, imMBA dual-degree students are eligible for a tuition discount while studying at IQS.",
      },
      {
        type: "p",
        key: "news.n5.p4",
        text: "The partnership offers students the opportunity to experience the European higher education system, broaden their global perspective, and thrive in an increasingly interconnected world.",
      },
      { type: "p", key: "news.n5.tags", text: "#FJCU_imMBA #Dual_Master_Degree", className: "article-tags" },
      { type: "image", src: "../images/posts/iqs.jpg", width: 500, height: 333 },
    ],
  },
  {
    file: "announcements/pacific-partner.html",
    kind: "announcement",
    hash: "announcements",
    titleKey: "news.n6.title",
    title: "【Across the Pacific, One More Global Partner】",
    descKey: "news.n6.body",
    date: "2026-07-15",
    dateLabel: "2026/07/15",
    blocks: [
      {
        type: "p",
        key: "news.n6.p1",
        text: "Recently, faculty members from Fu Jen's College of Management visited sister school California State Polytechnic University, Pomona (CPP). The two sides discussed various areas of collaboration, including the possibility of a 1+1 dual master's degree for the International Management MBA (imMBA).",
      },
      {
        type: "p",
        key: "news.n6.p2",
        text: "CPP is part of the California State University system. Its College of Business Administration holds AACSB accreditation in both business and accounting and is known for its Learn by Doing approach. Its research and practice centers focus on areas such as Customer Insights, Entrepreneurship, Digital Innovation, Business Analytics, and Cyber Risk.",
      },
      {
        type: "p",
        key: "news.n6.p3",
        text: "Both institutions will continue discussions on curriculum alignment, credit transfer, and program planning, with the goal of creating more international learning and dual degree opportunities for imMBA students.",
      },
      { type: "p", key: "news.n6.tags", text: "#FJCU_imMBA #Dual_Master_Degree", className: "article-tags" },
      { type: "image", src: "../images/posts/cpp.jpg", width: 500, height: 333 },
    ],
  },
  {
    file: "events/admissions-recap.html",
    kind: "event",
    hash: "events",
    titleKey: "events.e1",
    title: "【9/29 Admissions Info Session Recap｜Local Student Applications Open Tomorrow!】",
    descKey: "events.e1b",
    date: "2026-09-29",
    dateLabel: "2026/09/29",
    blocks: [
      {
        type: "p",
        key: "events.e1.p1",
        text: "Missed today's International Management MBA (imMBA) info session? Here are a few highlights!",
      },
      {
        type: "p",
        key: "events.e1.p2",
        text: "imMBA Chair Dr. Tu, Yi-ning walked students through our ''Admissions Guide'', covering the application process, program resources, and international study opportunities. She also shared updates on potential new partner universities in Europe and the U.S., bringing more possibilities for dual master's degrees.",
      },
      {
        type: "p",
        key: "events.e1.p3",
        text: "First-year imMBA student Zoe also shared her story. When she applied, her TOEIC score was in the 500s. After a year in imMBA's English-taught environment, learning and interacting with international classmates, she reached 805!",
      },
      {
        type: "p",
        key: "events.e1.p4",
        text: "Zoe also shared practical tips from her own application experience—from preparing application materials to highlighting what makes an applicant stand out. Her experience shows that where you start doesn't have to limit where you can go. Give yourself a chance!",
      },
      {
        type: "p",
        key: "events.e1.p5",
        text: "Stop by the imMBA office at LM208-1 and pick up our ''Admissions Guide''!",
      },
      {
        type: "p",
        key: "events.e1.p6",
        text: "International Management MBA (imMBA) 2027 Admissions",
        className: "article-callout",
      },
      {
        type: "p",
        key: "events.e1.p7",
        text: "Local Student Application Period｜9/30–10/13",
        className: "article-callout",
      },
      {
        type: "link",
        href: "https://www.management.fju.edu.tw/subweb/immba/enroll.php?IID=26",
        text: "https://www.management.fju.edu.tw/subweb/immba/enroll.php?IID=26",
      },
      { type: "p", key: "events.e1.tags", text: "#FJCU_imMBA #dual_master_degree", className: "article-tags" },
      { type: "image", src: "../images/posts/386729-1.jpg", width: 500, height: 440 },
      { type: "image", src: "../images/posts/386730.jpg", width: 500, height: 375 },
    ],
  },
  {
    file: "events/international-session.html",
    kind: "event",
    hash: "events",
    titleKey: "events.e2",
    title: "【International Students: Get to Know Fu Jen imMBA at Our Info Session!】",
    descKey: "events.e2b",
    date: "2026-09-15",
    dateLabel: "2026/09/15",
    blocks: [
      {
        type: "p",
        key: "events.e2.p1",
        text: "Fu Jen's International Management MBA (imMBA) is hosting an information session for international students on October 1.",
      },
      {
        type: "p",
        key: "events.e2.p2",
        text: "If you have a bachelor's degree (or are currently a junior or senior) and a TOEIC score of 700+ or equivalent English proficiency, come learn about imMBA.",
      },
      {
        type: "p",
        key: "events.e2.p3",
        text: "Study in a fully English-taught environment with students from around the world, explore four scholarship opportunities, and pursue dual master's degrees in the U.S., Spain, or France.",
      },
      {
        type: "p",
        key: "events.e2.p4",
        text: "International Management MBA Information Session",
        className: "article-callout",
      },
      {
        type: "p",
        key: "events.e2.p5",
        text: "Oct. 1 (Thu.) at noon｜Location will be emailed after registration closes",
        className: "article-callout",
      },
      {
        type: "p",
        key: "events.e2.p6",
        text: "Free lunch for registered attendees (limited quantities)",
        className: "article-callout",
      },
      {
        type: "p",
        key: "events.e2.p7",
        text: "Registration deadline: Sep. 29 (Tue.)",
        className: "article-callout",
      },
      {
        type: "link",
        href: "https://docs.google.com/forms/d/e/1FAIpQLScTzMabBstLOquE0PlHaHCoCVM89Nc9VRpLO-JLLFA1A4v0-w/viewform",
        text: "docs.google.com/forms/d/e/1FAIpQLScTzMabBstLOquE0PlHaHCoCVM89Nc9VRpLO-JLLFA1A4v0-w/viewform",
      },
      {
        type: "p",
        key: "events.e2.p8",
        text: "The session will be conducted in English. Feel free to share this with international friends!",
      },
      { type: "p", key: "events.e2.tags", text: "#FJCU_imMBA #dual_master_degree", className: "article-tags" },
      { type: "image", src: "../images/posts/1001.jpg", width: 500, height: 500 },
    ],
  },
  {
    file: "events/ai-product.html",
    kind: "event",
    hash: "events",
    titleKey: "events.e3",
    title: "【New Course Spotlight｜AI-Assisted Digital Product Development】",
    descKey: "events.e3b",
    date: "2026-08-19",
    dateLabel: "2026/08/19",
    blocks: [
      {
        type: "p",
        key: "events.e3.p1",
        text: "Want to turn a business idea into a working digital product—even without coding experience?",
      },
      {
        type: "p",
        key: "events.e3.p2",
        text: "AI is changing how products are developed. For business students, using AI to turn ideas into practical solutions is becoming an essential skill.",
      },
      {
        type: "p",
        key: "events.e3.p3",
        text: "This semester, Fu Jen imMBA introduces AI-Assisted Digital Product Development, where students learn product design, web development, and data management while building a functional digital product.",
      },
      {
        type: "p",
        key: "events.e3.p4",
        text: "As AI reshapes the business world, this course equips business students to apply AI and solve real-world problems.",
      },
      { type: "p", key: "events.e3.tags", text: "#FJCU_imMBA #dual_master_degree", className: "article-tags" },
      { type: "image", src: "../images/posts/0819.jpg", width: 500, height: 379 },
    ],
  },
];

const kindLabel = { announcement: ["article.announcement", "Announcement"], event: ["article.event", "Event"] };

const pageHtml = (page) => {
  const [kindKey, kindFallback] = kindLabel[page.kind];
  const extra = page.blocks.map(renderBlock).join("\n");
  const cta = page.cta
    ? `
            <a
              class="btn btn-primary"
              href="https://idsasys.oie.fju.edu.tw/"
              target="_blank"
              rel="noopener noreferrer"
              data-i18n="cta.portal"
              >Apply on the official portal</a
            >`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(page.title)} — imMBA</title>
    <meta name="description" content="${esc(page.blocks.find((b) => b.type === "p")?.text || page.title)}" />
    <meta name="theme-color" content="#163300" />
    <meta name="color-scheme" content="light" />
    <link rel="icon" href="../logo.jpg" type="image/jpeg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="../css/styles.css" />
  </head>
  <body data-title-key="${page.titleKey}" data-desc-key="${page.descKey}">
    <a class="skip-link" href="#main" data-i18n="skip">Skip to content</a>

    <div class="notice-bar" data-notice>
      <div class="container notice-inner">
        <p data-i18n="notice.text">This is a teaching website of Fu Jen Catholic University.</p>
        <div class="notice-actions">
          <a
            href="https://www.management.fju.edu.tw/esubweb/immbaengindex/"
            target="_blank"
            rel="noopener noreferrer"
            data-i18n="notice.official"
            >Official imMBA website</a
          >
        </div>
      </div>
    </div>

    <header class="site-header is-article" data-header>
      <div class="container header-grid">
        <div class="brand-tier">
          <a class="logo" href="../index.html">
            <img
              class="logo-img"
              src="../images/logo.jpg"
              alt="Fu Jen Catholic University International MBA (imMBA)"
              data-i18n-attr="alt:brand.name"
              width="48"
              height="48"
            />
            <span class="logo-text">
              <strong data-i18n="brand.name">Fu Jen Catholic University International MBA (imMBA)</strong>
            </span>
          </a>
        </div>
        <div class="header-actions">
          <button type="button" class="lang-toggle" data-lang-toggle data-i18n="langButton" aria-label="Switch language">
            中文
          </button>
          <a
            class="btn btn-primary header-apply"
            href="https://idsasys.oie.fju.edu.tw/"
            target="_blank"
            rel="noopener noreferrer"
            data-i18n="cta.apply"
            >Apply Now</a
          >
        </div>
      </div>
    </header>

    <main id="main" class="article-main">
      <article class="container article-wrap">
        <a class="article-back" href="../index.html#${page.hash}" data-i18n="article.back">Back to highlights</a>
        <span class="rule" aria-hidden="true"></span>
        <p class="label" data-i18n="${kindKey}">${kindFallback}</p>
        <time datetime="${page.date}">${page.dateLabel}</time>
        <h1 data-i18n="${page.titleKey}">${esc(page.title)}</h1>
${extra}${cta}
      </article>
    </main>

${childFooter()}

    <script type="module" src="../js/main.js"></script>
  </body>
</html>
`;
};

for (const page of pages) {
  const full = join(root, page.file);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, pageHtml(page));
  console.log(page.file);
}
