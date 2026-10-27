import { renderNewsArticle, renderNewsCards } from "./news-ui.js";
import { hydrateNews } from "./news-store.js?v=news2";
import { applyOfficialLinks } from "./official.js";
import { initGallery, refreshGalleryCaptions } from "./gallery.js";
import { guardAdminPage, initLoginForm, initLogoGate, initPendingPage } from "./auth.js?v=notice4";
import { initFacultyDirectory } from "./faculty.js?v=notice3";
import { initMarketplace, initListing } from "./marketplace.js?v=notice3";
import { initMarketAccount } from "./market-account.js?v=notice4";
import { initAnalytics } from "./analytics.js";
import { initAdminDash } from "./admin-dash.js?v=alumni1";
import { initPageHero } from "./page-hero.js?v=drop2";
import { initSelectDrops, refreshSelectDrop } from "./ui-drop.js?v=drop2";

const translations = {
  en: {
    "meta.title": "Fu Jen imMBA: MBA Program in International Management",
    "meta.description":
      "AACSB-accredited MBA in International Management at Fu Jen Catholic University. English-taught, globally ranked, with dual-degree options in the USA, France, and Spain.",
    "skip": "Skip to content",
    "notice.text": "This is a teaching website of Fu Jen Catholic University.",
    "notice.credit": "— made by Nigel Pang (415416026)",
    "footer.credit": "— made by Nigel Pang (415416026)",
    "notice.official": "Official imMBA website",
    "notice.collapse": "Collapse main menu",
    "notice.expand": "Expand main menu",
    "brand.name": "Fu Jen Catholic University International MBA (imMBA)",
    "brand.short": "imMBA",
    "nav.menu": "Open menu",
    "nav.primary": "Primary",
    "nav.about": "About",
    "nav.overview": "Overview and Ranking",
    "nav.environment": "Our Learning Environment",
    "nav.admissions": "Admissions",
    "nav.apply": "Apply for Fu Jen imMBA",
    "nav.courses": "Courses",
    "nav.requirements": "Curriculum and Requirements",
    "nav.faculty": "Faculty",
    "nav.guide": "imMBA Guide",
    "nav.graduation": "Graduation",
    "nav.dual": "Dual Degree",
    "nav.exchange": "Exchange",
    "nav.highlights": "Highlights",
    "nav.college": "College of Management",
    "nav.marketplace": "Marketplace",
    "nav.events": "Events",
    "nav.announcements": "Announcements",
    "nav.downloads": "Downloads",
    "cta.apply": "Apply Now",
    "cta.start": "Start application",
    "cta.marketplace": "Books & materials marketplace",
    "cta.portal": "Apply on the official portal",
    "hero.eyebrow": "AACSB accredited · English-taught · Taipei",
    "hero.title": "Fu Jen Catholic University International MBA (imMBA)",
    "hero.lede": "Cultivating global managers with AACSB-accredited excellence",
    "hero.note": "Spring 2027 is open to international students · Apply 14 Sep – 14 Oct",
    "hero.panel": "Program highlights",
    "stat.top": "Top",
    "stat.credits": "credits",
    "stat.english": "English",
    "hero.k1": "Eduniversal 2025",
    "hero.s1": "Top 3",
    "hero.c1": "in Taiwan for International Management",
    "hero.k2": "Global classroom",
    "hero.s2": "30+",
    "hero.c2": "countries represented, with a local/non-local mix that can reach 1:1",
    "hero.k3": "Dual master’s options",
    "hero.c3": "Two years, two degrees at University of Michigan-Flint (USA), KEDGE Business School (France), or Institut Químic de Sarrià IQS (Spain).",
    "trust.label": "Key facts",
    "trust.s1": "Top 20",
    "trust.c1": "Far East Asia · International Management",
    "trust.s2": "42 credits",
    "trust.c2": "Minimum to graduate, including thesis",
    "trust.s3": "100% English",
    "trust.c3": "All imMBA courses conducted in English",
    "trust.s4": "Top 5%",
    "trust.c4": "of business schools worldwide hold AACSB",
    "intro.title": "MBA Program in International Management (imMBA)",
    "intro.body":
      "Fu Jen MBA in International Management (imMBA) is AACSB accredited, designed to equip students with practical business and management knowledge from a global perspective to enhance their international mobility. Only 5% of the best business schools worldwide are accredited by AACSB.",
    "intro.body2":
      "The curriculum delivers a strong understanding of how the world is interconnected through marketing, operations, finance, human resources, technology, and strategy to help students meet the challenges of the up-to-date global economy.",
    "intro.college":
      "The College of Management earned AACSB accreditation in 2005, the first college on both sides of the Taiwan Strait to do so, and was reaccredited in 2010, 2015, 2020, and 2025. Of more than 16,000 business schools worldwide, only about 5% hold AACSB accreditation. In 2021 the College was selected for the Ministry of Education bilingual-education program, the only private-university management college in Greater Taipei among 76 applicants. imMBA launched in 2006 when Fu Jen was selected, alongside National Taiwan University and National Chengchi University, to trial a professional MBA college; all courses have been taught in English since academic year 103 (2014–15).",
    "rank.lede":
      "According to Eduniversal 2025, Fu Jen imMBA ranks top 3 in Taiwan and top 20 in Far East Asia in the category of International Management.",
    "rank.taiwan": "in Taiwan in International Management",
    "rank.fareast": "in Far East Asia in International Management",
    "rank.aacsbShare": "of business schools worldwide hold AACSB",
    "rank.countries": "countries represented among exchange and degree-seeking students",
    "rank.sourceEdu": "Eduniversal, 2025",
    "rank.sourceAacsb": "AACSB",
    "rank.sourceClass": "Local / non-local mix can reach 1:1",
    "rank.official": "Official overview",
    "aacsb.alt": "AACSB Accredited",
    "intro.f1.title": "International MBA environment",
    "intro.f1.body":
      "Fu Jen imMBA recruits both local and international students who come from more than 30 countries worldwide for exchange or degree-seeking. Taking advantage of the cultural diversity, studying at Fu Jen imMBA, the ratio of local to non-local in the classroom could be 1:1.",
    "intro.f2.title": "Dual master's degree from USA, France, and Spain",
    "intro.f2.body":
      "Fu Jen imMBA partners with the University of Michigan-Flint (USA), KEDGE Business School (France), and Institut Químic de Sarrià IQS (Spain) to offer dual master's degree options for all imMBA students. Students choosing this path may obtain two master's degrees in two years in an economic way in terms of time and budget.",
    "intro.f3.title": "Fu Jen tuition-free exchange program with partner schools worldwide",
    "intro.f3.body":
      "Fu Jen imMBA students are encouraged to take this advantage to explore their international perspectives and cross-cultural experiences if they don't plan to join the dual-degree program. For details about the global tuition-free exchange program, please visit Fu Jen International Student Center.",
    "intro.f4.title": "Two enrollment windows",
    "intro.f4.body":
      "Spring intake is typically mid-October to late December. Fall intake runs approximately January to June. International applicants follow the English track on this site.",
    "partners.label": "Dual-degree partners",
    "partners.um": "University of Michigan-Flint",
    "partners.kedge": "KEDGE Business School",
    "partners.iqs": "Institut Químic de Sarrià IQS",
    "kw.ibm": "International Business Management",
    "kw.strategy": "Strategic Management",
    "kw.supply": "Supply Chain",
    "kw.marketing": "Marketing Management",
    "kw.org": "Organization Design",
    "kw.finance": "Financial Management",
    "kw.analytics": "Data Analytics",
    "kw.ai": "AI Product Development",
    "kw.ethics": "Business Ethics",
    "kw.sr": "Curriculum themes across international management and English-taught core courses.",
    "curr.eyebrow": "Curriculum highlights",
    "curr.title": "A clear structure. A global core. Room to specialize.",
    "curr.body":
      "Graduation requires at least 42 credits and a thesis defense. Courses from the College of Management that are graduate-level, English-taught, and business-related count toward the degree.",
    "curr.req": "Graduation requirements",
    "curr.req1": "23 required credits: 11 absolutely required (including a 6-credit thesis) and 12 optionally required.",
    "curr.req2": "19 elective credits.",
    "curr.req3": "Successful final thesis defense.",
    "curr.req4": "Minimum of 42 credits in total.",
    "curr.reqNote":
      "First-year students typically take 9–18 credits per semester; second-year students 8–18, unless it is the final semester or the director approves otherwise.",
    "curr.abs": "Absolutely required (11 credits)",
    "curr.ibm": "International Business Management",
    "curr.ethics": "Business Ethics",
    "curr.thesis": "Thesis",
    "curr.absNote":
      "Enroll in THESIS before the add/drop period in the semester you plan to defend. Advisor lists are released in late March and early October.",
    "curr.opt": "Optionally required: take 4 of 6 (12 credits)",
    "curr.opt1": "Strategic Management: A Global Viewpoint",
    "curr.opt2": "Supply Chain and Operations Management: A Global Viewpoint",
    "curr.opt3": "Marketing Management: International Perspectives",
    "curr.opt4": "Organization Design and Management: A Global Viewpoint",
    "curr.opt5": "Human Resources and Knowledge Management: International Perspectives",
    "curr.opt6": "Financial Management: International Perspectives",
    "curr.prereq": "Prerequisites & waivers",
    "curr.prereq1":
      "Economics, Business Management, Statistics, and Accounting are prerequisite areas. Students from non-business majors must show one of these was passed at undergraduate level before the first semester, or complete an approved FJCU undergraduate equivalent in their first term. Prerequisites do not count toward graduation credits.",
    "curr.prereq2":
      "Postgraduate course waivers must be requested before official enrollment. There is one chance, with a deadline in the first week of class, subject to the imMBA chair’s approval.",
    "curr.spot": "New course spotlights",
    "curr.spot1.title": "Data Analytics for International Business",
    "curr.spot1.body":
      "Build the quantitative literacy to read markets, not just reports. A new spotlight course for globally minded managers.",
    "curr.spot2.title": "AI-Assisted Digital Product Development",
    "curr.spot2.body":
      "Learn how AI changes product practice, from discovery to delivery, with a practitioner-led lens.",
    "admissions.eyebrow": "Admissions",
    "admissions.title": "How to apply: a straight path, not a maze.",
    "admissions.body":
      "All courses are conducted in English. Choose the two-year Fu Jen imMBA, or a dual master’s with M1 at FJCU and M2 at a partner school. Partner-school tuition and fees apply for the dual track.",
    "admissions.open": "Now open · International students only",
    "admissions.spring": "Spring 2027 applications",
    "admissions.dates": "14 September – 14 October. Local applicants should use the Chinese admissions track.",
    "admissions.s1.title": "Choose your path",
    "admissions.s1.body":
      "Two-year imMBA at Fu Jen, or dual master’s with UM-Flint, KEDGE, or IQS. Dual-degree students must be admitted and pay extra full or partial tuition at the partner school.",
    "admissions.s2.title": "Prepare your file",
    "admissions.s2.body":
      "English autobiography, English study plan, English proficiency (TOEFL, IELTS, or TOEIC, CEFR B2 preferred), two recommendation letters, plus any supporting materials.",
    "admissions.s3.title": "Apply online",
    "admissions.s3a": "Submit through the official portal at",
    "admissions.s3b": "Typical windows: Spring mid-Oct to late Dec; Fall January to June.",
    "admissions.s4.title": "Review fees & scholarships",
    "admissions.s4.body":
      "International tuition is NT$123,000 per semester. Eligible students may choose preferential fees of NT$68,660 or the President Scholarship of NT$40,600 per semester (up to four terms), not both.",
    "admissions.path": "How to apply",
    "notify.now": "now",
    "notify.ago2": "2m ago",
    "notify.ago8": "8m ago",
    "notify.n1.name": "Fu Jen imMBA",
    "notify.n2.name": "Admissions Office",
    "notify.n2.title": "International vs local",
    "notify.n3.name": "imMBA",
    "notify.n3.title": "Typical windows",
    "deadlines.title": "Application Deadlines",
    "deadlines.r1": "Round 1",
    "deadlines.r2": "Round 2",
    "deadlines.r3": "Round 3",
    "deadlines.m1": "Oct",
    "deadlines.d1": "14",
    "deadlines.m2": "Dec",
    "deadlines.d2": "31",
    "deadlines.m3": "Jun",
    "deadlines.d3": "30",
    "env.pageTitle": "Our Learning Environment",
    "env.meta":
      "Classrooms, library, and campus spaces of Fu Jen Catholic University’s International MBA (imMBA).",
    "env.headline": "Our Learning Environment",
    "env.p1":
      "Fu Jen Catholic University sits at a rare junction of two MRT lines. Greater Taipei is well connected, and the Airport MRT makes exploring the world more convenient.",
    "env.p2":
      "Step into the Cardinal Shan Building (MD) and you meet a bright, generous humanities lobby and the aroma of Yili Mai coffee, so students can recharge between classes and discussions. Floors 10 to 12 hold the College of Management's professional classrooms, updated equipment, and comfortable rest areas. Most imMBA learning spaces are arranged here.",
    "env.p3":
      "Studying in imMBA means more than a strong faculty and an international peer group. It also means a five-star learning environment at the highest point on campus, looking out over Fu Jen.",
    "env.p4":
      "Floors 3, 4, and 5 of the Cardinal Shan Building house a well-stocked library. Pause from research, look out the window, and think. Don't miss the new e-learning Fun Learning Self-Study Center on the 5th floor, where creating and learning feel more immediate.",
    "env.cap.lobby": "Cardinal Shan Building (MD), humanities lobby",
    "env.cap.class": "College classrooms on MD floors 10 to 12",
    "env.cap.campus": "Campus and learning spaces",
    "env.cap.library": "Library levels and self-study spaces",
    "env.cap.rooms": "Classrooms and gathering spaces",
    "env.cap.av": "MD 10F multifunctional AV classroom",
    "env.cap.proclass": "MD 10F professional classroom",
    "env.cap.projection": "Classroom with projection screen",
    "env.cap.discuss": "MD 10F small group discussion room",
    "env.cap.wave": "Wave bench lounge with plants",
    "env.cap.circular": "Circular lounge with tree and purple sofas",
    "env.cap.orange": "Orange curved sofa lounge",
    "env.cap.ottoman": "Colorful plus-shaped ottomans",
    "env.cta": "See our learning environment",
    "faculty.pageTitle": "Faculty Directory",
    "faculty.meta":
      "Full-time and part-time faculty of Fu Jen Catholic University’s International MBA (imMBA).",
    "faculty.headline": "Faculty",
    "faculty.searchLabel": "Name",
    "faculty.search": "Search by name...",
    "faculty.typeLabel": "Faculty Type",
    "faculty.typeAll": "All Faculty",
    "faculty.typeChair": "Chair Professor",
    "faculty.typeProfessor": "Professor",
    "faculty.typeAssociate": "Associate Professor",
    "faculty.typeAssistant": "Assistant Professor",
    "faculty.typeParttime": "Part-time",
    "faculty.lastName": "Last Name",
    "faculty.empty": "No faculty match these filters.",
    "faculty.quote": "The classroom is where Fu Jen meets the world.",
    "faculty.fields": "Research fields",
    "faculty.statScholars": "Scholars",
    "faculty.statFulltime": "Full-time",
    "faculty.statAdjunct": "Adjunct",
    "faculty.statFields": "Fields",
    "faculty.fieldAll": "All fields",
    "faculty.eyebrow": "Faculty",
    "faculty.title": "Scholars and practitioners who teach across borders.",
    "faculty.body":
      "A sample of the full-time faculty who teach and advise in the program. Advisor lists for thesis supervision are released each March and October.",
    "faculty.cta": "View faculty directory",
    "cta.bandTitle": "Take control of your MBA year with imMBA",
    "fac.yt.role": "Associate Professor · Program Chair",
    "fac.yt.bio": "Ph.D. in Information Management, National Chengchi University. Data mining, AI, machine learning.",
    "fac.ml.role": "Chair Professor",
    "fac.ml.bio": "Ph.D. in Operations Research and Industrial Engineering, University of Texas at Austin.",
    "fac.yl.role": "Professor",
    "fac.yl.bio": "Ph.D. in Marketing, Golden Gate University, San Francisco. Marketing management.",
    "fac.yh.role": "Associate Professor",
    "fac.yh.bio": "Ph.D. in International Business, National Taiwan University. Digital marketing and social commerce.",
    "fac.cl.role": "Associate Professor",
    "fac.cl.bio": "Ph.D. in International Business, NTU. Supply chain, brand, and integrated marketing.",
    "fac.kh.role": "Associate Professor",
    "fac.kh.bio": "Ph.D. in Business Administration, University of Technology Sydney.",
    "fac.tc.role": "Assistant Professor",
    "fac.tc.bio": "Ph.D. in Business Administration, FJCU. Economics, governance, financial management.",
    "fac.ls.role": "Assistant Professor",
    "fac.ls.bio": "Ph.D. in Finance, National Chung Cheng University. ESG, green and climate finance.",
    "fac.sh.role": "Part-time Associate Professor",
    "fac.sh.bio": "Ph.D. in Business Administration, FJCU. Human resources, talent and organization development (ATD CPTD).",
    "guide.pageTitle": "imMBA Guide",
    "guide.meta": "Course registration, thesis advising, and what to do after you enroll in Fu Jen imMBA.",
    "guide.title": "What to do after you enroll.",
    "guide.body":
      "The imMBA office publishes advisor lists in late March and early October. Register for THESIS before add/drop in the semester you plan to defend. First-year students typically take 9–18 credits per semester; second-year students 8–18, unless it is the final semester or the director approves otherwise.",
    "guide.card1.title": "Course registration",
    "guide.card1.body":
      "Only graduate-level, English-taught, business-related College of Management courses count toward graduation credits unless the imMBA director approves otherwise.",
    "guide.card2.title": "Thesis advising",
    "guide.card2.body":
      "Wait for the official professor list each term, then contact an advisor. Enrolling in THESIS preserves the right to apply for defense that semester.",
    "grad.pageTitle": "Graduation",
    "grad.meta": "Graduation requirements, thesis defense, and official forms for Fu Jen imMBA.",
    "grad.title": "42 credits and a thesis defense.",
    "grad.body":
      "Complete 23 required credits (11 absolutely required including a 6-credit thesis, plus 12 optionally required), 19 electives, and the final thesis defense. The minimum for graduation is 42 credits.",
    "grad.source": "Official Graduation page",
    "dual.pageTitle": "Dual Degree",
    "dual.meta":
      "Official dual master's degree options with University of Michigan-Flint, KEDGE Business School, and IQS School of Management.",
    "dual.partnersAria": "Partner schools",
    "dual.source": "Official Dual Degree page",
    "dual.title": "M1 at Fu Jen. M2 in the USA, France, or Spain.",
    "dual.body":
      "Declare your intention to the imMBA office in the first week of the first semester so your course plan can diverge. Apply directly to the partner school in the second semester. Seats are limited; the office recommends students by performance, and the partner makes the final admission decision. Extra full or partial tuition at the partner school applies.",
    "exchange.title": "Tuition-free exchange with partners worldwide.",
    "exchange.body":
      "If you are not on a dual-degree track, Fu Jen’s global tuition-free exchange program is open to imMBA students. Procedures, requirements, deadlines, and school lists are handled by the Fu Jen International Student Center.",
    "exchange.cta": "International Student Center",
    "exchange.all": "Partner universities",
    "exchange.pageTitle": "Exchange",
    "exchange.officialTitle": "Global tuition-free exchange program with partner schools worldwide",
    "exchange.meta": "Tuition-free exchange with Fu Jen partner schools worldwide, through the International Student Center.",
    "exchange.p1":
      "With abundant resources in academic networking, Fu Jen Catholic University has partnered schools globally with a tuition-free exchange program.",
    "exchange.p2":
      "Fu Jen imMBA students are encouraged to take this advantage to explore their international perspectives and cross-cultural experiences if they don't plan to join a dual degree program at one of the contracted institutions abroad.",
    "exchange.p3":
      "For details about the global tuition-free exchange program in terms of application procedures, requirements, deadline, school information, and so on, please visit Fu Jen International Student Center.",
    "exchange.partnersLabel": "Featured partners",
    "market.pageTitle": "Marketplace",
    "market.meta": "Student-to-student course packets, textbooks, and materials for Fu Jen imMBA.",
    "market.headline": "Marketplace",
    "market.filter": "Filter by",
    "market.filterAll": "Filter: All",
    "market.filterCore": "Filter: Core",
    "market.filterSpot": "Filter: Spotlight",
    "market.filterElective": "Filter: Elective",
    "market.sort": "Sort by",
    "market.sortFeatured": "Sort by: Featured",
    "market.sortAz": "Sort by: A–Z",
    "market.sortZa": "Sort by: Z–A",
    "market.sortLow": "Sort by: Price low to high",
    "market.sortHigh": "Sort by: Price high to low",
    "market.empty": "No packets match these filters.",
    "market.tabDesc": "Description",
    "market.tabDetails": "Details",
    "market.tabPickup": "Pickup",
    "market.related": "You may also like",
    "market.title": "Books & materials marketplace",
    "market.body":
      "A student-to-student board for course books and materials used in the English-taught imMBA curriculum. Listings below are representative placeholders based on core and spotlight courses.",
    "market.cta": "Browse the marketplace",
    "market.sellHint": "Students can register as a marketplace seller to post a listing.",
    "market.accountTitle": "Seller account",
    "market.accountMeta": "Register, verify email, sign in, or reset a password to post a marketplace listing.",
    "market.accountLede": "Sign in to post a listing.",
    "market.sellerIn": "Seller sign in",
    "market.desk": "Seller desk",
    "market.backShop": "Back to Marketplace",
    "market.posted": "Listing posted. Use Back to Marketplace to see it in the shop.",
    "market.removedNotice": "The office removed a listing of yours. It is no longer on Marketplace.",
    "market.item1": "Core textbook and case pack · typically circulated between first-year cohorts.",
    "market.item2": "Software notes and reading list for the new analytics spotlight course.",
    "market.item3": "Workshop handouts and recommended product-practice readings.",
    "market.item4": "2-credit required course packet, often reused after the first semester.",
    "events.title": "Photo Gallery",
    "gallery.title": "Photo Gallery",
    "gallery.body": "Campus life, classrooms, and the College of Management at Fu Jen.",
    "gallery.prev": "Previous photo",
    "gallery.next": "Next photo",
    "events.e1": "【9/29 Admissions Info Session Recap｜Local Student Applications Open Tomorrow!】",
    "events.e1b": "Missed today's International Management MBA (imMBA) info session? Here are a few highlights!",
    "events.e1.p1": "Missed today's International Management MBA (imMBA) info session? Here are a few highlights!",
    "events.e1.p2":
      "imMBA Chair Dr. Tu, Yi-ning walked students through our ''Admissions Guide'', covering the application process, program resources, and international study opportunities. She also shared updates on potential new partner universities in Europe and the U.S., bringing more possibilities for dual master's degrees.",
    "events.e1.p3":
      "First-year imMBA student Zoe also shared her story. When she applied, her TOEIC score was in the 500s. After a year in imMBA's English-taught environment, learning and interacting with international classmates, she reached 805!",
    "events.e1.p4":
      "Zoe also shared practical tips from her own application experience, from preparing application materials to highlighting what makes an applicant stand out. Her experience shows that where you start doesn't have to limit where you can go. Give yourself a chance!",
    "events.e1.p5": "Stop by the imMBA office at LM208-1 and pick up our ''Admissions Guide''!",
    "events.e1.p6": "International Management MBA (imMBA) 2027 Admissions",
    "events.e1.p7": "Local Student Application Period｜9/30–10/13",
    "events.e1.tags": "#FJCU_imMBA #dual_master_degree",
    "events.e2": "【International Students: Get to Know Fu Jen imMBA at Our Info Session!】",
    "events.e2b":
      "Fu Jen's International Management MBA (imMBA) is hosting an information session for international students on October 1.",
    "events.e2.p1":
      "Fu Jen's International Management MBA (imMBA) is hosting an information session for international students on October 1.",
    "events.e2.p2":
      "If you have a bachelor's degree (or are currently a junior or senior) and a TOEIC score of 700+ or equivalent English proficiency, come learn about imMBA.",
    "events.e2.p3":
      "Study in a fully English-taught environment with students from around the world, explore four scholarship opportunities, and pursue dual master's degrees in the U.S., Spain, or France.",
    "events.e2.p4": "International Management MBA Information Session",
    "events.e2.p5": "Oct. 1 (Thu.) at noon｜Location will be emailed after registration closes",
    "events.e2.p6": "Free lunch for registered attendees (limited quantities)",
    "events.e2.p7": "Registration deadline: Sep. 29 (Tue.)",
    "events.e2.p8": "The session will be conducted in English. Feel free to share this with international friends!",
    "events.e2.tags": "#FJCU_imMBA #dual_master_degree",
    "events.e3": "【New Course Spotlight｜AI-Assisted Digital Product Development】",
    "events.e3b": "Want to turn a business idea into a working digital product, even without coding experience?",
    "events.e3.p1": "Want to turn a business idea into a working digital product, even without coding experience?",
    "events.e3.p2":
      "AI is changing how products are developed. For business students, using AI to turn ideas into practical solutions is becoming an essential skill.",
    "events.e3.p3":
      "This semester, Fu Jen imMBA introduces AI-Assisted Digital Product Development, where students learn product design, web development, and data management while building a functional digital product.",
    "events.e3.p4":
      "As AI reshapes the business world, this course equips business students to apply AI and solve real-world problems.",
    "events.e3.tags": "#FJCU_imMBA #dual_master_degree",
    "news.title": "What’s happening in the program.",
    "highlights.pageTitle": "Highlights",
    "highlights.meta": "Latest announcements and highlights from Fu Jen imMBA.",
    "highlights.lede": "All program announcements, newest first, with the same date, title, and official source as the original posts.",
    "highlights.all": "All highlights",
    "news.n1.title":
      "Spring 2027, apply NOW!! (Sep 14 - Oct 14) - This track is open to international students only",
    "news.n1.body": "★ When to apply: Sep 14 - Oct 14",
    "news.n1.p1": "Spring 2027",
    "news.n1.p2": "★ When to apply: Sep 14 - Oct 14",
    "news.n1.p3": "★ How to apply: Apply online and submit required documents.",
    "news.n1.p4": "★ Required Documents",
    "news.n1.d1": "1.The certificate or diploma of your highest degree",
    "news.n1.d2": "2.Complete academic transcripts issued by your school for each year of study",
    "news.n1.d3": "3.A financial statement showing that you have sufficient funds to study in Taiwan",
    "news.n1.d4": "4.Receipt for application fee",
    "news.n1.d5": "5.Verification of nationality",
    "news.n1.d6": "6.Declaration Form: Download the form from the application system",
    "news.n1.d7": "7.Two recommendation letters",
    "news.n1.d8": "8.Transcript of English Proficiency",
    "news.n1.d9": "9.A biography with a study plan",
    "news.n1.d10": "10.Any other materials which may contribute to the application for admission",
    "news.n1.p5": "For more detailed information:",
    "news.n2.title": "【How much is possible in two years?】",
    "news.n2.body":
      "If you're choosing a graduate program, you may be looking for more than just a master's degree.",
    "news.n2.p1": "If you're choosing a graduate program, you may be looking for more than just a master's degree.",
    "news.n2.p2":
      "International Management MBA (imMBA) offers a fully English-taught environment where you study with students from around the world, gain cross-cultural experience, and build an international network. You'll also have opportunities to study abroad and explore more possibilities.",
    "news.n2.p3": "What is imMBA all about? Who is it for? What opportunities does it offer?",
    "news.n2.p4": "Join us on September 29 and discover where imMBA could take you.",
    "news.n2.p5": "Fu Jen imMBA 2027 Admissions Information Session",
    "news.n2.p6": "September 29 (Tue.)｜12:10 PM｜LM202 Meeting Room",
    "news.n2.p7": "Registration opens on September 14 (Mon.). Stay tuned!",
    "news.n2.p8": "Your future starts with imMBA.",
    "news.n2.tags": "#FJCU_imMBA #Dual_Master_Degree",
    "news.n3.title": "【90 Seconds with the Professor｜AI × Product】",
    "news.n3.body": "What is AI-Assisted Digital Product Development all about?",
    "news.n3.p1": "What is AI-Assisted Digital Product Development all about?",
    "news.n3.p2":
      "Starting with a business idea, how can AI support the development of a digital product? And what skills can business students gain from this course?",
    "news.n3.p3":
      "In just 90 seconds, our professor introduces the course and gives you a quick look at the key ideas behind AI × Product.",
    "news.n3.p4": "90 seconds. Let's hear from the professor.",
    "news.n3.tags": "#FJCU_imMBA #dual_master_degree",
    "news.n4.title": "【New Course Spotlight｜Data Analytics for International Business】",
    "news.n4.body":
      "Last week, we explored AI × Product. This week, we look at AI × Data and how data supports better business decisions.",
    "news.n4.p1":
      "Last week, we explored AI × Product. This week, we look at AI × Data and how data supports better business decisions.",
    "news.n4.p2":
      "In the AI era, identifying problems, spotting trends, and making data-informed decisions are becoming essential skills for business professionals.",
    "news.n4.p3":
      "This academic year, Fu Jen imMBA introduces Data Analytics for International Business, covering data visualization, statistical analysis, and machine learning through real-world business applications.",
    "news.n4.p4":
      "From AI × Product to AI × Data, these two new courses respond to the changes brought by AI from different angles, helping business students build the skills to solve problems and make better decisions.",
    "news.n4.tags": "#FJCU_imMBA #dual_master_degree",
    "news.n5.title": "【Partner Spotlight | IQS School of Management】",
    "news.n5.body": "When people think of Spain, Barcelona is often known for its architecture and vibrant culture.",
    "news.n5.p1":
      "When people think of Spain, Barcelona is often known for its architecture and vibrant culture. For business students, it is also one of Europe's leading hubs for innovation and entrepreneurship.",
    "news.n5.p2":
      "Located in Barcelona, IQS School of Management is part of IQS, a founding member of Universitat Ramon Llull, and one of the dual-degree partners of Fu Jen imMBA. Founded in 1905, IQS School of Management is AACSB-accredited and is recognized for integrating management, technology, and innovation.",
    "news.n5.p3":
      "Through the imMBA 1+1 Dual Master's Degree Program, students may spend their second year at IQS, choosing between the Master in Industrial Business Management and the Master in International Marketing in a Digital Environment. Upon meeting the graduation requirements of both institutions, students earn master's degrees from both universities. Under the partnership agreement, imMBA dual-degree students are eligible for a tuition discount while studying at IQS.",
    "news.n5.p4":
      "The partnership offers students the opportunity to experience the European higher education system, broaden their global perspective, and thrive in an increasingly interconnected world.",
    "news.n5.tags": "#FJCU_imMBA #Dual_Master_Degree",
    "news.n6.title": "【Across the Pacific, One More Global Partner】",
    "news.n6.body":
      "Recently, faculty members from Fu Jen's College of Management visited sister school California State Polytechnic University, Pomona (CPP).",
    "news.n6.p1":
      "Recently, faculty members from Fu Jen's College of Management visited sister school California State Polytechnic University, Pomona (CPP). The two sides discussed various areas of collaboration, including the possibility of a 1+1 dual master's degree for the International Management MBA (imMBA).",
    "news.n6.p2":
      "CPP is part of the California State University system. Its College of Business Administration holds AACSB accreditation in both business and accounting and is known for its Learn by Doing approach. Its research and practice centers focus on areas such as Customer Insights, Entrepreneurship, Digital Innovation, Business Analytics, and Cyber Risk.",
    "news.n6.p3":
      "Both institutions will continue discussions on curriculum alignment, credit transfer, and program planning, with the goal of creating more international learning and dual degree opportunities for imMBA students.",
    "news.n6.tags": "#FJCU_imMBA #Dual_Master_Degree",
    "article.back": "Back to highlights",
    "article.read": "View Details",
    "article.announcement": "Announcement",
    "news.source": "Official news",
    "news.sourceLine": "Official news",
    "admin.kicker": "News",
    "admin.faculty": "Faculty",
    "admin.facultyLede": "Create, edit, reorder, and photograph faculty. Records sync to the public Faculty page through Supabase when connected.",
    "admin.facultySeed": "Seed from local prototype",
    "admin.facultyNew": "New faculty",
    "admin.facultyConnect": "Save connection",
    "admin.title": "Announcement back-office",
    "admin.lede": "Create, preview, update, or delete one bilingual record at a time. Saving or deleting always applies to Chinese and English together.",
    "admin.new": "New announcement",
    "admin.restore": "Restore defaults",
    "admin.site": "View website",
    "admin.save": "Save both languages",
    "admin.translateEn": "Auto-translate to English",
    "admin.translateZh": "Auto-translate to Chinese",
    "admin.logout": "Sign out",
    "admin.photos": "Photos",
    "admin.photosHint": "Attach JPEG, PNG, or WebP. Photos appear on the announcement page with both languages.",
    "admin.removePhoto": "Remove",
    "admin.openPost": "View this post",
    "admin.dash": "Dashboard",
    "dash.kicker": "Back-office",
    "dash.title": "Traffic dashboard",
    "dash.lede": "Live visitors, page views, and the links people click most. Counts stay in this browser.",
    "dash.range": "Range",
    "dash.today": "Today",
    "dash.week": "Last 7 days",
    "dash.all": "All recorded",
    "dash.clear": "Clear data",
    "dash.live": "Live now",
    "dash.views": "Page views",
    "dash.visitors": "Visitors",
    "dash.clicks": "Clicks",
    "dash.chart": "Views this week",
    "dash.pages": "Pages viewed most",
    "dash.page": "Page",
    "dash.targets": "Clicked most",
    "dash.link": "Link",
    "dash.people": "People who clicked the most",
    "dash.person": "Visitor",
    "dash.last": "Last seen",
    "dash.recent": "Live activity",
    "office.area": "Area",
    "office.web": "Web Analytics",
    "office.analytics": "Analytics",
    "office.people": "People",
    "office.overview": "Overview",
    "office.source": "Traffic overview",
    "office.os": "Operating systems",
    "office.langw": "Language",
    "dash.visits": "Visits",
    "office.map": "Country map",
    "office.content": "Content overview",
    "office.time": "Time on site",
    "office.bounce": "Bounce rate",
    "office.exit": "Exit rate",
    "office.search": "Search engines",
    "office.countries": "Country list",
    "office.total": "Total",
    "office.avg": "Average",
    "office.tznote": "From timezone and locale",
    "office.logged": "Every view, click, and live ping is logged",
    "office.clicks": "Clicks",
    "office.devices": "Device type",
    "office.returning": "Returning visitors",
    "office.events": "Events logged",
    "office.referrers": "Referrers",
    "office.latest": "Latest",
    "admin.listLede": "Edit or delete bilingual announcements. Use New announcement in the left rail to compose a post.",
    "official.page": "Official page",
    "official.rail": "Official pages",
    "official.ext": "ext",
    "official.zh": "Chinese official site",
    "official.collegeEn": "College of Management (English)",
    "official.local": "Local-student admissions",
    "official.iscProc": "Exchange procedures",
    "login.title": "Sign in",
    "login.lede": "Sign in to manage announcements. A single click on the logo returns to the home page.",
    "login.staffLede": "Continue to the back office.",
    "login.sellerLede": "Continue to post a listing.",
    "login.marketHint": "Selling on Marketplace?",
    "login.marketLink": "Seller sign in",
    "login.email": "Email",
    "login.forgot": "Forgot password?",
    "login.back": "Back to sign in",
    "login.registerTitle": "Create account",
    "login.resetTitle": "Forgot password",
    "login.newPassTitle": "New password",
    "login.sendReset": "Send reset link",
    "login.savePass": "Save password",
    "login.registerLede": "Create a staff account. A super admin approves access.",
    "login.resetLede": "Enter your email and we’ll send a reset link.",
    "login.newPassLede": "Choose a new password, then continue.",
    "login.user": "Email or local admin username",
    "login.pass": "Password",
    "login.submit": "Sign in",
    "login.keep": "Keep me signed in",
    "login.error": "Email or password is incorrect.",
    "login.register": "Register",
    "login.reset": "Reset password",
    "login.verify": "Email verification",
    "login.intent": "Account type",
    "login.staff": "Staff (back office)",
    "login.market": "Marketplace seller",
    "login.name": "Display name",
    "login.checkEmail": "Check your email to verify this address.",
    "pending.title": "Waiting for approval",
    "pending.lede": "Your email is registered. Verify it if asked, then wait \u2014 a super admin must approve staff before they can open the back office.",
    "pending.switch": "Switch account",
    "pending.seller": "I meant to sell on Marketplace",
    "office.tabFaculty": "Faculty",
    "office.tabAlumni": "Alumni",
    "office.tabAudit": "Audit",
    "audit.lede": "Append-only office audit trail. Admins only see USER actions. Super admins see every role and can restore snapshots.",
    "audit.module": "Module",
    "audit.moduleAll": "All modules",
    "audit.refresh": "Refresh",
    "audit.verify": "Verify hash chain",
    "audit.when": "When",
    "audit.actor": "Actor",
    "audit.action": "Action",
    "audit.entity": "Entity",
    "audit.status": "Status",
    "audit.rollback": "Point-in-time rollback",
    "audit.rollbackLede": "Super admin only. Preview the affected records, then execute an atomic restore.",
    "audit.target": "Roll back to",
    "audit.preview": "Dry-run preview",
    "audit.execute": "Execute rollback",
    "audit.snapshots": "Snapshots",
    "alumni.lede": "Shared alumni database. Add, edit, delete, search, filter, import a CSV, and export the filtered list. Create, update, and delete write an audit trail.",
    "alumni.new": "New alumni",
    "alumni.template": "CSV template",
    "alumni.import": "Import CSV",
    "alumni.export": "Export filtered CSV",
    "alumni.search": "Search",
    "alumni.searchHint": "Name, company, email…",
    "alumni.degree": "Degree program",
    "alumni.year": "Graduation year",
    "alumni.dept": "Department",
    "alumni.company": "Company",
    "alumni.columns": "Display fields",
    "alumni.save": "Save alumni",
    "alumni.audit": "Activity history",
    "office.tabListings": "Listings",
    "office.tabNews": "News",
    "office.tabCompose": "Compose",
    "admin.listings": "Listings",
    "listings.lede": "Student seller posts appear here. Course packets on the public shop are program listings. Open a post to check it, or remove it from the shop.",
    "listings.thTitle": "Title",
    "listings.thSeller": "Seller",
    "listings.thPrice": "Price",
    "listings.thKind": "Kind",
    "access.thEmail": "Email",
    "access.thRole": "Role",
    "access.thType": "Account",
    "admin.facultyAdvanced": "Advanced connection",
    "access.kicker": "Access",
    "access.thPerms": "Permissions",
    "access.lede": "Open Permissions on a row and check a role on or off. Super admin only.",
    "nav.admin": "News",
    "article.event": "Event",
    "downloads.title": "Official forms and brochures.",
    "downloads.d1": "Admission Brochure for Degree-Seeking International Students",
    "downloads.d2": "Graduation Requirements (imMBA)",
    "downloads.d3": "Course structure and catalog (official site)",
    "band.title": "Ready for an English-taught MBA in Taipei?",
    "band.body":
      "Spring 2027 international applications are open through 14 October. Apply online, then write to the imMBA office if you need a hand.",
    "footer.program": "MBA Program in International Management",
    "footer.university": "Fu Jen Catholic University",
    "footer.visit": "Visit & contact",
    "footer.office": "Office LM208-1",
    "footer.address": "No. 510, Zhongzheng Rd., Xinzhuang Dist., New Taipei City 24205, Taiwan",
    "footer.tel": "Tel:",
    "footer.ms": "Ms. Chang",
    "footer.email": "Email:",
    "footer.explore": "Explore",
    "footer.connect": "Connect",
    "footer.fb": "College of Management on Facebook",
    "footer.li": "Fu Jen on LinkedIn",
    "footer.home": "University home",
    "footer.isc": "International Student Center",
    "footer.copy": "Fu Jen Catholic University. All rights reserved.",
    "footer.privacy": "Privacy",
    "footer.legal": "Legal",
    "ui.top": "Back to top",
    "langButton": "中文",
    "langAria": "Switch to Traditional Chinese",
  },
  zh: {
    "meta.title": "輔仁大學國際創業與經營管理碩士學位學程（imMBA）",
    "meta.description":
      "輔仁大學 AACSB 認證國際經營管理碩士。全英語授課、具全球排名，並提供美國、法國、西班牙雙聯碩士選擇。",
    "skip": "跳至主要內容",
    "notice.text": "本網站為輔仁大學教學網站。",
    "notice.credit": "— 製作：Nigel Pang (415416026)",
    "footer.credit": "— 製作：Nigel Pang (415416026)",
    "notice.official": "官方 imMBA 網站",
    "notice.collapse": "收合主選單",
    "notice.expand": "展開主選單",
    "brand.name": "輔仁大學國際創業與經營管理碩士學位學程",
    "brand.short": "imMBA",
    "nav.menu": "開啟選單",
    "nav.primary": "主要選單",
    "nav.about": "關於我們",
    "nav.overview": "簡介與排名",
    "nav.environment": "學習環境",
    "nav.admissions": "招生資訊",
    "nav.apply": "報名 Fu Jen imMBA",
    "nav.courses": "課程資訊",
    "nav.requirements": "課程與修課規定",
    "nav.faculty": "師資陣容",
    "nav.guide": "imMBA 指南",
    "nav.graduation": "畢業規定",
    "nav.dual": "雙聯學位",
    "nav.exchange": "海外交換",
    "nav.highlights": "亮點特色",
    "nav.college": "管理學院",
    "nav.marketplace": "教材市集",
    "nav.events": "活動",
    "nav.announcements": "公告",
    "nav.downloads": "下載專區",
    "cta.apply": "立即申請",
    "cta.start": "開始申請",
    "cta.marketplace": "二手書與教材市集",
    "cta.portal": "前往官方申請系統",
    "hero.eyebrow": "AACSB 認證 · 全英語授課 · 台北",
    "hero.title": "輔仁大學國際創業與經營管理碩士學位學程",
    "hero.lede": "以 AACSB 認證的卓越標準，培育全球經理人",
    "hero.note": "2027 年春季班開放國際學生申請 · 9/14–10/14",
    "hero.panel": "學程亮點",
    "stat.top": "Top",
    "stat.credits": "學分",
    "stat.english": "英語",
    "hero.k1": "Eduniversal 2025",
    "hero.s1": "Top 3",
    "hero.c1": "台灣國際管理領域名列前茅",
    "hero.k2": "國際課堂",
    "hero.s2": "30+",
    "hero.c2": "來自全球的國家，本地／國際生比例可達 1:1",
    "hero.k3": "雙聯碩士選擇",
    "hero.c3": "兩年兩學位：密西根大學 Flint（美國）、KEDGE 高等商學院（法國）或 Institut Químic de Sarrià IQS（西班牙）。",
    "trust.label": "關鍵數據",
    "trust.s1": "Top 20",
    "trust.c1": "遠東地區 · 國際管理",
    "trust.s2": "42 學分",
    "trust.c2": "最低畢業學分，含論文",
    "trust.s3": "全英語",
    "trust.c3": "imMBA 課程均以英語授課",
    "trust.s4": "前 5%",
    "trust.c4": "全球商學院取得 AACSB 認證的比例",
    "intro.title": "輔仁大學國際經營管理碩士班（imMBA）",
    "intro.body":
      "輔仁大學國際經營管理碩士班（imMBA）獲 AACSB 認證，旨在培養學生具備全球視野的實務商管知識，提升國際移動力。全球僅約 5% 頂尖商學院獲 AACSB 認證。",
    "intro.body2":
      "課程透過行銷、營運、財務、人資、科技與策略，讓學生深入理解世界如何相互連結，以因應當代全球經濟挑戰。",
    "intro.college":
      "輔大管理學院於 2005 年通過 AACSB 國際商學院認證，為兩岸首家通過 AACSB 認證的學院，並於 2010、2015、2020 及 2025 年持續通過認證。全球一萬六千多所商管學院中，僅約 5% 能通過 AACSB。2021 年獲選教育部「大專校院學生雙語化學習計畫」重點培育學院，為全台 76 個申請學院中大台北地區唯一獲補助的私立大學管理學院。國際經管（imMBA）於 2006 年與台大、政大同步獲教育部遴選試辦商管專業學院；自 103 學年度起全面英語授課並招收來自世界各地的學生。",
    "rank.lede": "根據 Eduniversal 2025，國際經管（imMBA）在 International Management 分類排名全台 Top 3、遠東地區 Top 20。",
    "rank.taiwan": "台灣・國際管理",
    "rank.fareast": "遠東亞・國際管理",
    "rank.aacsbShare": "全球商學院取得 AACSB 認證的比例",
    "rank.countries": "交換或攻讀學位學生來自的國家數",
    "rank.sourceEdu": "Eduniversal，2025",
    "rank.sourceAacsb": "AACSB",
    "rank.sourceClass": "本地生與非本地生可達 1:1",
    "rank.official": "官方簡介與排名",
    "aacsb.alt": "AACSB 認證",
    "intro.f1.title": "國際化 MBA 學習環境",
    "intro.f1.body":
      "國際經管（imMBA）學生組成除本地生外，尚有亞洲、美洲、歐洲、大洋洲等超過 30 個不同國家的學生前來攻讀學位或交換學習，本地生與國際學生 1:1 合班上課，在菁英師資帶領下，達到在地學習、國際化的學習體驗。",
    "intro.f2.title": "美國、法國、西班牙跨國雙碩士",
    "intro.f2.body":
      "國際經管（imMBA）與美國密西根大學 Flint 分校（UM-Flint）、法國 KEDGE 高等商學院（KEDGE）和西班牙拉孟大學 IQS 管理學院（IQS）簽署跨國雙碩士學位計畫。凡錄取且符合資格的學生，都有機會以最經濟的時間與預算，最快於兩年內取得兩個碩士學位。",
    "intro.f3.title": "全球姊妹校免學費出國交換",
    "intro.f3.body":
      "無意攻讀雙碩士、但也想到國外體驗學習生活的同學，可以把握輔大全球姊妹校資源，申請姊妹校交換學習計畫。詳情請見輔大國際學生中心。",
    "intro.f4.title": "春秋兩季入學",
    "intro.f4.body":
      "春季申請約每年 10 月中至 12 月底；秋季約 1 月至 6 月。國際學生請使用本站英語招生通道。",
    "partners.label": "雙聯合作學校",
    "partners.um": "密西根大學 Flint 分校",
    "partners.kedge": "KEDGE 高等商學院",
    "partners.iqs": "Institut Químic de Sarrià IQS",
    "kw.ibm": "國際企業管理",
    "kw.strategy": "策略管理",
    "kw.supply": "供應鏈",
    "kw.marketing": "行銷管理",
    "kw.org": "組織設計",
    "kw.finance": "財務管理",
    "kw.analytics": "數據分析",
    "kw.ai": "AI 產品開發",
    "kw.ethics": "商業倫理",
    "kw.sr": "課程主題涵蓋國際管理與全英語核心課程。",
    "curr.eyebrow": "課程重點",
    "curr.title": "結構清楚、核心國際化，也保留專長空間。",
    "curr.body":
      "畢業至少 42 學分並通過論文口試。原則上僅管理學院研究所、英語授課、商管相關課程可計入畢業學分。",
    "curr.req": "畢業規定",
    "curr.req1": "必修 23 學分：絕對必修 11 學分（含論文 6 學分）及選必修 12 學分。",
    "curr.req2": "選修 19 學分。",
    "curr.req3": "通過論文口試。",
    "curr.req4": "最低畢業學分為 42 學分。",
    "curr.reqNote":
      "一年級每學期通常修 9–18 學分、二年級 8–18 學分，最後一學期或經主任同意者除外。",
    "curr.abs": "絕對必修（11 學分）",
    "curr.ibm": "國際企業管理",
    "curr.ethics": "商業倫理",
    "curr.thesis": "論文",
    "curr.absNote":
      "預計口試當學期請於加退選前加選 THESIS。指導教授名單於每年三月下旬與十月上旬公布。",
    "curr.opt": "選必修：六選四（12 學分）",
    "curr.opt1": "策略管理：全球觀點",
    "curr.opt2": "供應鏈與營運管理：全球觀點",
    "curr.opt3": "行銷管理：國際觀點",
    "curr.opt4": "組織設計與管理：全球觀點",
    "curr.opt5": "人力資源與知識管理：國際觀點",
    "curr.opt6": "財務管理：國際觀點",
    "curr.prereq": "先修與抵免",
    "curr.prereq1":
      "經濟學、企業管理、統計與會計為先修領域。非商管背景須於入學第一學期前證明大學部已修過其中一門，或於第一學期修習輔大核可之大學部課程。先修學分不計入畢業學分。",
    "curr.prereq2":
      "研究所層級抵免須於正式入學前提出，僅一次機會，期限為開課第一週，是否核准由 imMBA 主任決定。",
    "curr.spot": "新課焦點",
    "curr.spot1.title": "國際企業資料分析",
    "curr.spot1.body": "培養讀懂市場、而不只是讀懂報表的量化能力。",
    "curr.spot2.title": "AI 輔助數位產品開發",
    "curr.spot2.body": "從探索到交付，理解 AI 如何改寫產品實務。",
    "admissions.eyebrow": "招生資訊",
    "admissions.title": "申請路徑清楚，不必繞路。",
    "admissions.body":
      "課程全英語授課。可選擇兩年制輔大 imMBA，或碩一在輔大、碩二赴合作學校的雙聯碩士。雙聯須另繳合作學校全部或部分學費。",
    "admissions.open": "開放中 · 僅限國際學生",
    "admissions.spring": "2027 年春季班申請",
    "admissions.dates": "9 月 14 日至 10 月 14 日。本地生請走中文招生通道。",
    "admissions.s1.title": "選擇路徑",
    "admissions.s1.body":
      "兩年制輔大 imMBA，或與 UM-Flint、KEDGE、IQS 的雙聯碩士。雙聯生須獲合作學校錄取並繳交額外學費。",
    "admissions.s2.title": "準備文件",
    "admissions.s2.body":
      "英文自傳、英文讀書計畫、英語能力證明（TOEFL、IELTS 或 TOEIC，建議 CEFR B2）、兩封推薦信，以及其他有助申請的資料。",
    "admissions.s3.title": "線上申請",
    "admissions.s3a": "請至官方系統送出申請",
    "admissions.s3b": "一般時程：春季約 10 月中至 12 月底；秋季約 1 月至 6 月。",
    "admissions.s4.title": "學雜費與獎學金",
    "admissions.s4.body":
      "國際生每學期學雜費新台幣 123,000 元。符合資格者可選擇本地生優惠學雜費 68,660 元，或校長獎學金每學期 40,600 元（至多四學期），兩者擇一。",
    "admissions.path": "申請步驟",
    "notify.now": "現在",
    "notify.ago2": "2分鐘前",
    "notify.ago8": "8分鐘前",
    "notify.n1.name": "輔大 imMBA",
    "notify.n2.name": "招生辦公室",
    "notify.n2.title": "國際生與本地生",
    "notify.n3.name": "imMBA",
    "notify.n3.title": "一般申請時程",
    "deadlines.title": "申請截止日期",
    "deadlines.r1": "第一輪",
    "deadlines.r2": "第二輪",
    "deadlines.r3": "第三輪",
    "deadlines.m1": "10月",
    "deadlines.d1": "14",
    "deadlines.m2": "12月",
    "deadlines.d2": "31",
    "deadlines.m3": "6月",
    "deadlines.d3": "30",
    "env.pageTitle": "學習環境",
    "env.meta": "輔仁大學國際經營管理碩士（imMBA）的教室、圖書館與校園學習空間。",
    "env.headline": "學習環境",
    "env.p1":
      "輔仁大學擁有得天獨厚的雙捷運線交會，大台北地區交通四通八達，機場捷運線讓探索全世界更便利。",
    "env.p2":
      "走進國璽樓(MD)，映入眼簾的是寬敞明亮的人文大廳，以及一粒麥陣陣的咖啡香，讓同學在充實課程和討論學習之餘，能隨時提振精神，獲得滿滿的能量。而位在國璽樓(MD)10-12樓是管理學院的專業教室設備新穎、休息空間舒適，國際經管(imMBA)學習空間也多安排在此。",
    "env.p3":
      "可以說在國際經管(imMBA)求學，除了專業的師資陣容，國際多元同儕共同學習之外，還能享有五星級的優質學習環境，雄踞校園制高點，俯瞰美麗的輔大校園。",
    "env.p4":
      "國璽樓3、4、5樓是藏書豐富的圖書館，埋頭研究之餘，偶而遠眺窗外，靜心沉思。不容錯過位於5樓新落成的e化「Fun學趣自學中心」，學習創作更有感。",
    "env.cap.lobby": "國璽樓（MD）人文大廳",
    "env.cap.class": "國璽樓 10 至 12 樓專業教室",
    "env.cap.campus": "校園與學習空間",
    "env.cap.library": "圖書館樓層與自學空間",
    "env.cap.rooms": "教室與聚會空間",
    "env.cap.av": "國璽樓（MD）10 樓多功能影音教室",
    "env.cap.proclass": "國璽樓（MD）10 樓專業教室",
    "env.cap.projection": "投影教室",
    "env.cap.discuss": "國璽樓（MD）10 樓小組討論室",
    "env.cap.wave": "波浪座椅休憩區",
    "env.cap.circular": "圓形沙發休憩區",
    "env.cap.orange": "橘色弧形沙發休憩區",
    "env.cap.ottoman": "彩色組合椅凳",
    "env.cta": "看看我們的學習環境",
    "faculty.pageTitle": "師資名錄",
    "faculty.meta": "輔仁大學國際經營管理碩士（imMBA）專任與兼任師資。",
    "faculty.headline": "師資名錄",
    "faculty.searchLabel": "姓名",
    "faculty.search": "依姓名搜尋…",
    "faculty.typeLabel": "職稱",
    "faculty.typeAll": "全部師資",
    "faculty.typeChair": "講座教授",
    "faculty.typeProfessor": "教授",
    "faculty.typeAssociate": "副教授",
    "faculty.typeAssistant": "助理教授",
    "faculty.typeParttime": "兼任",
    "faculty.lastName": "姓氏",
    "faculty.empty": "沒有符合條件的師資。",
    "faculty.quote": "課堂，是輔仁與世界相遇的地方。",
    "faculty.fields": "研究領域",
    "faculty.statScholars": "師資",
    "faculty.statFulltime": "專任",
    "faculty.statAdjunct": "兼任",
    "faculty.statFields": "領域",
    "faculty.fieldAll": "全部領域",
    "faculty.eyebrow": "師資陣容",
    "faculty.title": "跨領域、跨國界的學者與實務教師。",
    "faculty.body": "以下為學程專任與兼任師資示例。論文指導教授名單於每年三月與十月公布。",
    "faculty.cta": "查看師資名錄",
    "cta.bandTitle": "用 imMBA 掌握你的 MBA 年",
    "fac.yt.role": "副教授 · 學程主任",
    "fac.yt.bio": "政治大學資訊管理博士。資料探勘、人工智慧、機器學習。",
    "fac.ml.role": "講座教授",
    "fac.ml.bio": "德州大學奧斯汀分校作業研究與工業工程博士。",
    "fac.yl.role": "教授",
    "fac.yl.bio": "舊金山金門大學行銷博士。行銷管理。",
    "fac.yh.role": "副教授",
    "fac.yh.bio": "台灣大學國際企業博士。數位行銷與社群商務。",
    "fac.cl.role": "副教授",
    "fac.cl.bio": "台灣大學國際企業博士。供應鏈、品牌與整合行銷。",
    "fac.kh.role": "副教授",
    "fac.kh.bio": "雪梨科技大學企業管理博士。",
    "fac.tc.role": "助理教授",
    "fac.tc.bio": "輔仁大學企業管理博士。經濟學、治理與財務管理。",
    "fac.ls.role": "助理教授",
    "fac.ls.bio": "中正大學財務博士。ESG、綠色與氣候金融。",
    "fac.sh.role": "兼任副教授",
    "fac.sh.bio": "輔仁大學企業管理博士。人資、人才與組織發展（ATD CPTD）。",
    "guide.pageTitle": "imMBA 指南",
    "guide.meta": "輔仁大學 imMBA 入學後選課、論文指導與注意事項。",
    "guide.title": "入學後這樣走。",
    "guide.body":
      "imMBA 辦公室於每年三月下旬與十月上旬公布論文指導教授名單。預計口試當學期請於加退選前加選 THESIS。一年級每學期通常修 9–18 學分、二年級 8–18 學分，最後一學期或經主任同意者除外。",
    "guide.card1.title": "選課",
    "guide.card1.body":
      "原則上僅管理學院研究所、英語授課、商管相關課程可計入畢業學分，其餘須事先經 imMBA 主任同意。",
    "guide.card2.title": "論文指導",
    "guide.card2.body":
      "請等候當學期正式名單再聯繫指導教授。加選 THESIS 才能保留該學期申請口試與畢業的權利。",
    "grad.pageTitle": "畢業規定",
    "grad.meta": "輔仁大學 imMBA 畢業規定、論文口試與正式表格。",
    "grad.title": "42 學分與論文口試。",
    "grad.body":
      "須完成必修 23 學分（絕對必修 11 學分含論文 6 學分，選必修 12 學分）、選修 19 學分，並通過論文口試。最低畢業學分為 42 學分。",
    "grad.source": "官方畢業與離校頁面",
    "dual.pageTitle": "跨國雙碩士",
    "dual.meta": "輔仁大學 imMBA 與密西根大學 Flint 分校、KEDGE 高等商學院、IQS 管理學院的跨國雙碩士學位。",
    "dual.partnersAria": "合作學校",
    "dual.source": "官方跨國雙碩士頁面",
    "dual.title": "碩一在輔大，碩二赴美、法或西班牙。",
    "dual.body":
      "請於入學第一週向辦公室登記雙聯意願，以便碩一課程分流；第二學期逕向合作學校提出申請。名額有限，辦公室依表現推薦，錄取由合作學校決定。合作學校另收全額或部分學費。",
    "exchange.title": "與全球夥伴學校的免學費交換。",
    "exchange.body":
      "未走雙聯者，可使用輔仁大學全球免學費交換。申請流程、資格、期限與學校資訊請洽國際學生中心。",
    "exchange.cta": "國際學生中心",
    "exchange.all": "夥伴大學",
    "exchange.pageTitle": "海外交換",
    "exchange.officialTitle": "與全球夥伴學校的免學費交換計畫",
    "exchange.meta": "透過國際學生中心，參與輔仁大學與全球夥伴學校的免學費交換。",
    "exchange.p1": "輔仁大學學術網絡資源豐富，與全球夥伴學校設有免學費交換計畫。",
    "exchange.p2":
      "若不計畫前往簽約海外院校修讀雙聯學位，本學程鼓勵同學善用此機會，拓展國際視野與跨文化經驗。",
    "exchange.p3":
      "全球免學費交換之申請流程、資格、期限與學校資訊等細節，請洽輔仁大學國際學生中心。",
    "exchange.partnersLabel": "夥伴學校",
    "market.pageTitle": "教材市集",
    "market.meta": "輔仁大學 imMBA 學生教材、課程包與用書流通市集。",
    "market.headline": "教材市集",
    "market.filter": "篩選",
    "market.filterAll": "篩選：全部",
    "market.filterCore": "篩選：核心",
    "market.filterSpot": "篩選：焦點",
    "market.filterElective": "篩選：選修",
    "market.sort": "排序",
    "market.sortFeatured": "排序：精選",
    "market.sortAz": "排序：A–Z",
    "market.sortZa": "排序：Z–A",
    "market.sortLow": "排序：價格由低到高",
    "market.sortHigh": "排序：價格由高到低",
    "market.empty": "沒有符合條件的教材。",
    "market.tabDesc": "說明",
    "market.tabDetails": "細節",
    "market.tabPickup": "取件方式",
    "market.related": "你可能也需要",
    "market.title": "二手書與教材市集",
    "market.body":
      "供 imMBA 英語課程教材與用書流通的學生市集。以下為依核心與焦點課程整理的代表項目。",
    "market.cta": "進入教材市集",
    "market.sellHint": "同學可註冊為市集賣方後刊登教材。",
    "market.accountTitle": "賣方帳號",
    "market.accountMeta": "註冊、驗證信箱、登入或重設密碼後即可刊登教材。",
    "market.accountLede": "登入後即可刊登教材。",
    "market.sellerIn": "賣方登入",
    "market.desk": "賣方工作台",
    "market.backShop": "返回教材市集",
    "market.posted": "已刊登。可用「返回教材市集」查看。",
    "market.removedNotice": "後台已將你的一則刊登下架，市集上已看不到。",
    "market.item1": "核心教科書與個案教材 · 常見於一年級同學流轉。",
    "market.item2": "新開「國際企業資料分析」課程的軟體筆記與書單。",
    "market.item3": "工作坊講義與產品實務推薦讀物。",
    "market.item4": "必修 2 學分商業倫理課程包，第一學期後常被重複使用。",
    "events.title": "相片集錦",
    "gallery.title": "相片集錦",
    "gallery.body": "輔仁大學校園生活、課堂與管理學院。",
    "gallery.prev": "上一張",
    "gallery.next": "下一張",
    "events.e1": "【9/29 招生說明會回顧｜本地生申請明日開放！】",
    "events.e1b": "錯過今天的國際經營管理碩士（imMBA）說明會了嗎？以下是重點回顧！",
    "events.e1.p1": "錯過今天的國際經營管理碩士（imMBA）說明會了嗎？以下是重點回顧！",
    "events.e1.p2":
      "imMBA 主任涂薏寧老師帶領同學認識《招生指南》，說明申請流程、學程資源與海外學習機會，並分享歐洲與美國潛在新夥伴學校的最新進展，為雙聯碩士帶來更多可能。",
    "events.e1.p3":
      "一年級同學 Zoe 也分享她的故事。申請時 TOEIC 約 500 多分；在 imMBA 全英語環境中與國際同學學習互動一年後，她考到 805 分！",
    "events.e1.p4":
      "Zoe 也從自身申請經驗分享實用建議，從準備申請資料到凸顯個人亮點。她的經驗說明：起點不必限制你能走到哪裡。給自己一個機會！",
    "events.e1.p5": "歡迎到 LM208-1 imMBA 辦公室索取《招生指南》！",
    "events.e1.p6": "國際經營管理碩士（imMBA）2027 招生",
    "events.e1.p7": "本地生申請期間｜9/30–10/13",
    "events.e1.tags": "#FJCU_imMBA #dual_master_degree",
    "events.e2": "【國際學生：來說明會認識輔大 imMBA！】",
    "events.e2b": "輔仁大學國際經營管理碩士（imMBA）將於 10 月 1 日舉辦國際學生說明會。",
    "events.e2.p1": "輔仁大學國際經營管理碩士（imMBA）將於 10 月 1 日舉辦國際學生說明會。",
    "events.e2.p2":
      "若你已有學士學位（或目前為大三、大四），且 TOEIC 700 分以上或具備同等英語能力，歡迎前來認識 imMBA。",
    "events.e2.p3":
      "在全英語環境與來自世界各地的同學一起學習，了解四項獎學金機會，並可攻讀美國、西班牙或法國的雙聯碩士。",
    "events.e2.p4": "國際經營管理碩士說明會",
    "events.e2.p5": "10 月 1 日（四）中午｜地點將於報名截止後以電子郵件通知",
    "events.e2.p6": "報名參加者備有免費午餐（數量有限）",
    "events.e2.p7": "報名截止：9 月 29 日（二）",
    "events.e2.p8": "說明會以英語進行。歡迎轉分享給國際朋友！",
    "events.e2.tags": "#FJCU_imMBA #dual_master_degree",
    "events.e3": "【新課焦點｜AI 輔助數位產品開發】",
    "events.e3b": "想把商業想法做成可用的數位產品，即使沒有程式經驗？",
    "events.e3.p1": "想把商業想法做成可用的數位產品，即使沒有程式經驗？",
    "events.e3.p2": "AI 正在改變產品開發方式。對商管學生而言，用 AI 把想法變成實用解方，正成為必備能力。",
    "events.e3.p3":
      "本學期輔大 imMBA 新開「AI 輔助數位產品開發」，學生學習產品設計、網站開發與資料管理，並實作一套可用的數位產品。",
    "events.e3.p4": "在 AI 改寫商業世界之際，本課程協助商管學生運用 AI、解決真實問題。",
    "events.e3.tags": "#FJCU_imMBA #dual_master_degree",
    "news.title": "學程最新消息。",
    "highlights.pageTitle": "亮點特色",
    "highlights.meta": "輔仁大學 imMBA 最新公告與亮點。",
    "highlights.lede": "全部學程公告，依最新日期排列，保留原文日期、標題與官方來源。",
    "highlights.all": "全部亮點",
    "news.n1.title": "2027 春季班，立即申請！！（9/14–10/14）。本通道僅開放國際學生",
    "news.n1.body": "★ 申請時間：9 月 14 日至 10 月 14 日",
    "news.n1.p1": "2027 春季班",
    "news.n1.p2": "★ 申請時間：9 月 14 日至 10 月 14 日",
    "news.n1.p3": "★ 申請方式：線上申請並繳交應備文件。",
    "news.n1.p4": "★ 應備文件",
    "news.n1.d1": "1.最高學歷證書或文憑",
    "news.n1.d2": "2.就讀各學年完整成績單（由學校核發）",
    "news.n1.d3": "3.足以證明有能力在臺求學的財力證明",
    "news.n1.d4": "4.報名費繳費收據",
    "news.n1.d5": "5.國籍證明",
    "news.n1.d6": "6.切結書：請自申請系統下載",
    "news.n1.d7": "7.兩封推薦信",
    "news.n1.d8": "8.英語能力成績單",
    "news.n1.d9": "9.含讀書計畫之自傳",
    "news.n1.d10": "10.其他有助於入學申請的資料",
    "news.n1.p5": "更多詳細資訊：",
    "news.n2.title": "【兩年可以完成多少事？】",
    "news.n2.body": "如果你正在選擇研究所，你要找的也許不只是一張碩士文憑。",
    "news.n2.p1": "如果你正在選擇研究所，你要找的也許不只是一張碩士文憑。",
    "news.n2.p2":
      "國際經營管理碩士（imMBA）提供全英語環境，與來自世界各地的同學一起學習，累積跨文化經驗並建立國際網絡。你也將有機會出國進修、探索更多可能。",
    "news.n2.p3": "imMBA 是什麼？適合誰？能帶來哪些機會？",
    "news.n2.p4": "9 月 29 日與我們見面，看看 imMBA 能帶你走多遠。",
    "news.n2.p5": "輔大 imMBA 2027 招生說明會",
    "news.n2.p6": "9 月 29 日（二）｜中午 12:10｜LM202 會議室",
    "news.n2.p7": "報名於 9 月 14 日（一）開始，敬請期待！",
    "news.n2.p8": "你的未來，從 imMBA 開始。",
    "news.n2.tags": "#FJCU_imMBA #Dual_Master_Degree",
    "news.n3.title": "【教授 90 秒｜AI × 產品】",
    "news.n3.body": "「AI 輔助數位產品開發」到底在學什麼？",
    "news.n3.p1": "「AI 輔助數位產品開發」到底在學什麼？",
    "news.n3.p2": "從一個商業想法出發，AI 如何協助開發數位產品？商管學生又能從這門課得到哪些能力？",
    "news.n3.p3": "只要 90 秒，教授介紹這門課，帶你快速認識 AI × 產品的核心概念。",
    "news.n3.p4": "90 秒，聽聽教授怎麼說。",
    "news.n3.tags": "#FJCU_imMBA #dual_master_degree",
    "news.n4.title": "【新課焦點｜國際企業資料分析】",
    "news.n4.body": "上週我們談了 AI × 產品。本週來看 AI × 資料，以及資料如何支持更好的商業決策。",
    "news.n4.p1": "上週我們談了 AI × 產品。本週來看 AI × 資料，以及資料如何支持更好的商業決策。",
    "news.n4.p2": "在 AI 時代，辨識問題、掌握趨勢，並依資料做出決策，正成為商管專業人士的關鍵能力。",
    "news.n4.p3":
      "本學年輔大 imMBA 新開「國際企業資料分析」，透過真實商業應用教授資料視覺化、統計分析與機器學習。",
    "news.n4.p4":
      "從 AI × 產品到 AI × 資料，兩門新課從不同角度回應 AI 帶來的改變，幫助商管學生培養解決問題與做出更好決策的能力。",
    "news.n4.tags": "#FJCU_imMBA #dual_master_degree",
    "news.n5.title": "【夥伴聚焦｜IQS 管理學院】",
    "news.n5.body": "提到西班牙，人們常想到巴塞隆納的建築與活力文化。",
    "news.n5.p1":
      "提到西班牙，人們常想到巴塞隆納的建築與活力文化。對商管學生而言，這裡也是歐洲創新與創業的重要樞紐之一。",
    "news.n5.p2":
      "位於巴塞隆納的 IQS School of Management 隸屬 IQS，是 Ramon Llull 大學創始成員之一，也是輔大 imMBA 雙聯夥伴。創立於 1905 年，IQS School of Management 具 AACSB 認證，以整合管理、科技與創新著稱。",
    "news.n5.p3":
      "透過 imMBA 1+1 雙聯碩士，學生可於第二年到 IQS 就讀，選擇工業企業管理碩士或數位環境國際行銷碩士。符合兩校畢業規定後，可取得兩校碩士學位。依合作協議，imMBA 雙聯生於 IQS 就讀可享學費優惠。",
    "news.n5.p4": "這項合作讓學生體驗歐洲高等教育、拓展全球視野，並在日益連結的世界中成長。",
    "news.n5.tags": "#FJCU_imMBA #Dual_Master_Degree",
    "news.n6.title": "【跨越太平洋，再添全球夥伴】",
    "news.n6.body": "近日，輔大管理學院師長拜訪姐妹校加州州立理工大學波莫納分校（CPP）。",
    "news.n6.p1":
      "近日，輔大管理學院師長拜訪姐妹校加州州立理工大學波莫納分校（CPP）。雙方討論多項合作，包括國際經營管理碩士（imMBA）1+1 雙聯碩士的可能。",
    "news.n6.p2":
      "CPP 隸屬加州州立大學系統。其商管學院在商學與會計皆具 AACSB 認證，以「做中學」著稱。研究與實務中心涵蓋顧客洞察、創業、數位創新、商業分析與網路風險等領域。",
    "news.n6.p3": "雙方將持續就課程對接、學分採計與學程規劃進行討論，為 imMBA 學生創造更多國際學習與雙聯機會。",
    "news.n6.tags": "#FJCU_imMBA #Dual_Master_Degree",
    "article.back": "返回亮點",
    "article.read": "查看詳情",
    "article.announcement": "公告",
    "news.source": "官方消息",
    "news.sourceLine": "官方消息",
    "admin.kicker": "公告",
    "admin.faculty": "師資",
    "admin.facultyLede": "新增、編輯、排序與上傳教師照片。連上 Supabase 後會同步到前台師資頁。",
    "admin.facultySeed": "從來地原型匯入",
    "admin.facultyNew": "新增教師",
    "admin.facultyConnect": "儲存連線",
    "admin.title": "公告後台",
    "admin.lede": "一次新增、預覽、更新或刪除一筆雙語公告。儲存或刪除時，中文與英文會一併處理。",
    "admin.new": "新增公告",
    "admin.restore": "還原預設",
    "admin.site": "查看前台",
    "admin.save": "儲存雙語版本",
    "admin.translateEn": "自動翻譯成英文",
    "admin.translateZh": "自動翻譯成中文",
    "admin.logout": "登出",
    "admin.photos": "照片",
    "admin.photosHint": "可附加 JPEG、PNG 或 WebP。照片會隨中英文公告一併顯示。",
    "admin.removePhoto": "移除",
    "admin.openPost": "查看此則公告",
    "admin.dash": "儀表板",
    "dash.kicker": "後台",
    "dash.title": "流量儀表板",
    "dash.lede": "即時訪客、瀏覽量與點擊最多的連結。紀錄存在這個瀏覽器。",
    "dash.range": "期間",
    "dash.today": "今天",
    "dash.week": "近 7 天",
    "dash.all": "全部紀錄",
    "dash.clear": "清除資料",
    "dash.live": "目前在線",
    "dash.views": "瀏覽次數",
    "dash.visitors": "訪客",
    "dash.clicks": "點擊",
    "dash.chart": "本週瀏覽",
    "dash.pages": "瀏覽最多的頁面",
    "dash.page": "頁面",
    "dash.targets": "點擊最多",
    "dash.link": "連結",
    "dash.people": "點擊最多的訪客",
    "dash.person": "訪客",
    "dash.last": "最後出現",
    "dash.recent": "即時動態",
    "office.area": "區塊",
    "office.web": "網站分析",
    "office.analytics": "分析",
    "office.people": "訪客",
    "office.overview": "總覽",
    "office.source": "流量來源",
    "office.os": "作業系統",
    "office.langw": "語言",
    "dash.visits": "造訪",
    "office.map": "國家地圖",
    "office.content": "內容總覽",
    "office.time": "停留時間",
    "office.bounce": "跳出率",
    "office.exit": "離開率",
    "office.search": "搜尋引擎",
    "office.countries": "國家列表",
    "office.total": "合計",
    "office.avg": "平均",
    "office.tznote": "依時區與語系推估",
    "office.logged": "每次瀏覽、點擊與在線訊號都會記錄",
    "office.clicks": "點擊",
    "office.devices": "裝置類型",
    "office.returning": "回訪訪客",
    "office.events": "已記錄事件",
    "office.referrers": "推薦來源",
    "office.latest": "最新",
    "admin.listLede": "在此編輯或刪除雙語公告。新增請用左側的「新增公告」。",
    "official.page": "官方頁面",
    "official.rail": "官方頁面",
    "official.ext": "外部",
    "official.zh": "中文官方網站",
    "official.collegeEn": "管理學院英文網",
    "official.local": "本國生招生",
    "official.iscProc": "交換作業",
    "login.title": "登入",
    "login.lede": "登入後即可管理公告。點一下校徽會回到首頁。",
    "login.staffLede": "繼續進入後台。",
    "login.sellerLede": "繼續刊登教材。",
    "login.marketHint": "在市集上架？",
    "login.marketLink": "賣方登入",
    "login.email": "電子郵件",
    "login.forgot": "忘記密碼？",
    "login.back": "回到登入",
    "login.registerTitle": "建立帳號",
    "login.resetTitle": "忘記密碼",
    "login.newPassTitle": "新密碼",
    "login.sendReset": "寄送重設連結",
    "login.savePass": "儲存密碼",
    "login.registerLede": "建立職員帳號，需經 super admin 核准。",
    "login.resetLede": "輸入電子郵件，我們會寄重設連結。",
    "login.newPassLede": "請設定新密碼，然後繼續。",
    "login.user": "電子郵件或本機管理員帳號",
    "login.pass": "密碼",
    "login.submit": "登入",
    "login.keep": "保持登入",
    "login.error": "電子郵件或密碼不正確。",
    "login.register": "註冊",
    "login.reset": "重設密碼",
    "login.verify": "電子郵件驗證",
    "login.intent": "帳號類型",
    "login.staff": "職員（後台）",
    "login.market": "市集賣方",
    "login.name": "顯示名稱",
    "login.checkEmail": "請到信箱完成驗證，再回來登入。",
    "pending.title": "等待核准",
    "pending.lede": "帳號已註冊。如需請先驗證電子郵件，再等候 super admin 核准後台權限。",
    "pending.switch": "切換帳號",
    "pending.seller": "我其實要在市集刊登",
    "office.tabFaculty": "師資",
    "office.tabAlumni": "校友",
    "office.tabAudit": "稽核",
    "audit.lede": "僅可附加的後台稽核紀錄。管理員只能看到 USER 的操作。超級管理員可看全部角色，並還原快照。",
    "audit.module": "模組",
    "audit.moduleAll": "全部模組",
    "audit.refresh": "重新整理",
    "audit.verify": "驗證雜湊鏈",
    "audit.when": "時間",
    "audit.actor": "操作者",
    "audit.action": "動作",
    "audit.entity": "對象",
    "audit.status": "狀態",
    "audit.rollback": "時間點還原",
    "audit.rollbackLede": "僅超級管理員。先預覽受影響的資料，再一次還原。",
    "audit.target": "還原到",
    "audit.preview": "預覽",
    "audit.execute": "執行還原",
    "audit.snapshots": "快照",
    "alumni.lede": "共用校友資料庫。可新增、編輯、刪除、搜尋、篩選、匯入 CSV，並匯出目前篩選結果。新增、更新、刪除都會寫入稽核紀錄。",
    "alumni.new": "新增校友",
    "alumni.template": "CSV 範本",
    "alumni.import": "匯入 CSV",
    "alumni.export": "匯出篩選結果",
    "alumni.search": "搜尋",
    "alumni.searchHint": "姓名、公司、Email…",
    "alumni.degree": "學制",
    "alumni.year": "畢業年",
    "alumni.dept": "系所",
    "alumni.company": "公司",
    "alumni.columns": "顯示欄位",
    "alumni.save": "儲存校友",
    "alumni.audit": "操作紀錄",
    "office.tabListings": "刊登",
    "office.tabNews": "公告",
    "office.tabCompose": "撰寫",
    "admin.listings": "刊登",
    "listings.lede": "同學刊登會出現在這裡。前台市集上的課程教材是學程展示。可開啟商品確認內容，或從市集移除。",
    "listings.thTitle": "標題",
    "listings.thSeller": "賣方",
    "listings.thPrice": "價格",
    "listings.thKind": "類型",
    "access.thEmail": "電子郵件",
    "access.thRole": "角色",
    "access.thType": "帳號",
    "admin.facultyAdvanced": "進階連線",
    "access.kicker": "權限",
    "access.thPerms": "權限",
    "access.lede": "在列上開啟「權限」，勾選即可加上或拿掉角色。僅超級管理員。",
    "nav.admin": "公告",
    "article.event": "活動",
    "downloads.title": "官方表件與簡章。",
    "downloads.d1": "學位國際學生招生簡章",
    "downloads.d2": "畢業規定（imMBA）",
    "downloads.d3": "課程架構與目錄（官方網站）",
    "band.title": "準備好在台北攻讀全英語 MBA 了嗎？",
    "band.body": "2027 春季國際生申請至 10 月 14 日截止。請線上申請，如需協助可來信辦公室。",
    "footer.program": "國際經營管理碩士學位學程",
    "footer.university": "輔仁大學",
    "footer.visit": "參觀與聯絡",
    "footer.office": "辦公室 LM208-1",
    "footer.address": "24205 新北市新莊區中正路 510 號",
    "footer.tel": "電話：",
    "footer.ms": "張秘書",
    "footer.email": "信箱：",
    "footer.explore": "探索",
    "footer.connect": "連結",
    "footer.fb": "管理學院 Facebook",
    "footer.li": "輔仁大學 LinkedIn",
    "footer.home": "大學首頁",
    "footer.isc": "國際學生中心",
    "footer.copy": "輔仁大學 版權所有。",
    "footer.privacy": "隱私權",
    "footer.legal": "法律聲明",
    "ui.top": "回到頂端",
    "langButton": "English",
    "langAria": "切換為英文",
  },
};

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const yearNodes = document.querySelectorAll("[data-year]");
const collapseButtons = document.querySelectorAll("[data-collapse-nav]");
const langButtons = document.querySelectorAll("[data-lang-toggle]");
const metaDescription = document.querySelector('meta[name="description"]');

