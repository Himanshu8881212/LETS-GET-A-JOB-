'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  FileText,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Target,
  Layout,
  Type,
  Ruler,
  Hash,
  Search,
  ListChecks,
} from 'lucide-react'

type Tab = 'resume' | 'cover'

interface GuidelinesPageProps {
  onBack: () => void
}

export default function GuidelinesPage({ onBack }: GuidelinesPageProps) {
  const [tab, setTab] = useState<Tab>('resume')

  return (
    <div className="flex-1 bg-brand-mist/20 flex flex-col h-full overflow-hidden">
      <div className="h-[72px] px-6 border-b border-brand-border flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-steel hover:text-brand-ink transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <h2 className="font-display font-bold text-brand-ink leading-tight">Writing Guidelines</h2>
            <p className="text-[10px] uppercase tracking-wider text-brand-steel font-medium">
              Craft resumes and cover letters that get shortlisted
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-full border border-brand-border bg-white p-1 shadow-sm">
          <button
            onClick={() => setTab('resume')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === 'resume' ? 'bg-brand-ink text-white' : 'text-brand-steel hover:text-brand-ink'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Resume
          </button>
          <button
            onClick={() => setTab('cover')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === 'cover' ? 'bg-brand-ink text-white' : 'text-brand-steel hover:text-brand-ink'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Cover Letter
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          {tab === 'resume' ? <ResumeGuidelines /> : <CoverLetterGuidelines />}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-brand-border bg-white p-6 shadow-soft">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-mist text-brand-ink">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold font-display text-brand-ink">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-brand-steel">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-brand-slate">{children}</div>
    </section>
  )
}

function DoDont({
  dos,
  donts,
}: {
  dos: string[]
  donts: string[]
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="flex items-center gap-2 mb-3 text-emerald-800 font-semibold text-sm">
          <CheckCircle2 className="h-4 w-4" />
          Do
        </div>
        <ul className="space-y-1.5 text-sm text-emerald-900/80">
          {dos.map((d, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-emerald-600 mt-0.5">✓</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
        <div className="flex items-center gap-2 mb-3 text-red-800 font-semibold text-sm">
          <AlertTriangle className="h-4 w-4" />
          Avoid
        </div>
        <ul className="space-y-1.5 text-sm text-red-900/80">
          {donts.map((d, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-red-500 mt-0.5">✗</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Example({
  weak,
  strong,
  note,
}: {
  weak: string
  strong: string
  note?: string
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-red-200 bg-red-50/40 px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-red-700 mb-1">Weak</p>
        <p className="text-sm text-brand-slate">{weak}</p>
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 mb-1">Strong</p>
        <p className="text-sm text-brand-slate">{strong}</p>
      </div>
      {note && <p className="text-xs text-brand-steel italic pl-1">{note}</p>}
    </div>
  )
}

function Pills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-full border border-brand-border bg-brand-mist px-3 py-1 text-xs font-medium text-brand-slate"
        >
          {t}
        </span>
      ))}
    </div>
  )
}

function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-mist/60 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-ink mb-1">{title}</p>
      <div className="text-sm text-brand-slate">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Resume
// ─────────────────────────────────────────────────────────────────────────

function ResumeGuidelines() {
  return (
    <>
      <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-ink to-brand-slate p-6 text-white shadow-soft">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">Resume Playbook</p>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold font-display">
          A resume has 7.4 seconds of a recruiter's attention.
        </h1>
        <p className="mt-3 text-sm text-white/80 max-w-3xl">
          Make every line earn its place. The goal is not to list everything you've done — it's
          to prove, with specific evidence, that you can do the job you're applying for.
        </p>
      </div>

      <Section
        icon={<Target className="h-5 w-5" />}
        title="The one rule that beats every other rule"
        subtitle="Tailor the resume to the specific job."
      >
        <p>
          A generic resume sent to twenty jobs will lose to a tailored resume sent to one. Read
          the job description line by line. Mirror the language it uses (where truthful) — if it
          says "stakeholder management," don't write "worked with teams." If it lists "Python,
          SQL, Airflow," those exact terms should appear where they apply to your experience.
        </p>
        <Callout title="Rule of thumb">
          If someone deleted the top third of your resume, they should still be able to tell
          which role you're targeting within 10 seconds.
        </Callout>
      </Section>

      <Section
        icon={<Layout className="h-5 w-5" />}
        title="Structure & section order"
        subtitle="Reverse-chronological is the ATS-safe default."
      >
        <p>
          Unless you have a strong reason to deviate (career change, recent graduate with
          projects stronger than jobs), use this order:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            <strong>Header</strong> — Name, one location line, phone, email, LinkedIn, GitHub/portfolio
          </li>
          <li>
            <strong>Summary</strong> (optional, 2–3 lines) — Only if it says something specific
          </li>
          <li>
            <strong>Experience</strong> — Most recent first, reverse-chronological
          </li>
          <li>
            <strong>Projects</strong> — For engineers, researchers, or early-career
          </li>
          <li>
            <strong>Education</strong> — Above experience only if you're &lt; 2 years out
          </li>
          <li>
            <strong>Skills</strong> — Grouped by type (languages, tools, frameworks)
          </li>
          <li>
            <strong>Certifications / Languages / Awards</strong> — If relevant
          </li>
        </ol>
        <Callout title="Length">
          One page if you have under 10 years of experience. Two pages is acceptable for
          senior/principal roles — never three. Academic CVs are the only exception.
        </Callout>
      </Section>

      <Section
        icon={<Type className="h-5 w-5" />}
        title="Fonts, sizes & margins"
        subtitle="Boring is good. ATS parsers reward boring."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-brand-border p-4">
            <p className="font-semibold text-brand-ink mb-2 text-sm">Safe font stack</p>
            <Pills items={['Arial', 'Calibri', 'Helvetica', 'Georgia', 'Garamond', 'Times New Roman']} />
            <p className="mt-3 text-xs text-brand-steel">
              Sans-serif for modern tech roles, serif for legal/finance/academic.
            </p>
          </div>
          <div className="rounded-lg border border-brand-border p-4">
            <p className="font-semibold text-brand-ink mb-2 text-sm">Sizes</p>
            <ul className="text-sm space-y-1">
              <li>Name: <strong>18–24pt</strong></li>
              <li>Section headings: <strong>12–14pt</strong></li>
              <li>Body text: <strong>10–11pt</strong></li>
              <li>Line height: <strong>1.15–1.3</strong></li>
              <li>Margins: <strong>0.5″–1″</strong> (never smaller)</li>
            </ul>
          </div>
        </div>
        <DoDont
          dos={[
            'Plain black text on white background',
            'Single-column layout (ATS parses top-to-bottom)',
            'Standard section labels: "Experience", "Education", "Skills"',
            'PDF export — preserves formatting and is universally parseable',
          ]}
          donts={[
            'Tables, text boxes, headers/footers — ATS may miss content inside them',
            'Graphics, icons, photos, progress bars, star ratings',
            'Multiple columns or sidebars (content may parse out of order)',
            'Cute fonts (Comic Sans, Papyrus), colored text, emojis',
          ]}
        />
      </Section>

      <Section
        icon={<Hash className="h-5 w-5" />}
        title="The XYZ bullet formula"
        subtitle="Every bullet is a miniature case study: what + how + result."
      >
        <p>
          Google's recruiting team popularized the XYZ format:{' '}
          <strong>"Accomplished [X] as measured by [Y] by doing [Z]."</strong>
        </p>
        <Example
          weak="Responsible for improving the checkout flow."
          strong="Redesigned checkout flow (X) reducing cart-abandonment by 23% (Y) through single-page form and address auto-complete (Z)."
          note="Start with a strong verb, quantify the impact, describe how."
        />
        <Example
          weak="Helped migrate the data pipeline to a new system."
          strong="Led migration of 40+ ETL pipelines from Airflow to Dagster, cutting run-time by 58% and on-call pages by 3× while unblocking 6 downstream analytics teams."
        />
        <Callout title="Hard rules this app enforces">
          Every bullet must contain a number or measurable result. Projects get exactly 3 bullets.
          Work experiences get a maximum of 5. If you can't quantify an achievement, ask: <em>how
          many? how much? how often? compared to what?</em>
        </Callout>
      </Section>

      <Section
        icon={<Sparkles className="h-5 w-5" />}
        title="Strong verbs beat weak verbs"
        subtitle="Open every bullet with an action verb. Never start with 'Responsible for'."
      >
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-steel mb-2">Led / Built</p>
            <Pills items={['Architected', 'Launched', 'Spearheaded', 'Founded', 'Delivered', 'Shipped']} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-steel mb-2">Improved</p>
            <Pills items={['Reduced', 'Accelerated', 'Streamlined', 'Optimized', 'Cut', 'Doubled']} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-brand-steel mb-2">Influenced</p>
            <Pills items={['Drove', 'Negotiated', 'Aligned', 'Influenced', 'Mentored', 'Partnered']} />
          </div>
        </div>
        <Callout title="Weasel words to strike">
          <p>
            "Responsible for", "helped", "worked on", "assisted", "participated in", "contributed
            to", "involved in", "exposure to", "familiar with".
          </p>
        </Callout>
      </Section>

      <Section
        icon={<Search className="h-5 w-5" />}
        title="Keywords & ATS alignment"
        subtitle="75% of resumes never reach a human. Most don't because of keyword mismatch."
      >
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            Paste the job description into a word cloud or read it carefully. Identify
            <strong> hard skills</strong> (Python, SOX, Kubernetes, FDA 510(k), Salesforce) and{' '}
            <strong>soft skills</strong> (cross-functional, stakeholder management).
          </li>
          <li>
            Use the <strong>exact phrase</strong> the posting uses, at least once. If it says
            "Amazon Web Services," don't just write "AWS."
          </li>
          <li>
            Embed keywords inside bullets — not in an invisible white-text dump. Modern ATS
            (Workday, Greenhouse, Lever) flag keyword-stuffing.
          </li>
          <li>
            Match <strong>years of experience</strong> claims to the posting. If it asks for 5+
            years in Python, your timeline should support it.
          </li>
        </ol>
        <Callout title="Use this app's ATS Evaluator">
          Upload your tailored resume + the JD and run an evaluation. The 10-metric rubric flags
          missing keywords, weak quantification, and knockout risks before you hit submit.
        </Callout>
      </Section>

      <Section
        icon={<Ruler className="h-5 w-5" />}
        title="Section-by-section playbook"
        subtitle="What to include — and what to cut — in every section."
      >
        <div className="space-y-5">
          <div>
            <p className="font-semibold text-brand-ink mb-1.5">Header</p>
            <p className="mb-2">
              <strong>Include:</strong> Full name, city + state/country (no full street address),
              one phone, one email (firstname.lastname@, not Gmail jokes from 2008), LinkedIn
              vanity URL, GitHub/portfolio if relevant.
            </p>
            <p><strong>Cut:</strong> date of birth, photo, marital status, nationality (unless required by country norms — Germany, Japan, etc.).</p>
          </div>

          <div>
            <p className="font-semibold text-brand-ink mb-1.5">Summary</p>
            <p>
              Only write one if it <em>says</em> something. A 2–3 line summary should state:
              your role + years + two specialties + one differentiator. Skip it if it would read
              like "hardworking professional seeking opportunities."
            </p>
            <Example
              weak="Motivated software engineer looking for opportunities to grow at a forward-thinking company."
              strong="Backend engineer with 6 years scaling payment infrastructure at fintech startups. Shipped Stripe→Adyen migration saving $1.2M/yr. Looking to deepen work on settlement and reconciliation systems."
            />
          </div>

          <div>
            <p className="font-semibold text-brand-ink mb-1.5">Experience</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Header line: <strong>Company · Title · Location · Dates (MMM YYYY – MMM YYYY)</strong></li>
              <li>One short context line if the company/team isn't well known.</li>
              <li>3–5 bullets per role, heaviest for most recent/most relevant.</li>
              <li>Promoted at the same company? List each title separately with its own dates.</li>
              <li>Gap years? Be honest — a short line ("Caregiver, 2022–2023") is better than a suspicious hole.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-brand-ink mb-1.5">Projects</p>
            <p>
              Essential for engineers, designers, and early-career candidates. Each project: <strong>title,
              one-line description, stack tags, 3 bullets, live/repo link</strong>. Treat projects like
              jobs — quantify impact (stars, users, latency, adoption).
            </p>
          </div>

          <div>
            <p className="font-semibold text-brand-ink mb-1.5">Education</p>
            <p>
              Degree, institution, graduation year. Include GPA only if ≥3.5/4.0 and you're
              within 3 years of graduation. Add coursework only for new grads applying to their
              first role.
            </p>
          </div>

          <div>
            <p className="font-semibold text-brand-ink mb-1.5">Skills</p>
            <p>
              Group by category (<em>Languages, Frameworks, Tools, Cloud, Data</em>). Don't rate
              yourself on a 1–10 scale — ATS ignores it and recruiters find it juvenile. List
              only skills you'd defend in an interview.
            </p>
          </div>
        </div>
      </Section>

      <Section
        icon={<AlertTriangle className="h-5 w-5" />}
        title="The 12 most common resume killers"
        subtitle="Any one of these can send an otherwise strong resume to the reject pile."
      >
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Typos and grammar errors — read every line aloud, then paste into Grammarly.</li>
          <li>Inconsistent date/formatting (e.g., "Jan 2020" vs "01/2020" in the same doc).</li>
          <li>Bullets that describe duties instead of outcomes.</li>
          <li>No numbers anywhere — at least 50% of bullets should quantify something.</li>
          <li>Jargon the hiring manager won't know (internal tool names, acronyms).</li>
          <li>Using a photo or Canva-style template with sidebars/graphics.</li>
          <li>Name that doesn't match your LinkedIn or the application form.</li>
          <li>Stale contact info or a non-clickable portfolio link in the PDF.</li>
          <li>Pronouns in bullets ("I built..."). Drop the "I", lead with the verb.</li>
          <li>Claiming ownership of team wins ("Launched our $50M product" — what did <em>you</em> do?).</li>
          <li>Five-year-old skills still listed as a headline (jQuery, Flash, legacy Perl).</li>
          <li>Different fonts/sizes mixed inconsistently — the parser will choke.</li>
        </ol>
      </Section>

      <Section
        icon={<ListChecks className="h-5 w-5" />}
        title="Pre-submit checklist"
        subtitle="Run through this list before you attach the PDF."
      >
        <Checklist
          items={[
            'File named: Firstname_Lastname_Resume.pdf (include company name if tailoring)',
            'PDF exported from your source — not a screenshot or scan',
            'No information older than 10–15 years (unless a capstone credential)',
            'Every bullet starts with a strong action verb',
            'At least 50% of bullets contain a number',
            'Top 5 keywords from the JD appear in context',
            'Phone number is correct; email is professional',
            'LinkedIn URL opens to your current profile',
            'Dates line up — no unexplained gaps',
            'Read it top-to-bottom out loud. Every line still earns its space.',
            'Hand it to a friend in the industry for a 3-minute review',
          ]}
        />
      </Section>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Cover Letter
// ─────────────────────────────────────────────────────────────────────────

function CoverLetterGuidelines() {
  return (
    <>
      <div className="rounded-2xl border border-brand-border bg-gradient-to-br from-brand-ink to-brand-slate p-6 text-white shadow-soft">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">Cover Letter Playbook</p>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold font-display">
          A cover letter is not a resume in paragraph form.
        </h1>
        <p className="mt-3 text-sm text-white/80 max-w-3xl">
          It's the answer to one question: <em>why should this company, with this role, hire
          you specifically?</em> If your letter could be sent to any of 10 companies by changing
          two words, start over.
        </p>
      </div>

      <Section
        icon={<Target className="h-5 w-5" />}
        title="The three questions every letter must answer"
        subtitle="Fail any one of these and the letter goes in the trash."
      >
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong>Why this company?</strong> — Reference something specific they do/have
            done/are building. Not their mission statement, not their Wikipedia page. Show you
            read a blog post, a product release, a talk, an investor letter.
          </li>
          <li>
            <strong>Why this role?</strong> — Not "I'm passionate about software." <em>This</em>{' '}
            role exists to solve a specific problem. Prove you understand what the problem is.
          </li>
          <li>
            <strong>Why you?</strong> — One non-obvious combination of skills, experiences, or
            results that this role specifically needs. Expand on something the resume only hints
            at.
          </li>
        </ol>
      </Section>

      <Section
        icon={<Layout className="h-5 w-5" />}
        title="Structure & length"
        subtitle="250–400 words. Three short paragraphs. No exceptions."
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-brand-border p-4">
            <p className="font-semibold text-brand-ink mb-1">Paragraph 1 — The hook (2–4 sentences)</p>
            <p className="text-sm">
              State the role, name one specific thing that drew you to <em>this</em> company
              (not their mission), and foreshadow the one strength you'll prove below. Do not
              open with "I am writing to apply for..." or "My name is..."
            </p>
          </div>
          <div className="rounded-lg border border-brand-border p-4">
            <p className="font-semibold text-brand-ink mb-1">Paragraph 2 — The evidence (4–6 sentences)</p>
            <p className="text-sm">
              One story, with numbers. Tell a mini case study that maps directly to what this
              role will actually do. Pick the single most relevant experience — don't try to
              re-summarize your whole resume.
            </p>
          </div>
          <div className="rounded-lg border border-brand-border p-4">
            <p className="font-semibold text-brand-ink mb-1">Paragraph 3 — The close (2–3 sentences)</p>
            <p className="text-sm">
              Briefly name one more dimension you'd bring, express genuine interest in the team's
              current work, and state you'd welcome a conversation. Sign off with "Best regards"
              or "Sincerely" — not "Cheers" or "Thanks!"
            </p>
          </div>
        </div>
      </Section>

      <Section
        icon={<Sparkles className="h-5 w-5" />}
        title="Openings — what works, what kills"
        subtitle="The first sentence decides whether the rest gets read."
      >
        <Callout title="Banned openers (this app will reject them)">
          <ul className="space-y-1">
            <li>"I am writing to apply for the [X] position at [Company]..."</li>
            <li>"My name is [Name] and I have [X] years of experience..."</li>
            <li>"I was excited to see your posting on LinkedIn..."</li>
            <li>"Please accept this letter as my application for..."</li>
            <li>"As a passionate [role] seeking new opportunities..."</li>
          </ul>
        </Callout>
        <Example
          weak="I am writing to apply for the Senior Backend Engineer role at Acme. I have 8 years of experience and would love to join your team."
          strong="Your Q3 eng blog post on sharding Postgres at 12B rows was the clearest writeup I've read this year — and it lines up with what I spent the last 18 months doing at Ramp. I'd like to bring that work to Acme as a Senior Backend Engineer."
        />
        <Example
          weak="I've always been passionate about fintech and believe your mission is inspiring."
          strong="When Plaid deprecated their legacy auth endpoints last March, my team at Mercury had three weeks to migrate 40M users. We shipped with zero downtime — the kind of problem I noticed your platform team is currently hiring for."
        />
      </Section>

      <Section
        icon={<Hash className="h-5 w-5" />}
        title="Make the evidence paragraph irresistible"
        subtitle="One story, well told, beats three stories half-told."
      >
        <p>
          Pick <strong>one</strong> experience or project from your resume that aligns most
          closely with what this role will do. Expand it into a mini case study using this shape:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            <strong>Context</strong> — 1 sentence setting the stakes. ("Our conversion rate had
            dropped 30% quarter-over-quarter.")
          </li>
          <li>
            <strong>Your action</strong> — 2–3 sentences with specifics: what you owned, how you
            approached it, what trade-offs you made.
          </li>
          <li>
            <strong>Result</strong> — 1 sentence, quantified. ("We recovered 22% of lost
            conversion in six weeks and the approach was rolled out to three other squads.")
          </li>
          <li>
            <strong>Bridge</strong> — 1 sentence connecting it to the role. ("That experience
            maps directly to the work you've described on the Growth team.")
          </li>
        </ol>
        <Callout title="If you can't think of a story">
          You're applying to the wrong role, <em>or</em> you haven't sat with your own resume long
          enough. Every job you've held has at least one specific win. Find it.
        </Callout>
      </Section>

      <Section
        icon={<Search className="h-5 w-5" />}
        title="Personalization — the research shortcut"
        subtitle="Specific beats sincere. Every time."
      >
        <p>
          Spend 15 minutes before you write. Pull one concrete reference from each of these
          sources (you only need <em>one</em> in the letter):
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Engineering / product blog</strong> — Reference a specific post by title +
            takeaway. This is the single highest-signal thing you can do.
          </li>
          <li>
            <strong>Recent product launch / press release</strong> — Mention it, then connect
            your experience to the problem it's solving.
          </li>
          <li>
            <strong>Podcast / conference talk</strong> by a founder, CTO, or the hiring manager
            themselves — quote one specific idea.
          </li>
          <li>
            <strong>Investor update / earnings call</strong> — Notice a priority they named and
            align to it.
          </li>
          <li>
            <strong>The job description itself</strong> — Find a phrase like "within the first
            90 days you will..." and describe how you'd approach it.
          </li>
        </ul>
        <Callout title="Addressing the letter">
          <p>
            Use the hiring manager's name if you can find it (LinkedIn, team pages, the job
            posting). "Dear [Name]" beats "Dear Hiring Manager" which beats "To Whom It May
            Concern" (never use this).
          </p>
        </Callout>
      </Section>

      <Section
        icon={<Type className="h-5 w-5" />}
        title="Tone & voice"
        subtitle="Write the way you'd email a respected colleague you don't yet know."
      >
        <DoDont
          dos={[
            'Short, confident sentences — average 15–18 words',
            'Active voice: "I shipped" not "It was shipped"',
            'Concrete nouns: "Postgres migration" not "data infrastructure work"',
            'First-person singular ("I") — not "we" unless you\'re specifically crediting the team',
            'Plain, direct language — write like you\'d talk over coffee, not a law firm brief',
          ]}
          donts={[
            'Corporate filler: "synergy", "results-oriented", "dynamic environment"',
            'Self-aggrandizing: "world-class", "top-tier", "rockstar", "ninja", "guru"',
            'Humble-brags or over-apologizing ("I may not have all the experience, but...")',
            'Every paragraph starting with "I" — vary sentence openings',
            'Long run-on sentences — if one is over 25 words, cut it in half',
          ]}
        />
      </Section>

      <Section
        icon={<Ruler className="h-5 w-5" />}
        title="Formatting — match the resume"
        subtitle="The two documents should look like siblings, not strangers."
      >
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Same <strong>font family</strong>, same <strong>margins</strong>, same{' '}
            <strong>header block</strong> (name, contact info) as your resume.
          </li>
          <li>Date, then recipient block (name, title, company, address), then salutation.</li>
          <li>Body text 10.5–11pt, line spacing 1.15–1.3, single column.</li>
          <li>One page. Always. Half a page is fine.</li>
          <li>Export as PDF. File name: <code>Firstname_Lastname_CoverLetter.pdf</code></li>
        </ul>
      </Section>

      <Section
        icon={<AlertTriangle className="h-5 w-5" />}
        title="The 10 most common cover letter killers"
        subtitle="Any one of these tells the reader you don't care enough to edit."
      >
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>The wrong company name in the letter (or the right name in one spot, wrong in another).</li>
          <li>Repeating your resume in paragraph form.</li>
          <li>Starting every sentence with "I".</li>
          <li>Over-explaining why you're leaving your current job. Nobody asked.</li>
          <li>Apologizing for what you <em>don't</em> have instead of showing what you do.</li>
          <li>Generic praise: "I've always admired your innovative culture." Cut it.</li>
          <li>Word-count bloat — anything over 400 words is a red flag.</li>
          <li>No specific reference to the company — interchangeable letter.</li>
          <li>AI-obvious phrasing ("In today's rapidly evolving landscape..."). Rewrite it.</li>
          <li>Generic sign-off with no call to action. Ask for the conversation.</li>
        </ol>
      </Section>

      <Section
        icon={<ListChecks className="h-5 w-5" />}
        title="Pre-submit checklist"
        subtitle="Final pass before you send."
      >
        <Checklist
          items={[
            'Company and role name are correct everywhere they appear',
            'Hiring manager name spelled correctly (or generic salutation done well)',
            'Word count between 250 and 400',
            'First sentence is not on the banned-openers list',
            'At least one specific reference to something the company has recently done',
            'One quantified achievement in the evidence paragraph',
            'Same font, margins, and header block as your resume',
            'Read aloud — no sentence over 25 words',
            'Grammarly pass, then fresh-eyes read 1 hour later',
            'File named Firstname_Lastname_CoverLetter_Company.pdf',
            'Resume is attached too — recruiters hate half-submissions',
          ]}
        />
      </Section>
    </>
  )
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-lg border border-brand-border bg-brand-mist/40 px-3 py-2 text-sm"
        >
          <CheckCircle2 className="h-4 w-4 text-brand-ink shrink-0 mt-0.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