let lang = localStorage.getItem("immba-lang") === "zh" ? "zh" : "en";

yearNodes.forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

const dict = () => translations[lang];

const applyLang = () => {
  const d = dict();
  document.documentElement.lang = lang === "zh" ? "zh-TW" : "en";
  document.body.dataset.lang = lang;
  const titleKey = document.body.getAttribute("data-title-key");
  document.title = titleKey && d[titleKey] ? `${d[titleKey]}: ${d["brand.short"]}` : d["meta.title"];
  const descKey = document.body.getAttribute("data-desc-key");
  if (metaDescription) {
    metaDescription.setAttribute("content", (descKey && d[descKey]) || d["meta.description"]);
  }

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    const value = d[key];
    if (!value) return;
    if (node.children.length) return;
    node.textContent = value;
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((node) => {
    node.getAttribute("data-i18n-attr").split(",").forEach((pair) => {
      const [attr, key] = pair.split(":").map((part) => part.trim());
      if (attr && key && d[key]) node.setAttribute(attr, d[key]);
    });
  });

  langButtons.forEach((btn) => {
    btn.textContent = d.langButton;
    btn.setAttribute("aria-label", d.langAria);
  });

  syncCollapseLabel();
  renderNewsCards(lang, {
    view: d["article.read"],
    source: d["news.source"],
    kicker: d["article.announcement"],
  });
  renderNewsArticle(lang);
  applyOfficialLinks(d);
  refreshGalleryCaptions();
  document.querySelectorAll("select.menu-drop-source").forEach(refreshSelectDrop);
  window.dispatchEvent(new Event("resize"));
  window.dispatchEvent(new CustomEvent("immba:lang"));
};

window.addEventListener("storage", (event) => {
  if (event.key === "immba-admin-news-v1" || event.key === "immba-lang") {
    lang = localStorage.getItem("immba-lang") === "zh" ? "zh" : "en";
    applyLang();
  }
});

const syncCollapseLabel = () => {
  const collapsed = document.body.classList.contains("nav-collapsed");
  const label = collapsed ? dict()["notice.expand"] : dict()["notice.collapse"];
  collapseButtons.forEach((btn) => {
    btn.setAttribute("aria-expanded", String(!collapsed));
    btn.setAttribute("aria-label", label);
    const sr = btn.querySelector(".sr-only");
    if (sr) sr.textContent = label;
    else btn.textContent = label;
  });
};

const enhanceFooter = () => {
  const footer = document.querySelector("footer.site-footer");
  if (!footer || footer.classList.contains("footer-hec")) return;
  footer.classList.add("footer-hec");
  const nested = /\/(announcements|events)\//.test(location.pathname);
  const p = nested ? "../" : "";
  const visual = document.createElement("div");
  visual.className = "footer-visual";
  visual.innerHTML = `
    <img src="${p}images/campus-glass.jpg" alt="" />
    <a class="footer-mark" href="${p}index.html">
      <img src="${p}images/logo.png" alt="" width="96" height="96" />
      <span>
        <strong data-i18n="brand.short">imMBA</strong>
        <small data-i18n="footer.university">Fu Jen Catholic University</small>
      </span>
    </a>
  `;
  const body = document.createElement("div");
  body.className = "footer-body";
  while (footer.firstChild) body.appendChild(footer.firstChild);
  const badges = document.createElement("div");
  badges.className = "footer-badges";
  badges.innerHTML = `
    <a href="https://www.aacsb.edu/" target="_blank" rel="noopener noreferrer">
      <img src="${p}images/aacsb.png" alt="AACSB Accredited" width="148" height="40" data-i18n-attr="alt:aacsb.alt" />
    </a>
  `;
  body.appendChild(badges);
  footer.append(visual, body);
};

initLogoGate();
initLoginForm();
initPendingPage();
guardAdminPage();
initAnalytics();
initAdminDash();
initMarketAccount();
enhanceFooter();
initPageHero();
initSelectDrops();
applyLang();
hydrateNews().finally(() => applyLang());

const setScrolled = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
};

setScrolled();
window.addEventListener("scroll", setScrolled, { passive: true });

const closeMenu = () => {
  if (!menuToggle || !mobileNav) return;
  mobileNav.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
};

menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  mobileNav.hidden = open;
});

mobileNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    const href = link.getAttribute("href") || "";
    if (href.startsWith("#")) closeMenu();
  });
});

collapseButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    document.body.classList.toggle("nav-collapsed");
    closeMenu();
    syncCollapseLabel();
  });
});

langButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    lang = lang === "en" ? "zh" : "en";
    localStorage.setItem("immba-lang", lang);
    applyLang();
  });
});

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const heroMedia = document.querySelector(".hero-media");
const heroVideo = document.querySelector("[data-hero-video]");
if (heroMedia && heroVideo && !prefersReducedMotion) {
  const showVideo = () => heroMedia.classList.add("is-video");
  const tryPlay = () => {
    const attempt = heroVideo.play();
    if (attempt && typeof attempt.then === "function") {
      attempt.then(showVideo).catch(() => {});
    } else if (!heroVideo.paused) showVideo();
  };
  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  heroVideo.playsInline = true;
  heroVideo.addEventListener("loadeddata", () => {
    showVideo();
    tryPlay();
  });
  heroVideo.addEventListener("playing", showVideo);
  tryPlay();
  document.addEventListener("touchstart", tryPlay, { once: true, passive: true });
  document.addEventListener("click", tryPlay, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tryPlay();
  });
}

const accordion = document.querySelector("[data-accordion]");
if (accordion) {
  const panels = [...accordion.querySelectorAll(":scope > details")];
  const accordionMs = 420;
  const accordionEase = "cubic-bezier(0.39, 0.575, 0.565, 1)";
  const heightTransition = `height ${accordionMs}ms ${accordionEase}, opacity ${accordionMs - 80}ms ease`;

  const panelBody = (panel) => panel.querySelector(".details-body");

  const clearBodyMotion = (body) => {
    body.style.height = "";
    body.style.opacity = "";
    body.style.transition = "";
  };

  const expandPanel = (panel) => {
    const body = panelBody(panel);
    if (!body || panel.classList.contains("is-expanded")) return;
    panel.open = true;
    body.inert = false;
    if (prefersReducedMotion) {
      panel.classList.add("is-expanded");
      clearBodyMotion(body);
      return;
    }
    body.style.transition = "none";
    body.style.height = "0px";
    body.style.opacity = "0";
    panel.classList.add("is-expanded");
    const end = body.scrollHeight;
    void body.offsetHeight;
    body.style.transition = heightTransition;
    body.style.height = `${end}px`;
    body.style.opacity = "1";
    const done = (event) => {
      if (event && event.propertyName && event.propertyName !== "height") return;
      body.removeEventListener("transitionend", done);
      if (panel.classList.contains("is-expanded")) clearBodyMotion(body);
    };
    body.addEventListener("transitionend", done);
    window.setTimeout(() => done(), accordionMs + 40);
  };

  const collapsePanel = (panel) => {
    const body = panelBody(panel);
    if (!body || (!panel.classList.contains("is-expanded") && !panel.open)) return;
    if (prefersReducedMotion) {
      panel.classList.remove("is-expanded");
      panel.open = false;
      body.inert = true;
      body.style.height = "0px";
      body.style.opacity = "0";
      body.style.transition = "";
      return;
    }
    const start = body.getBoundingClientRect().height || body.scrollHeight;
    body.style.transition = "none";
    body.style.height = `${start}px`;
    body.style.opacity = "1";
    void body.offsetHeight;
    panel.classList.remove("is-expanded");
    body.style.transition = heightTransition;
    body.style.height = "0px";
    body.style.opacity = "0";
    const done = (event) => {
      if (event && event.propertyName && event.propertyName !== "height") return;
      body.removeEventListener("transitionend", done);
      if (panel.classList.contains("is-expanded")) return;
      panel.open = false;
      body.inert = true;
      body.style.transition = "";
      body.style.height = "0px";
      body.style.opacity = "0";
    };
    body.addEventListener("transitionend", done);
    window.setTimeout(() => done(), accordionMs + 40);
  };

  panels.forEach((panel) => {
    const body = panelBody(panel);
    if (panel.open || panel.classList.contains("is-expanded")) {
      panel.open = true;
      panel.classList.add("is-expanded");
      if (body) body.inert = false;
    } else if (body) {
      body.inert = true;
    }

    panel.querySelector("summary")?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        const opening = !panel.classList.contains("is-expanded");
        if (opening) {
          panels.forEach((other) => {
            if (other !== panel) collapsePanel(other);
          });
          expandPanel(panel);
        } else {
          collapsePanel(panel);
        }
      },
      true
    );
  });
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const id = anchor.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    event.preventDefault();
    const offset = header ? header.offsetHeight + 8 : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  });
});

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

const formatCount = (el, value) => {
  const suffix = el.dataset.suffix || "";
  el.textContent = `${Math.round(value)}${suffix}`;
};

const animateCount = (el) => {
  if (el.dataset.counted === "1") return;
  el.dataset.counted = "1";
  const target = Number(el.dataset.count);
  const duration = Number(el.dataset.duration) || 1200;
  if (!Number.isFinite(target)) return;
  if (prefersReducedMotion) {
    formatCount(el, target);
    return;
  }
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    formatCount(el, target * easeOutCubic(progress));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

initGallery();
initFacultyDirectory();
initMarketplace();
initListing();

const counters = document.querySelectorAll(".stat-count");
if (counters.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.45, rootMargin: "0px 0px -8% 0px" }
  );
  counters.forEach((el) => observer.observe(el));
}
